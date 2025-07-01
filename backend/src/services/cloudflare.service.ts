import axios, { AxiosInstance } from 'axios';

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
}

export interface CloudflareDNSRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
  zone_id?: string;
  zone_name?: string;
}

export interface CloudflareSSLSettings {
  id: string;
  value: 'off' | 'flexible' | 'full' | 'strict';
  modified_on: string;
  certificate_status: string;
}

export interface CloudflarePageRule {
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

export class CloudflareService {
  private client: AxiosInstance;
  private apiToken: string;
  private zoneId: string | null = null;

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || 'd8e7d9139c38512e19d7fe59d0973ba7db0e2';
    
    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all zones in the account
   */
  async getZones(): Promise<CloudflareZone[]> {
    try {
      const response = await this.client.get('/zones');
      return response.data.result;
    } catch (error) {
      console.error('Error fetching Cloudflare zones:', error);
      throw new Error(`Failed to fetch zones: ${error.message}`);
    }
  }

  /**
   * Get zone by domain name
   */
  async getZoneByName(domain: string): Promise<CloudflareZone | null> {
    try {
      const response = await this.client.get('/zones', {
        params: { name: domain }
      });
      return response.data.result[0] || null;
    } catch (error) {
      console.error('Error fetching zone by name:', error);
      return null;
    }
  }

  /**
   * Set the active zone for operations
   */
  async setActiveZone(domain: string): Promise<void> {
    const zone = await this.getZoneByName(domain);
    if (!zone) {
      throw new Error(`Zone not found for domain: ${domain}`);
    }
    this.zoneId = zone.id;
  }

  /**
   * Get DNS records for the zone
   */
  async getDNSRecords(zoneId?: string): Promise<CloudflareDNSRecord[]> {
    const targetZoneId = zoneId || this.zoneId;
    if (!targetZoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      const response = await this.client.get(`/zones/${targetZoneId}/dns_records`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching DNS records:', error);
      throw new Error(`Failed to fetch DNS records: ${error.message}`);
    }
  }

  /**
   * Create a new DNS record
   */
  async createDNSRecord(record: CloudflareDNSRecord): Promise<CloudflareDNSRecord> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      const response = await this.client.post(
        `/zones/${this.zoneId}/dns_records`,
        record
      );
      return response.data.result;
    } catch (error) {
      console.error('Error creating DNS record:', error);
      throw new Error(`Failed to create DNS record: ${error.message}`);
    }
  }

  /**
   * Update an existing DNS record
   */
  async updateDNSRecord(recordId: string, record: Partial<CloudflareDNSRecord>): Promise<CloudflareDNSRecord> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      const response = await this.client.put(
        `/zones/${this.zoneId}/dns_records/${recordId}`,
        record
      );
      return response.data.result;
    } catch (error) {
      console.error('Error updating DNS record:', error);
      throw new Error(`Failed to update DNS record: ${error.message}`);
    }
  }

  /**
   * Delete a DNS record
   */
  async deleteDNSRecord(recordId: string): Promise<void> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      await this.client.delete(`/zones/${this.zoneId}/dns_records/${recordId}`);
    } catch (error) {
      console.error('Error deleting DNS record:', error);
      throw new Error(`Failed to delete DNS record: ${error.message}`);
    }
  }

  /**
   * Get SSL/TLS settings
   */
  async getSSLSettings(): Promise<CloudflareSSLSettings> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      const response = await this.client.get(`/zones/${this.zoneId}/settings/ssl`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching SSL settings:', error);
      throw new Error(`Failed to fetch SSL settings: ${error.message}`);
    }
  }

  /**
   * Update SSL/TLS settings
   */
  async updateSSLSettings(mode: 'off' | 'flexible' | 'full' | 'strict'): Promise<CloudflareSSLSettings> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      const response = await this.client.patch(
        `/zones/${this.zoneId}/settings/ssl`,
        { value: mode }
      );
      return response.data.result;
    } catch (error) {
      console.error('Error updating SSL settings:', error);
      throw new Error(`Failed to update SSL settings: ${error.message}`);
    }
  }

  /**
   * Enable or disable development mode
   */
  async setDevelopmentMode(enabled: boolean): Promise<void> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      await this.client.patch(
        `/zones/${this.zoneId}/settings/development_mode`,
        { value: enabled ? 'on' : 'off' }
      );
    } catch (error) {
      console.error('Error setting development mode:', error);
      throw new Error(`Failed to set development mode: ${error.message}`);
    }
  }

  /**
   * Purge cache
   */
  async purgeCache(files?: string[]): Promise<void> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      const data = files ? { files } : { purge_everything: true };
      await this.client.post(`/zones/${this.zoneId}/purge_cache`, data);
    } catch (error) {
      console.error('Error purging cache:', error);
      throw new Error(`Failed to purge cache: ${error.message}`);
    }
  }

  /**
   * Create page rule
   */
  async createPageRule(rule: CloudflarePageRule): Promise<CloudflarePageRule> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      const response = await this.client.post(
        `/zones/${this.zoneId}/pagerules`,
        rule
      );
      return response.data.result;
    } catch (error) {
      console.error('Error creating page rule:', error);
      throw new Error(`Failed to create page rule: ${error.message}`);
    }
  }

  /**
   * Configure security settings for the zone
   */
  async configureSecuritySettings(): Promise<void> {
    if (!this.zoneId) {
      throw new Error('Zone ID not set. Call setActiveZone() first.');
    }

    try {
      // Enable HTTPS rewrites
      await this.client.patch(`/zones/${this.zoneId}/settings/automatic_https_rewrites`, {
        value: 'on'
      });

      // Enable Always Use HTTPS
      await this.client.patch(`/zones/${this.zoneId}/settings/always_use_https`, {
        value: 'on'
      });

      // Set minimum TLS version
      await this.client.patch(`/zones/${this.zoneId}/settings/min_tls_version`, {
        value: '1.2'
      });

      // Enable HSTS
      await this.client.patch(`/zones/${this.zoneId}/settings/security_header`, {
        value: {
          strict_transport_security: {
            enabled: true,
            max_age: 31536000,
            include_subdomains: true,
            preload: true
          }
        }
      });

      console.log('Security settings configured successfully');
    } catch (error) {
      console.error('Error configuring security settings:', error);
      throw new Error(`Failed to configure security settings: ${error.message}`);
    }
  }

  /**
   * Setup DNS records for LOGOS Ecosystem
   */
  async setupLOGOSEcosystemDNS(domain: string): Promise<void> {
    await this.setActiveZone(domain);

    // DNS records for the LOGOS Ecosystem
    const dnsRecords: CloudflareDNSRecord[] = [
      // Main domain - points to Vercel
      {
        type: 'CNAME',
        name: '@',
        content: 'cname.vercel-dns.com',
        ttl: 1,
        proxied: false
      },
      // www subdomain
      {
        type: 'CNAME',
        name: 'www',
        content: domain,
        ttl: 1,
        proxied: true
      },
      // API subdomain - points to AWS ALB
      {
        type: 'CNAME',
        name: 'api',
        content: 'logos-alb-123456.us-east-1.elb.amazonaws.com', // Replace with actual ALB
        ttl: 1,
        proxied: true
      },
      // Email records (if using custom email)
      {
        type: 'MX',
        name: '@',
        content: 'mail.' + domain,
        ttl: 1,
        priority: 10
      },
      // SPF record for email
      {
        type: 'TXT',
        name: '@',
        content: 'v=spf1 include:amazonses.com ~all',
        ttl: 1
      }
    ];

    // Create DNS records
    for (const record of dnsRecords) {
      try {
        await this.createDNSRecord(record);
        console.log(`Created DNS record: ${record.type} ${record.name}`);
      } catch (error) {
        console.error(`Failed to create DNS record ${record.type} ${record.name}:`, error);
      }
    }

    // Configure security settings
    await this.configureSecuritySettings();

    // Create page rules
    const pageRules: CloudflarePageRule[] = [
      // Force HTTPS for API
      {
        targets: [{
          target: 'url',
          constraint: {
            operator: 'matches',
            value: `api.${domain}/*`
          }
        }],
        actions: [
          { id: 'ssl', value: 'full' },
          { id: 'automatic_https_rewrites', value: 'on' }
        ],
        priority: 1,
        status: 'active'
      },
      // Cache static assets
      {
        targets: [{
          target: 'url',
          constraint: {
            operator: 'matches',
            value: `${domain}/static/*`
          }
        }],
        actions: [
          { id: 'cache_level', value: 'cache_everything' },
          { id: 'edge_cache_ttl', value: 2419200 } // 28 days
        ],
        priority: 2,
        status: 'active'
      }
    ];

    for (const rule of pageRules) {
      try {
        await this.createPageRule(rule);
        console.log('Created page rule:', rule.targets[0].constraint.value);
      } catch (error) {
        console.error('Failed to create page rule:', error);
      }
    }
  }

  /**
   * Verify Cloudflare configuration
   */
  async verifyConfiguration(): Promise<{
    zones: CloudflareZone[];
    dnsRecords: CloudflareDNSRecord[];
    sslSettings: CloudflareSSLSettings;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Get zones
    const zones = await this.getZones();
    if (zones.length === 0) {
      issues.push('No zones found in Cloudflare account');
    }

    // Get DNS records if zone is set
    let dnsRecords: CloudflareDNSRecord[] = [];
    let sslSettings: CloudflareSSLSettings | null = null;

    if (this.zoneId) {
      try {
        dnsRecords = await this.getDNSRecords();
        if (dnsRecords.length === 0) {
          issues.push('No DNS records found');
        }

        // Check for essential records
        const hasApiRecord = dnsRecords.some(r => r.name.includes('api'));
        if (!hasApiRecord) {
          issues.push('API subdomain DNS record not found');
        }

        // Get SSL settings
        sslSettings = await this.getSSLSettings();
        if (sslSettings.value === 'off') {
          issues.push('SSL is disabled');
        }
      } catch (error) {
        issues.push(`Error checking zone configuration: ${error.message}`);
      }
    }

    return {
      zones,
      dnsRecords,
      sslSettings: sslSettings!,
      issues
    };
  }
}

export const cloudflareService = new CloudflareService();