# 🔧 Backend - LOGOS ECOSYSTEM

## Descripción

El backend de LOGOS ECOSYSTEM está construido con FastAPI (Python) y proporciona una API RESTful robusta y escalable para todos los servicios de la plataforma.

## 🚀 Características

- **FastAPI Framework**: Alto rendimiento y documentación automática
- **Arquitectura Asíncrona**: Manejo eficiente de múltiples solicitudes
- **Base de Datos PostgreSQL**: Persistencia confiable
- **Redis Cache**: Respuestas ultra-rápidas
- **JWT Authentication**: Seguridad de grado empresarial
- **WebSockets**: Comunicación en tiempo real
- **100+ Agentes AI**: Integración con múltiples modelos de IA

## 📋 Requisitos

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Virtual Environment (recomendado)

## 🛠️ Instalación

### 1. Configurar Entorno Virtual

```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 2. Instalar Dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

Variables importantes:
```env
DATABASE_URL=postgresql://user:password@localhost/logos_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=tu-clave-secreta-segura
JWT_SECRET_KEY=otra-clave-secreta
ANTHROPIC_API_KEY=tu-api-key
OPENAI_API_KEY=tu-api-key
```

### 4. Inicializar Base de Datos

```bash
# Crear base de datos
createdb logos_db

# Ejecutar migraciones
alembic upgrade head

# (Opcional) Cargar datos de prueba
python scripts/seed_database.py
```

### 5. Ejecutar el Servidor

```bash
# Modo desarrollo
uvicorn main:app --reload --port 8000

# Modo producción
uvicorn main:app --workers 4 --port 8000
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── api/              # Endpoints de la API
│   │   ├── v1/          # Versión 1 de la API
│   │   │   ├── auth.py  # Autenticación
│   │   │   ├── agents.py # Agentes AI
│   │   │   ├── chat.py  # WebSocket chat
│   │   │   └── marketplace.py
│   │   └── deps.py      # Dependencias compartidas
│   │
│   ├── core/            # Configuración central
│   │   ├── config.py    # Configuraciones
│   │   ├── security.py  # Utilidades de seguridad
│   │   └── database.py  # Conexión a BD
│   │
│   ├── models/          # Modelos SQLAlchemy
│   │   ├── user.py
│   │   ├── agent.py
│   │   ├── conversation.py
│   │   └── transaction.py
│   │
│   ├── schemas/         # Pydantic schemas
│   │   ├── user.py
│   │   ├── agent.py
│   │   └── chat.py
│   │
│   ├── services/        # Lógica de negocio
│   │   ├── auth_service.py
│   │   ├── agent_service.py
│   │   ├── ai_service.py
│   │   └── payment_service.py
│   │
│   ├── agents/          # Implementaciones de agentes
│   │   ├── base.py
│   │   ├── code_agent.py
│   │   ├── design_agent.py
│   │   └── registry.py
│   │
│   └── utils/           # Utilidades
│       ├── logger.py
│       ├── validators.py
│       └── helpers.py
│
├── tests/               # Tests unitarios
│   ├── test_auth.py
│   ├── test_agents.py
│   └── test_chat.py
│
├── alembic/            # Migraciones de BD
│   └── versions/
│
├── scripts/            # Scripts útiles
│   ├── seed_database.py
│   └── create_admin.py
│
├── requirements.txt    # Dependencias
├── main.py            # Punto de entrada
└── README.md          # Este archivo
```

## 🔌 API Endpoints

### Autenticación

```http
POST   /api/v1/auth/register    # Registro de usuario
POST   /api/v1/auth/login       # Iniciar sesión
POST   /api/v1/auth/logout      # Cerrar sesión
POST   /api/v1/auth/refresh     # Renovar token
GET    /api/v1/auth/me         # Perfil actual
```

### Agentes AI

```http
GET    /api/v1/agents           # Listar agentes
GET    /api/v1/agents/{id}      # Detalle de agente
POST   /api/v1/agents/{id}/chat # Chat con agente
GET    /api/v1/agents/categories # Categorías
```

### Marketplace

```http
GET    /api/v1/marketplace      # Agentes en venta
POST   /api/v1/marketplace/purchase # Comprar agente
GET    /api/v1/marketplace/my-agents # Mis compras
```

### WebSocket

```
WS     /ws/chat/{conversation_id} # Chat en tiempo real
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
pytest

# Tests específicos
pytest tests/test_auth.py

# Con coverage
pytest --cov=src tests/
```

### Tests de Carga

```bash
# Instalar locust
pip install locust

# Ejecutar tests de carga
locust -f tests/load_test.py
```

## 🔒 Seguridad

- **Autenticación JWT**: Tokens seguros con expiración
- **Rate Limiting**: Protección contra abuso
- **CORS**: Configurado para dominios permitidos
- **Validación de Entrada**: Schemas Pydantic estrictos
- **Encriptación**: Contraseñas con bcrypt
- **HTTPS**: Requerido en producción

## 🚀 Despliegue

### Docker

```bash
# Construir imagen
docker build -t logos-backend .

# Ejecutar contenedor
docker run -p 8000:8000 --env-file .env logos-backend
```

### AWS ECS

```bash
# Usar script de despliegue
./scripts/deploy-aws.sh
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logos-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: logos-backend:latest
        ports:
        - containerPort: 8000
```

## 📊 Monitoreo

- **Health Check**: `/health`
- **Metrics**: `/metrics` (Prometheus)
- **Logs**: Structured JSON logging
- **APM**: Integración con Datadog/New Relic

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu rama (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crea un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.