"""
API documentation configuration using FastAPI's built-in OpenAPI support
"""

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

def custom_openapi(app: FastAPI):
    """
    Custom OpenAPI schema generation with enhanced documentation
    """
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="LOGOS AI Ecosystem API",
        version="1.0.0",
        description="""
# LOGOS AI Ecosystem API Documentation

Welcome to the LOGOS AI Ecosystem API. This is a comprehensive AI-native platform that combines:

- 🤖 **AI Integration**: Claude Opus 4 powered chat, content generation, and analysis
- 🛍️ **Marketplace**: Buy and sell AI models, prompts, datasets, and services
- 💰 **Wallet System**: Secure payment processing with Stripe integration
- 🔐 **Authentication**: JWT-based auth with refresh tokens
- 🚀 **Real-time Updates**: WebSocket support for live notifications
- 📁 **File Management**: Local and S3 storage support for uploads

## Authentication

Most endpoints require authentication. Use the `/api/v1/auth/token` endpoint to obtain access and refresh tokens.

```bash
curl -X POST "https://api.logos.ai/api/v1/auth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=your_username&password=your_password"
```

Include the access token in subsequent requests:

```bash
curl -X GET "https://api.logos.ai/api/v1/users/me" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Rate Limiting

API requests are rate limited:
- **General endpoints**: 60 requests per minute
- **Auth endpoints**: 5 requests per minute
- **AI endpoints**: Based on your subscription plan

## WebSocket Connection

Connect to real-time updates:

```javascript
const ws = new WebSocket('wss://api.logos.ai/ws?token=YOUR_ACCESS_TOKEN');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Error message",
  "status_code": 400,
  "error_code": "VALIDATION_ERROR"
}
```

## Pagination

List endpoints support pagination:
- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip

## Support

For API support, contact: api-support@logos.ai
        """,
        routes=app.routes,
        tags=[
            {
                "name": "auth",
                "description": "Authentication and authorization endpoints",
                "externalDocs": {
                    "description": "Auth documentation",
                    "url": "https://docs.logos.ai/api/auth",
                },
            },
            {
                "name": "users",
                "description": "User profile and account management",
            },
            {
                "name": "ai",
                "description": "AI-powered features including chat and content generation",
            },
            {
                "name": "marketplace",
                "description": "Browse, list, and purchase AI assets",
            },
            {
                "name": "wallet",
                "description": "Manage wallet balance and transactions",
            },
            {
                "name": "upload",
                "description": "File upload and management",
            },
            {
                "name": "health",
                "description": "System health and monitoring",
            },
        ],
        servers=[
            {"url": "https://api.logos.ai", "description": "Production server"},
            {"url": "https://staging-api.logos.ai", "description": "Staging server"},
            {"url": "http://localhost:8000", "description": "Development server"},
        ],
        contact={
            "name": "LOGOS AI Support",
            "url": "https://logos.ai/support",
            "email": "support@logos.ai",
        },
        license_info={
            "name": "MIT",
            "url": "https://opensource.org/licenses/MIT",
        },
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter the token with the `Bearer ` prefix, e.g. 'Bearer abcde12345'",
        }
    }
    
    # Add global security requirement (can be overridden per endpoint)
    openapi_schema["security"] = [{"bearerAuth": []}]
    
    # Add response examples
    openapi_schema["components"]["responses"] = {
        "UnauthorizedError": {
            "description": "Authentication required",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "detail": {"type": "string", "example": "Not authenticated"},
                            "status_code": {"type": "integer", "example": 401},
                            "error_code": {"type": "string", "example": "UNAUTHORIZED"},
                        },
                    }
                }
            },
        },
        "ForbiddenError": {
            "description": "Insufficient permissions",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "detail": {"type": "string", "example": "Not enough permissions"},
                            "status_code": {"type": "integer", "example": 403},
                            "error_code": {"type": "string", "example": "FORBIDDEN"},
                        },
                    }
                }
            },
        },
        "NotFoundError": {
            "description": "Resource not found",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "detail": {"type": "string", "example": "Resource not found"},
                            "status_code": {"type": "integer", "example": 404},
                            "error_code": {"type": "string", "example": "NOT_FOUND"},
                        },
                    }
                }
            },
        },
        "ValidationError": {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "detail": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "loc": {"type": "array", "items": {"type": "string"}},
                                        "msg": {"type": "string"},
                                        "type": {"type": "string"},
                                    },
                                },
                            }
                        },
                    }
                }
            },
        },
    }
    
    # Add common schemas
    openapi_schema["components"]["schemas"]["PaginationParams"] = {
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100,
                "default": 20,
                "description": "Number of items per page",
            },
            "offset": {
                "type": "integer",
                "minimum": 0,
                "default": 0,
                "description": "Number of items to skip",
            },
        },
    }
    
    openapi_schema["components"]["schemas"]["PaginatedResponse"] = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {"type": "object"},
                "description": "List of items",
            },
            "total": {
                "type": "integer",
                "description": "Total number of items",
            },
            "limit": {
                "type": "integer",
                "description": "Items per page",
            },
            "offset": {
                "type": "integer",
                "description": "Number of items skipped",
            },
            "has_more": {
                "type": "boolean",
                "description": "Whether more items are available",
            },
        },
        "required": ["items", "total", "limit", "offset"],
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema