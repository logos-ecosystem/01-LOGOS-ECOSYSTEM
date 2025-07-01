/**
 * LOGOS Ecosystem JavaScript SDK
 * 
 * Official SDK for integrating with LOGOS Ecosystem API
 * 
 * @version 1.0.0
 * @license MIT
 */

class LogosEcosystemSDK {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.LOGOS_API_KEY;
    this.baseUrl = config.baseUrl || 'https://api.logos-ecosystem.com';
    this.timeout = config.timeout || 30000;
    this.version = 'v1';
    this.debug = config.debug || false;
    
    // Service instances
    this.auth = new AuthService(this);
    this.products = new ProductsService(this);
    this.subscriptions = new SubscriptionsService(this);
    this.invoices = new InvoicesService(this);
    this.support = new SupportService(this);
    this.analytics = new AnalyticsService(this);
    this.webhooks = new WebhooksService(this);
    this.ai = new AIService(this);
  }

  /**
   * Make an authenticated API request
   */
  async request(method, path, data = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-SDK-Version': '1.0.0',
      'User-Agent': 'LOGOS-Ecosystem-SDK/1.0.0',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      method,
      headers,
      timeout: this.timeout,
      ...options
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    try {
      if (this.debug) {
        console.log(`[LOGOS SDK] ${method} ${url}`, data);
      }

      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        throw new LogosError(result.error || 'Request failed', response.status, result);
      }

      return result;
    } catch (error) {
      if (error instanceof LogosError) {
        throw error;
      }
      throw new LogosError(error.message, 0, error);
    }
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * WebSocket connection for real-time updates
   */
  connectWebSocket(options = {}) {
    const wsUrl = this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    
    return new LogosWebSocket(wsUrl, {
      token: this.token,
      ...options
    });
  }
}

/**
 * Custom error class
 */
class LogosError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'LogosError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Auth Service
 */
class AuthService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async login(email, password) {
    const result = await this.sdk.request('POST', '/api/auth/login', { email, password });
    if (result.data && result.data.token) {
      this.sdk.setToken(result.data.token);
    }
    return result;
  }

  async register(userData) {
    return this.sdk.request('POST', '/api/auth/register', userData);
  }

  async logout() {
    const result = await this.sdk.request('POST', '/api/auth/logout');
    this.sdk.setToken(null);
    return result;
  }

  async refreshToken(refreshToken) {
    return this.sdk.request('POST', '/api/auth/refresh', { refreshToken });
  }

  async forgotPassword(email) {
    return this.sdk.request('POST', '/api/auth/forgot-password', { email });
  }

  async resetPassword(token, newPassword) {
    return this.sdk.request('POST', '/api/auth/reset-password', { token, newPassword });
  }

  async verifyEmail(token) {
    return this.sdk.request('POST', '/api/auth/verify-email', { token });
  }

  async enable2FA() {
    return this.sdk.request('POST', '/api/auth/2fa/enable');
  }

  async verify2FA(code) {
    return this.sdk.request('POST', '/api/auth/2fa/verify', { code });
  }
}

/**
 * Products Service
 */
class ProductsService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/products${queryString ? '?' + queryString : ''}`);
  }

  async get(productId) {
    return this.sdk.request('GET', `/api/products/${productId}`);
  }

  async create(productData) {
    return this.sdk.request('POST', '/api/products', productData);
  }

  async update(productId, updates) {
    return this.sdk.request('PUT', `/api/products/${productId}`, updates);
  }

  async delete(productId) {
    return this.sdk.request('DELETE', `/api/products/${productId}`);
  }

  async configure(productId, configuration) {
    return this.sdk.request('POST', `/api/products/${productId}/configure`, configuration);
  }

  async getUsage(productId, period = 'month') {
    return this.sdk.request('GET', `/api/products/${productId}/usage?period=${period}`);
  }
}

/**
 * Subscriptions Service
 */
class SubscriptionsService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/subscriptions${queryString ? '?' + queryString : ''}`);
  }

  async get(subscriptionId) {
    return this.sdk.request('GET', `/api/subscriptions/${subscriptionId}`);
  }

  async create(subscriptionData) {
    return this.sdk.request('POST', '/api/subscriptions', subscriptionData);
  }

  async update(subscriptionId, updates) {
    return this.sdk.request('PUT', `/api/subscriptions/${subscriptionId}`, updates);
  }

  async cancel(subscriptionId, immediately = false) {
    return this.sdk.request('POST', `/api/subscriptions/${subscriptionId}/cancel`, { immediately });
  }

  async reactivate(subscriptionId) {
    return this.sdk.request('POST', `/api/subscriptions/${subscriptionId}/reactivate`);
  }

  async changePlan(subscriptionId, newPlanId) {
    return this.sdk.request('POST', `/api/subscriptions/${subscriptionId}/change-plan`, { planId: newPlanId });
  }
}

