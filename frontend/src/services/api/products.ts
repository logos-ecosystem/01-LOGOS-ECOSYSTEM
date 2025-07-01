import api from '../api';
import {
  LogosEcosystemProduct,
  ProductConfiguration,
  ProductTemplate,
  Integration,
  Webhook,
  CustomCommand,
  ProductType,
  ProductStatus
} from '@/types/product';

export const productsAPI = {
  // Products Management
  getProducts: async (params?: {
    type?: ProductType;
    status?: ProductStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ products: LogosEcosystemProduct[]; total: number }> => {
    const { data } = await api.get('/products', { params });
    return data;
  },

  getProductDetails: async (productId: string): Promise<LogosEcosystemProduct> => {
    const { data } = await api.get(`/products/${productId}`);
    return data;
  },

  createProduct: async (product: {
    name: string;
    type: ProductType;
    description: string;
    templateId?: string;
    configuration?: Partial<ProductConfiguration>;
  }): Promise<LogosEcosystemProduct> => {
    const { data } = await api.post('/products', product);
    return data;
  },

  updateProduct: async (
    productId: string,
    updates: Partial<LogosEcosystemProduct>
  ): Promise<LogosEcosystemProduct> => {
    const { data } = await api.put(`/products/${productId}`, updates);
    return data;
  },

  deleteProduct: async (productId: string): Promise<void> => {
    await api.delete(`/products/${productId}`);
  },

  duplicateProduct: async (productId: string, newName: string): Promise<LogosEcosystemProduct> => {
    const { data } = await api.post(`/products/${productId}/duplicate`, { name: newName });
    return data;
  },

  // Configuration
  updateConfiguration: async (
    productId: string,
    configuration: Partial<ProductConfiguration>
  ): Promise<LogosEcosystemProduct> => {
    const { data } = await api.put(`/products/${productId}/configuration`, configuration);
    return data;
  },

  testConfiguration: async (
    productId: string,
    testInput: string
  ): Promise<{ success: boolean; response: string; metrics: any }> => {
    const { data } = await api.post(`/products/${productId}/test`, { input: testInput });
    return data;
  },

  // Deployment
  deployProduct: async (
    productId: string,
    environment: 'development' | 'staging' | 'production'
  ): Promise<LogosEcosystemProduct> => {
    const { data } = await api.post(`/products/${productId}/deploy`, { environment });
    return data;
  },

  rollbackDeployment: async (productId: string, version: string): Promise<LogosEcosystemProduct> => {
    const { data } = await api.post(`/products/${productId}/rollback`, { version });
    return data;
  },

  getDeploymentHistory: async (productId: string): Promise<any[]> => {
    const { data } = await api.get(`/products/${productId}/deployments`);
    return data;
  },

  // API Keys
  regenerateApiKey: async (productId: string): Promise<{ apiKey: string }> => {
    const { data } = await api.post(`/products/${productId}/api-key/regenerate`);
    return data;
  },

  // Integrations
  addIntegration: async (productId: string, integration: Omit<Integration, 'id'>): Promise<Integration> => {
    const { data } = await api.post(`/products/${productId}/integrations`, integration);
    return data;
  },

  updateIntegration: async (
    productId: string,
    integrationId: string,
    updates: Partial<Integration>
  ): Promise<Integration> => {
    const { data } = await api.put(`/products/${productId}/integrations/${integrationId}`, updates);
    return data;
  },

  removeIntegration: async (productId: string, integrationId: string): Promise<void> => {
    await api.delete(`/products/${productId}/integrations/${integrationId}`);
  },

  testIntegration: async (
    productId: string,
    integrationId: string
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/products/${productId}/integrations/${integrationId}/test`);
    return data;
  },

  // Webhooks
  addWebhook: async (productId: string, webhook: Omit<Webhook, 'id'>): Promise<Webhook> => {
    const { data } = await api.post(`/products/${productId}/webhooks`, webhook);
    return data;
  },

  updateWebhook: async (
    productId: string,
    webhookId: string,
    updates: Partial<Webhook>
  ): Promise<Webhook> => {
    const { data } = await api.put(`/products/${productId}/webhooks/${webhookId}`, updates);
    return data;
  },

  removeWebhook: async (productId: string, webhookId: string): Promise<void> => {
    await api.delete(`/products/${productId}/webhooks/${webhookId}`);
  },

  testWebhook: async (productId: string, webhookId: string): Promise<{ success: boolean }> => {
    const { data } = await api.post(`/products/${productId}/webhooks/${webhookId}/test`);
    return data;
  },

  // Custom Commands
  addCustomCommand: async (productId: string, command: Omit<CustomCommand, 'id'>): Promise<CustomCommand> => {
    const { data } = await api.post(`/products/${productId}/commands`, command);
    return data;
  },

  updateCustomCommand: async (
    productId: string,
    commandId: string,
    updates: Partial<CustomCommand>
  ): Promise<CustomCommand> => {
    const { data } = await api.put(`/products/${productId}/commands/${commandId}`, updates);
    return data;
  },

  removeCustomCommand: async (productId: string, commandId: string): Promise<void> => {
    await api.delete(`/products/${productId}/commands/${commandId}`);
  },

  // Metrics & Analytics
  getProductMetrics: async (
    productId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<any> => {
    const { data } = await api.get(`/products/${productId}/metrics`, {
      params: {
        startDate: timeRange.start.toISOString(),
        endDate: timeRange.end.toISOString()
      }
    });
    return data;
  },

  getProductLogs: async (
    productId: string,
    params?: {
      level?: 'info' | 'warning' | 'error';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: any[]; total: number }> => {
    const { data } = await api.get(`/products/${productId}/logs`, { params });
    return data;
  },

  // Templates
  getTemplates: async (category?: string): Promise<ProductTemplate[]> => {
    const { data } = await api.get('/products/templates', {
      params: { category }
    });
    return data;
  },

  getTemplateDetails: async (templateId: string): Promise<ProductTemplate> => {
    const { data } = await api.get(`/products/templates/${templateId}`);
    return data;
  },

  // Import/Export
  exportConfiguration: async (productId: string): Promise<Blob> => {
    const { data } = await api.get(`/products/${productId}/export`, {
      responseType: 'blob'
    });
    return data;
  },

  importConfiguration: async (productId: string, file: File): Promise<LogosEcosystemProduct> => {
    const formData = new FormData();
    formData.append('configuration', file);
    
    const { data } = await api.post(`/products/${productId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }
};