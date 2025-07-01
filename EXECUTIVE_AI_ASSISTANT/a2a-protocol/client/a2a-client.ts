/**
 * A2A Client - High-level client for agent-to-agent communication
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  A2AMessage,
  A2AMessageType,
  AgentDID,
  AgentProfile,
  MessagePriority,
  MessageReceipt,
  AgentCapability,
  DiscoveryQuery
} from '../interfaces/a2a-types';
import { A2AMessageRouter } from '../core/a2a-message-router';
import { A2ASecurityService } from '../core/a2a-security';
import { A2ADiscoveryService } from '../core/a2a-discovery';
import { logger } from '../utils/logger';

export interface A2AClientConfig {
  agentDid: AgentDID;
  agentProfile: AgentProfile;
  privateKey?: string;
  routerConfig?: any;
  autoRegister?: boolean;
}

export interface MessageHandler {
  (message: A2AMessage): Promise<A2AMessage | void>;
}

export class A2AClient extends EventEmitter {
  private agentDid: AgentDID;
  private agentProfile: AgentProfile;
  private router: A2AMessageRouter;
  private security: A2ASecurityService;
  private discovery: A2ADiscoveryService;
  private messageHandlers: Map<A2AMessageType, MessageHandler[]>;
  private pendingRequests: Map<string, {
    resolve: (response: A2AMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
  private privateKey?: string;

  constructor(config: A2AClientConfig) {
    super();
    
    this.agentDid = config.agentDid;
    this.agentProfile = config.agentProfile;
    this.privateKey = config.privateKey;
    
    this.router = new A2AMessageRouter(config.routerConfig);
    this.security = new A2ASecurityService();
    this.discovery = new A2ADiscoveryService();
    
    this.messageHandlers = new Map();
    this.pendingRequests = new Map();
    
    this.initialize(config.autoRegister !== false);
  }

  private async initialize(autoRegister: boolean): Promise<void> {
    // Register agent with router
    this.router.registerAgent(this.agentDid, this.handleIncomingMessage.bind(this));
    
    // Auto-register with discovery service
    if (autoRegister) {
      await this.discovery.registerAgent(this.agentProfile);
    }
    
    // Set up router event listeners
    this.router.on('message:routed', (event) => {
      this.emit('message:sent', event);
    });
    
    this.router.on('message:error', (event) => {
      this.emit('message:error', event);
    });
    
    logger.info(`A2A Client initialized for agent: ${this.agentDid}`);
  }

  /**
   * Send a message to another agent
   */
  async sendMessage(options: {
    to: AgentDID | AgentDID[];
    type: A2AMessageType;
    body: any;
    priority?: MessagePriority;
    ttl?: number;
    requiresAck?: boolean;
    headers?: Record<string, any>;
    correlationId?: string;
  }): Promise<MessageReceipt> {
    const message: A2AMessage = {
      '@context': 'https://w3id.org/a2a/v1',
      '@type': options.type,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      from: this.agentDid,
      to: options.to,
      body: options.body,
      priority: options.priority,
      ttl: options.ttl,
      requiresAck: options.requiresAck,
      headers: options.headers,
      correlationId: options.correlationId
    };
    
    // Sign message if private key is available
    if (this.privateKey) {
      const signedMessage = await this.security.signMessage(message, this.privateKey);
      return await this.router.routeMessage(signedMessage);
    }
    
    return await this.router.routeMessage(message);
  }

  /**
   * Send a request and wait for response
   */
  async request(options: {
    to: AgentDID;
    body: any;
    timeout?: number;
    priority?: MessagePriority;
    headers?: Record<string, any>;
  }): Promise<A2AMessage> {
    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      const timeout = options.timeout || 30000;
      
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('Request timeout'));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });
      
      // Send request
      this.sendMessage({
        to: options.to,
        type: A2AMessageType.REQUEST,
        body: options.body,
        priority: options.priority,
        headers: {
          ...options.headers,
          'X-Request-ID': messageId
        }
      }).catch(error => {
        this.pendingRequests.delete(messageId);
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  /**
   * Reply to a message
   */
  async reply(
    originalMessageId: string,
    body: any,
    options: {
      type?: A2AMessageType;
      headers?: Record<string, any>;
    } = {}
  ): Promise<MessageReceipt> {
    return this.sendMessage({
      to: this.agentDid, // Will be overridden by router based on correlation
      type: options.type || A2AMessageType.RESPONSE,
      body,
      correlationId: originalMessageId,
      headers: options.headers
    });
  }

  /**
   * Subscribe to message types
   */
  on(event: A2AMessageType, handler: MessageHandler): this;
  on(event: string, handler: (...args: any[]) => void): this;
  on(event: string | A2AMessageType, handler: any): this {
    if (Object.values(A2AMessageType).includes(event as A2AMessageType)) {
      const handlers = this.messageHandlers.get(event as A2AMessageType) || [];
      handlers.push(handler);
      this.messageHandlers.set(event as A2AMessageType, handlers);
      return this;
    }
    
    return super.on(event, handler);
  }

  /**
   * Discover agents
   */
  async discoverAgents(query: DiscoveryQuery): Promise<AgentProfile[]> {
    return await this.discovery.discoverAgents(query);
  }

  /**
   * Find agents by capability
   */
  async findAgentsByCapability(capabilityId: string): Promise<AgentProfile[]> {
    return await this.discovery.findAgentsByCapability(capabilityId);
  }

  /**
   * Get agent profile
   */
  async getAgent(agentDid: AgentDID): Promise<AgentProfile | null> {
    return await this.discovery.findAgent(agentDid);
  }

  /**
   * Execute capability on remote agent
   */
  async executeCapability(
    agentDid: AgentDID,
    capabilityId: string,
    parameters: any,
    options: {
      timeout?: number;
      priority?: MessagePriority;
    } = {}
  ): Promise<any> {
    const response = await this.request({
      to: agentDid,
      body: {
        action: 'execute_capability',
        capability: capabilityId,
        parameters
      },
      timeout: options.timeout,
      priority: options.priority,
      headers: {
        'X-Capability-ID': capabilityId
      }
    });
    
    if (response.body.error) {
      throw new Error(response.body.error);
    }
    
    return response.body.result;
  }

  /**
   * Broadcast message to multiple agents
   */
  async broadcast(options: {
    category?: string;
    capability?: string;
    type: A2AMessageType;
    body: any;
    priority?: MessagePriority;
  }): Promise<MessageReceipt[]> {
    // Discover target agents
    const query: DiscoveryQuery = {};
    if (options.category) {
      query.categories = [options.category];
    }
    if (options.capability) {
      query.capabilities = [options.capability];
    }
    
    const agents = await this.discoverAgents(query);
    const agentDids = agents.map(a => a.did);
    
    if (agentDids.length === 0) {
      return [];
    }
    
    // Send to all discovered agents
    const receipt = await this.sendMessage({
      to: agentDids,
      type: options.type,
      body: options.body,
      priority: options.priority
    });
    
    return [receipt];
  }

  /**
   * Create a communication session with another agent
   */
  async createSession(
    agentDid: AgentDID,
    context?: Record<string, any>
  ): Promise<string> {
    const sessionId = uuidv4();
    
    await this.sendMessage({
      to: agentDid,
      type: A2AMessageType.REQUEST,
      body: {
        action: 'create_session',
        sessionId,
        context
      },
      correlationId: sessionId,
      headers: {
        'X-Session-Init': 'true'
      }
    });
    
    return sessionId;
  }

  /**
   * Handle incoming messages
   */
  private async handleIncomingMessage(message: A2AMessage): Promise<void> {
    logger.info(`Received message: ${message.id} from ${message.from}`);
    
    // Decrypt if necessary
    let processedMessage = message;
    if (message.encryption && this.privateKey) {
      processedMessage = await this.security.decryptMessage(message, this.privateKey);
    }
    
    // Check if this is a response to a pending request
    const requestId = processedMessage.headers?.['X-Request-ID'];
    if (requestId && this.pendingRequests.has(requestId)) {
      const pending = this.pendingRequests.get(requestId)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      pending.resolve(processedMessage);
      return;
    }
    
    // Handle based on message type
    const handlers = this.messageHandlers.get(processedMessage['@type']) || [];
    
    for (const handler of handlers) {
      try {
        const response = await handler(processedMessage);
        
        // If handler returns a response, send it
        if (response && processedMessage.correlationId) {
          await this.reply(processedMessage.id, response.body, {
            type: response['@type'],
            headers: response.headers
          });
        }
      } catch (error) {
        logger.error('Message handler error:', error);
        
        // Send error response if appropriate
        if (processedMessage['@type'] === A2AMessageType.REQUEST) {
          await this.reply(processedMessage.id, {
            error: error instanceof Error ? error.message : 'Handler error',
            code: 'HANDLER_ERROR'
          }, {
            type: A2AMessageType.ERROR
          });
        }
      }
    }
    
    // Emit generic message event
    this.emit('message', processedMessage);
  }

  /**
   * Update agent status
   */
  async updateStatus(status: AgentProfile['metadata']['status']): Promise<void> {
    await this.discovery.updateAgentStatus(this.agentDid, status);
    this.agentProfile.metadata.status = status;
  }

  /**
   * Get client statistics
   */
  getStatistics() {
    return {
      agentDid: this.agentDid,
      pendingRequests: this.pendingRequests.size,
      registeredHandlers: Array.from(this.messageHandlers.entries())
        .map(([type, handlers]) => ({ type, count: handlers.length })),
      routerStats: this.router.getStatistics(),
      discoveryStats: this.discovery.getStatistics()
    };
  }

  /**
   * Shutdown client
   */
  async shutdown(): Promise<void> {
    // Clear pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client shutdown'));
    }
    this.pendingRequests.clear();
    
    // Update agent status
    await this.updateStatus('inactive');
    
    // Unregister from router
    this.router.unregisterAgent(this.agentDid);
    
    // Unregister from discovery
    await this.discovery.unregisterAgent(this.agentDid);
    
    logger.info(`A2A Client shutdown: ${this.agentDid}`);
  }
}

export default A2AClient;