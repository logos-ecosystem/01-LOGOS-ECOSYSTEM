export interface LogosEcosystemProduct {
  id: string;
  userId: string;
  name: string;
  type: ProductType;
  description: string;
  status: ProductStatus;
  configuration: ProductConfiguration;
  deployment: ProductDeployment;
  metrics: ProductMetrics;
  subscription: {
    planId: string;
    features: string[];
    limits: ProductLimits;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type ProductType = 
  | 'expert-bot'
  | 'ai-assistant'
  | 'automation-agent'
  | 'analytics-bot'
  | 'custom-solution';

export type ProductStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending'
  | 'error'
  | 'maintenance';

export interface ProductConfiguration {
  general: {
    displayName: string;
    avatar?: string;
    description: string;
    language: string;
    timezone: string;
  };
  behavior: {
    personality: string;
    responseStyle: 'formal' | 'casual' | 'technical' | 'friendly';
    creativity: number; // 0-100
    contextWindow: number;
    maxTokens: number;
  };
  capabilities: {
    enabledFeatures: string[];
    integrations: Integration[];
    webhooks: Webhook[];
    customCommands: CustomCommand[];
  };
  security: {
    allowedDomains: string[];
    blockedKeywords: string[];
    dataRetention: number; // days
    encryptionEnabled: boolean;
    auditLogging: boolean;
  };
}

export interface ProductDeployment {
  environment: 'development' | 'staging' | 'production';
  endpoint: string;
  apiKey: string;
  region: string;
  version: string;
  lastDeployed: Date;
  health: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number; // percentage
    lastCheck: Date;
  };
}

export interface ProductMetrics {
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    tokenUsage: number;
  };
  performance: {
    cpu: number;
    memory: number;
    latency: number;
    throughput: number;
  };
  costs: {
    currentMonth: number;
    lastMonth: number;
    projected: number;
    breakdown: {
      compute: number;
      storage: number;
      bandwidth: number;
      api: number;
    };
  };
}

export interface ProductLimits {
  maxRequestsPerMonth: number;
  maxTokensPerRequest: number;
  maxConcurrentRequests: number;
  maxStorageGB: number;
  maxIntegrations: number;
  maxWebhooks: number;
}

export interface Integration {
  id: string;
  type: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  lastSync?: Date;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  lastTriggered?: Date;
  failureCount: number;
}

export interface CustomCommand {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  parameters: CommandParameter[];
  enabled: boolean;
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  validation?: string;
}

export interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  configuration: Partial<ProductConfiguration>;
  popularity: number;
  tags: string[];
}