/**
 * Invoices Service
 */
class InvoicesService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/invoices${queryString ? '?' + queryString : ''}`);
  }

  async get(invoiceId) {
    return this.sdk.request('GET', `/api/invoices/${invoiceId}`);
  }

  async download(invoiceId, format = 'pdf') {
    return this.sdk.request('GET', `/api/invoices/${invoiceId}/download?format=${format}`);
  }

  async pay(invoiceId, paymentMethodId) {
    return this.sdk.request('POST', `/api/invoices/${invoiceId}/pay`, { paymentMethodId });
  }

  async sendReminder(invoiceId) {
    return this.sdk.request('POST', `/api/invoices/${invoiceId}/send-reminder`);
  }
}

/**
 * Support Service
 */
class SupportService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async createTicket(ticketData) {
    return this.sdk.request('POST', '/api/support/tickets', ticketData);
  }

  async listTickets(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/support/tickets${queryString ? '?' + queryString : ''}`);
  }

  async getTicket(ticketId) {
    return this.sdk.request('GET', `/api/support/tickets/${ticketId}`);
  }

  async updateTicket(ticketId, updates) {
    return this.sdk.request('PUT', `/api/support/tickets/${ticketId}`, updates);
  }

  async addComment(ticketId, comment) {
    return this.sdk.request('POST', `/api/support/tickets/${ticketId}/comments`, { comment });
  }

  async closeTicket(ticketId) {
    return this.sdk.request('POST', `/api/support/tickets/${ticketId}/close`);
  }

  async getCategories() {
    return this.sdk.request('GET', '/api/support/categories');
  }
}

/**
 * Analytics Service
 */
class AnalyticsService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async getDashboard(period = '30d') {
    return this.sdk.request('GET', `/api/analytics/dashboard?period=${period}`);
  }

  async getMetrics(metric, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/analytics/metrics/${metric}${queryString ? '?' + queryString : ''}`);
  }

  async getReports(reportType, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/analytics/reports/${reportType}${queryString ? '?' + queryString : ''}`);
  }

  async exportData(dataType, format = 'csv', params = {}) {
    const queryString = new URLSearchParams({ format, ...params }).toString();
    return this.sdk.request('GET', `/api/analytics/export/${dataType}?${queryString}`);
  }
}

/**
 * Webhooks Service
 */
class WebhooksService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list() {
    return this.sdk.request('GET', '/api/webhooks');
  }

  async create(webhookData) {
    return this.sdk.request('POST', '/api/webhooks', webhookData);
  }

  async update(webhookId, updates) {
    return this.sdk.request('PUT', `/api/webhooks/${webhookId}`, updates);
  }

  async delete(webhookId) {
    return this.sdk.request('DELETE', `/api/webhooks/${webhookId}`);
  }

  async test(webhookId) {
    return this.sdk.request('POST', `/api/webhooks/${webhookId}/test`);
  }

  async getEvents() {
    return this.sdk.request('GET', '/api/webhooks/events');
  }

  async getLogs(webhookId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/webhooks/${webhookId}/logs${queryString ? '?' + queryString : ''}`);
  }
}

/**
 * AI Service
 */
class AIService {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async createBot(botConfig) {
    return this.sdk.request('POST', '/api/ai/bots', botConfig);
  }

  async listBots(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.sdk.request('GET', `/api/ai/bots${queryString ? '?' + queryString : ''}`);
  }

  async getBot(botId) {
    return this.sdk.request('GET', `/api/ai/bots/${botId}`);
  }

  async updateBot(botId, updates) {
    return this.sdk.request('PUT', `/api/ai/bots/${botId}`, updates);
  }

  async deleteBot(botId) {
    return this.sdk.request('DELETE', `/api/ai/bots/${botId}`);
  }

  async chat(botId, message, context = {}) {
    return this.sdk.request('POST', `/api/ai/bots/${botId}/chat`, { message, context });
  }

  async train(botId, trainingData) {
    return this.sdk.request('POST', `/api/ai/bots/${botId}/train`, trainingData);
  }

  async getModels() {
    return this.sdk.request('GET', '/api/ai/models');
  }
}

/**
 * WebSocket client for real-time updates
 */
class LogosWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('[LOGOS WS] Connected');
      this.reconnectAttempts = 0;
      
      // Authenticate
      if (this.options.token) {
        this.send('auth', { token: this.options.token });
      }
      
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.event, data.data);
      } catch (error) {
        console.error('[LOGOS WS] Parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[LOGOS WS] Error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('[LOGOS WS] Disconnected');
      this.emit('disconnected');
      this.attemptReconnect();
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[LOGOS WS] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(event, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogosEcosystemSDK;
} else if (typeof window !== 'undefined') {
  window.LogosEcosystemSDK = LogosEcosystemSDK;
}