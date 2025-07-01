// Cloudflare API Service
interface CloudflareConfig {
  apiToken: string;
  accountId?: string;
  zoneId?: string;
}

interface DNSRecord {
  id?: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV' | 'CAA';
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  comment?: string;
  tags?: string[];
}

interface Zone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  original_registrar: string;
  original_dnshost: string;
  created_on: string;
  modified_on: string;
}

interface SecuritySettings {
  waf: boolean;
  ddos_protection: boolean;
  rate_limiting: boolean;
  bot_management: boolean;
  ssl_mode: 'off' | 'flexible' | 'full' | 'strict';
  min_tls_version: string;
  automatic_https_rewrites: boolean;
}

interface AnalyticsData {
  requests: {
    all: number;
    cached: number;
    uncached: number;
  };
  bandwidth: {
    all: number;
    cached: number;
    uncached: number;
  };
  threats: {
    all: number;
    blocked: number;
  };
  pageviews: {
    all: number;
    search_engines: number;
  };
}

interface PageRule {
  id?: string;
  targets: Array<{
    target: string;
    constraint: {
      operator: string;
      value: string;
    };
  }>;
  actions: Array<{
    id: string;
    value: any;
  }>;
  priority: number;
  status: 'active' | 'disabled';
}

interface WorkerScript {
  id: string;
  script: string;
  etag: string;
  usage_model: string;
  created_on: string;
  modified_on: string;
}

interface FirewallRule {
  id?: string;
  filter: {
    expression: string;
    paused: boolean;
    description: string;
  };
  action: 'block' | 'challenge' | 'js_challenge' | 'managed_challenge' | 'allow' | 'log' | 'bypass';
  priority?: number;
  products?: string[];
}

class CloudflareService {
  private apiToken: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';
  private accountId: string | null = null;
  private zoneId: string | null = null;

  constructor(config: CloudflareConfig) {
    this.apiToken = config.apiToken;
    this.accountId = config.accountId || null;
    this.zoneId = config.zoneId || null;
  }

