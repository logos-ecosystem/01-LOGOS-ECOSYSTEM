import { Request, Response } from 'express';
import { cloudflareService } from '../../services/cloudflare.service';

export class CloudflareController {
  /**
   * Get all zones
   */
  async getZones(_req: Request, res: Response) {
    try {
      const zones = await cloudflareService.getZones();
      res.json({
        success: true,
        zones,
        total: zones.length
      });
    } catch (error) {
      console.error('Error fetching zones:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch zones',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get DNS records for a zone
   */
  async getDNSRecords(req: Request, res: Response) {
    try {
      const { zoneId } = req.params;
      const records = await cloudflareService.getDNSRecords(zoneId);
      
      res.json({
        success: true,
        records,
        total: records.length
      });
    } catch (error) {
      console.error('Error fetching DNS records:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch DNS records',
        message: (error as Error).message
      });
    }
  }

  /**
   * Create DNS record
   */
  async createDNSRecord(req: Request, res: Response) {
    try {
      const { domain } = req.params;
      await cloudflareService.setActiveZone(domain);
      
      const record = await cloudflareService.createDNSRecord(req.body);
      
      res.json({
        success: true,
        record,
        message: 'DNS record created successfully'
      });
    } catch (error) {
      console.error('Error creating DNS record:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create DNS record',
        message: (error as Error).message
      });
    }
  }

  /**
   * Update DNS record
   */
  async updateDNSRecord(req: Request, res: Response) {
    try {
      const { domain, recordId } = req.params;
      await cloudflareService.setActiveZone(domain);
      
      const record = await cloudflareService.updateDNSRecord(recordId, req.body);
      
      res.json({
        success: true,
        record,
        message: 'DNS record updated successfully'
      });
    } catch (error) {
      console.error('Error updating DNS record:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update DNS record',
        message: (error as Error).message
      });
    }
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(req: Request, res: Response) {
    try {
      const { domain, recordId } = req.params;
      await cloudflareService.setActiveZone(domain);
      
      await cloudflareService.deleteDNSRecord(recordId);
      
      res.json({
        success: true,
        message: 'DNS record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting DNS record:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete DNS record',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get SSL settings
   */
  async getSSLSettings(req: Request, res: Response) {
    try {
      const { domain } = req.params;
      await cloudflareService.setActiveZone(domain);
      
      const settings = await cloudflareService.getSSLSettings();
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Error fetching SSL settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SSL settings',
        message: (error as Error).message
      });
    }
  }

  /**
   * Update SSL settings
   */
  async updateSSLSettings(req: Request, res: Response) {
    try {
      const { domain } = req.params;
      const { mode } = req.body;
      
      await cloudflareService.setActiveZone(domain);
      const settings = await cloudflareService.updateSSLSettings(mode);
      
      res.json({
        success: true,
        settings,
        message: 'SSL settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating SSL settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update SSL settings',
        message: (error as Error).message
      });
    }
  }

  /**
   * Purge cache
   */
  async purgeCache(req: Request, res: Response) {
    try {
      const { domain } = req.params;
      const { files } = req.body;
      
      await cloudflareService.setActiveZone(domain);
      await cloudflareService.purgeCache(files);
      
      res.json({
        success: true,
        message: 'Cache purged successfully'
      });
    } catch (error) {
      console.error('Error purging cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to purge cache',
        message: (error as Error).message
      });
    }
  }

  /**
   * Setup LOGOS Ecosystem DNS
   */
  async setupEcosystem(req: Request, res: Response) {
    try {
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({
          success: false,
          error: 'Domain is required'
        });
      }
      
      await cloudflareService.setupLOGOSEcosystemDNS(domain);
      
      return res.json({
        success: true,
        message: `LOGOS Ecosystem DNS setup completed for ${domain}`
      });
    } catch (error) {
      console.error('Error setting up ecosystem:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to setup ecosystem',
        message: (error as Error).message
      });
    }
  }

  /**
   * Verify Cloudflare configuration
   */
  async verifyConfiguration(_req: Request, res: Response) {
    try {
      const verification = await cloudflareService.verifyConfiguration();
      
      res.json({
        success: true,
        verification,
        healthy: verification.issues.length === 0
      });
    } catch (error) {
      console.error('Error verifying configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify configuration',
        message: (error as Error).message
      });
    }
  }
}

export const cloudflareController = new CloudflareController();