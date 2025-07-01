# 🎨 Frontend - LOGOS ECOSYSTEM

## Descripción

El frontend de LOGOS ECOSYSTEM es una aplicación moderna construida con Next.js y React, ofreciendo una experiencia de usuario excepcional con interfaces intuitivas y responsivas.

## 🚀 Características

- **Next.js 14**: Framework React con SSR/SSG
- **TypeScript**: Tipado estático para mayor confiabilidad
- **Tailwind CSS**: Estilos modernos y responsivos
- **Shadcn/UI**: Componentes de UI accesibles
- **WebSocket**: Chat en tiempo real
- **PWA**: Funciona offline
- **Dark Mode**: Tema claro/oscuro

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Navegador moderno

## 🛠️ Instalación

### 1. Instalar Dependencias

```bash
npm install
# o
yarn install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env.local
# Editar .env.local con tus configuraciones
```

Variables importantes:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=tu-clave-publica
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
# o
yarn dev
```

Visita `http://localhost:3000`

### 4. Construir para Producción

```bash
npm run build
npm run start
```

## 📁 Estructura del Proyecto

```
frontend/
├── app/                    # App directory (Next.js 14)
│   ├── (auth)/            # Rutas de autenticación
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Rutas protegidas
│   │   ├── agents/
│   │   ├── chat/
│   │   └── marketplace/
│   ├── api/              # API routes
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Página de inicio
│
├── components/           # Componentes React
│   ├── ui/              # Componentes base
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── dialog.tsx
│   ├── agents/          # Componentes de agentes
│   │   ├── AgentCard.tsx
│   │   └── AgentList.tsx
│   ├── chat/            # Componentes de chat
│   │   ├── ChatWindow.tsx
│   │   └── MessageBubble.tsx
│   └── layout/          # Componentes de layout
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
│
├── lib/                 # Librerías y utilidades
│   ├── api.ts          # Cliente API
│   ├── auth.ts         # Utilidades de auth
│   ├── websocket.ts    # Cliente WebSocket
│   └── utils.ts        # Utilidades generales
│
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useAgents.ts
│
├── styles/             # Estilos globales
│   └── globals.css
│
├── public/             # Archivos estáticos
│   ├── images/
│   ├── icons/
│   └── manifest.json
│
├── types/              # TypeScript types
│   ├── agent.ts
│   ├── user.ts
│   └── chat.ts
│
├── package.json        # Dependencias
├── tsconfig.json       # Configuración TypeScript
├── tailwind.config.js  # Configuración Tailwind
└── README.md          # Este archivo
```

## 🎨 Componentes Principales

### Layout

```tsx
// components/layout/Header.tsx
export function Header() {
  return (
    <header className="border-b">
      <nav className="container mx-auto px-4 py-4">
        {/* Navegación */}
      </nav>
    </header>
  )
}
```

### Agent Card

```tsx
// components/agents/AgentCard.tsx
interface AgentCardProps {
  agent: Agent
  onSelect: (agent: Agent) => void
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{agent.name}</CardTitle>
        <CardDescription>{agent.description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button onClick={() => onSelect(agent)}>
          Iniciar Chat
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### Chat Window

```tsx
// components/chat/ChatWindow.tsx
export function ChatWindow({ agentId }: { agentId: string }) {
  const { messages, sendMessage } = useChat(agentId)
  
  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  )
}
```

## 🔌 Integración con Backend

### Cliente API

```typescript
// lib/api.ts
class ApiClient {
  private baseURL: string
  
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL!
  }
  
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return response.json()
  }
  
  // Más métodos...
}

export const api = new ApiClient()
```

### WebSocket

```typescript
// lib/websocket.ts
export class ChatWebSocket {
  private ws: WebSocket | null = null
  
  connect(conversationId: string) {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/chat/${conversationId}`
    this.ws = new WebSocket(wsUrl)
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      // Manejar mensaje
    }
  }
  
  sendMessage(content: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ content }))
    }
  }
}
```

## 🧪 Testing

### Tests Unitarios

```bash
# Ejecutar tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test:coverage
```

### Tests E2E

```bash
# Cypress
npm run cypress:open

# Playwright
npm run test:e2e
```

## 🎯 Optimización

### Performance

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Carga dinámica de componentes
- **Prefetching**: Enlaces optimizados
- **Caching**: SWR para estado del servidor

### SEO

- **Meta Tags**: Dinámicos por página
- **Sitemap**: Generado automáticamente
- **Robots.txt**: Configurado
- **Schema.org**: Datos estructurados

## 🚀 Despliegue

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
RUN npm run build
CMD ["npm", "start"]
```

### Nginx

```nginx
server {
    listen 80;
    server_name app.logosecosystem.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

## 📱 PWA

La aplicación funciona como PWA con:
- **Offline Support**: Service Worker
- **Install Prompt**: Agregar a pantalla de inicio
- **Push Notifications**: Notificaciones nativas
- **Background Sync**: Sincronización en segundo plano

## 🎨 Temas

### Configurar Tema

```tsx
// app/providers.tsx
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system">
      {children}
    </NextThemesProvider>
  )
}
```

### Cambiar Tema

```tsx
// components/ThemeToggle.tsx
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu rama (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crea un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.