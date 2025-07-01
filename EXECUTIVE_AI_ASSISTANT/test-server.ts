// Simplified test server for agent integration
import express from 'express';
import cors from 'cors';
import { createAgentRoutes } from './backend-mock-routes';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for testing
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'LOGOS Ecosystem Test Server',
    timestamp: new Date().toISOString()
  });
});

// Agent routes
app.use('/api/ai', createAgentRoutes());

// Basic AI routes for compatibility
app.post('/api/ai/chat', (req, res) => {
  const { message } = req.body;
  res.json({
    success: true,
    response: `Echo: ${message}`,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ai/models', (req, res) => {
  res.json({
    success: true,
    models: [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      { id: 'claude-3', name: 'Claude 3', provider: 'anthropic' }
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 LOGOS ECOSYSTEM Test Server
📡 Port: ${PORT}
🌍 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
🤖 Agents API: http://localhost:${PORT}/api/ai/agents
✅ Server is running!
  `);
});