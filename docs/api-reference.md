# API Reference

## Overview

The LOGOS AI Ecosystem API is a RESTful API that provides programmatic access to all platform features. All API requests must be made over HTTPS.

### Base URL
```
Production: https://api.logos-ecosystem.com
Development: http://localhost:5000
```

### Authentication

The API supports two authentication methods:

1. **Bearer Token (JWT)**
```http
Authorization: Bearer <your-jwt-token>
```

2. **API Key**
```http
X-API-Key: <your-api-key>
```

### Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per 15 minutes per user
- **Enterprise**: Custom limits available

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "userId": "user_123abc"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123abc",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "USER"
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123!"
}
```

### User Management

#### Get Current User
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user_123abc",
  "email": "user@example.com",
  "username": "johndoe",
  "role": {
    "name": "USER",
    "permissions": ["products:read", "products:create"]
  },
  "subscription": {
    "plan": "Professional",
    "status": "active",
    "currentPeriodEnd": "2024-02-20T00:00:00Z"
  }
}
```

#### Update Profile
```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

#### Change Password
```http
PUT /api/users/me/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Upload Avatar
```http
POST /api/users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar: <file>
```

### Products

#### List Products
```http
GET /api/products
Authorization: Bearer <token>
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category
- `search` (string): Search query
- `sort` (string): Sort field (name, createdAt, price)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "prod_123",
      "name": "AI Chat Bot",
      "description": "Intelligent conversational agent",
      "category": "CHATBOT",
      "price": 99,
      "features": ["NLP", "Multi-language", "Analytics"],
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Get Product
```http
GET /api/products/:id
Authorization: Bearer <token>
```

#### Create Product
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Custom AI Bot",
  "description": "Tailored AI solution",
  "category": "CUSTOM",
  "configuration": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

#### Update Product
```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Bot Name",
  "configuration": {
    "temperature": 0.8
  }
}
```

#### Delete Product
```http
DELETE /api/products/:id
Authorization: Bearer <token>
```

### Subscriptions

#### Get Current Subscription
```http
GET /api/subscriptions/current
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "sub_123",
  "plan": {
    "id": "plan_pro",
    "name": "Professional",
    "price": 99,
    "interval": "monthly"
  },
  "status": "active",
  "currentPeriodStart": "2024-01-20T00:00:00Z",
  "currentPeriodEnd": "2024-02-20T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

#### List Available Plans
```http
GET /api/subscriptions/plans
```

#### Create Subscription
```http
POST /api/subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "plan_pro",
  "paymentMethodId": "pm_123"
}
```

#### Update Subscription
```http
PUT /api/subscriptions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "plan_enterprise"
}
```

#### Cancel Subscription
```http
DELETE /api/subscriptions/:id
Authorization: Bearer <token>
```

Query Parameters:
- `immediately` (boolean): Cancel immediately or at period end

### Support Tickets

#### Create Ticket
```http
POST /api/support/tickets
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Integration Help",
  "description": "I need help integrating with Slack",
  "priority": "medium",
  "category": "technical"
}
```

#### List Tickets
```http
GET /api/support/tickets
Authorization: Bearer <token>
```

Query Parameters:
- `status` (string): open, in_progress, resolved, closed
- `priority` (string): low, medium, high, urgent
- `page` (number): Page number
- `limit` (number): Items per page

#### Get Ticket
```http
GET /api/support/tickets/:id
Authorization: Bearer <token>
```

#### Update Ticket
```http
PUT /api/support/tickets/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved"
}
```

#### Add Comment
```http
POST /api/support/tickets/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Thanks for the help!"
}
```

### API Keys

#### List API Keys
```http
GET /api/keys
Authorization: Bearer <token>
```

#### Create API Key
```http
POST /api/keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production Key",
  "scopes": ["products:read", "products:create"]
}
```

**Response:**
```json
{
  "id": "key_123",
  "name": "Production Key",
  "key": "sk_live_abcd1234...",
  "scopes": ["products:read", "products:create"],
  "createdAt": "2024-01-20T00:00:00Z"
}
```

**Note:** The full API key is only shown once upon creation.

#### Revoke API Key
```http
DELETE /api/keys/:id
Authorization: Bearer <token>
```

### Analytics

#### Get Usage Analytics
```http
GET /api/analytics/usage
Authorization: Bearer <token>
```

Query Parameters:
- `startDate` (ISO 8601): Start of date range
- `endDate` (ISO 8601): End of date range
- `interval` (string): hour, day, week, month

**Response:**
```json
{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "usage": {
    "apiCalls": 45230,
    "activeProducts": 12,
    "storageUsedGB": 3.4
  },
  "timeline": [
    {
      "date": "2024-01-01",
      "apiCalls": 1523,
      "errors": 12
    }
  ]
}
```

#### Get Performance Metrics
```http
GET /api/analytics/performance
Authorization: Bearer <token>
```

### Webhooks

#### List Webhooks
```http
GET /api/webhooks
Authorization: Bearer <token>
```

#### Create Webhook
```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["product.created", "subscription.updated"],
  "secret": "webhook_secret_123"
}
```

#### Update Webhook
```http
PUT /api/webhooks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "events": ["product.created", "product.updated", "subscription.updated"]
}
```

#### Delete Webhook
```http
DELETE /api/webhooks/:id
Authorization: Bearer <token>
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

## Pagination

List endpoints support pagination:

```http
GET /api/products?page=2&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Webhooks

### Event Types

- `user.created`
- `user.updated`
- `user.deleted`
- `product.created`
- `product.updated`
- `product.deleted`
- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `payment.succeeded`
- `payment.failed`

### Webhook Payload

```json
{
  "id": "evt_123",
  "type": "product.created",
  "created": "2024-01-20T00:00:00Z",
  "data": {
    "object": {
      "id": "prod_123",
      "name": "AI Chat Bot"
    }
  }
}
```

### Webhook Security

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { LogosClient } from '@logos-ecosystem/sdk';

const client = new LogosClient({
  apiKey: process.env.LOGOS_API_KEY
});

// Create a product
const product = await client.products.create({
  name: 'My AI Bot',
  category: 'CHATBOT'
});

// Get subscription
const subscription = await client.subscriptions.getCurrent();
```

### Python

```python
from logos_ai import LogosClient

client = LogosClient(api_key="your_api_key")

# List products
products = client.products.list(limit=10)

# Create ticket
ticket = client.support.create_ticket(
    subject="Need help",
    description="...",
    priority="medium"
)
```

### cURL

```bash
# Get current user
curl -X GET https://api.logos-ecosystem.com/api/users/me \
  -H "Authorization: Bearer your_token"

# Create product
curl -X POST https://api.logos-ecosystem.com/api/products \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"AI Bot","category":"CHATBOT"}'
```

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Handle Rate Limits**: Implement exponential backoff
3. **Validate Webhooks**: Always verify webhook signatures
4. **Error Handling**: Implement robust error handling
5. **Pagination**: Use pagination for list endpoints
6. **API Versioning**: Include version in Accept header
7. **Idempotency**: Use idempotency keys for critical operations

## Support

- API Status: https://status.logos-ecosystem.com
- Documentation: https://docs.logos-ecosystem.com
- Support: support@logos-ecosystem.com