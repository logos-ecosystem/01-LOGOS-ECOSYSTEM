import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'LOGOS Ecosystem API',
      version,
      description: `
# Welcome to LOGOS Ecosystem API

The **LOGOS Ecosystem API** provides developers with powerful tools to integrate AI-powered bots, manage subscriptions, process payments, and access advanced analytics.

## 🚀 Features

- **AI Bot Management**: Create, configure, and deploy AI expert bots
- **Real-time WebSocket**: Live notifications and updates
- **Payment Processing**: Stripe and PayPal integration
- **Multi-language Support**: 8 languages supported
- **Advanced Analytics**: Real-time metrics and insights
- **Support System**: Ticket management with AI assistance

## 🔐 Authentication

All API requests require authentication using JWT tokens. Include your token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

## 📦 Rate Limiting

- **Standard endpoints**: 100 requests per 15 minutes
- **Auth endpoints**: 5 requests per 15 minutes
- **Payment endpoints**: 10 requests per hour

## 🌍 Base URLs

- **Production**: https://api.logos-ecosystem.com
- **Staging**: https://staging-api.logos-ecosystem.com
- **WebSocket**: wss://api.logos-ecosystem.com
      `,
      termsOfService: 'https://logos-ecosystem.com/terms',
      contact: {
        name: 'LOGOS Ecosystem Support',
        email: 'support@logos-ecosystem.com',
        url: 'https://logos-ecosystem.com/support',
      },
      license: {
        name: 'Enterprise License',
        url: 'https://logos-ecosystem.com/license',
      },
    },
    servers: [
      {
        url: 'https://api.logos-ecosystem.com',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.logos-ecosystem.com',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for external integrations',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              default: true,
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            total: {
              type: 'integer',
            },
            totalPages: {
              type: 'integer',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'super_admin'],
            },
            isActive: {
              type: 'boolean',
            },
            emailVerified: {
              type: 'boolean',
            },
            twoFactorEnabled: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['ai_bot', 'api_access', 'storage', 'compute'],
            },
            features: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            pricing: {
              type: 'object',
              properties: {
                monthly: {
                  type: 'number',
                },
                yearly: {
                  type: 'number',
                },
                usage: {
                  type: 'object',
                },
              },
            },
            limits: {
              type: 'object',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'beta'],
            },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            productId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['active', 'cancelled', 'expired', 'suspended'],
            },
            currentPeriodStart: {
              type: 'string',
              format: 'date-time',
            },
            currentPeriodEnd: {
              type: 'string',
              format: 'date-time',
            },
            cancelAtPeriodEnd: {
              type: 'boolean',
            },
            metadata: {
              type: 'object',
            },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            invoiceNumber: {
              type: 'string',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            amount: {
              type: 'number',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'GBP'],
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
            },
            dueDate: {
              type: 'string',
              format: 'date',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                  },
                  quantity: {
                    type: 'number',
                  },
                  unitPrice: {
                    type: 'number',
                  },
                  total: {
                    type: 'number',
                  },
                },
              },
            },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            ticketNumber: {
              type: 'string',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            subject: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['open', 'in_progress', 'resolved', 'closed'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            category: {
              type: 'string',
            },
            assignedTo: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            resolvedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Unauthorized',
                code: 'AUTH_REQUIRED',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Forbidden',
                code: 'INSUFFICIENT_PERMISSIONS',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Not found',
                code: 'RESOURCE_NOT_FOUND',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {
                  field: 'email',
                  message: 'Invalid email format',
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED',
                details: {
                  retryAfter: 900,
                },
              },
            },
          },
        },
      },
      parameters: {
        pageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        limitParam: {
          name: 'limit',
          in: 'query',
          description: 'Items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        searchParam: {
          name: 'search',
          in: 'query',
          description: 'Search query',
          required: false,
          schema: {
            type: 'string',
          },
        },
        sortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field and order (e.g., createdAt:desc)',
          required: false,
          schema: {
            type: 'string',
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Products',
        description: 'AI bot and service management',
      },
      {
        name: 'Subscriptions',
        description: 'Subscription management',
      },
      {
        name: 'Payments',
        description: 'Payment processing (Stripe & PayPal)',
      },
      {
        name: 'Invoices',
        description: 'Invoice generation and management',
      },
      {
        name: 'Support',
        description: 'Support ticket system',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting',
      },
      {
        name: 'Webhooks',
        description: 'Webhook configuration',
      },
      {
        name: 'System',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/api/routes/*.ts',
    './src/controllers/*.ts',
    './src/api/controllers/*.ts',
  ],
};

export default swaggerOptions;