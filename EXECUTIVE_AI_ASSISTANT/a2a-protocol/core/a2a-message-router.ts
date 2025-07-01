/**
 * A2A Message Router - Core routing engine for agent-to-agent communication
 * Implements Google A2A Protocol specification
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  A2AMessage,
  A2AMessageType,
  AgentDID,
  AgentProfile,
  RoutingRule,
  MessageReceipt,
  A2AError,
  MessagePriority,
  A2ASession
} from '../interfaces/a2a-types';
import { A2ASecurityService } from './a2a-security';
import { A2ADiscoveryService } from './a2a-discovery';
import { A2AMessageValidator } from './a2a-validator';
import { logger } from '../utils/logger';

export interface RouterConfig {
  maxRetries: number;
  retryDelay: number;
  messageTimeout: number;
  maxQueueSize: number;
  enableEncryption: boolean;
  enableCompression: boolean;
}

export class A2AMessageRouter extends EventEmitter {
  private config: RouterConfig;
  private messageQueue: Map<string, A2AMessage>;
  private sessions: Map<string, A2ASession>;
  private routingRules: Map<string, RoutingRule>;
  private security: A2ASecurityService;
  private discovery: A2ADiscoveryService;
  private validator: A2AMessageValidator;
  private messageHandlers: Map<AgentDID, (message: A2AMessage) => Promise<void>>;

  constructor(config: Partial<RouterConfig> = {}) {
    super();
    
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      messageTimeout: 30000,
      maxQueueSize: 10000,
      enableEncryption: true,
      enableCompression: true,
      ...config
    };

    this.messageQueue = new Map();
    this.sessions = new Map();
    this.routingRules = new Map();
    this.messageHandlers = new Map();
    
    this.security = new A2ASecurityService();
    this.discovery = new A2ADiscoveryService();
    this.validator = new A2AMessageValidator();
    
    this.initializeRouter();
  }

  private initializeRouter(): void {
    // Set up periodic cleanup
    setInterval(() => this.cleanupExpiredMessages(), 60000);
    
    // Initialize default routing rules
    this.setupDefaultRoutingRules();
    
    logger.info('A2A Message Router initialized');
  }

  /**
   * Route a message to its destination(s)
   */
  async routeMessage(message: A2AMessage): Promise<MessageReceipt> {
    const startTime = Date.now();
    const receipt: MessageReceipt = {
      messageId: message.id,
      receivedAt: new Date().toISOString(),
      status: 'received'
    };

    try {
      // Validate message structure
      await this.validator.validateMessage(message);
      
      // Verify signature if present
      if (message.signature) {
        const isValid = await this.security.verifySignature(message);
        if (!isValid) {
          throw new Error('Invalid message signature');
        }
      }
      
      // Add to queue
      if (this.messageQueue.size >= this.config.maxQueueSize) {
        throw new Error('Message queue is full');
      }
      this.messageQueue.set(message.id, message);
      
      // Update session if exists
      if (message.correlationId) {
        this.updateSession(message);
      }
      
      // Apply routing rules
      const processedMessage = await this.applyRoutingRules(message);
      
      // Route to destination(s)
      if (Array.isArray(processedMessage.to)) {
        await Promise.all(
          processedMessage.to.map(agent => this.deliverToAgent(processedMessage, agent))
        );
      } else {
        await this.deliverToAgent(processedMessage, processedMessage.to);
      }
      
      receipt.status = 'completed';
      
      // Emit metrics
      this.emit('message:routed', {
        messageId: message.id,
        from: message.from,
        to: message.to,
        type: message['@type'],
        duration: Date.now() - startTime
      });
      
    } catch (error: any) {
      receipt.status = 'failed';
      receipt.error = {
        code: 'ROUTING_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      logger.error('Message routing failed:', error);
      this.emit('message:error', { message, error });
    } finally {
      // Clean up from queue
      this.messageQueue.delete(message.id);
    }
    
    return receipt;
  }

  /**
   * Deliver message to specific agent
   */
  private async deliverToAgent(message: A2AMessage, agentDid: AgentDID): Promise<void> {
    // Check if agent is registered locally
    const handler = this.messageHandlers.get(agentDid);
    if (handler) {
      // Local delivery
      await handler(message);
      return;
    }
    
    // Discover agent endpoint
    const agent = await this.discovery.findAgent(agentDid);
    if (!agent) {
      throw new Error(`Agent not found: ${agentDid}`);
    }
    
    // Encrypt message if required
    let finalMessage = message;
    if (this.config.enableEncryption && agent.publicKey) {
      finalMessage = await this.security.encryptMessage(message, agent.publicKey);
    }
    
    // Send via appropriate transport
    await this.sendViaTransport(finalMessage, agent);
  }

  /**
   * Send message via agent's preferred transport
   */
  private async sendViaTransport(message: A2AMessage, agent: AgentProfile): Promise<void> {
    // Sort endpoints by priority
    const endpoints = [...agent.endpoints].sort((a, b) => b.priority - a.priority);
    
    for (const endpoint of endpoints) {
      try {
        switch (endpoint.type) {
          case 'http':
            await this.sendViaHTTP(message, endpoint.url);
            return;
            
          case 'websocket':
            await this.sendViaWebSocket(message, endpoint.url);
            return;
            
          case 'grpc':
            await this.sendViaGRPC(message, endpoint.url);
            return;
            
          case 'mqtt':
            await this.sendViaMQTT(message, endpoint.url);
            return;
            
          default:
            logger.warn(`Unsupported transport type: ${endpoint.type}`);
        }
      } catch (error) {
        logger.error(`Failed to send via ${endpoint.type}:`, error);
        // Try next endpoint
      }
    }
    
    throw new Error('All transport endpoints failed');
  }

  /**
   * HTTP transport implementation
   */
  private async sendViaHTTP(message: A2AMessage, url: string): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-A2A-Version': '1.0',
        'X-Message-Id': message.id
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP transport failed: ${response.status}`);
    }
  }

  /**
   * WebSocket transport implementation
   */
  private async sendViaWebSocket(message: A2AMessage, url: string): Promise<void> {
    // Implementation would use actual WebSocket client
    // This is a placeholder
    logger.info(`WebSocket delivery to ${url}`, { messageId: message.id });
  }

  /**
   * gRPC transport implementation
   */
  private async sendViaGRPC(message: A2AMessage, url: string): Promise<void> {
    // Implementation would use actual gRPC client
    // This is a placeholder
    logger.info(`gRPC delivery to ${url}`, { messageId: message.id });
  }

  /**
   * MQTT transport implementation
   */
  private async sendViaMQTT(message: A2AMessage, url: string): Promise<void> {
    // Implementation would use actual MQTT client
    // This is a placeholder
    logger.info(`MQTT delivery to ${url}`, { messageId: message.id });
  }

  /**
   * Apply routing rules to message
   */
  private async applyRoutingRules(message: A2AMessage): Promise<A2AMessage> {
    let processedMessage = { ...message };
    
    // Get applicable rules sorted by priority
    const applicableRules = Array.from(this.routingRules.values())
      .filter(rule => rule.enabled && this.matchesCondition(message, rule.condition))
      .sort((a, b) => b.priority - a.priority);
    
    for (const rule of applicableRules) {
      processedMessage = await this.executeRoutingAction(processedMessage, rule.action);
    }
    
    return processedMessage;
  }

  /**
   * Check if message matches routing condition
   */
  private matchesCondition(message: A2AMessage, condition: any): boolean {
    if (condition.messageType && !condition.messageType.includes(message['@type'])) {
      return false;
    }
    
    if (condition.from && !condition.from.includes(message.from)) {
      return false;
    }
    
    if (condition.to) {
      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      if (!recipients.some(r => condition.to.includes(r))) {
        return false;
      }
    }
    
    // Additional condition checks...
    
    return true;
  }

  /**
   * Execute routing action
   */
  private async executeRoutingAction(message: A2AMessage, action: any): Promise<A2AMessage> {
    switch (action.type) {
      case 'forward':
        return { ...message, to: action.target };
        
      case 'transform':
        return this.transformMessage(message, action.transform);
        
      case 'aggregate':
        // Aggregation logic would go here
        return message;
        
      case 'filter':
        // Filtering logic would go here
        return message;
        
      case 'log':
        logger.info('Routing action log:', { message, action });
        return message;
        
      default:
        return message;
    }
  }

  /**
   * Transform message based on rules
   */
  private transformMessage(message: A2AMessage, transform: any): A2AMessage {
    // Implementation would apply JSONPath transformations
    // This is a simplified version
    return {
      ...message,
      body: {
        ...message.body,
        transformed: true,
        transformedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Register local agent handler
   */
  registerAgent(agentDid: AgentDID, handler: (message: A2AMessage) => Promise<void>): void {
    this.messageHandlers.set(agentDid, handler);
    logger.info(`Registered local agent: ${agentDid}`);
  }

  /**
   * Unregister local agent
   */
  unregisterAgent(agentDid: AgentDID): void {
    this.messageHandlers.delete(agentDid);
    logger.info(`Unregistered local agent: ${agentDid}`);
  }

  /**
   * Add routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.set(rule.id, rule);
    logger.info(`Added routing rule: ${rule.name}`);
  }

  /**
   * Remove routing rule
   */
  removeRoutingRule(ruleId: string): void {
    this.routingRules.delete(ruleId);
    logger.info(`Removed routing rule: ${ruleId}`);
  }

  /**
   * Create or update session
   */
  private updateSession(message: A2AMessage): void {
    const sessionId = message.correlationId!;
    const session = this.sessions.get(sessionId) || {
      id: sessionId,
      participants: [],
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      state: 'active',
      context: {},
      messageCount: 0
    };
    
    // Update participants
    if (!session.participants.includes(message.from)) {
      session.participants.push(message.from);
    }
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    recipients.forEach(r => {
      if (!session.participants.includes(r)) {
        session.participants.push(r);
      }
    });
    
    session.lastActivity = new Date().toISOString();
    session.messageCount++;
    
    this.sessions.set(sessionId, session);
  }

  /**
   * Setup default routing rules
   */
  private setupDefaultRoutingRules(): void {
    // High priority error routing
    this.addRoutingRule({
      id: 'error-routing',
      name: 'Error Message Routing',
      condition: {
        messageType: [A2AMessageType.ERROR]
      },
      action: {
        type: 'log'
      },
      priority: 100,
      enabled: true
    });
    
    // Critical message expediting
    this.addRoutingRule({
      id: 'critical-expedite',
      name: 'Critical Message Expediting',
      condition: {
        headers: { priority: MessagePriority.CRITICAL }
      },
      action: {
        type: 'forward'
      },
      priority: 90,
      enabled: true
    });
  }

  /**
   * Clean up expired messages and sessions
   */
  private cleanupExpiredMessages(): void {
    const now = Date.now();
    
    // Clean up old messages
    for (const [id, message] of this.messageQueue.entries()) {
      const messageTime = new Date(message.timestamp).getTime();
      if (now - messageTime > this.config.messageTimeout) {
        this.messageQueue.delete(id);
      }
    }
    
    // Clean up inactive sessions
    for (const [id, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.lastActivity).getTime();
      if (now - lastActivity > 3600000 && session.state !== 'active') { // 1 hour
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Get router statistics
   */
  getStatistics() {
    return {
      queueSize: this.messageQueue.size,
      activeSessions: this.sessions.size,
      registeredAgents: this.messageHandlers.size,
      routingRules: this.routingRules.size,
      uptime: process.uptime()
    };
  }
}

export default A2AMessageRouter;