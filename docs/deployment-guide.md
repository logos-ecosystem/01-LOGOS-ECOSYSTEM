# Deployment Guide

## Overview

This guide covers deploying the LOGOS AI Ecosystem to production environments. The application is designed for cloud-native deployment with automatic scaling and high availability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CDN (CloudFlare)                     │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (HTTPS)                     │
└─────────────────────────────────────────────────────────────┘
                    │                      │
                    ▼                      ▼
        ┌──────────────────┐    ┌──────────────────┐
        │  Frontend (Next) │    │  Backend (API)    │
        │     (Vercel)     │    │  (Cloud Run/ECS)  │
        └──────────────────┘    └──────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────┐
                    │                                       │
                    ▼                                       ▼
        ┌──────────────────┐                    ┌──────────────────┐
        │   PostgreSQL     │                    │      Redis       │
        │  (Cloud SQL/RDS) │                    │ (Memorystore/   │
        └──────────────────┘                    │  ElastiCache)   │
                                               └──────────────────┘
```

## Prerequisites

- Domain name with DNS control
- Cloud provider account (GCP/AWS/Azure)
- Docker installed locally
- GitHub repository access
- Stripe account configured
- SSL certificates (or use Let's Encrypt)

## Environment Preparation

### 1. Production Environment Variables

Create production `.env` files with all required variables:

```bash
# Backend Production .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/logos_prod
REDIS_URL=redis://redis-host:6379
JWT_SECRET=<generate-secure-secret>
STRIPE_SECRET_KEY=sk_live_...
SENTRY_DSN=https://...@sentry.io/...
```

### 2. Database Setup

#### PostgreSQL on Cloud SQL (GCP)

```bash
# Create Cloud SQL instance
gcloud sql instances create logos-db \
  --database-version=POSTGRES_14 \
  --tier=db-g1-small \
  --region=us-central1

# Create database
gcloud sql databases create logos_prod --instance=logos-db

# Create user
gcloud sql users create logos_user \
  --instance=logos-db \
  --password=secure_password
```

#### PostgreSQL on RDS (AWS)

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier logos-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username logos_user \
  --master-user-password secure_password \
  --allocated-storage 20
```

### 3. Redis Setup

#### Redis on Google Cloud Memorystore

```bash
gcloud redis instances create logos-cache \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x
```

#### Redis on AWS ElastiCache

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id logos-cache \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1
```

## Frontend Deployment (Vercel)

### 1. Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
cd frontend
vercel link
```

### 2. Configure Environment Variables

```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_GOOGLE_ANALYTICS_ID production
```

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or use GitHub integration for automatic deployments
```

### 4. Custom Domain

1. Add domain in Vercel dashboard
2. Update DNS records:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```

## Backend Deployment

### Option 1: Google Cloud Run

#### 1. Build Docker Image

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080
CMD ["npm", "start"]
```

#### 2. Build and Push Image

```bash
# Build image
docker build -t gcr.io/your-project/logos-api:latest ./backend

# Push to Google Container Registry
docker push gcr.io/your-project/logos-api:latest
```

#### 3. Deploy to Cloud Run

```bash
gcloud run deploy logos-api \
  --image gcr.io/your-project/logos-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL=$DATABASE_URL \
  --set-env-vars REDIS_URL=$REDIS_URL
```

### Option 2: AWS ECS

#### 1. Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name logos-cluster
```

#### 2. Create Task Definition

```json
{
  "family": "logos-api",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsExecutionRole",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "logos-api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/logos-api:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:123456789:secret:db-url"
        }
      ]
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512"
}
```

#### 3. Create Service

```bash
aws ecs create-service \
  --cluster logos-cluster \
  --service-name logos-api \
  --task-definition logos-api:1 \
  --desired-count 2 \
  --launch-type FARGATE
```

### Option 3: Kubernetes (GKE/EKS)

#### 1. Kubernetes Manifests

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logos-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: logos-api
  template:
    metadata:
      labels:
        app: logos-api
    spec:
      containers:
      - name: api
        image: gcr.io/your-project/logos-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: logos-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: logos-api-service
spec:
  selector:
    app: logos-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

#### 2. Deploy to Kubernetes

```bash
# Create secrets
kubectl create secret generic logos-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=jwt-secret=$JWT_SECRET

# Apply manifests
kubectl apply -f k8s/
```

