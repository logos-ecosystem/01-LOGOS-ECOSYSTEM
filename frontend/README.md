# LOGOS Frontend Application

Modern, responsive web interface for the LOGOS AI-Native Ecosystem built with Next.js 14 and TypeScript.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Zustand
- **Styling**: Emotion CSS-in-JS
- **Real-time**: WebSocket integration
- **Testing**: Jest & React Testing Library
- **Performance**: WebAssembly modules for crypto operations

## Directory Structure

```
frontend/
├── src/
│   ├── pages/           # Next.js pages (routes)
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API service layer
│   ├── store/          # Zustand state stores
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── wasm/           # WebAssembly modules
├── public/             # Static assets
├── scripts/            # Build and utility scripts
├── __tests__/          # Test files
└── __mocks__/          # Test mocks
```

## Key Features

### Pages
- **Dashboard**: User control center with analytics
- **Marketplace**: AI agent marketplace with search and filtering
- **AI Chat**: Interactive chat interface with AI agents
- **Integrations**: IoT and automotive device management
- **Profile**: User settings and preferences
- **Wallet**: Digital wallet and transaction history

### Components
- **Auth**: Authentication wrapper and guards
- **Layout**: Responsive dashboard layout
- **Chat**: Real-time chat components
- **Marketplace**: Product cards, filters, and search
- **IoT**: Device management interface
- **Automotive**: Car integration controls
- **Voice**: Voice interface components
- **SEO**: SEO optimization components

### Services
- **API Client**: Axios-based API communication
- **WebSocket**: Real-time event handling
- **Authentication**: JWT token management
- **Marketplace**: Agent discovery and purchase

## Setup and Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run linting
npm run lint
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id
```

## Development

### Code Style
- ESLint configuration for consistent code style
- Prettier for code formatting
- TypeScript strict mode enabled
- Pre-commit hooks for linting

### Component Development
- Functional components with hooks
- TypeScript interfaces for props
- Modular CSS with Emotion
- Responsive design patterns

### State Management
- Zustand for global state
- React Context for auth state
- Local state for component-specific data
- WebSocket integration for real-time updates

## Performance Optimizations

- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Dynamic imports for heavy components
- **Caching**: Service worker for offline support
- **WebAssembly**: Fast crypto operations
- **Bundle Size**: Tree shaking and minification

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Building for Production

```bash
# Build the application
npm run build

# Analyze bundle size
npm run analyze

# Generate sitemap
npm run generate-sitemap

# Run production build locally
npm run start
```

## Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
npm run deploy:vercel
```

### Docker
```bash
# Build Docker image
docker build -t logos-frontend -f Dockerfile.prod .

# Run container
docker run -p 3000:3000 logos-frontend
```

### Static Export
```bash
# Generate static files
npm run export
```

## Security Features

- Content Security Policy (CSP)
- XSS protection
- HTTPS enforcement
- Secure cookie handling
- Input sanitization
- API request validation

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Focus management
- ARIA labels and roles

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## Contributing

1. Create feature branch from `main`
2. Follow code style guidelines
3. Write tests for new features
4. Ensure all tests pass
5. Submit pull request with description