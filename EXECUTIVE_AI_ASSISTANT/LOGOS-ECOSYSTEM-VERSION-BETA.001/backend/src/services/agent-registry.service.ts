import { BaseAgent } from './agents/base/base-agent';
import { logger } from '../../../../../../../backend/src/utils/logger';
import { readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { AgentCapability } from './agents/base/types';
import { PythonAgentBridge } from './agents/base/python-agent-bridge';

export interface RegisteredAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: AgentCapability[];
  instance: BaseAgent;
  path: string;
  isAudioEnabled: boolean;
  isMarketplaceEnabled: boolean;
  isIoTEnabled: boolean;
  isAutomotiveEnabled: boolean;
  metadata: {
    version: string;
    author: string;
    lastUpdated: Date;
    usage: number;
    rating: number;
  };
}

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, RegisteredAgent> = new Map();
  private agentsByCategory: Map<string, RegisteredAgent[]> = new Map();
  private categoryMetadata: Map<string, any> = new Map();
  private isInitialized = false;
  private pythonBridge: PythonAgentBridge;

  private constructor() {
    this.pythonBridge = new PythonAgentBridge();
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Agent Registry already initialized');
      return;
    }

    logger.info('🤖 Initializing Agent Registry with automatic discovery...');
    
    // Initialize Python bridge
    await this.pythonBridge.initialize();
    
    // Discover and load all agents
    await this.discoverAndLoadAgents();
    
    // Generate metadata
    this.generateCategoryMetadata();
    
    this.isInitialized = true;
    
    logger.info(`✅ Agent Registry initialized successfully!`);
    logger.info(`📊 Total agents: ${this.agents.size}`);
    logger.info(`📁 Categories: ${this.agentsByCategory.size}`);
    logger.info(`🔥 Ready to serve AI capabilities!`);
  }

  private async discoverAndLoadAgents(): Promise<void> {
    const agentPaths = [
      // Main agents directory
      join(__dirname, 'agents', 'specialized'),
      // Executive AI agents
      join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'EXECUTIVE_AI_ASSISTANT', 
           'LOGOS-ECOSYSTEM-VERSION-BETA.001', 'backend', 'src', 'services', 'agents', 'specialized')
    ];
    
    let totalLoaded = 0;
    
    for (const basePath of agentPaths) {
      try {
        logger.info(`🔍 Scanning: ${basePath}`);
        const loaded = await this.scanDirectory(basePath);
        totalLoaded += loaded;
      } catch (error) {
        logger.warn(`⚠️ Could not scan directory ${basePath}:`, error);
      }
    }
    
    logger.info(`✅ Loaded ${totalLoaded} agents successfully`);
  }

  private async scanDirectory(dirPath: string, category: string = '', depth: number = 0): Promise<number> {
    let loadedCount = 0;
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        
        try {
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && depth < 3) {
            // Use directory name as category if not already set
            const newCategory = category || item;
            const subCount = await this.scanDirectory(fullPath, newCategory, depth + 1);
            loadedCount += subCount;
          } else if (this.isAgentFile(item)) {
            // Load agent file
            const loaded = await this.loadAgent(fullPath, category || this.extractCategoryFromPath(fullPath));
            if (loaded) loadedCount++;
          }
        } catch (error) {
          logger.debug(`Skipping ${fullPath}: ${error}`);
        }
      }
    } catch (error) {
      logger.error(`Error scanning directory ${dirPath}:`, error);
    }
    
    return loadedCount;
  }

  private isAgentFile(filename: string): boolean {
    return filename.endsWith('_agent.py') || 
           filename.endsWith('_agent.ts') ||
           filename.endsWith('_agent.js') ||
           (filename.includes('agent') && (filename.endsWith('.py') || filename.endsWith('.ts')));
  }

  private extractCategoryFromPath(filePath: string): string {
    const parts = filePath.split('/');
    const specializedIndex = parts.findIndex(p => p === 'specialized');
    
    if (specializedIndex !== -1 && specializedIndex < parts.length - 2) {
      return parts[specializedIndex + 1];
    }
    
    // Try to extract from parent directory
    const parentDir = parts[parts.length - 2];
    if (parentDir && parentDir !== 'agents' && parentDir !== 'specialized') {
      return parentDir;
    }
    
    return 'general';
  }

  private async loadAgent(filePath: string, category: string): Promise<boolean> {
    try {
      const agentName = this.extractAgentName(basename(filePath));
      const agentId = this.generateAgentId(agentName, category);
      
      // Skip if already loaded
      if (this.agents.has(agentId)) {
        return false;
      }
      
      logger.debug(`Loading agent: ${agentName} from ${filePath}`);
      
      if (filePath.endsWith('.py')) {
        return await this.loadPythonAgent(agentId, agentName, filePath, category);
      } else {
        return await this.loadTypeScriptAgent(agentId, agentName, filePath, category);
      }
    } catch (error) {
      logger.error(`Failed to load agent from ${filePath}:`, error);
      return false;
    }
  }

  private extractAgentName(filename: string): string {
    return filename
      .replace(/\.(py|ts|js)$/, '')
      .replace(/_agent$/, '')
      .replace(/[-_]/g, ' ')
      .trim();
  }

  private generateAgentId(name: string, category: string): string {
    const baseName = name.toLowerCase().replace(/\s+/g, '-');
    return `${category}-${baseName}`;
  }

  private async loadPythonAgent(agentId: string, agentName: string, filePath: string, category: string): Promise<boolean> {
    try {
      // Extract metadata from Python file
      const metadata = await this.pythonBridge.extractAgentMetadata(filePath);
      
      const agent: RegisteredAgent = {
        id: agentId,
        name: metadata.name || this.formatAgentName(agentName),
        description: metadata.description || `Specialized ${category} AI expert: ${this.formatAgentName(agentName)}`,
        category: this.normalizeCategory(category),
        capabilities: metadata.capabilities || this.generateDefaultCapabilities(agentName, category),
        instance: await this.pythonBridge.createAgentWrapper(agentId, filePath, metadata),
        path: filePath,
        isAudioEnabled: metadata.audio_enabled !== false,
        isMarketplaceEnabled: metadata.marketplace_enabled !== false,
        isIoTEnabled: metadata.iot_enabled || this.shouldEnableIoT(category),
        isAutomotiveEnabled: metadata.automotive_enabled || this.shouldEnableAutomotive(category),
        metadata: {
          version: metadata.version || '1.0.0',
          author: metadata.author || 'LOGOS Team',
          lastUpdated: new Date(),
          usage: 0,
          rating: 5.0
        }
      };
      
      this.registerAgent(agent);
      return true;
    } catch (error) {
      logger.error(`Failed to load Python agent ${agentName}:`, error);
      return false;
    }
  }

  private async loadTypeScriptAgent(agentId: string, agentName: string, filePath: string, category: string): Promise<boolean> {
    try {
      const AgentModule = await import(filePath);
      const AgentClass = AgentModule.default || AgentModule[Object.keys(AgentModule)[0]];
      
      if (!AgentClass) {
        logger.warn(`No agent class found in ${filePath}`);
        return false;
      }
      
      const instance = new AgentClass();
      
      const agent: RegisteredAgent = {
        id: agentId,
        name: instance.name || this.formatAgentName(agentName),
        description: instance.description || `Specialized ${category} AI expert`,
        category: this.normalizeCategory(category),
        capabilities: instance.capabilities || this.generateDefaultCapabilities(agentName, category),
        instance,
        path: filePath,
        isAudioEnabled: instance.audio_enabled !== false,
        isMarketplaceEnabled: instance.marketplace_enabled !== false,
        isIoTEnabled: instance.iot_enabled || this.shouldEnableIoT(category),
        isAutomotiveEnabled: instance.automotive_enabled || this.shouldEnableAutomotive(category),
        metadata: {
          version: instance.version || '1.0.0',
          author: instance.author || 'LOGOS Team',
          lastUpdated: new Date(),
          usage: 0,
          rating: 5.0
        }
      };
      
      this.registerAgent(agent);
      return true;
    } catch (error) {
      logger.error(`Failed to import TypeScript agent ${filePath}:`, error);
      return false;
    }
  }

  private formatAgentName(rawName: string): string {
    return rawName
      .split(/[\s_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/\s+Agent$/, ' Expert')
      .replace(/\s+Expert Expert$/, ' Expert');
  }

  private normalizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'med': 'medical',
      'healthcare': 'medical',
      'health': 'medical',
      'eng': 'engineering',
      'tech': 'technology',
      'fin': 'finance',
      'financial': 'finance',
      'bus': 'business',
      'edu': 'education',
      'sci': 'science',
      'geo': 'geography',
      'art': 'arts',
      'agri': 'agriculture',
      'agr': 'agriculture',
      'trans': 'transportation',
      'legal': 'legal',
      'law': 'legal'
    };
    
    const normalized = category.toLowerCase();
    return categoryMap[normalized] || normalized;
  }

  private generateDefaultCapabilities(agentName: string, category: string): AgentCapability[] {
    const capabilities: AgentCapability[] = [
      {
        name: 'analyze',
        description: `Analyze ${category} data and provide expert insights`,
        parameters: {
          data: 'Data to analyze',
          analysis_type: 'Type of analysis (comprehensive, summary, specific)',
          format: 'Output format (report, bullets, narrative)'
        },
        required_parameters: ['data']
      },
      {
        name: 'consult',
        description: `Provide expert ${category} consultation and advice`,
        parameters: {
          query: 'Question or topic for consultation',
          context: 'Additional context or background',
          depth: 'Level of detail (overview, detailed, expert)'
        },
        required_parameters: ['query']
      },
      {
        name: 'generate',
        description: `Generate ${category}-specific content or solutions`,
        parameters: {
          type: 'Type of content to generate',
          requirements: 'Specific requirements or constraints',
          style: 'Style or format preferences'
        },
        required_parameters: ['type']
      }
    ];

    // Add category-specific capabilities
    const categoryCapabilities = this.getCategorySpecificCapabilities(category);
    capabilities.push(...categoryCapabilities);
    
    return capabilities;
  }

  private getCategorySpecificCapabilities(category: string): AgentCapability[] {
    const capabilityMap: Record<string, AgentCapability[]> = {
      medical: [
        {
          name: 'diagnose',
          description: 'Provide diagnostic assistance based on symptoms',
          parameters: {
            symptoms: 'List of symptoms',
            history: 'Medical history',
            tests: 'Test results if available'
          },
          required_parameters: ['symptoms']
        },
        {
          name: 'treatment_plan',
          description: 'Suggest treatment options and care plans',
          parameters: {
            condition: 'Medical condition',
            patient_info: 'Patient information',
            preferences: 'Treatment preferences'
          },
          required_parameters: ['condition']
        }
      ],
      engineering: [
        {
          name: 'design',
          description: 'Create engineering designs and specifications',
          parameters: {
            requirements: 'Design requirements',
            constraints: 'Technical constraints',
            standards: 'Applicable standards'
          },
          required_parameters: ['requirements']
        },
        {
          name: 'calculate',
          description: 'Perform engineering calculations',
          parameters: {
            type: 'Type of calculation',
            inputs: 'Input parameters',
            units: 'Unit system'
          },
          required_parameters: ['type', 'inputs']
        }
      ],
      finance: [
        {
          name: 'forecast',
          description: 'Generate financial forecasts and projections',
          parameters: {
            data: 'Historical financial data',
            period: 'Forecast period',
            method: 'Forecasting method'
          },
          required_parameters: ['data', 'period']
        },
        {
          name: 'risk_assessment',
          description: 'Assess financial risks and opportunities',
          parameters: {
            portfolio: 'Portfolio or investment details',
            risk_tolerance: 'Risk tolerance level',
            market_conditions: 'Current market conditions'
          },
          required_parameters: ['portfolio']
        }
      ],
      legal: [
        {
          name: 'review_contract',
          description: 'Review and analyze legal contracts',
          parameters: {
            contract: 'Contract text',
            focus_areas: 'Specific areas to focus on',
            jurisdiction: 'Applicable jurisdiction'
          },
          required_parameters: ['contract']
        },
        {
          name: 'compliance_check',
          description: 'Check compliance with regulations',
          parameters: {
            regulations: 'Applicable regulations',
            business_model: 'Business model or practices',
            jurisdiction: 'Jurisdiction'
          },
          required_parameters: ['regulations']
        }
      ]
    };
    
    return capabilityMap[category] || [];
  }

  private shouldEnableIoT(category: string): boolean {
    const iotCategories = ['engineering', 'technology', 'automation', 'industrial', 'agriculture', 'manufacturing'];
    return iotCategories.includes(category.toLowerCase());
  }

  private shouldEnableAutomotive(category: string): boolean {
    const autoCategories = ['engineering', 'transportation', 'automotive', 'mobility', 'logistics'];
    return autoCategories.includes(category.toLowerCase());
  }

  private registerAgent(agent: RegisteredAgent): void {
    // Register in main map
    this.agents.set(agent.id, agent);
    
    // Update category mapping
    if (!this.agentsByCategory.has(agent.category)) {
      this.agentsByCategory.set(agent.category, []);
    }
    this.agentsByCategory.get(agent.category)!.push(agent);
    
    logger.debug(`✅ Registered: ${agent.name} [${agent.id}] in ${agent.category}`);
  }

  private generateCategoryMetadata(): void {
    for (const [category, agents] of this.agentsByCategory.entries()) {
      this.categoryMetadata.set(category, {
        name: this.formatCategoryName(category),
        description: this.getCategoryDescription(category),
        agentCount: agents.length,
        totalCapabilities: agents.reduce((sum, agent) => sum + agent.capabilities.length, 0),
        features: {
          audioEnabled: agents.filter(a => a.isAudioEnabled).length,
          iotEnabled: agents.filter(a => a.isIoTEnabled).length,
          automotiveEnabled: agents.filter(a => a.isAutomotiveEnabled).length
        }
      });
    }
  }

  private formatCategoryName(category: string): string {
    return category
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      medical: 'Healthcare and medical expertise including diagnosis, treatment, and research',
      engineering: 'Technical engineering across civil, mechanical, electrical, and software domains',
      finance: 'Financial analysis, investment strategies, and economic insights',
      technology: 'Software development, AI/ML, cybersecurity, and emerging technologies',
      business: 'Business strategy, management, marketing, and operations',
      legal: 'Legal analysis, compliance, contracts, and regulatory guidance',
      education: 'Educational content, tutoring, and learning strategies',
      science: 'Scientific research, analysis, and experimentation',
      geography: 'Geographic, cultural, and regional expertise worldwide',
      arts: 'Creative arts, design, music, and cultural analysis',
      agriculture: 'Agricultural practices, crop management, and sustainability',
      transportation: 'Logistics, transportation systems, and mobility solutions'
    };
    
    return descriptions[category] || `Specialized expertise in ${category} domain`;
  }

  // Public API Methods

  getAgent(agentId: string): RegisteredAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByCategory(category: string): RegisteredAgent[] {
    return this.agentsByCategory.get(this.normalizeCategory(category)) || [];
  }

  getAllCategories(): Array<{name: string, metadata: any}> {
    return Array.from(this.categoryMetadata.entries()).map(([key, value]) => ({
      name: key,
      metadata: value
    }));
  }

  searchAgents(query: string): RegisteredAgent[] {
    const lowercaseQuery = query.toLowerCase();
    const results: RegisteredAgent[] = [];
    const scores: Map<string, number> = new Map();
    
    for (const agent of this.agents.values()) {
      let score = 0;
      
      // Name match (highest priority)
      if (agent.name.toLowerCase().includes(lowercaseQuery)) {
        score += 10;
      }
      
      // Category match
      if (agent.category.toLowerCase().includes(lowercaseQuery)) {
        score += 5;
      }
      
      // Description match
      if (agent.description.toLowerCase().includes(lowercaseQuery)) {
        score += 3;
      }
      
      // Capability match
      for (const cap of agent.capabilities) {
        if (cap.name.toLowerCase().includes(lowercaseQuery) || 
            cap.description.toLowerCase().includes(lowercaseQuery)) {
          score += 2;
        }
      }
      
      if (score > 0) {
        results.push(agent);
        scores.set(agent.id, score);
      }
    }
    
    // Sort by relevance score
    return results.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
  }

  async executeAgentCapability(
    agentId: string, 
    capability: string, 
    params: any, 
    userId: string,
    context?: any
  ): Promise<any> {
    const agent = this.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    const agentCapability = agent.capabilities.find(cap => cap.name === capability);
    
    if (!agentCapability) {
      throw new Error(`Capability ${capability} not found for agent ${agentId}`);
    }
    
    // Validate required parameters
    for (const requiredParam of agentCapability.required_parameters || []) {
      if (!params[requiredParam]) {
        throw new Error(`Missing required parameter: ${requiredParam}`);
      }
    }
    
    // Update usage metrics
    agent.metadata.usage++;
    
    // Log execution
    logger.info(`Executing ${capability} on agent ${agentId} for user ${userId}`);
    
    try {
      // Execute through the agent instance
      let result;
      
      if (agent.instance.executeCapability) {
        result = await agent.instance.executeCapability(capability, params, context);
      } else if (agent.instance[capability]) {
        // Direct method call
        result = await agent.instance[capability](params);
      } else {
        // Fallback execution
        result = await this.fallbackExecution(agent, capability, params);
      }
      
      return {
        success: true,
        agentId,
        agentName: agent.name,
        capability,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error executing ${capability} on ${agentId}:`, error);
      throw error;
    }
  }

  private async fallbackExecution(agent: RegisteredAgent, capability: string, params: any): Promise<any> {
    // For Python agents or agents without direct execution
    if (agent.path.endsWith('.py')) {
      return await this.pythonBridge.executeCapability(agent.path, capability, params);
    }
    
    // Generic fallback
    return {
      message: `Executed ${capability} on ${agent.name}`,
      params,
      notice: 'This is a simulated response. Full integration pending.'
    };
  }

  async chatWithAgent(agentId: string, message: string, userId: string, context?: any): Promise<any> {
    const agent = this.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    logger.info(`Chat with agent ${agentId} for user ${userId}`);
    
    // Use the consult capability for chat
    return this.executeAgentCapability(agentId, 'consult', { query: message, context }, userId, context);
  }

  getSystemStats(): any {
    const stats = {
      totalAgents: this.agents.size,
      totalCategories: this.agentsByCategory.size,
      agentsByCategory: {} as Record<string, number>,
      capabilities: {
        total: 0,
        byCategory: {} as Record<string, number>,
        unique: new Set<string>()
      },
      features: {
        audioEnabled: 0,
        marketplaceEnabled: 0,
        iotEnabled: 0,
        automotiveEnabled: 0
      },
      topAgents: [] as any[],
      recentlyAdded: [] as any[],
      categoryDetails: {} as Record<string, any>
    };
    
    // Calculate statistics
    for (const [category, agents] of this.agentsByCategory.entries()) {
      stats.agentsByCategory[category] = agents.length;
      stats.capabilities.byCategory[category] = 0;
      
      for (const agent of agents) {
        // Count capabilities
        stats.capabilities.total += agent.capabilities.length;
        stats.capabilities.byCategory[category] += agent.capabilities.length;
        
        // Track unique capabilities
        agent.capabilities.forEach(cap => stats.capabilities.unique.add(cap.name));
        
        // Count features
        if (agent.isAudioEnabled) stats.features.audioEnabled++;
        if (agent.isMarketplaceEnabled) stats.features.marketplaceEnabled++;
        if (agent.isIoTEnabled) stats.features.iotEnabled++;
        if (agent.isAutomotiveEnabled) stats.features.automotiveEnabled++;
      }
      
      // Category details
      stats.categoryDetails[category] = this.categoryMetadata.get(category);
    }
    
    // Get top agents by usage
    stats.topAgents = Array.from(this.agents.values())
      .sort((a, b) => b.metadata.usage - a.metadata.usage)
      .slice(0, 10)
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        category: agent.category,
        usage: agent.metadata.usage,
        rating: agent.metadata.rating
      }));
    
    // Get recently added agents
    stats.recentlyAdded = Array.from(this.agents.values())
      .sort((a, b) => b.metadata.lastUpdated.getTime() - a.metadata.lastUpdated.getTime())
      .slice(0, 10)
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        category: agent.category,
        addedAt: agent.metadata.lastUpdated
      }));
    
    // Convert Set to array for unique capabilities
    stats.capabilities.unique = Array.from(stats.capabilities.unique);
    
    return stats;
  }

  async refreshRegistry(): Promise<void> {
    logger.info('🔄 Refreshing Agent Registry...');
    
    // Clear existing data
    this.agents.clear();
    this.agentsByCategory.clear();
    this.categoryMetadata.clear();
    this.isInitialized = false;
    
    // Reinitialize
    await this.initialize();
  }

  async submitFeedback(agentId: string, rating: number, feedback: string, userId: string): Promise<void> {
    const agent = this.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // Update agent rating (simple average for now)
    const currentRating = agent.metadata.rating;
    const currentCount = agent.metadata.usage || 1;
    agent.metadata.rating = ((currentRating * currentCount) + rating) / (currentCount + 1);
    
    logger.info(`Feedback submitted for agent ${agentId}: ${rating}/5`);
    
    // TODO: Store feedback in database
  }

  getAgentMetrics(agentId: string): any {
    const agent = this.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    return {
      agentId: agent.id,
      name: agent.name,
      category: agent.category,
      usage: agent.metadata.usage,
      rating: agent.metadata.rating,
      capabilities: agent.capabilities.length,
      features: {
        audio: agent.isAudioEnabled,
        marketplace: agent.isMarketplaceEnabled,
        iot: agent.isIoTEnabled,
        automotive: agent.isAutomotiveEnabled
      },
      lastUpdated: agent.metadata.lastUpdated
    };
  }
}

// Export singleton instance
export const agentRegistry = AgentRegistry.getInstance();