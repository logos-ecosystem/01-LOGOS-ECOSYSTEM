/**
 * Google A2A Protocol Type Definitions
 * Based on Google's Agent-to-Agent Communication Specification
 */

// Agent Identifier using Decentralized Identifiers (DIDs)
export type AgentDID = `did:logos:${string}`;

// Message Types according to A2A specification
export enum A2AMessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  QUERY = 'query',
  COMMAND = 'command',
  EVENT = 'event',
  STREAM_START = 'stream_start',
  STREAM_DATA = 'stream_data',
  STREAM_END = 'stream_end',
  ERROR = 'error'
}

// Message Priority Levels
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

// Base A2A Message Structure
export interface A2AMessage {
  // Message metadata
  '@context': string | string[];
  '@type': A2AMessageType;
  id: string;
  timestamp: string;
  version: '1.0';
  
  // Routing information
  from: AgentDID;
  to: AgentDID | AgentDID[];
  replyTo?: AgentDID;
  correlationId?: string;
  
  // Message properties
  priority?: MessagePriority;
  ttl?: number; // Time to live in seconds
  requiresAck?: boolean;
  
  // Security
  signature?: JWSSignature;
  encryption?: JWEEncryption;
  
  // Content
  headers?: Record<string, any>;
  body: any;
  attachments?: Attachment[];
}

// Digital Signature (JWS)
export interface JWSSignature {
  protected: string;
  signature: string;
  header?: Record<string, any>;
}

// Encryption (JWE)
export interface JWEEncryption {
  protected: string;
  encrypted_key: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

// Message Attachment
export interface Attachment {
  id: string;
  mimeType: string;
  filename?: string;
  size: number;
  data?: string; // Base64 encoded
  url?: string; // External reference
  hash?: string; // SHA-256 hash
}

// Agent Profile for Discovery
export interface AgentProfile {
  did: AgentDID;
  name: string;
  type: 'specialist' | 'coordinator' | 'service' | 'gateway';
  category: string;
  capabilities: AgentCapability[];
  endpoints: AgentEndpoint[];
  publicKey: PublicKeyInfo;
  metadata: {
    version: string;
    created: string;
    updated: string;
    status: 'active' | 'inactive' | 'maintenance';
    performance?: PerformanceMetrics;
  };
}

// Agent Capability Definition
export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  inputSchema?: object; // JSON Schema
  outputSchema?: object; // JSON Schema
  constraints?: {
    maxRequestsPerMinute?: number;
    timeout?: number;
    requiredPermissions?: string[];
  };
}

// Agent Communication Endpoint
export interface AgentEndpoint {
  type: 'http' | 'websocket' | 'grpc' | 'mqtt';
  url: string;
  priority: number;
  capabilities?: string[];
}

// Public Key Information
export interface PublicKeyInfo {
  id: string;
  type: 'RSA' | 'Ed25519' | 'secp256k1';
  publicKeyPem?: string;
  publicKeyJwk?: object;
  purposes: ('authentication' | 'keyAgreement' | 'assertionMethod')[];
}

// Performance Metrics
export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  uptime: number;
  lastUpdated: string;
}

// Message Routing Rules
export interface RoutingRule {
  id: string;
  name: string;
  condition: RoutingCondition;
  action: RoutingAction;
  priority: number;
  enabled: boolean;
}

export interface RoutingCondition {
  messageType?: A2AMessageType[];
  from?: AgentDID[];
  to?: AgentDID[];
  bodyMatches?: object; // JSONPath expressions
  headers?: Record<string, any>;
}

export interface RoutingAction {
  type: 'forward' | 'transform' | 'aggregate' | 'filter' | 'log';
  target?: AgentDID | AgentDID[];
  transform?: TransformRule;
  aggregate?: AggregateRule;
}

export interface TransformRule {
  template: object;
  mapping: Record<string, string>; // JSONPath mappings
}

export interface AggregateRule {
  window: number; // seconds
  groupBy?: string[];
  operation: 'collect' | 'merge' | 'reduce';
}

// Communication Session
export interface A2ASession {
  id: string;
  participants: AgentDID[];
  created: string;
  lastActivity: string;
  state: 'active' | 'paused' | 'completed' | 'failed';
  context: Record<string, any>;
  messageCount: number;
}

// Error Response
export interface A2AError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  traceId?: string;
}

// Discovery Query
export interface DiscoveryQuery {
  capabilities?: string[];
  categories?: string[];
  agentTypes?: AgentProfile['type'][];
  status?: AgentProfile['metadata']['status'][];
  limit?: number;
  offset?: number;
}

// Trust Certificate
export interface TrustCertificate {
  id: string;
  issuer: AgentDID;
  subject: AgentDID;
  validFrom: string;
  validTo: string;
  trustLevel: 'basic' | 'verified' | 'certified';
  claims: Record<string, any>;
  signature: JWSSignature;
}

// Message Receipt
export interface MessageReceipt {
  messageId: string;
  receivedAt: string;
  status: 'received' | 'processing' | 'completed' | 'failed';
  error?: A2AError;
}

// Subscription for Pub/Sub
export interface Subscription {
  id: string;
  subscriber: AgentDID;
  topic: string;
  filter?: object;
  created: string;
  expires?: string;
}