import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface RollbackConfig {
  service: 'backend' | 'frontend' | 'database' | 'all';
  targetVersion?: string;
  reason: string;
  initiatedBy: string;
  automatic?: boolean;
}

export interface RollbackResult {
  success: boolean;
  service: string;
  previousVersion: string;
  rolledBackTo: string;
  duration: number;
  error?: string;
}

export interface DeploymentSnapshot {
  id: string;
  timestamp: Date;
  services: {
    backend: {
      version: string;
      dockerImage: string;
      ecsTaskDefinition: string;
    };
    frontend: {
      version: string;
      vercelDeploymentId: string;
      url: string;
    };
    database: {
      version: string;
      migrationId: string;
      backupFile: string;
    };
  };
  healthChecks: {
    backend: boolean;
    frontend: boolean;
    database: boolean;
  };
}

export class RollbackService {
  private snapshotDir = path.join(process.cwd(), 'deployment-snapshots');
  private backupDir = path.join(process.cwd(), 'deployment-backups');
  
  constructor() {
    this.initializeDirectories();
  }
  
  private async initializeDirectories() {
    await fs.mkdir(this.snapshotDir, { recursive: true });
    await fs.mkdir(this.backupDir, { recursive: true });
  }
  
  /**
   * Create a snapshot before deployment
   */
  async createDeploymentSnapshot(): Promise<DeploymentSnapshot> {
    console.log('📸 Creating deployment snapshot...');
    
    const snapshot: DeploymentSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: new Date(),
      services: {
        backend: await this.getBackendVersion(),
        frontend: await this.getFrontendVersion(),
        database: await this.getDatabaseVersion()
      },
      healthChecks: await this.performHealthChecks()
    };
    
    // Save snapshot
    await fs.writeFile(
      path.join(this.snapshotDir, `${snapshot.id}.json`),
      JSON.stringify(snapshot, null, 2)
    );
    
    // Create database backup
    await this.createDatabaseBackup(snapshot.id);
    
