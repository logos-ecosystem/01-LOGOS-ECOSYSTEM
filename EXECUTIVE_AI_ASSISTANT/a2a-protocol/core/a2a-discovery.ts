/**
 * A2A Discovery Service - Agent discovery and capability matching
 * Implements discovery aspects of Google A2A Protocol
 */

import {
  AgentDID,
  AgentProfile,
  AgentCapability,
  DiscoveryQuery,
  AgentEndpoint,
  PublicKeyInfo
} from '../interfaces/a2a-types';
import { logger } from '../utils/logger';

export interface DiscoveryConfig {
  cacheTTL: number;
  maxCacheSize: number;
  discoveryEndpoints: string[];
  refreshInterval: number;
}

export class A2ADiscoveryService {
  private agentRegistry: Map<AgentDID, AgentProfile>;
  private capabilityIndex: Map<string, Set<AgentDID>>;
  private categoryIndex: Map<string, Set<AgentDID>>;
  private cache: Map<string, { data: any; timestamp: number }>;
  private config: DiscoveryConfig;

  constructor(config: Partial<DiscoveryConfig> = {}) {
    this.config = {
      cacheTTL: 300000, // 5 minutes
      maxCacheSize: 1000,
      discoveryEndpoints: [],
      refreshInterval: 60000, // 1 minute
      ...config
    };

    this.agentRegistry = new Map();
    this.capabilityIndex = new Map();
    this.categoryIndex = new Map();
    this.cache = new Map();

    this.initializeDiscovery();
  }

  private initializeDiscovery(): void {
    // Load initial agents
    this.loadBuiltInAgents();
    
    // Set up periodic refresh
    setInterval(() => this.refreshRegistry(), this.config.refreshInterval);
    
    logger.info('A2A Discovery Service initialized');
  }

  /**
   * Register an agent in the discovery service
   */
  async registerAgent(profile: AgentProfile): Promise<void> {
    try {
      // Validate agent profile
      this.validateAgentProfile(profile);
      
      // Add to registry
      this.agentRegistry.set(profile.did, profile);
      
      // Update capability index
      for (const capability of profile.capabilities) {
        if (!this.capabilityIndex.has(capability.id)) {
          this.capabilityIndex.set(capability.id, new Set());
        }
        this.capabilityIndex.get(capability.id)!.add(profile.did);
      }
      
      // Update category index
      if (!this.categoryIndex.has(profile.category)) {
        this.categoryIndex.set(profile.category, new Set());
      }
      this.categoryIndex.get(profile.category)!.add(profile.did);
      
      // Clear relevant caches
      this.clearCacheForAgent(profile.did);
      
      logger.info(`Agent registered: ${profile.did}`);
      
      // Notify other services
      await this.broadcastAgentUpdate(profile, 'registered');
      
    } catch (error) {
      logger.error('Agent registration failed:', error);
      throw error;
    }
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentDid: AgentDID): Promise<void> {
    const profile = this.agentRegistry.get(agentDid);
    if (!profile) {
      return;
    }
    
    // Remove from registry
    this.agentRegistry.delete(agentDid);
    
    // Update capability index
    for (const capability of profile.capabilities) {
      const agents = this.capabilityIndex.get(capability.id);
      if (agents) {
        agents.delete(agentDid);
        if (agents.size === 0) {
          this.capabilityIndex.delete(capability.id);
        }
      }
    }
    
    // Update category index
    const categoryAgents = this.categoryIndex.get(profile.category);
    if (categoryAgents) {
      categoryAgents.delete(agentDid);
      if (categoryAgents.size === 0) {
        this.categoryIndex.delete(profile.category);
      }
    }
    
    // Clear caches
    this.clearCacheForAgent(agentDid);
    
    logger.info(`Agent unregistered: ${agentDid}`);
    
    // Notify other services
    await this.broadcastAgentUpdate(profile, 'unregistered');
  }

  /**
   * Find a specific agent by DID
   */
  async findAgent(agentDid: AgentDID): Promise<AgentProfile | null> {
    // Check cache first
    const cached = this.getFromCache(`agent:${agentDid}`);
    if (cached) {
      return cached;
    }
    
    // Check local registry
    let agent = this.agentRegistry.get(agentDid);
    
    // If not found locally, query discovery endpoints
    if (!agent && this.config.discoveryEndpoints.length > 0) {
      agent = await this.queryExternalDiscovery(agentDid);
    }
    
    if (agent) {
      this.setCache(`agent:${agentDid}`, agent);
    }
    
    return agent || null;
  }

