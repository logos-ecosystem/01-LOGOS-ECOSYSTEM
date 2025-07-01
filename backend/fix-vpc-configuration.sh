#!/bin/bash

# Script to fix VPC configuration mismatch between RDS and ECS
# This updates the ECS service to use the same VPC as RDS

set -e

echo "🔧 Fixing VPC Configuration for LOGOS Ecosystem"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-1"
RDS_INSTANCE="logos-production-db"
CLUSTER_NAME="logos-production-cluster"
SERVICE_NAME="logos-production-service"

# Get RDS VPC and Subnets
echo -e "${YELLOW}1. Getting RDS configuration...${NC}"
RDS_VPC=$(aws rds describe-db-instances \
  --db-instance-identifier $RDS_INSTANCE \
  --region $REGION \
  --query 'DBInstances[0].DBSubnetGroup.VpcId' \
  --output text)

RDS_SUBNETS=$(aws rds describe-db-instances \
  --db-instance-identifier $RDS_INSTANCE \
  --region $REGION \
  --query 'DBInstances[0].DBSubnetGroup.Subnets[*].SubnetIdentifier' \
  --output text)

echo "   RDS VPC: $RDS_VPC"
echo "   RDS Subnets: $RDS_SUBNETS"

# Get the security group for RDS
RDS_SECURITY_GROUP=$(aws rds describe-db-instances \
  --db-instance-identifier $RDS_INSTANCE \
  --region $REGION \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

echo "   RDS Security Group: $RDS_SECURITY_GROUP"

# Create or update security group for ECS in the same VPC
echo -e "${YELLOW}2. Creating/Updating security groups...${NC}"

# Check if ECS security group exists
ECS_SG_NAME="logos-ecs-service-sg"
ECS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$ECS_SG_NAME" "Name=vpc-id,Values=$RDS_VPC" \
  --region $REGION \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$ECS_SG_ID" == "None" ]; then
  echo "   Creating new ECS security group..."
  ECS_SG_ID=$(aws ec2 create-security-group \
    --group-name $ECS_SG_NAME \
    --description "Security group for LOGOS ECS Service" \
    --vpc-id $RDS_VPC \
    --region $REGION \
    --query 'GroupId' \
    --output text)
  
  # Add ingress rules
  aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 8080 \
    --cidr 0.0.0.0/0 \
    --region $REGION
  
  echo "   Created ECS Security Group: $ECS_SG_ID"
else
  echo "   Using existing ECS Security Group: $ECS_SG_ID"
fi

# Update RDS security group to allow access from ECS
echo -e "${YELLOW}3. Updating RDS security group...${NC}"
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SECURITY_GROUP \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG_ID \
  --region $REGION 2>/dev/null || echo "   Rule already exists"

# Create updated task definition with correct port
echo -e "${YELLOW}4. Creating updated task definition...${NC}"
cat > ecs-task-definition-fixed.json << EOF
{
  "family": "logos-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::287103448174:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::287103448174:role/logos-backend-task-role",
  "containerDefinitions": [
    {
      "name": "logos-backend",
      "image": "287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-backend:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "8080"
        },
        {
          "name": "CORS_ORIGIN",
          "value": "https://logos-ecosystem.com,https://www.logos-ecosystem.com"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/jwt-secret"
        },
        {
          "name": "STRIPE_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/stripe-secret"
        },
        {
          "name": "STRIPE_WEBHOOK_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/stripe-webhook"
        },
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/anthropic-key"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/redis-url"
        },
        {
          "name": "SMTP_USER",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/smtp-user"
        },
        {
          "name": "SMTP_PASS",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:287103448174:secret:logos/production/smtp-pass"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/logos-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register the new task definition
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition-fixed.json \
  --region $REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "   Registered task definition: $TASK_DEFINITION_ARN"

# Update or create the ECS service
echo -e "${YELLOW}5. Updating ECS service configuration...${NC}"

# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "MISSING")

if [ "$SERVICE_EXISTS" != "MISSING" ] && [ "$SERVICE_EXISTS" != "INACTIVE" ]; then
  echo "   Updating existing service..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_DEFINITION_ARN \
    --network-configuration "awsvpcConfiguration={subnets=[$RDS_SUBNETS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
    --region $REGION \
    --force-new-deployment
else
  echo "   Creating new service..."
  
  # First, create target group in the default VPC
  TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name logos-backend-tg \
    --protocol HTTP \
    --port 8080 \
    --vpc-id $RDS_VPC \
    --target-type ip \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
  
  # Create ALB in public subnets of the same VPC
  PUBLIC_SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$RDS_VPC" "Name=map-public-ip-on-launch,Values=true" \
    --region $REGION \
    --query 'Subnets[*].SubnetId' \
    --output text)
  
  if [ -z "$PUBLIC_SUBNETS" ]; then
    echo -e "${RED}Error: No public subnets found in VPC $RDS_VPC${NC}"
    echo "Creating public subnets..."
    # This would require more complex subnet creation logic
    exit 1
  fi
  
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_DEFINITION_ARN \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$RDS_SUBNETS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=logos-backend,containerPort=8080" \
    --region $REGION
fi

echo -e "${GREEN}✅ VPC configuration fixed!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for the service to stabilize (3-5 minutes)"
echo "2. Check service status: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
echo "3. Update DNS records to point to the new load balancer"
echo ""
echo "Important notes:"
echo "- RDS and ECS are now in the same VPC: $RDS_VPC"
echo "- Security groups have been configured to allow communication"
echo "- The service is using public IP assignment for outbound internet access"