## Database Migrations

### Production Migration Strategy

1. **Backup Database**
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

2. **Run Migrations**
```bash
cd backend
npx prisma migrate deploy
```

3. **Verify Migration**
```bash
npx prisma db pull
npx prisma validate
```

## SSL/TLS Configuration

### CloudFlare SSL

1. Add site to CloudFlare
2. Enable "Full (strict)" SSL mode
3. Enable "Always Use HTTPS"
4. Configure Page Rules for caching

### Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --webroot -w /var/www/html -d logos-ecosystem.com -d www.logos-ecosystem.com

# Auto-renewal
sudo certbot renew --dry-run
```

## CDN Configuration

### CloudFlare Setup

1. **DNS Configuration**
   ```
   A     api    YOUR_BACKEND_IP
   A     @      YOUR_FRONTEND_IP
   CNAME www    @
   ```

2. **Page Rules**
   - `api.logos-ecosystem.com/*` - Cache Level: Bypass
   - `*.logos-ecosystem.com/static/*` - Cache Level: Cache Everything
   - `*.logos-ecosystem.com/*.js` - Cache Level: Cache Everything, Edge Cache TTL: 1 month

3. **Security Settings**
   - Enable WAF
   - Configure rate limiting
   - Set up DDoS protection

## Monitoring Setup

### 1. Health Checks

Configure uptime monitoring:
- Frontend: `https://logos-ecosystem.com/`
- Backend: `https://api.logos-ecosystem.com/health`
- Critical endpoints monitoring

### 2. Application Monitoring

```bash
# Set Sentry DSN in production
SENTRY_DSN=https://xxx@sentry.io/yyy
```

### 3. Infrastructure Monitoring

- **Google Cloud**: Cloud Monitoring
- **AWS**: CloudWatch
- **Custom**: Datadog, New Relic

## Backup Strategy

### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Retain backups for 30 days
find /backups -name "*.sql.gz" -mtime +30 -delete
```

### Application Backups

- Code: Git repository
- User uploads: Object storage with versioning
- Configuration: Encrypted secrets backup

## Scaling Configuration

### Horizontal Scaling

#### Cloud Run Auto-scaling
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: logos-api
  annotations:
    run.googleapis.com/minScale: "1"
    run.googleapis.com/maxScale: "100"
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "80"
```

#### Kubernetes HPA
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: logos-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: logos-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Connection Pooling

```javascript
// Configure Prisma connection pool
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 25
}
```

## Security Hardening

### 1. Network Security

- Configure VPC with private subnets
- Set up Cloud Armor / AWS WAF
- Implement IP whitelisting for admin endpoints

### 2. Secrets Management

```bash
# Google Secret Manager
echo -n "secret-value" | gcloud secrets create my-secret --data-file=-

# AWS Secrets Manager
aws secretsmanager create-secret --name my-secret --secret-string "secret-value"
```

### 3. Security Headers

Ensure all security headers are configured:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy implemented

### Deployment
- [ ] Deploy database migrations
- [ ] Deploy backend services
- [ ] Deploy frontend application
- [ ] Update DNS records
- [ ] Configure CDN

### Post-deployment
- [ ] Verify health endpoints
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify backup execution
- [ ] Update status page

## Rollback Strategy

### Quick Rollback

```bash
# Vercel
vercel rollback

# Cloud Run
gcloud run services update-traffic logos-api --to-revisions=PREV=100

# Kubernetes
kubectl rollout undo deployment/logos-api
```

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup-20240120.sql

# Or use Prisma migrate
npx prisma migrate resolve --rolled-back
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check connection string
   - Verify network connectivity
   - Check connection pool limits

2. **High Memory Usage**
   - Review memory limits
   - Check for memory leaks
   - Optimize queries

3. **Slow Response Times**
   - Enable query logging
   - Check database indexes
   - Review CDN configuration

### Debug Commands

```bash
# Check pod logs (Kubernetes)
kubectl logs -f deployment/logos-api

# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision"

# Database connection test
npx prisma db pull
```

## Support

For deployment assistance:
- Documentation: https://docs.logos-ecosystem.com/deployment
- DevOps Team: devops@logos-ecosystem.com
- Emergency: +1-555-LOGOS-911