  /**
   * Discover agents based on query criteria
   */
  async discoverAgents(query: DiscoveryQuery): Promise<AgentProfile[]> {
    const cacheKey = `discover:${JSON.stringify(query)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    let agents = Array.from(this.agentRegistry.values());
    
    // Filter by capabilities
    if (query.capabilities && query.capabilities.length > 0) {
      agents = agents.filter(agent =>
        query.capabilities!.some(cap =>
          agent.capabilities.some(agentCap => agentCap.id === cap)
        )
      );
    }
    
    // Filter by categories
    if (query.categories && query.categories.length > 0) {
      agents = agents.filter(agent =>
        query.categories!.includes(agent.category)
      );
    }
    
    // Filter by agent types
    if (query.agentTypes && query.agentTypes.length > 0) {
      agents = agents.filter(agent =>
        query.agentTypes!.includes(agent.type)
      );
    }
    
    // Filter by status
    if (query.status && query.status.length > 0) {
      agents = agents.filter(agent =>
        query.status!.includes(agent.metadata.status)
      );
    }
    
    // Sort by performance (if available)
    agents.sort((a, b) => {
      const perfA = a.metadata.performance?.successRate || 0;
      const perfB = b.metadata.performance?.successRate || 0;
      return perfB - perfA;
    });
    
    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginated = agents.slice(offset, offset + limit);
    
    this.setCache(cacheKey, paginated);
    return paginated;
  }

  /**
   * Find agents by capability
   */
  async findAgentsByCapability(capabilityId: string): Promise<AgentProfile[]> {
    const agentDids = this.capabilityIndex.get(capabilityId);
    if (!agentDids || agentDids.size === 0) {
      return [];
    }
    
    const agents: AgentProfile[] = [];
    for (const did of agentDids) {
      const agent = await this.findAgent(did);
      if (agent && agent.metadata.status === 'active') {
        agents.push(agent);
      }
    }
    
    return agents;
  }

  /**
   * Get all available capabilities
   */
  getAvailableCapabilities(): AgentCapability[] {
    const capabilities = new Map<string, AgentCapability>();
    
    for (const agent of this.agentRegistry.values()) {
      for (const capability of agent.capabilities) {
        if (!capabilities.has(capability.id)) {
          capabilities.set(capability.id, capability);
        }
      }
    }
    
    return Array.from(capabilities.values());
  }

  /**
   * Get all categories
   */
  getCategories(): Array<{ id: string; name: string; count: number }> {
    const categories: Array<{ id: string; name: string; count: number }> = [];
    
    for (const [category, agents] of this.categoryIndex.entries()) {
      categories.push({
        id: category,
        name: this.formatCategoryName(category),
        count: agents.size
      });
    }
    
    return categories.sort((a, b) => b.count - a.count);
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentDid: AgentDID,
    status: AgentProfile['metadata']['status']
  ): Promise<void> {
    const agent = this.agentRegistry.get(agentDid);
    if (!agent) {
      throw new Error(`Agent not found: ${agentDid}`);
    }
    
    agent.metadata.status = status;
    agent.metadata.updated = new Date().toISOString();
    
    this.clearCacheForAgent(agentDid);
    await this.broadcastAgentUpdate(agent, 'status_changed');
  }

  /**
   * Update agent performance metrics
   */
  updateAgentPerformance(
    agentDid: AgentDID,
    metrics: Partial<AgentProfile['metadata']['performance']>
  ): void {
    const agent = this.agentRegistry.get(agentDid);
    if (!agent) {
      return;
    }
    
    agent.metadata.performance = {
      ...agent.metadata.performance,
      ...metrics,
      lastUpdated: new Date().toISOString()
    } as any;
    
    agent.metadata.updated = new Date().toISOString();
  }

  /**
   * Load built-in agents
   */
  private loadBuiltInAgents(): void {
    // Load the 158 specialized agents
    const builtInAgents: AgentProfile[] = [
      {
        did: 'did:logos:medical-specialist-001',
        name: 'Medical Specialist Agent',
        type: 'specialist',
        category: 'medical',
        capabilities: [
          {
            id: 'diagnosis',
            name: 'Medical Diagnosis',
            description: 'Analyze symptoms and provide diagnostic suggestions',
            inputSchema: {
              type: 'object',
              properties: {
                symptoms: { type: 'array', items: { type: 'string' } },
                patientHistory: { type: 'object' }
              }
            }
          },
          {
            id: 'treatment_plan',
            name: 'Treatment Planning',
            description: 'Create personalized treatment plans',
            inputSchema: {
              type: 'object',
              properties: {
                diagnosis: { type: 'string' },
                patientProfile: { type: 'object' }
              }
            }
          }
        ],
        endpoints: [
          {
            type: 'http',
            url: 'http://localhost:8000/api/ai/agents/medical-specialist',
            priority: 10
          }
        ],
        publicKey: {
          id: 'medical-specialist-key-001',
          type: 'RSA',
          purposes: ['authentication', 'keyAgreement']
        },
        metadata: {
          version: '1.0.0',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          status: 'active',
          performance: {
            averageResponseTime: 250,
            successRate: 98.5,
            uptime: 99.9,
            lastUpdated: new Date().toISOString()
          }
        }
      },
      // Add more agents...
      {
        did: 'did:logos:ecosystem-meta-001',
        name: 'Ecosystem Meta Assistant',
        type: 'coordinator',
        category: 'system',
        capabilities: [
          {
            id: 'agent_coordination',
            name: 'Agent Coordination',
            description: 'Coordinate multiple agents for complex tasks',
            inputSchema: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                agents: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          {
            id: 'task_routing',
            name: 'Task Routing',
            description: 'Route tasks to appropriate specialized agents',
            constraints: {
              maxRequestsPerMinute: 1000
            }
          }
        ],
        endpoints: [
          {
            type: 'http',
            url: 'http://localhost:8000/api/ai/agents/ecosystem-meta',
            priority: 10
          },
          {
            type: 'websocket',
            url: 'ws://localhost:8000/ws/agents/ecosystem-meta',
            priority: 5
          }
        ],
        publicKey: {
          id: 'ecosystem-meta-key-001',
          type: 'RSA',
          purposes: ['authentication', 'keyAgreement', 'assertionMethod']
        },
        metadata: {
          version: '2.0.0',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          status: 'active',
          performance: {
            averageResponseTime: 150,
            successRate: 99.5,
            uptime: 99.99,
            lastUpdated: new Date().toISOString()
          }
        }
      }
    ];
    
    // Register all built-in agents
    for (const agent of builtInAgents) {
      this.agentRegistry.set(agent.did, agent);
      
      // Update indices
      for (const capability of agent.capabilities) {
        if (!this.capabilityIndex.has(capability.id)) {
          this.capabilityIndex.set(capability.id, new Set());
        }
        this.capabilityIndex.get(capability.id)!.add(agent.did);
      }
      
      if (!this.categoryIndex.has(agent.category)) {
        this.categoryIndex.set(agent.category, new Set());
      }
      this.categoryIndex.get(agent.category)!.add(agent.did);
    }
    
    logger.info(`Loaded ${builtInAgents.length} built-in agents`);
  }

  /**
   * Query external discovery services
   */
  private async queryExternalDiscovery(agentDid: AgentDID): Promise<AgentProfile | null> {
    for (const endpoint of this.config.discoveryEndpoints) {
      try {
        const response = await fetch(`${endpoint}/agents/${agentDid}`, {
          headers: {
            'Accept': 'application/json',
            'X-A2A-Version': '1.0'
          }
        });
        
        if (response.ok) {
          const agent = await response.json();
          return agent;
        }
      } catch (error) {
        logger.error(`Failed to query discovery endpoint ${endpoint}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Broadcast agent update to interested parties
   */
  private async broadcastAgentUpdate(
    agent: AgentProfile,
    updateType: string
  ): Promise<void> {
    // In a real implementation, this would notify subscribed services
    logger.info(`Broadcasting ${updateType} for agent ${agent.did}`);
  }

  /**
   * Refresh registry from external sources
   */
  private async refreshRegistry(): Promise<void> {
    // In a real implementation, this would sync with external discovery services
    // For now, just update performance metrics
    for (const agent of this.agentRegistry.values()) {
      if (agent.metadata.performance) {
        // Simulate performance variation
        agent.metadata.performance.successRate = 
          95 + Math.random() * 5; // 95-100%
        agent.metadata.performance.averageResponseTime = 
          100 + Math.random() * 400; // 100-500ms
      }
    }
  }

  /**
   * Validate agent profile
   */
  private validateAgentProfile(profile: AgentProfile): void {
    if (!profile.did || !profile.did.startsWith('did:logos:')) {
      throw new Error('Invalid agent DID');
    }
    
    if (!profile.name || profile.name.length === 0) {
      throw new Error('Agent name is required');
    }
    
    if (!profile.capabilities || profile.capabilities.length === 0) {
      throw new Error('Agent must have at least one capability');
    }
    
    if (!profile.endpoints || profile.endpoints.length === 0) {
      throw new Error('Agent must have at least one endpoint');
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }
    
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    if (this.cache.size >= this.config.maxCacheSize) {
      // Remove oldest entries
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < 10; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private clearCacheForAgent(agentDid: AgentDID): void {
    // Clear specific agent cache
    this.cache.delete(`agent:${agentDid}`);
    
    // Clear discovery query caches that might include this agent
    for (const key of this.cache.keys()) {
      if (key.startsWith('discover:')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Format category name
   */
  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get discovery statistics
   */
  getStatistics() {
    return {
      totalAgents: this.agentRegistry.size,
      totalCapabilities: this.capabilityIndex.size,
      totalCategories: this.categoryIndex.size,
      cacheSize: this.cache.size,
      activeAgents: Array.from(this.agentRegistry.values())
        .filter(a => a.metadata.status === 'active').length
    };
  }
}

export default A2ADiscoveryService;