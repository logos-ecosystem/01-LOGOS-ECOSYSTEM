/**
 * LOGOS-A2A Adapter - Integrates existing LOGOS agents with Google A2A Protocol
 */

import { A2AClient } from '../client/a2a-client';
import {
  AgentDID,
  AgentProfile,
  A2AMessage,
  A2AMessageType,
  AgentCapability
} from '../interfaces/a2a-types';
import { AgentRegistry } from '../../LOGOS-ECOSYSTEM-VERSION-BETA.001/backend/src/services/agent-registry.service';
import { logger } from '../utils/logger';

export class LogosA2AAdapter {
  private a2aClients: Map<AgentDID, A2AClient>;
  private agentRegistry: AgentRegistry;
  private agentDidMapping: Map<string, AgentDID>;

  constructor() {
    this.a2aClients = new Map();
    this.agentRegistry = new AgentRegistry();
    this.agentDidMapping = new Map();
  }

  /**
   * Initialize adapter and convert all LOGOS agents to A2A
   */
  async initialize(): Promise<void> {
    logger.info('Initializing LOGOS-A2A Adapter...');
    
    // Initialize agent registry
    await this.agentRegistry.initialize();
    
    // Get all registered agents
    const agents = this.agentRegistry.getAllAgents();
    
    // Convert each agent to A2A
    for (const [agentId, agent] of agents) {
      await this.convertAgentToA2A(agentId, agent);
    }
    
    logger.info(`Converted ${agents.size} LOGOS agents to A2A protocol`);
  }

  /**
   * Convert a LOGOS agent to A2A protocol
   */
  private async convertAgentToA2A(agentId: string, agent: any): Promise<void> {
    // Generate DID for agent
    const agentDid: AgentDID = `did:logos:${agentId}`;
    this.agentDidMapping.set(agentId, agentDid);
    
    // Convert capabilities
    const capabilities: AgentCapability[] = agent.capabilities.map((cap: any) => ({
      id: cap.name,
      name: cap.displayName || cap.name,
      description: cap.description,
      inputSchema: cap.parameters ? this.convertParametersToSchema(cap.parameters) : undefined,
      outputSchema: cap.returns ? { type: 'object' } : undefined,
      constraints: {
        timeout: cap.timeout || 30000,
        maxRequestsPerMinute: cap.rateLimit || 60
      }
    }));
    
    // Create A2A agent profile
    const profile: AgentProfile = {
      did: agentDid,
      name: agent.name,
      type: this.determineAgentType(agent),
      category: agent.category,
      capabilities,
      endpoints: [
        {
          type: 'http',
          url: `http://localhost:8000/api/ai/agents/${agentId}`,
          priority: 10
        }
      ],
      publicKey: {
        id: `${agentId}-key`,
        type: 'RSA',
        purposes: ['authentication', 'keyAgreement']
      },
      metadata: {
        version: agent.version || '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'active',
        performance: {
          averageResponseTime: 0,
          successRate: 100,
          uptime: 100,
          lastUpdated: new Date().toISOString()
        }
      }
    };
    
    // Create A2A client for agent
    const client = new A2AClient({
      agentDid,
      agentProfile: profile,
      autoRegister: true
    });
    
    // Set up message handlers
    this.setupMessageHandlers(client, agent);
    
    // Store client
    this.a2aClients.set(agentDid, client);
  }

  /**
   * Setup message handlers for A2A client
   */
  private setupMessageHandlers(client: A2AClient, agent: any): void {
    // Handle capability execution requests
    client.on(A2AMessageType.REQUEST, async (message: A2AMessage) => {
      if (message.body.action === 'execute_capability') {
        const { capability, parameters } = message.body;
        
        try {
          // Execute capability using original agent
          const result = await agent.executeCapability(capability, parameters);
          
          return {
            '@context': message['@context'],
            '@type': A2AMessageType.RESPONSE,
            id: `${message.id}-response`,
            timestamp: new Date().toISOString(),
            version: '1.0',
            from: client['agentDid'],
            to: message.from,
            body: {
              result,
              status: 'success'
            }
          };
        } catch (error: any) {
          return {
            '@context': message['@context'],
            '@type': A2AMessageType.ERROR,
            id: `${message.id}-error`,
            timestamp: new Date().toISOString(),
            version: '1.0',
            from: client['agentDid'],
            to: message.from,
            body: {
              error: error.message,
              code: 'EXECUTION_ERROR'
            }
          };
        }
      }
    });
    
    // Handle chat messages
    client.on(A2AMessageType.REQUEST, async (message: A2AMessage) => {
      if (message.body.action === 'chat') {
        const { message: chatMessage, context } = message.body;
        
        try {
          // Process chat using original agent
          const response = await agent.processChat(chatMessage, context);
          
          return {
            '@context': message['@context'],
            '@type': A2AMessageType.RESPONSE,
            id: `${message.id}-response`,
            timestamp: new Date().toISOString(),
            version: '1.0',
            from: client['agentDid'],
            to: message.from,
            body: {
              message: response,
              status: 'success'
            }
          };
        } catch (error: any) {
          return {
            '@context': message['@context'],
            '@type': A2AMessageType.ERROR,
            id: `${message.id}-error`,
            timestamp: new Date().toISOString(),
            version: '1.0',
            from: client['agentDid'],
            to: message.from,
            body: {
              error: error.message,
              code: 'CHAT_ERROR'
            }
          };
        }
      }
    });
  }

  /**
   * Enable agent-to-agent communication
   */
  async enableAgentCommunication(
    fromAgentId: string,
    toAgentId: string,
    message: any
  ): Promise<any> {
    const fromDid = this.agentDidMapping.get(fromAgentId);
    const toDid = this.agentDidMapping.get(toAgentId);
    
    if (!fromDid || !toDid) {
      throw new Error('Agent not found in A2A registry');
    }
    
    const fromClient = this.a2aClients.get(fromDid);
    if (!fromClient) {
      throw new Error('A2A client not found for agent');
    }
    
    // Send message using A2A protocol
    const response = await fromClient.request({
      to: toDid,
      body: message,
      timeout: 30000
    });
    
    return response.body;
  }

  /**
   * Execute capability on remote agent
   */
  async executeRemoteCapability(
    fromAgentId: string,
    toAgentId: string,
    capabilityId: string,
    parameters: any
  ): Promise<any> {
    const fromDid = this.agentDidMapping.get(fromAgentId);
    const toDid = this.agentDidMapping.get(toAgentId);
    
    if (!fromDid || !toDid) {
      throw new Error('Agent not found in A2A registry');
    }
    
    const fromClient = this.a2aClients.get(fromDid);
    if (!fromClient) {
      throw new Error('A2A client not found for agent');
    }
    
    return await fromClient.executeCapability(toDid, capabilityId, parameters);
  }

  /**
   * Broadcast message to agents in category
   */
  async broadcastToCategory(
    fromAgentId: string,
    category: string,
    message: any
  ): Promise<void> {
    const fromDid = this.agentDidMapping.get(fromAgentId);
    if (!fromDid) {
      throw new Error('Agent not found in A2A registry');
    }
    
    const fromClient = this.a2aClients.get(fromDid);
    if (!fromClient) {
      throw new Error('A2A client not found for agent');
    }
    
    await fromClient.broadcast({
      category,
      type: A2AMessageType.NOTIFICATION,
      body: message
    });
  }

  /**
   * Create collaborative session between agents
   */
  async createCollaborativeSession(
    agentIds: string[],
    context: any
  ): Promise<string> {
    if (agentIds.length < 2) {
      throw new Error('At least 2 agents required for collaborative session');
    }
    
    const initiatorId = agentIds[0];
    const initiatorDid = this.agentDidMapping.get(initiatorId);
    if (!initiatorDid) {
      throw new Error('Initiator agent not found');
    }
    
    const initiatorClient = this.a2aClients.get(initiatorDid);
    if (!initiatorClient) {
      throw new Error('A2A client not found for initiator');
    }
    
    // Create session with first participant
    const participantDid = this.agentDidMapping.get(agentIds[1]);
    if (!participantDid) {
      throw new Error('Participant agent not found');
    }
    
    const sessionId = await initiatorClient.createSession(participantDid, {
      ...context,
      participants: agentIds.map(id => this.agentDidMapping.get(id)),
      initiator: initiatorDid
    });
    
    // Notify other participants
    for (let i = 2; i < agentIds.length; i++) {
      const agentDid = this.agentDidMapping.get(agentIds[i]);
      if (agentDid) {
        await initiatorClient.sendMessage({
          to: agentDid,
          type: A2AMessageType.NOTIFICATION,
          body: {
            action: 'join_session',
            sessionId,
            context
          },
          correlationId: sessionId
        });
      }
    }
    
    return sessionId;
  }

  /**
   * Helper: Convert parameters to JSON Schema
   */
  private convertParametersToSchema(parameters: any[]): object {
    const properties: any = {};
    const required: string[] = [];
    
    for (const param of parameters) {
      properties[param.name] = {
        type: param.type || 'string',
        description: param.description
      };
      
      if (param.required) {
        required.push(param.name);
      }
    }
    
    return {
      type: 'object',
      properties,
      required
    };
  }

  /**
   * Helper: Determine agent type
   */
  private determineAgentType(agent: any): AgentProfile['type'] {
    if (agent.name.toLowerCase().includes('coordinator') || 
        agent.name.toLowerCase().includes('orchestrator')) {
      return 'coordinator';
    }
    
    if (agent.name.toLowerCase().includes('gateway')) {
      return 'gateway';
    }
    
    if (agent.name.toLowerCase().includes('service')) {
      return 'service';
    }
    
    return 'specialist';
  }

  /**
   * Get A2A statistics
   */
  getStatistics() {
    const stats: any = {
      totalAgents: this.a2aClients.size,
      agentsByType: {},
      agentsByCategory: {},
      activeConnections: 0
    };
    
    for (const client of this.a2aClients.values()) {
      const clientStats = client.getStatistics();
      stats.activeConnections += clientStats.pendingRequests;
    }
    
    return stats;
  }

  /**
   * Shutdown adapter
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down LOGOS-A2A Adapter...');
    
    // Shutdown all A2A clients
    for (const client of this.a2aClients.values()) {
      await client.shutdown();
    }
    
    this.a2aClients.clear();
    this.agentDidMapping.clear();
    
    logger.info('LOGOS-A2A Adapter shutdown complete');
  }
}

export default LogosA2AAdapter;