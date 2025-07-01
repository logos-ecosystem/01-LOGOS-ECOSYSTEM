# 🚀 LOGOS AI Ecosystem - Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. AWS Account Setup (logos-ecosystem@gmail.com)
- [ ] AWS Account created and verified
- [ ] AWS CLI configured with credentials
- [ ] Billing alerts configured
- [ ] IAM user created with appropriate permissions

### 2. Vercel Account Setup (logos-ecosystem@gmail.com)
- [ ] Vercel account created
- [ ] GitHub integration connected
- [ ] Domain verified (if custom domain)

### 3. Stripe Configuration
- [ ] Stripe account verified
- [ ] Products and prices created in Stripe Dashboard
- [ ] Webhook endpoint configured
- [ ] Test mode disabled for production

## 🔧 Backend Deployment (AWS)

### 1. Infrastructure Setup
```bash
# Deploy CloudFormation stack
aws cloudformation create-stack \
  --stack-name logos-production \
  --template-body file://aws-infrastructure.yaml \
  --parameters ParameterKey=DBPassword,ParameterValue=YOUR_SECURE_PASSWORD \
  --capabilities CAPABILITY_NAMED_IAM
```

### 2. Secrets Configuration
```bash
cd backend
./setup-aws-secrets.sh production
```

### 3. Database Setup
```bash
# After RDS is created, run migrations
DATABASE_URL=postgresql://... npx prisma migrate deploy
npx prisma db seed
```

### 4. ECR Repository
```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name logos-backend \
  --region us-east-1
```

### 5. Deploy Backend
```bash
cd backend
./aws-deployment.sh production
```

### 6. Configure Load Balancer SSL
- [ ] Request ACM certificate for api.logos-ecosystem.com
- [ ] Update ALB listener to use HTTPS
- [ ] Update security groups

## 🎨 Frontend Deployment (Vercel)

### 1. Environment Variables in Vercel Dashboard
Add these in Vercel project settings:

```
NEXT_PUBLIC_APP_NAME=LOGOS AI Ecosystem
NEXT_PUBLIC_APP_URL=https://logos-ecosystem.com
NEXT_PUBLIC_API_URL=https://api.logos-ecosystem.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 2. Deploy to Vercel
```bash
cd frontend
vercel --prod
```

### 3. Custom Domain Setup
- [ ] Add domain in Vercel dashboard
- [ ] Update DNS records at your registrar
- [ ] Wait for SSL certificate provisioning

## 🔒 Security Checklist

### Backend Security
- [ ] All secrets in AWS Secrets Manager
- [ ] Security groups properly configured
- [ ] WAF rules enabled
- [ ] SSL/TLS certificates active
- [ ] Database encryption enabled
- [ ] Backup strategy configured

### Frontend Security
- [ ] Environment variables properly set
- [ ] CORS configured correctly
- [ ] CSP headers configured
- [ ] API keys not exposed in code

## 📊 Post-Deployment Verification

### 1. Health Checks
```bash
# Backend health
curl https://api.logos-ecosystem.com/health

# Frontend
curl https://logos-ecosystem.com
```

### 2. Critical User Flows
- [ ] User registration works
- [ ] Login/logout works
- [ ] Payment processing works
- [ ] WebSocket connections work
- [ ] File uploads work

### 3. Monitoring Setup
- [ ] CloudWatch alarms configured
- [ ] Sentry receiving errors
- [ ] Logs aggregating properly
- [ ] Metrics dashboard accessible

### 4. Performance Tests
- [ ] Load testing completed
- [ ] Response times acceptable
- [ ] CDN cache hit ratio good
- [ ] Database queries optimized

## 🔄 Rollback Plan

### Backend Rollback
```bash
# Rollback to previous ECS task definition
aws ecs update-service \
  --cluster logos-cluster-production \
  --service logos-backend-production \
  --task-definition logos-backend-production:PREVIOUS_VERSION
```

### Frontend Rollback
```bash
# Rollback in Vercel dashboard or CLI
vercel rollback
```

## 📞 Support Contacts

- **AWS Support**: Available in AWS Console
- **Vercel Support**: support@vercel.com
- **Stripe Support**: Available in Stripe Dashboard
- **Domain Registrar**: Check your provider

## 🎯 Go-Live Checklist

### Final Checks
- [ ] All environment variables set
- [ ] SSL certificates active
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Team access configured
- [ ] Documentation updated

### DNS Switch
- [ ] Update DNS records to point to production
- [ ] Monitor propagation
- [ ] Test from multiple locations

### Communication
- [ ] Status page updated
- [ ] Team notified
- [ ] Support ready

## 🚨 Emergency Procedures

### High Priority Issues
1. **Database Down**: Check RDS status, failover if needed
2. **API Down**: Check ECS tasks, ALB target health
3. **Frontend Down**: Check Vercel status page
4. **Payment Issues**: Check Stripe dashboard, webhook logs

### Contact Escalation
1. On-call engineer
2. Technical lead
3. CTO/Founder

---

## 📝 Notes

**Current Status**:
- Backend ALB: `logos-backend-alb-915729089.us-east-1.elb.amazonaws.com`
- Stripe Test Key: `pk_test_51QddgKFMBBiwv1cOoSNnQlsNv6gRWOySSgMgOZP5OOLBczv4M9oqgKECKpkU58wJdGg4sQJsEPTOUw3yYzjuJZdT00iFOu3dSy`

**Important**: 
- Replace all test keys with production keys before go-live
- Update all URLs to use HTTPS in production
- Ensure all secrets are properly stored in AWS Secrets Manager

**Deployment Order**:
1. Deploy backend infrastructure
2. Configure secrets
3. Deploy backend application
4. Deploy frontend
5. Configure DNS
6. Test everything
7. Go live! 🎉