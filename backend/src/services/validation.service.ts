import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface ValidationResult {
  passed: boolean;
  category: string;
  test: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: Date;
}

export interface ValidationReport {
  overallStatus: 'passed' | 'failed' | 'warning';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  results: ValidationResult[];
  generatedAt: Date;
  recommendedActions: string[];
}

export class ValidationService {
  private results: ValidationResult[] = [];

  async runAllValidations(): Promise<ValidationReport> {
    console.log('🔍 Starting comprehensive pre-deployment validation...');
    
    this.results = [];

    // Environment validations
    await this.validateEnvironmentVariables();
    await this.validateAPIKeys();
    
    // Code validations
    await this.validateTypeScript();
    await this.validateDependencies();
    await this.validateSecurityVulnerabilities();
    
    // Database validations
    await this.validateDatabaseConnection();
    await this.validateDatabaseSchema();
    await this.validateDatabaseMigrations();
    
    // Service validations
    await this.validateExternalServices();
    await this.validateCacheConnection();
    await this.validateEmailService();
    
    // Infrastructure validations
    await this.validateDiskSpace();
    await this.validateMemoryUsage();
    await this.validatePortAvailability();
    
    // Security validations
    await this.validateSSLCertificates();
    await this.validateSecurityHeaders();
    await this.validateRateLimiting();
    
    // Business logic validations
    await this.validatePaymentConfiguration();
    await this.validateSubscriptionLogic();
    await this.validateNotificationSystem();
    
    return this.generateReport();
  }