  // Helper method for API requests
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Cloudflare API request failed');
    }

    return data.result;
  }

  // Zone Management
  async listZones(): Promise<Zone[]> {
    return await this.request('/zones');
  }

  async getZone(zoneId: string): Promise<Zone> {
    return await this.request(`/zones/${zoneId}`);
  }

  async createZone(name: string, accountId: string): Promise<Zone> {
    return await this.request('/zones', {
      method: 'POST',
      body: JSON.stringify({
        name,
        account: { id: accountId },
        jump_start: true
      })
    });
  }

  async deleteZone(zoneId: string): Promise<void> {
    await this.request(`/zones/${zoneId}`, {
      method: 'DELETE'
    });
  }

  // DNS Management
  async listDNSRecords(zoneId: string): Promise<DNSRecord[]> {
    return await this.request(`/zones/${zoneId}/dns_records`);
  }

  async getDNSRecord(zoneId: string, recordId: string): Promise<DNSRecord> {
    return await this.request(`/zones/${zoneId}/dns_records/${recordId}`);
  }

  async createDNSRecord(zoneId: string, record: DNSRecord): Promise<DNSRecord> {
    return await this.request(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
  }

  async updateDNSRecord(zoneId: string, recordId: string, record: Partial<DNSRecord>): Promise<DNSRecord> {
    return await this.request(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(record)
    });
  }

  async deleteDNSRecord(zoneId: string, recordId: string): Promise<void> {
    await this.request(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE'
    });
  }

  // Bulk DNS Operations
  async importDNSRecords(zoneId: string, records: string): Promise<any> {
    return await this.request(`/zones/${zoneId}/dns_records/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: records
    });
  }

  async exportDNSRecords(zoneId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/export`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    });
    return await response.text();
  }

  // Security Settings
  async getSecuritySettings(zoneId: string): Promise<SecuritySettings> {
    const [waf, ssl, settings] = await Promise.all([
      this.request(`/zones/${zoneId}/settings/waf`),
      this.request(`/zones/${zoneId}/settings/ssl`),
      this.request(`/zones/${zoneId}/settings`)
    ]);

    return {
      waf: waf.value === 'on',
      ddos_protection: true, // Always on for Cloudflare
      rate_limiting: settings.find((s: any) => s.id === 'rate_limiting')?.value === 'on',
      bot_management: settings.find((s: any) => s.id === 'bot_management')?.value === 'on',
      ssl_mode: ssl.value,
      min_tls_version: settings.find((s: any) => s.id === 'min_tls_version')?.value,
      automatic_https_rewrites: settings.find((s: any) => s.id === 'automatic_https_rewrites')?.value === 'on'
    };
  }

  async updateSecuritySetting(zoneId: string, setting: string, value: any): Promise<any> {
    return await this.request(`/zones/${zoneId}/settings/${setting}`, {
      method: 'PATCH',
      body: JSON.stringify({ value })
    });
  }

  // Analytics
  async getAnalytics(zoneId: string, since: Date, until: Date): Promise<AnalyticsData> {
    const params = new URLSearchParams({
      since: since.toISOString(),
      until: until.toISOString()
    });

    const data = await this.request(`/zones/${zoneId}/analytics/dashboard?${params}`);
    
    return {
      requests: data.totals.requests,
      bandwidth: data.totals.bandwidth,
      threats: data.totals.threats,
      pageviews: data.totals.pageviews
    };
  }

  // Page Rules
  async listPageRules(zoneId: string): Promise<PageRule[]> {
    return await this.request(`/zones/${zoneId}/pagerules`);
  }

  async createPageRule(zoneId: string, rule: PageRule): Promise<PageRule> {
    return await this.request(`/zones/${zoneId}/pagerules`, {
      method: 'POST',
      body: JSON.stringify(rule)
    });
  }

  async updatePageRule(zoneId: string, ruleId: string, rule: Partial<PageRule>): Promise<PageRule> {
    return await this.request(`/zones/${zoneId}/pagerules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(rule)
    });
  }

  async deletePageRule(zoneId: string, ruleId: string): Promise<void> {
    await this.request(`/zones/${zoneId}/pagerules/${ruleId}`, {
      method: 'DELETE'
    });
  }

  // Workers
  async listWorkers(accountId: string): Promise<WorkerScript[]> {
    return await this.request(`/accounts/${accountId}/workers/scripts`);
  }

  async getWorker(accountId: string, scriptName: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${accountId}/workers/scripts/${scriptName}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Accept': 'application/javascript'
        }
      }
    );
    return await response.text();
  }

  async deployWorker(accountId: string, scriptName: string, script: string): Promise<WorkerScript> {
    return await this.request(`/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/javascript'
      },
      body: script
    });
  }

  async deleteWorker(accountId: string, scriptName: string): Promise<void> {
    await this.request(`/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: 'DELETE'
    });
  }

  // Firewall Rules
  async listFirewallRules(zoneId: string): Promise<FirewallRule[]> {
    return await this.request(`/zones/${zoneId}/firewall/rules`);
  }

  async createFirewallRule(zoneId: string, rule: FirewallRule): Promise<FirewallRule> {
    // First create the filter
    const filter = await this.request(`/zones/${zoneId}/filters`, {
      method: 'POST',
      body: JSON.stringify(rule.filter)
    });

    // Then create the rule
    return await this.request(`/zones/${zoneId}/firewall/rules`, {
      method: 'POST',
      body: JSON.stringify({
        filter: { id: filter.id },
        action: rule.action,
        priority: rule.priority,
        products: rule.products
      })
    });
  }

  async updateFirewallRule(zoneId: string, ruleId: string, rule: Partial<FirewallRule>): Promise<FirewallRule> {
    return await this.request(`/zones/${zoneId}/firewall/rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(rule)
    });
  }

  async deleteFirewallRule(zoneId: string, ruleId: string): Promise<void> {
    await this.request(`/zones/${zoneId}/firewall/rules/${ruleId}`, {
      method: 'DELETE'
    });
  }

  // Cache Management
  async purgeCache(zoneId: string, options?: { files?: string[], tags?: string[], hosts?: string[] }): Promise<void> {
    const body = options ? JSON.stringify(options) : JSON.stringify({ purge_everything: true });
    
    await this.request(`/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      body
    });
  }

  // SSL/TLS Certificates
  async listCertificates(zoneId: string): Promise<any[]> {
    return await this.request(`/zones/${zoneId}/ssl/certificate_packs`);
  }

  async orderCertificate(zoneId: string, hosts: string[]): Promise<any> {
    return await this.request(`/zones/${zoneId}/ssl/certificate_packs/order`, {
      method: 'POST',
      body: JSON.stringify({
        hosts,
        type: 'advanced',
        validation_method: 'txt'
      })
    });
  }

  // Rate Limiting
  async createRateLimit(zoneId: string, rule: {
    threshold: number;
    period: number;
    match: {
      request: {
        url_pattern?: string;
        schemes?: string[];
        methods?: string[];
      };
      response?: {
        status?: number[];
        headers?: Array<{ name: string; op: string; value: string }>;
      };
    };
    action: {
      mode: 'simulate' | 'ban' | 'challenge' | 'js_challenge';
      timeout?: number;
      response?: {
        content_type: string;
        body: string;
      };
    };
  }): Promise<any> {
    return await this.request(`/zones/${zoneId}/rate_limits`, {
      method: 'POST',
      body: JSON.stringify(rule)
    });
  }

  // Load Balancing
  async createLoadBalancer(accountId: string, config: {
    name: string;
    description?: string;
    default_pools: string[];
    fallback_pool?: string;
    proxied?: boolean;
    ttl?: number;
    steering_policy?: 'off' | 'geo' | 'random' | 'dynamic_latency';
    session_affinity?: 'none' | 'cookie' | 'ip_cookie';
    session_affinity_ttl?: number;
  }): Promise<any> {
    return await this.request(`/accounts/${accountId}/load_balancers/pools`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  // Argo Tunnel
  async createTunnel(accountId: string, name: string, tunnelSecret: string): Promise<any> {
    return await this.request(`/accounts/${accountId}/tunnels`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        tunnel_secret: tunnelSecret
      })
    });
  }

  // Helper Methods
  async verifyToken(): Promise<{ id: string; email: string }> {
    return await this.request('/user/tokens/verify');
  }

  async setZone(zoneId: string): Promise<void> {
    this.zoneId = zoneId;
  }

  async setAccount(accountId: string): Promise<void> {
    this.accountId = accountId;
  }

  // Quick DNS Helpers
  async addARecord(domain: string, ip: string, proxied: boolean = true): Promise<DNSRecord> {
    if (!this.zoneId) throw new Error('Zone ID not set');
    
    return await this.createDNSRecord(this.zoneId, {
      type: 'A',
      name: domain,
      content: ip,
      ttl: 1, // Auto TTL
      proxied
    });
  }

  async addCNAME(subdomain: string, target: string, proxied: boolean = true): Promise<DNSRecord> {
    if (!this.zoneId) throw new Error('Zone ID not set');
    
    return await this.createDNSRecord(this.zoneId, {
      type: 'CNAME',
      name: subdomain,
      content: target,
      ttl: 1,
      proxied
    });
  }

  async updateARecord(domain: string, newIp: string): Promise<DNSRecord | null> {
    if (!this.zoneId) throw new Error('Zone ID not set');
    
    const records = await this.listDNSRecords(this.zoneId);
    const record = records.find(r => r.type === 'A' && r.name === domain);
    
    if (!record || !record.id) return null;
    
    return await this.updateDNSRecord(this.zoneId, record.id, {
      content: newIp
    });
  }

  // Security Helpers
  async enableUnderAttackMode(zoneId: string): Promise<void> {
    await this.updateSecuritySetting(zoneId, 'security_level', 'under_attack');
  }

  async setSecurityLevel(zoneId: string, level: 'off' | 'essentially_off' | 'low' | 'medium' | 'high' | 'under_attack'): Promise<void> {
    await this.updateSecuritySetting(zoneId, 'security_level', level);
  }

  async enableAlwaysHTTPS(zoneId: string): Promise<void> {
    await this.updateSecuritySetting(zoneId, 'always_use_https', 'on');
  }
}

// Create singleton instance with environment variable
const cloudflareService = new CloudflareService({
  apiToken: process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN || 'd8e7d9139c38512e19d7fe59d0973ba7db0e2'
});

export default cloudflareService;
export { CloudflareService, type DNSRecord, type Zone, type SecuritySettings, type AnalyticsData };