    console.log(`✅ Snapshot created: ${snapshot.id}`);
    return snapshot;
  }
  
  /**
   * Perform automatic rollback
   */
  async rollback(config: RollbackConfig): Promise<RollbackResult[]> {
    console.log(`🔄 Initiating rollback: ${config.reason}`);
    
    const results: RollbackResult[] = [];
    const startTime = Date.now();
    
    try {
      // Get the latest stable snapshot
      const targetSnapshot = await this.getTargetSnapshot(config.targetVersion);
      
      if (!targetSnapshot) {
        throw new Error('No valid snapshot found for rollback');
      }
      
      // Notify about rollback
      await this.notifyRollback(config, targetSnapshot);
      
      // Perform rollback based on service
      if (config.service === 'all' || config.service === 'backend') {
        results.push(await this.rollbackBackend(targetSnapshot));
      }
      
      if (config.service === 'all' || config.service === 'frontend') {
        results.push(await this.rollbackFrontend(targetSnapshot));
      }
      
      if (config.service === 'all' || config.service === 'database') {
        results.push(await this.rollbackDatabase(targetSnapshot));
      }
      
      // Verify rollback success
      await this.verifyRollback(targetSnapshot);
      
      // Log rollback event
      await this.logRollbackEvent(config, results);
      
      console.log(`✅ Rollback completed in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      results.push({
        success: false,
        service: config.service,
        previousVersion: 'unknown',
        rolledBackTo: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      });
    }
    
    return results;
  }
  
  /**
   * Rollback backend service
   */
  private async rollbackBackend(snapshot: DeploymentSnapshot): Promise<RollbackResult> {
    const startTime = Date.now();
    console.log('🔄 Rolling back backend...');
    
    try {
      // Get current version
      const currentVersion = await this.getBackendVersion();
      
      // Update ECS service to previous task definition
      await execAsync(`
        aws ecs update-service \
          --cluster logos-production-cluster \
          --service logos-production-service \
          --task-definition ${snapshot.services.backend.ecsTaskDefinition} \
          --force-new-deployment
      `);
      
      // Wait for service to stabilize
      await execAsync(`
        aws ecs wait services-stable \
          --cluster logos-production-cluster \
          --services logos-production-service
      `);
      
      return {
        success: true,
        service: 'backend',
        previousVersion: currentVersion.version,
        rolledBackTo: snapshot.services.backend.version,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        service: 'backend',
        previousVersion: 'unknown',
        rolledBackTo: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Rollback frontend service
   */
  private async rollbackFrontend(snapshot: DeploymentSnapshot): Promise<RollbackResult> {
    const startTime = Date.now();
    console.log('🔄 Rolling back frontend...');
    
    try {
      // Get current version
      const currentVersion = await this.getFrontendVersion();
      
      // Use Vercel CLI to rollback
      const { stdout } = await execAsync(`
        cd frontend && vercel rollback ${snapshot.services.frontend.vercelDeploymentId} --yes
      `);
      
      return {
        success: true,
        service: 'frontend',
        previousVersion: currentVersion.version,
        rolledBackTo: snapshot.services.frontend.version,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      // Alternative: Promote previous deployment
      try {
        await execAsync(`
          cd frontend && vercel promote ${snapshot.services.frontend.url} --yes
        `);
        
        return {
          success: true,
          service: 'frontend',
          previousVersion: 'current',
          rolledBackTo: snapshot.services.frontend.version,
          duration: Date.now() - startTime
        };
      } catch (altError) {
        return {
          success: false,
          service: 'frontend',
          previousVersion: 'unknown',
          rolledBackTo: 'failed',
          duration: Date.now() - startTime,
          error: altError.message
        };
      }
    }
  }
  
  /**
   * Rollback database
   */
  private async rollbackDatabase(snapshot: DeploymentSnapshot): Promise<RollbackResult> {
    const startTime = Date.now();
    console.log('🔄 Rolling back database...');
    
    try {
      // Get current migration status
      const { stdout: currentMigration } = await execAsync('npx prisma migrate status --schema=./prisma/schema.prisma');
      
      // Restore database backup
      const backupPath = path.join(this.backupDir, snapshot.services.database.backupFile);
      
      if (await this.fileExists(backupPath)) {
        console.log('📥 Restoring database backup...');
        
        // Create a temporary backup of current state
        await this.createDatabaseBackup(`rollback-safety-${Date.now()}`);
        
        // Restore the backup
        await execAsync(`psql "${process.env.DATABASE_URL}" < "${backupPath}"`);
        
        // Sync Prisma schema
        await execAsync('npx prisma db push --skip-generate --accept-data-loss');
        
        return {
          success: true,
          service: 'database',
          previousVersion: 'current',
          rolledBackTo: snapshot.services.database.version,
          duration: Date.now() - startTime
        };
      } else {
        throw new Error('Database backup file not found');
      }
      
    } catch (error) {
      return {
        success: false,
        service: 'database',
        previousVersion: 'unknown',
        rolledBackTo: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Get backend version information
   */
  private async getBackendVersion() {
    try {
      // Get current ECS task definition
      const { stdout } = await execAsync(`
        aws ecs describe-services \
          --cluster logos-production-cluster \
          --services logos-production-service \
          --query 'services[0].taskDefinition' \
          --output text
      `);
      
      const taskDefinition = stdout.trim();
      const version = taskDefinition.split(':').pop() || 'unknown';
      
      // Get Docker image tag
      const { stdout: taskDefJson } = await execAsync(`
        aws ecs describe-task-definition \
          --task-definition ${taskDefinition} \
          --query 'taskDefinition.containerDefinitions[0].image' \
          --output text
      `);
      
      return {
        version,
        dockerImage: taskDefJson.trim(),
        ecsTaskDefinition: taskDefinition
      };
    } catch (error) {
      console.error('Failed to get backend version:', error);
      return {
        version: 'unknown',
        dockerImage: 'unknown',
        ecsTaskDefinition: 'unknown'
      };
    }
  }
  
  /**
   * Get frontend version information
   */
  private async getFrontendVersion() {
    try {
      // Get current Vercel deployment
      const { stdout } = await execAsync('cd frontend && vercel list --json | head -1');
      const deployment = JSON.parse(stdout);
      
      return {
        version: deployment.uid,
        vercelDeploymentId: deployment.uid,
        url: deployment.url
      };
    } catch (error) {
      console.error('Failed to get frontend version:', error);
      return {
        version: 'unknown',
        vercelDeploymentId: 'unknown',
        url: 'unknown'
      };
    }
  }
  
  /**
   * Get database version information
   */
  private async getDatabaseVersion() {
    try {
      // Get latest migration
      const { stdout } = await execAsync(
        'npx prisma migrate status --schema=./prisma/schema.prisma | grep "Database schema is up to date" -A 1 | tail -1'
      );
      
      const migrationId = stdout.trim() || 'unknown';
      const backupFile = `db-backup-${Date.now()}.sql`;
      
      return {
        version: migrationId,
        migrationId,
        backupFile
      };
    } catch (error) {
      return {
        version: 'unknown',
        migrationId: 'unknown',
        backupFile: 'unknown'
      };
    }
  }
  
  /**
   * Create database backup
   */
  private async createDatabaseBackup(snapshotId: string): Promise<void> {
    try {
      const backupFile = `db-backup-${snapshotId}.sql`;
      const backupPath = path.join(this.backupDir, backupFile);
      
      console.log(`💾 Creating database backup: ${backupFile}`);
      
      await execAsync(`pg_dump "${process.env.DATABASE_URL}" > "${backupPath}"`);
      
      // Compress backup
      await execAsync(`gzip "${backupPath}"`);
      
      console.log('✅ Database backup created successfully');
    } catch (error) {
      console.error('Failed to create database backup:', error);
      throw error;
    }
  }
  
  /**
   * Perform health checks
   */
  private async performHealthChecks() {
    const checks = {
      backend: false,
      frontend: false,
      database: false
    };
    
    try {
      // Backend health check
      const backendResponse = await axios.get(
        `${process.env.API_URL || 'https://api.logos-ecosystem.com'}/health`,
        { timeout: 5000 }
      );
      checks.backend = backendResponse.status === 200;
    } catch (error) {
      checks.backend = false;
    }
    
    try {
      // Frontend health check
      const frontendResponse = await axios.get(
        process.env.FRONTEND_URL || 'https://logos-ecosystem.com',
        { timeout: 5000 }
      );
      checks.frontend = frontendResponse.status === 200;
    } catch (error) {
      checks.frontend = false;
    }
    
    try {
      // Database health check
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      checks.database = false;
    }
    
    return checks;
  }
  
  /**
   * Get target snapshot for rollback
   */
  private async getTargetSnapshot(targetVersion?: string): Promise<DeploymentSnapshot | null> {
    const files = await fs.readdir(this.snapshotDir);
    const snapshots = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(this.snapshotDir, file), 'utf-8');
        const snapshot = JSON.parse(content) as DeploymentSnapshot;
        
        // Only consider healthy snapshots
        if (snapshot.healthChecks.backend && 
            snapshot.healthChecks.frontend && 
            snapshot.healthChecks.database) {
          snapshots.push(snapshot);
        }
      }
    }
    
    // Sort by timestamp descending
    snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (targetVersion) {
      return snapshots.find(s => s.id === targetVersion) || null;
    }
    
    // Return the most recent healthy snapshot
    return snapshots[0] || null;
  }
  
  /**
   * Verify rollback success
   */
  private async verifyRollback(snapshot: DeploymentSnapshot): Promise<void> {
    console.log('🔍 Verifying rollback...');
    
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
      const healthChecks = await this.performHealthChecks();
      
      if (healthChecks.backend && healthChecks.frontend && healthChecks.database) {
        console.log('✅ All services are healthy after rollback');
        return;
      }
      
      console.log(`⏳ Waiting for services to stabilize... (${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      retries++;
    }
    
    throw new Error('Services did not stabilize after rollback');
  }
  
  /**
   * Notify about rollback
   */
  private async notifyRollback(config: RollbackConfig, snapshot: DeploymentSnapshot): Promise<void> {
    const message = {
      title: '🔄 Deployment Rollback Initiated',
      level: 'critical',
      details: {
        reason: config.reason,
        initiatedBy: config.initiatedBy,
        automatic: config.automatic || false,
        targetSnapshot: snapshot.id,
        targetTimestamp: snapshot.timestamp,
        services: config.service
      }
    };
    
    // Send Slack notification
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
          text: message.title,
          attachments: [{
            color: 'danger',
            fields: Object.entries(message.details).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true
            }))
          }]
        });
      } catch (error) {
        console.error('Failed to send Slack notification:', error);
      }
    }
    
    // Send email notification
    if (process.env.ADMIN_EMAIL) {
      // Email implementation here
      console.log(`Email notification would be sent to: ${process.env.ADMIN_EMAIL}`);
    }
  }
  
  /**
   * Log rollback event
   */
  private async logRollbackEvent(config: RollbackConfig, results: RollbackResult[]): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      config,
      results,
      success: results.every(r => r.success),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    };
    
    const logFile = path.join(
      process.cwd(),
      'deployment-logs',
      `rollback-${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    await fs.writeFile(logFile, JSON.stringify(logEntry, null, 2));
  }
  
  /**
   * Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get rollback history
   */
  async getRollbackHistory(): Promise<any[]> {
    const logDir = path.join(process.cwd(), 'deployment-logs');
    const files = await fs.readdir(logDir);
    const rollbacks = [];
    
    for (const file of files) {
      if (file.startsWith('rollback-')) {
        const content = await fs.readFile(path.join(logDir, file), 'utf-8');
        rollbacks.push(JSON.parse(content));
      }
    }
    
    return rollbacks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const rollbackService = new RollbackService();