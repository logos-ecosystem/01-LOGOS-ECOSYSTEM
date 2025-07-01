import { Request, Response, NextFunction } from 'express';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  lastCheck: Date;
}

class MonitoringService extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private requestMetrics: Map<string, any> = new Map();
  private systemMetrics: any = {};
  private startTime: Date;

  constructor() {
    super();
    this.startTime = new Date();
    this.startSystemMonitoring();
  }

  // System metrics collection
  private startSystemMonitoring() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  private collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const loadAverage = os.loadavg();

    this.systemMetrics = {
      cpu: {
        count: cpus.length,
        usage: this.calculateCPUUsage(cpus),
        loadAverage: {
          '1min': loadAverage[0],
          '5min': loadAverage[1],
          '15min': loadAverage[2],
        },
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        percentage: ((totalMemory - freeMemory) / totalMemory) * 100,
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform(),
      hostname: os.hostname(),
    };

    // Record metrics
    this.recordMetric('system.cpu.usage', this.systemMetrics.cpu.usage);
    this.recordMetric('system.memory.percentage', this.systemMetrics.memory.percentage);
  }

  private calculateCPUUsage(cpus: os.CpuInfo[]): number {
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof os.CpuTimes];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - ~~(100 * totalIdle / totalTick);
  }

  // Request monitoring middleware
  requestMonitor() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = performance.now();
      const path = req.route?.path || req.path;
      const method = req.method;
      const key = `${method}:${path}`;

      // Track response
      const originalSend = res.send;
      res.send = function(data) {
        res.send = originalSend;
        const duration = performance.now() - start;
        
        // Record metrics
        this.recordRequestMetric(key, {
          method,
          path,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date(),
        });

        // Record metric
        this.recordMetric('http.request.duration', duration, {
          method,
          path,
          status: res.statusCode.toString(),
        });

        return res.send(data);
      };

      next();
    };
  }

  // Record metrics
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only last 1000 metrics per name
    if (metrics.length > 1000) {
      metrics.shift();
    }

    // Emit metric event
    this.emit('metric', metric);
  }

  // Record request metrics
  private recordRequestMetric(key: string, data: any) {
    if (!this.requestMetrics.has(key)) {
      this.requestMetrics.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        lastRequest: null,
      });
    }

    const metric = this.requestMetrics.get(key);
    metric.count++;
    metric.totalDuration += data.duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, data.duration);
    metric.maxDuration = Math.max(metric.maxDuration, data.duration);
    metric.lastRequest = data.timestamp;

    if (data.statusCode >= 400) {
      metric.errors++;
    }
  }

  // Health check management
  async performHealthCheck(
    name: string,
    checkFunction: () => Promise<boolean>,
    timeout: number = 5000
  ): Promise<HealthCheckResult> {
    const start = performance.now();
    
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), timeout);
      });

      const healthy = await Promise.race([checkFunction(), timeoutPromise]);
      const responseTime = performance.now() - start;

      const result: HealthCheckResult = {
        service: name,
        status: healthy ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date(),
      };

      this.healthChecks.set(name, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        service: name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: performance.now() - start,
        lastCheck: new Date(),
      };

      this.healthChecks.set(name, result);
      return result;
    }
  }

  // Get all metrics
  getMetrics(name?: string): Metric[] | Map<string, Metric[]> {
    if (name) {
      return this.metrics.get(name) || [];
    }
    return this.metrics;
  }

  // Get request metrics
  getRequestMetrics(): any {
    const summary: any = {
      endpoints: {},
      total: {
        requests: 0,
        errors: 0,
        avgDuration: 0,
      },
    };

    this.requestMetrics.forEach((metric, key) => {
      summary.endpoints[key] = {
        count: metric.count,
        avgDuration: metric.avgDuration.toFixed(2),
        minDuration: metric.minDuration.toFixed(2),
        maxDuration: metric.maxDuration.toFixed(2),
        errorRate: ((metric.errors / metric.count) * 100).toFixed(2) + '%',
        lastRequest: metric.lastRequest,
      };

      summary.total.requests += metric.count;
      summary.total.errors += metric.errors;
    });

    if (summary.total.requests > 0) {
      let totalDuration = 0;
      this.requestMetrics.forEach(metric => {
        totalDuration += metric.totalDuration;
      });
      summary.total.avgDuration = (totalDuration / summary.total.requests).toFixed(2);
      summary.total.errorRate = ((summary.total.errors / summary.total.requests) * 100).toFixed(2) + '%';
    }

    return summary;
  }

  // Get system metrics
  getSystemMetrics() {
    return {
      ...this.systemMetrics,
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
        service: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      },
    };
  }

  // Get health status
  getHealthStatus(): { overall: string; services: HealthCheckResult[] } {
    const services = Array.from(this.healthChecks.values());
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let overall = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return { overall, services };
  }

  // Performance profiling
  startProfiling(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(`profiling.${label}`, duration);
    };
  }

  // Alert management
  checkAlerts() {
    // CPU usage alert
    if (this.systemMetrics.cpu?.usage > 80) {
      this.emit('alert', {
        type: 'cpu',
        severity: 'warning',
        message: `High CPU usage: ${this.systemMetrics.cpu.usage}%`,
      });
    }

    // Memory usage alert
    if (this.systemMetrics.memory?.percentage > 90) {
      this.emit('alert', {
        type: 'memory',
        severity: 'critical',
        message: `High memory usage: ${this.systemMetrics.memory.percentage.toFixed(2)}%`,
      });
    }

    // Request errors alert
    const requestSummary = this.getRequestMetrics();
    if (requestSummary.total.errorRate && parseFloat(requestSummary.total.errorRate) > 5) {
      this.emit('alert', {
        type: 'errors',
        severity: 'warning',
        message: `High error rate: ${requestSummary.total.errorRate}`,
      });
    }
  }

  // Export metrics for external monitoring
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    if (format === 'prometheus') {
      let output = '';
      
      // System metrics
      output += `# HELP system_cpu_usage CPU usage percentage\n`;
      output += `# TYPE system_cpu_usage gauge\n`;
      output += `system_cpu_usage ${this.systemMetrics.cpu?.usage || 0}\n\n`;

      output += `# HELP system_memory_usage Memory usage percentage\n`;
      output += `# TYPE system_memory_usage gauge\n`;
      output += `system_memory_usage ${this.systemMetrics.memory?.percentage || 0}\n\n`;

      // Request metrics
      this.requestMetrics.forEach((metric, key) => {
        const [method, path] = key.split(':');
        output += `# HELP http_requests_total Total HTTP requests\n`;
        output += `# TYPE http_requests_total counter\n`;
        output += `http_requests_total{method="${method}",path="${path}"} ${metric.count}\n\n`;

        output += `# HELP http_request_duration_seconds HTTP request duration\n`;
        output += `# TYPE http_request_duration_seconds summary\n`;
        output += `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.5"} ${metric.avgDuration / 1000}\n`;
        output += `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.9"} ${metric.maxDuration / 1000}\n\n`;
      });

      return output;
    }

    // JSON format
    return JSON.stringify({
      system: this.getSystemMetrics(),
      requests: this.getRequestMetrics(),
      health: this.getHealthStatus(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export monitoring middleware
export const monitor = monitoringService.requestMonitor.bind(monitoringService);

export default monitoringService;