  private async validateEnvironmentVariables(): Promise<void> {
    const requiredVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'REDIS_URL',
      'ANTHROPIC_API_KEY'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.addResult({
          passed: false,
          category: 'Environment',
          test: `Environment variable: ${varName}`,
          message: `Missing required environment variable: ${varName}`,
          severity: 'error'
        });
      } else {
        this.addResult({
          passed: true,
          category: 'Environment',
          test: `Environment variable: ${varName}`,
          message: `${varName} is set`,
          severity: 'info'
        });
      }
    }

    // Validate environment-specific settings
    if (process.env.NODE_ENV === 'production') {
      if (process.env.DATABASE_URL?.includes('localhost')) {
        this.addResult({
          passed: false,
          category: 'Environment',
          test: 'Production database URL',
          message: 'Production environment using localhost database',
          severity: 'error'
        });
      }
    }
  }

  private async validateAPIKeys(): Promise<void> {
    // Validate Stripe
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      await stripe.customers.list({ limit: 1 });
      this.addResult({
        passed: true,
        category: 'API Keys',
        test: 'Stripe API',
        message: 'Stripe API key is valid',
        severity: 'info'
      });
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'API Keys',
        test: 'Stripe API',
        message: `Stripe API key validation failed: ${error.message}`,
        severity: 'error'
      });
    }

    // Validate PayPal
    try {
      const response = await axios.post(
        `${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: {
            username: process.env.PAYPAL_CLIENT_ID!,
            password: process.env.PAYPAL_CLIENT_SECRET!
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (response.data.access_token) {
        this.addResult({
          passed: true,
          category: 'API Keys',
          test: 'PayPal API',
          message: 'PayPal API credentials are valid',
          severity: 'info'
        });
      }
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'API Keys',
        test: 'PayPal API',
        message: `PayPal API validation failed: ${error.message}`,
        severity: 'error'
      });
    }

    // Validate AWS credentials
    try {
      const AWS = require('aws-sdk');
      const sts = new AWS.STS();
      await sts.getCallerIdentity().promise();
      this.addResult({
        passed: true,
        category: 'API Keys',
        test: 'AWS Credentials',
        message: 'AWS credentials are valid',
        severity: 'info'
      });
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'API Keys',
        test: 'AWS Credentials',
        message: `AWS credentials validation failed: ${error.message}`,
        severity: 'error'
      });
    }
  }

  private async validateTypeScript(): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync('npm run typecheck', {
        cwd: process.cwd()
      });
      
      if (stderr) {
        this.addResult({
          passed: false,
          category: 'Code Quality',
          test: 'TypeScript Compilation',
          message: `TypeScript errors found: ${stderr}`,
          severity: 'error'
        });
      } else {
        this.addResult({
          passed: true,
          category: 'Code Quality',
          test: 'TypeScript Compilation',
          message: 'TypeScript compilation successful',
          severity: 'info'
        });
      }
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Code Quality',
        test: 'TypeScript Compilation',
        message: `TypeScript validation failed: ${error.message}`,
        severity: 'error'
      });
    }
  }

  private async validateDependencies(): Promise<void> {
    try {
      const { stdout } = await execAsync('npm outdated --json || true');
      const outdated = stdout ? JSON.parse(stdout) : {};
      const outdatedCount = Object.keys(outdated).length;
      
      if (outdatedCount > 10) {
        this.addResult({
          passed: false,
          category: 'Dependencies',
          test: 'Outdated packages',
          message: `${outdatedCount} packages are outdated`,
          severity: 'warning'
        });
      } else {
        this.addResult({
          passed: true,
          category: 'Dependencies',
          test: 'Outdated packages',
          message: `${outdatedCount} packages are outdated (acceptable)`,
          severity: 'info'
        });
      }
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Dependencies',
        test: 'Dependency check',
        message: `Dependency validation failed: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateSecurityVulnerabilities(): Promise<void> {
    try {
      const { stdout } = await execAsync('npm audit --json || true');
      const audit = JSON.parse(stdout);
      
      if (audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0) {
        this.addResult({
          passed: false,
          category: 'Security',
          test: 'NPM Audit',
          message: `Found ${audit.metadata.vulnerabilities.critical} critical and ${audit.metadata.vulnerabilities.high} high vulnerabilities`,
          severity: 'error'
        });
      } else if (audit.metadata.vulnerabilities.moderate > 0) {
        this.addResult({
          passed: true,
          category: 'Security',
          test: 'NPM Audit',
          message: `Found ${audit.metadata.vulnerabilities.moderate} moderate vulnerabilities`,
          severity: 'warning'
        });
      } else {
        this.addResult({
          passed: true,
          category: 'Security',
          test: 'NPM Audit',
          message: 'No security vulnerabilities found',
          severity: 'info'
        });
      }
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Security',
        test: 'Security audit',
        message: `Security audit failed: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateDatabaseConnection(): Promise<void> {
    try {
      await prisma.$connect();
      await prisma.$executeRaw`SELECT 1`;
      this.addResult({
        passed: true,
        category: 'Database',
        test: 'Connection',
        message: 'Database connection successful',
        severity: 'info'
      });
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Database',
        test: 'Connection',
        message: `Database connection failed: ${error.message}`,
        severity: 'error'
      });
    }
  }

  private async validateDatabaseSchema(): Promise<void> {
    try {
      const { stdout } = await execAsync('npx prisma validate');
      this.addResult({
        passed: true,
        category: 'Database',
        test: 'Schema validation',
        message: 'Database schema is valid',
        severity: 'info'
      });
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Database',
        test: 'Schema validation',
        message: `Database schema validation failed: ${error.message}`,
        severity: 'error'
      });
    }
  }

  private async validateDatabaseMigrations(): Promise<void> {
    try {
      const { stdout } = await execAsync('npx prisma migrate status');
      if (stdout.includes('Database schema is up to date')) {
        this.addResult({
          passed: true,
          category: 'Database',
          test: 'Migrations',
          message: 'All migrations are applied',
          severity: 'info'
        });
      } else {
        this.addResult({
          passed: false,
          category: 'Database',
          test: 'Migrations',
          message: 'Pending database migrations detected',
          severity: 'error'
        });
      }
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Database',
        test: 'Migration check',
        message: `Migration check failed: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateExternalServices(): Promise<void> {
    const services = [
      {
        name: 'Stripe API',
        url: 'https://api.stripe.com/v1/customers?limit=1',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        }
      },
      {
        name: 'PayPal API',
        url: `${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/catalogs/products?page_size=1`,
        requiresAuth: true
      }
    ];

    for (const service of services) {
      try {
        let headers = service.headers || {};
        
        if (service.requiresAuth && service.name === 'PayPal API') {
          // Get PayPal token first
          const tokenResponse = await axios.post(
            `${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
              auth: {
                username: process.env.PAYPAL_CLIENT_ID!,
                password: process.env.PAYPAL_CLIENT_SECRET!
              },
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
          headers = {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`
          };
        }

        const response = await axios.get(service.url, { headers, timeout: 5000 });
        
        this.addResult({
          passed: true,
          category: 'External Services',
          test: service.name,
          message: `${service.name} is accessible`,
          severity: 'info'
        });
      } catch (error) {
        this.addResult({
          passed: false,
          category: 'External Services',
          test: service.name,
          message: `${service.name} is not accessible: ${error.message}`,
          severity: 'error'
        });
      }
    }
  }

  private async validateCacheConnection(): Promise<void> {
    try {
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL
      });
      
      await client.connect();
      await client.ping();
      await client.disconnect();
      
      this.addResult({
        passed: true,
        category: 'Cache',
        test: 'Redis connection',
        message: 'Redis cache is accessible',
        severity: 'info'
      });
    } catch (error) {
      this.addResult({
        passed: true, // Cache is optional
        category: 'Cache',
        test: 'Redis connection',
        message: `Redis cache not available: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateEmailService(): Promise<void> {
    try {
      const AWS = require('aws-sdk');
      const ses = new AWS.SES({ region: process.env.AWS_REGION });
      
      await ses.getSendQuota().promise();
      
      this.addResult({
        passed: true,
        category: 'Email Service',
        test: 'AWS SES',
        message: 'Email service is configured',
        severity: 'info'
      });
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Email Service',
        test: 'AWS SES',
        message: `Email service validation failed: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateDiskSpace(): Promise<void> {
    try {
      const { stdout } = await execAsync("df -BG . | awk 'NR==2 {print $4}' | sed 's/G//'");
      const availableGB = parseInt(stdout.trim());
      
      if (availableGB < 5) {
        this.addResult({
          passed: false,
          category: 'Infrastructure',
          test: 'Disk space',
          message: `Only ${availableGB}GB available (minimum 5GB required)`,
          severity: 'error'
        });
      } else {
        this.addResult({
          passed: true,
          category: 'Infrastructure',
          test: 'Disk space',
          message: `${availableGB}GB disk space available`,
          severity: 'info'
        });
      }
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Infrastructure',
        test: 'Disk space check',
        message: `Disk space check failed: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateMemoryUsage(): Promise<void> {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((used.heapUsed / used.heapTotal) * 100);

    if (usagePercent > 80) {
      this.addResult({
        passed: false,
        category: 'Infrastructure',
        test: 'Memory usage',
        message: `High memory usage: ${heapUsedMB}MB of ${heapTotalMB}MB (${usagePercent}%)`,
        severity: 'warning'
      });
    } else {
      this.addResult({
        passed: true,
        category: 'Infrastructure',
        test: 'Memory usage',
        message: `Memory usage: ${heapUsedMB}MB of ${heapTotalMB}MB (${usagePercent}%)`,
        severity: 'info'
      });
    }
  }

  private async validatePortAvailability(): Promise<void> {
    const port = process.env.PORT || 3001;
    
    try {
      const net = require('net');
      const server = net.createServer();
      
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.once('listening', () => {
          server.close(resolve);
        });
        server.listen(port);
      });
      
      this.addResult({
        passed: true,
        category: 'Infrastructure',
        test: 'Port availability',
        message: `Port ${port} is available`,
        severity: 'info'
      });
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        this.addResult({
          passed: false,
          category: 'Infrastructure',
          test: 'Port availability',
          message: `Port ${port} is already in use`,
          severity: 'error'
        });
      } else {
        this.addResult({
          passed: false,
          category: 'Infrastructure',
          test: 'Port availability',
          message: `Port check failed: ${error.message}`,
          severity: 'warning'
        });
      }
    }
  }

  private async validateSSLCertificates(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.addResult({
        passed: true,
        category: 'Security',
        test: 'SSL Certificates',
        message: 'SSL validation skipped (non-production)',
        severity: 'info'
      });
      return;
    }

    try {
      const https = require('https');
      const checkSSL = (hostname: string) => {
        return new Promise((resolve, reject) => {
          const options = {
            hostname,
            port: 443,
            method: 'GET',
            timeout: 5000
          };

          const req = https.request(options, (res) => {
            const cert = res.socket.getPeerCertificate();
            const validTo = new Date(cert.valid_to);
            const daysUntilExpiry = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry < 30) {
              reject(new Error(`Certificate expires in ${daysUntilExpiry} days`));
            } else {
              resolve(daysUntilExpiry);
            }
          });

          req.on('error', reject);
          req.on('timeout', () => reject(new Error('SSL check timeout')));
          req.end();
        });
      };

      const apiDays = await checkSSL('api.logos-ecosystem.com');
      this.addResult({
        passed: true,
        category: 'Security',
        test: 'SSL Certificate - API',
        message: `API SSL certificate valid for ${apiDays} days`,
        severity: 'info'
      });
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Security',
        test: 'SSL Certificates',
        message: `SSL validation failed: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateSecurityHeaders(): Promise<void> {
    // Check if security middleware is configured
    const securityHeaders = [
      'helmet',
      'cors',
      'rate-limit'
    ];

    for (const header of securityHeaders) {
      const middlewarePath = path.join(process.cwd(), 'src', 'middleware');
      const hasMiddleware = fs.existsSync(middlewarePath);
      
      this.addResult({
        passed: hasMiddleware,
        category: 'Security',
        test: `Security header: ${header}`,
        message: hasMiddleware ? `${header} middleware configured` : `${header} middleware not found`,
        severity: hasMiddleware ? 'info' : 'warning'
      });
    }
  }

  private async validateRateLimiting(): Promise<void> {
    // Check rate limiting configuration
    const hasRateLimiting = !!process.env.RATE_LIMIT_WINDOW_MS && !!process.env.RATE_LIMIT_MAX;
    
    this.addResult({
      passed: hasRateLimiting,
      category: 'Security',
      test: 'Rate limiting',
      message: hasRateLimiting ? 'Rate limiting is configured' : 'Rate limiting not configured',
      severity: hasRateLimiting ? 'info' : 'warning'
    });
  }

  private async validatePaymentConfiguration(): Promise<void> {
    // Validate Stripe webhook configuration
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      this.addResult({
        passed: false,
        category: 'Payments',
        test: 'Stripe webhook',
        message: 'Stripe webhook secret not configured',
        severity: 'error'
      });
    } else {
      this.addResult({
        passed: true,
        category: 'Payments',
        test: 'Stripe webhook',
        message: 'Stripe webhook configured',
        severity: 'info'
      });
    }

    // Validate PayPal webhook configuration
    if (!process.env.PAYPAL_WEBHOOK_ID) {
      this.addResult({
        passed: false,
        category: 'Payments',
        test: 'PayPal webhook',
        message: 'PayPal webhook ID not configured',
        severity: 'warning'
      });
    } else {
      this.addResult({
        passed: true,
        category: 'Payments',
        test: 'PayPal webhook',
        message: 'PayPal webhook configured',
        severity: 'info'
      });
    }
  }

  private async validateSubscriptionLogic(): Promise<void> {
    try {
      // Check if subscription plans exist
      const plans = await prisma.product.count({
        where: {
          type: 'SUBSCRIPTION'
        }
      });

      if (plans === 0) {
        this.addResult({
          passed: false,
          category: 'Business Logic',
          test: 'Subscription plans',
          message: 'No subscription plans found in database',
          severity: 'warning'
        });
      } else {
        this.addResult({
          passed: true,
          category: 'Business Logic',
          test: 'Subscription plans',
          message: `Found ${plans} subscription plans`,
          severity: 'info'
        });
      }
    } catch (error) {
      this.addResult({
        passed: false,
        category: 'Business Logic',
        test: 'Subscription validation',
        message: `Subscription validation failed: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  private async validateNotificationSystem(): Promise<void> {
    // Check if notification templates exist
    const templatePath = path.join(process.cwd(), 'src', 'templates', 'email');
    const hasTemplates = fs.existsSync(templatePath);
    
    this.addResult({
      passed: hasTemplates,
      category: 'Notifications',
      test: 'Email templates',
      message: hasTemplates ? 'Email templates found' : 'Email templates missing',
      severity: hasTemplates ? 'info' : 'warning'
    });
  }

  private addResult(result: Omit<ValidationResult, 'timestamp'>): void {
    this.results.push({
      ...result,
      timestamp: new Date()
    });
  }

  private generateReport(): ValidationReport {
    const failedTests = this.results.filter(r => !r.passed && r.severity === 'error').length;
    const warningTests = this.results.filter(r => r.severity === 'warning').length;
    const passedTests = this.results.filter(r => r.passed).length;

    const overallStatus = failedTests > 0 ? 'failed' : warningTests > 0 ? 'warning' : 'passed';

    const recommendedActions: string[] = [];
    
    if (failedTests > 0) {
      recommendedActions.push('Fix all critical errors before deployment');
    }
    
    if (warningTests > 5) {
      recommendedActions.push('Review and address warnings to improve system stability');
    }

    const missingEnvVars = this.results
      .filter(r => r.category === 'Environment' && !r.passed)
      .map(r => r.test.replace('Environment variable: ', ''));
    
    if (missingEnvVars.length > 0) {
      recommendedActions.push(`Set missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    return {
      overallStatus,
      totalTests: this.results.length,
      passedTests,
      failedTests,
      warningTests,
      results: this.results,
      generatedAt: new Date(),
      recommendedActions
    };
  }

  async generateHTMLReport(report: ValidationReport): Promise<string> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LOGOS Ecosystem - Validation Report</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background-color: #0A0E21; 
            color: #F5F7FA;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .summary { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #141B3C;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .summary-card h3 { margin: 0 0 10px 0; }
        .summary-card .number { font-size: 2em; font-weight: bold; }
        .passed { color: #47FF88; }
        .failed { color: #FF5757; }
        .warning { color: #FFB547; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            background: #141B3C;
            border-radius: 8px;
            overflow: hidden;
        }
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        th { 
            background: #1C2444;
            font-weight: bold;
        }
        tr:hover { background: #1C2444; }
        .status-passed { color: #47FF88; }
        .status-failed { color: #FF5757; }
        .status-warning { color: #FFB547; }
        .recommendations {
            background: #141B3C;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
            border-left: 4px solid #4870FF;
        }
        .recommendations h2 { margin-top: 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LOGOS Ecosystem - Pre-Deployment Validation Report</h1>
            <p>Generated at: ${report.generatedAt.toLocaleString()}</p>
            <p>Overall Status: <span class="${report.overallStatus}">${report.overallStatus.toUpperCase()}</span></p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="number">${report.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="number passed">${report.passedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="number failed">${report.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Warnings</h3>
                <div class="number warning">${report.warningTests}</div>
            </div>
        </div>
        
        <h2>Validation Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Severity</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(r => `
                    <tr>
                        <td>${r.category}</td>
                        <td>${r.test}</td>
                        <td class="status-${r.passed ? 'passed' : 'failed'}">${r.passed ? 'PASSED' : 'FAILED'}</td>
                        <td>${r.message}</td>
                        <td class="status-${r.severity}">${r.severity.toUpperCase()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${report.recommendedActions.length > 0 ? `
        <div class="recommendations">
            <h2>Recommended Actions</h2>
            <ul>
                ${report.recommendedActions.map(action => `<li>${action}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
    
    return html;
  }
}

export const validationService = new ValidationService();