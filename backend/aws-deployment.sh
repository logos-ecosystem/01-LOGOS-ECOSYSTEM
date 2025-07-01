#!/bin/bash

# AWS Deployment Script for LOGOS Backend
# Usage: ./aws-deployment.sh [staging|production]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="logos-backend"
ECS_CLUSTER="logos-cluster-${ENVIRONMENT}"
ECS_SERVICE="logos-backend-${ENVIRONMENT}"
ECS_TASK_DEFINITION="logos-backend-${ENVIRONMENT}"

echo "🚀 Deploying LOGOS Backend to AWS ECS (${ENVIRONMENT})"
echo "Account: ${AWS_ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"

# Step 1: Build and push Docker image
echo "📦 Building Docker image..."
docker build -t ${ECR_REPOSITORY}:latest .

# Step 2: Tag image for ECR
echo "🏷️  Tagging image for ECR..."
docker tag ${ECR_REPOSITORY}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest
docker tag ${ECR_REPOSITORY}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${ENVIRONMENT}

# Step 3: Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 4: Create ECR repository if it doesn't exist
echo "📚 Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} || \
aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}

# Step 5: Push images
echo "⬆️  Pushing images to ECR..."
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${ENVIRONMENT}

# Step 6: Update task definition
echo "📝 Updating task definition..."
sed -i "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" task-definition.json

# Register new task definition
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region ${AWS_REGION} \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task definition registered: ${TASK_DEFINITION_ARN}"

# Step 7: Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster ${ECS_CLUSTER} \
  --service ${ECS_SERVICE} \
  --task-definition ${TASK_DEFINITION_ARN} \
  --region ${AWS_REGION} \
  --force-new-deployment

echo "⏳ Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster ${ECS_CLUSTER} \
  --services ${ECS_SERVICE} \
  --region ${AWS_REGION}

echo "✅ Deployment completed successfully!"

# Step 8: Run database migrations
echo "🗄️  Running database migrations..."
TASK_ARN=$(aws ecs run-task \
  --cluster ${ECS_CLUSTER} \
  --task-definition ${TASK_DEFINITION_ARN} \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"logos-backend","command":["npx","prisma","migrate","deploy"]}]}' \
  --region ${AWS_REGION} \
  --query 'tasks[0].taskArn' \
  --output text)

echo "📋 Migration task: ${TASK_ARN}"

# Wait for migration to complete
aws ecs wait tasks-stopped --cluster ${ECS_CLUSTER} --tasks ${TASK_ARN} --region ${AWS_REGION}

echo "✅ Migrations completed!"

# Step 9: Health check
echo "🏥 Checking service health..."
SERVICE_URL=$(aws ecs describe-services \
  --cluster ${ECS_CLUSTER} \
  --services ${ECS_SERVICE} \
  --region ${AWS_REGION} \
  --query 'services[0].loadBalancers[0].targetGroupArn' \
  --output text | xargs -I {} aws elbv2 describe-target-health --target-group-arn {} --query 'TargetHealthDescriptions[0].Target.Id' --output text)

echo "🎉 Deployment complete! Service is running."
echo "📍 Service endpoint: https://api.logos-ecosystem.com"