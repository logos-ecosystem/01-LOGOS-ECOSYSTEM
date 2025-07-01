# Monitoring & Logging Setup Guide

## Overview

The LOGOS Ecosystem includes comprehensive monitoring and logging capabilities using:
- **Winston** for structured logging
- **Sentry** for error tracking and performance monitoring
- **Custom middleware** for request tracking and metrics
- **Health checks** for service monitoring

## Setup Instructions

### 1. Sentry Configuration

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project for your application
3. Copy your DSN from Project Settings > Client Keys
4. Add to your `.env` file:

```env
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/0
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% in production
SENTRY_PROFILES_SAMPLE_RATE=0.1 # 10% in production
```

### 2. Logging Configuration

Configure logging levels in your `.env`:

```env
LOG_LEVEL=info  # Options: error, warn, info, http, debug
```

Log files are automatically created in the `logs/` directory:
- `error.log` - Error-level logs only
- `combined.log` - All logs
- `requests.log` - HTTP request logs
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### 3. Monitoring Endpoints

#### Health Check
```bash
GET /health
```

Returns system health status:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "healthy",
    "redis": "healthy"
  },
  "environment": "production",
  "version": "1.0.0"
}
```

#### Metrics Endpoint
```bash
GET /metrics
Authorization: Bearer <token>
```

Returns detailed metrics:
```json
{
  "timestamp": "2024-01-20T10:00:00.000Z",
  "period": "24h",
  "requests": {
    "byStatus": [...],
    "errorCount": 12,
    "avgResponseTime": 125
  },
  "apiUsage": {
    "topEndpoints": [...]
  },
  "system": {
    "uptime": 3600,
    "memory": {...},
    "cpu": {...}
  }
}
```

## Features

### 1. Request Timing
Every request is automatically timed and logged with:
- HTTP method and path
- Response status code
- Duration in milliseconds
- User ID (if authenticated)
- Response time header (`X-Response-Time`)

### 2. Error Tracking
Errors are automatically:
- Logged with full stack traces
- Sent to Sentry with context
- Filtered for sensitive data (passwords, tokens, etc.)
- Stored in error logs

### 3. Performance Monitoring
- Database query monitoring (slow queries > 1s are logged)
- API endpoint performance tracking
- Memory and CPU usage monitoring
- Request rate tracking

### 4. Security Features
- Sensitive data redaction in logs
- IP-based request tracking
- User activity audit logs
- Failed authentication tracking

## Production Best Practices

### 1. Log Rotation
Logs are automatically rotated when they reach 5MB, keeping the last 5 files.

### 2. Performance Sampling
In production, use lower sampling rates:
```env
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of requests
SENTRY_PROFILES_SAMPLE_RATE=0.1 # 10% of requests
```

### 3. Alert Configuration
Set up alerts in Sentry for:
- Error rate spikes
- Performance degradation
- Specific error patterns
- Failed authentication attempts

### 4. Log Aggregation
Consider using a log aggregation service:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **New Relic**
- **CloudWatch** (AWS)

## Monitoring Dashboard

### Key Metrics to Track

1. **Application Health**
   - Uptime percentage
   - Response time (p50, p95, p99)
   - Error rate
   - Request rate

2. **Business Metrics**
   - Active users
   - API usage by endpoint
   - Subscription conversions
   - Support ticket volume

3. **Infrastructure**
   - CPU usage
   - Memory consumption
   - Database connections
   - Redis memory usage

### Setting Up Dashboards

1. **Sentry Dashboard**
   - Error trends
   - Performance metrics
   - User impact analysis
   - Release health

2. **Custom Metrics Dashboard**
   - Use the `/metrics` endpoint data
   - Visualize with Grafana or similar
   - Set up automated alerts

## Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check `LOG_LEVEL` environment variable
   - Ensure `logs/` directory exists and is writable
   - Verify process has write permissions

2. **Sentry not receiving events**
   - Verify `SENTRY_DSN` is correct
   - Check network connectivity
   - Ensure Sentry SDK is properly initialized

3. **High memory usage from logs**
   - Reduce `LOG_LEVEL` to `warn` or `error`
   - Decrease log retention
   - Implement more aggressive rotation

### Debug Mode

Enable debug logging temporarily:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## Monitoring Checklist

- [ ] Sentry DSN configured
- [ ] Log directories created with proper permissions
- [ ] Health check endpoint accessible
- [ ] Metrics endpoint secured with authentication
- [ ] Error alerts configured in Sentry
- [ ] Log rotation verified
- [ ] Performance baselines established
- [ ] Monitoring dashboard set up
- [ ] Alert thresholds configured
- [ ] Backup monitoring in place

## Security Considerations

1. **Access Control**
   - Metrics endpoint requires authentication
   - Log files should be protected
   - Sentry access should be restricted

2. **Data Privacy**
   - Sensitive data is automatically redacted
   - User PII is minimized in logs
   - GDPR compliance for EU users

3. **Audit Trail**
   - All admin actions are logged
   - Authentication attempts tracked
   - API usage monitored per user

## Support

For monitoring issues:
1. Check the troubleshooting section
2. Review Sentry documentation
3. Contact the DevOps team
4. Create a support ticket with error details