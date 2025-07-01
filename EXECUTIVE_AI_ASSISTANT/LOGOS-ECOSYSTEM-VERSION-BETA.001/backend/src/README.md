# LOGOS Backend Source Code

This directory contains the core backend implementation for the LOGOS AI-Native Ecosystem.

## Directory Structure

```
src/
├── api/                # FastAPI application and routes
│   ├── main.py        # Main application entry point
│   ├── deps.py        # Dependency injection
│   ├── docs.py        # API documentation configuration
│   ├── routes/        # API endpoint implementations
│   ├── schemas/       # Pydantic schemas for request/response
│   ├── middleware/    # Custom middleware components
│   └── graphql/       # GraphQL schema and resolvers
├── services/          # Business logic layer
│   ├── agents/        # AI agent implementations
│   ├── ai/           # AI/LLM integration services
│   ├── auth/         # Authentication & authorization
│   ├── marketplace/  # Marketplace functionality
│   ├── payment/      # Payment processing
│   ├── wallet/       # Digital wallet services
│   ├── iot/          # IoT device management
│   ├── automotive/   # Car integration services
│   └── whitelabel/   # Multi-tenant features
├── infrastructure/    # Infrastructure components
│   ├── database/     # Database utilities and optimizations
│   ├── cache/        # Redis caching layer
│   ├── queue/        # Task queue management
│   └── websocket/    # WebSocket connection handling
└── shared/           # Shared utilities and models
    ├── models/       # SQLAlchemy database models
    ├── schemas/      # Base Pydantic schemas
    ├── utils/        # Utility functions
    └── middleware/   # Shared middleware
```

## Key Components

### API Layer (`api/`)
- **FastAPI Application**: High-performance async web framework
- **RESTful Endpoints**: Complete CRUD operations for all resources
- **GraphQL Support**: Alternative query interface for complex data fetching
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Middleware Stack**: Security, compression, monitoring, rate limiting

### Services Layer (`services/`)
- **AI Agents**: 56+ specialized AI agents with unique capabilities
- **Authentication**: JWT-based auth with MFA support
- **Payment Processing**: Stripe, PayPal, and cryptocurrency integration
- **IoT Management**: Device registration, telemetry, and control
- **Real-time Features**: WebSocket-based live updates

### Infrastructure Layer (`infrastructure/`)
- **Database**: PostgreSQL with connection pooling and query optimization
- **Caching**: Multi-level Redis caching for performance
- **Task Queue**: Celery for background job processing
- **WebSocket**: Connection pooling and event broadcasting

## Configuration

The application uses environment-based configuration:
- Development: `config/development.py`
- Production: `config/production.py`
- Testing: `config/testing.py`

## Running the Application

```bash
# Development mode
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
gunicorn src.api.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## API Endpoints

Key endpoint categories:
- `/api/v1/auth/*` - Authentication and user management
- `/api/v1/agents/*` - AI agent interactions
- `/api/v1/marketplace/*` - Marketplace operations
- `/api/v1/wallet/*` - Digital wallet management
- `/api/v1/iot/*` - IoT device control
- `/api/v1/analytics/*` - Analytics and metrics

## Testing

```bash
# Run unit tests for services
pytest tests/unit/ -v

# Run integration tests
pytest tests/integration/ -v

# Run specific service tests
pytest tests/unit/test_auth_service.py -v
```

## Performance Considerations

- Async/await pattern used throughout for non-blocking I/O
- Database query optimization with proper indexing
- Redis caching for frequently accessed data
- Connection pooling for database and Redis
- Background task processing for heavy operations

## Security Features

- JWT token-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS and CSRF protection
- Rate limiting per endpoint
- API key authentication for external services

## Monitoring

- Prometheus metrics exported at `/metrics`
- Health checks at `/health` and `/ready`
- Structured logging with correlation IDs
- Performance tracking for all database queries
- Real-time error tracking and alerting