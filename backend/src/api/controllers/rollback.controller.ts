import { Request, Response } from 'express';
import { rollbackService, RollbackConfig } from '../../services/rollback.service';

export class RollbackController {
  /**
   * Create deployment snapshot
   */
  async createSnapshot(req: Request, res: Response) {
    try {
      const snapshot = await rollbackService.createDeploymentSnapshot();
      
      res.json({
        success: true,
        snapshot,
        message: 'Deployment snapshot created successfully'
      });
    } catch (error) {
      console.error('Snapshot creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create snapshot',
        message: error.message
      });
    }
  }
  
  /**
   * Perform rollback
   */
  async performRollback(req: Request, res: Response) {
    try {
      const config: RollbackConfig = {
        service: req.body.service || 'all',
        targetVersion: req.body.targetVersion,
        reason: req.body.reason || 'Manual rollback requested',
        initiatedBy: req.user?.email || 'System',
        automatic: false
      };
      
      // Validate request
      if (!['backend', 'frontend', 'database', 'all'].includes(config.service)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid service specified',
          validServices: ['backend', 'frontend', 'database', 'all']
        });
      }
      
      // Perform rollback
      const results = await rollbackService.rollback(config);
      
      const success = results.every(r => r.success);
      
      res.status(success ? 200 : 500).json({
        success,
        results,
        message: success ? 'Rollback completed successfully' : 'Rollback completed with errors'
      });
    } catch (error) {
      console.error('Rollback error:', error);
      res.status(500).json({
        success: false,
        error: 'Rollback failed',
        message: error.message
      });
    }
  }
  
  /**
   * Get rollback history
   */
  async getRollbackHistory(req: Request, res: Response) {
    try {
      const history = await rollbackService.getRollbackHistory();
      
      res.json({
        success: true,
        history,
        total: history.length
      });
    } catch (error) {
      console.error('History retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get rollback history',
        message: error.message
      });
    }
  }
  
  /**
   * Automatic rollback endpoint (called by monitoring systems)
   */
  async automaticRollback(req: Request, res: Response) {
    try {
      // Verify the request is from an authorized monitoring system
      const authToken = req.headers['x-monitoring-token'];
      if (authToken !== process.env.MONITORING_TOKEN) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      const config: RollbackConfig = {
        service: 'all',
        reason: req.body.reason || 'Automatic rollback triggered by monitoring',
        initiatedBy: 'Monitoring System',
        automatic: true
      };
      
      // Perform immediate rollback
      const results = await rollbackService.rollback(config);
      
      res.json({
        success: results.every(r => r.success),
        results,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Automatic rollback error:', error);
      res.status(500).json({
        success: false,
        error: 'Automatic rollback failed',
        message: error.message
      });
    }
  }
}

export const rollbackController = new RollbackController();