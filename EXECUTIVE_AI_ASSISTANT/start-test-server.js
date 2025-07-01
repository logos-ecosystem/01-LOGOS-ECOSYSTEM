// Simple Node.js server without TypeScript compilation
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Mock agent data
const mockAgents = [
  {
    id: 'medical-specialist',
    name: 'Medical Specialist Agent',
    type: 'python',
    category: 'medical',
    description: 'Advanced medical diagnosis and treatment recommendations',
    capabilities: ['diagnosis', 'treatment_plan', 'medical_research'],
    status: 'active',
    version: '1.0.0'
  },
  {
    id: 'civil-engineering',
    name: 'Civil Engineering Agent',
    type: 'python',
    category: 'engineering',
    description: 'Infrastructure design and analysis',
    capabilities: ['structural_analysis', 'project_planning', 'cost_estimation'],
    status: 'active',
    version: '1.0.0'
  },
  {
    id: 'financial-advisor',
    name: 'Financial Advisor Agent',
    type: 'python',
    category: 'finance',
    description: 'Investment strategies and financial planning',
    capabilities: ['portfolio_analysis', 'risk_assessment', 'investment_advice'],
    status: 'active',
    version: '1.0.0'
  },
  {
    id: 'ecosystem-meta',
    name: 'Ecosystem Meta Assistant',
    type: 'typescript',
    category: 'system',
    description: 'Master orchestrator for all AI agents',
    capabilities: ['agent_coordination', 'task_routing', 'system_optimization'],
    status: 'active',
    version: '2.0.0'
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'LOGOS Ecosystem Test Server',
    timestamp: new Date().toISOString()
  });
});

// Agent routes
app.get('/api/ai/agents', (req, res) => {
  const { category, search, page = 1, limit = 10 } = req.query;
  
  let filtered = [...mockAgents];
  
  if (category) {
    filtered = filtered.filter(agent => agent.category === category);
  }
  
  if (search) {
    const searchLower = String(search).toLowerCase();
    filtered = filtered.filter(agent => 
      agent.name.toLowerCase().includes(searchLower) ||
      agent.description.toLowerCase().includes(searchLower)
    );
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedAgents = filtered.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      agents: paginatedAgents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / Number(limit))
      }
    }
  });
});

app.get('/api/ai/agents/categories', (req, res) => {
  const categories = [
    { id: 'medical', name: 'Medical', count: 15 },
    { id: 'engineering', name: 'Engineering', count: 20 },
    { id: 'finance', name: 'Finance', count: 18 },
    { id: 'legal', name: 'Legal', count: 12 },
    { id: 'education', name: 'Education', count: 10 },
    { id: 'marketing', name: 'Marketing', count: 8 },
    { id: 'hr', name: 'Human Resources', count: 7 },
    { id: 'arts', name: 'Arts & Design', count: 9 },
    { id: 'science', name: 'Science', count: 11 },
    { id: 'technology', name: 'Technology', count: 25 },
    { id: 'agriculture', name: 'Agriculture', count: 6 },
    { id: 'real-estate', name: 'Real Estate', count: 5 },
    { id: 'system', name: 'System', count: 12 }
  ];
  
  res.json({
    success: true,
    data: categories
  });
});

app.get('/api/ai/agents/:agentId', (req, res) => {
  const { agentId } = req.params;
  const agent = mockAgents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  res.json({
    success: true,
    data: agent
  });
});

app.get('/api/ai/agents/:agentId/capabilities', (req, res) => {
  const { agentId } = req.params;
  const agent = mockAgents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  const capabilityDetails = agent.capabilities.map(cap => ({
    name: cap,
    description: `${cap.replace(/_/g, ' ')} capability`,
    parameters: [
      { name: 'input', type: 'string', required: true },
      { name: 'options', type: 'object', required: false }
    ]
  }));
  
  res.json({
    success: true,
    data: {
      agentId: agent.id,
      capabilities: capabilityDetails
    }
  });
});

app.post('/api/ai/agents/:agentId/execute', (req, res) => {
  const { agentId } = req.params;
  const { capability, parameters } = req.body;
  
  const agent = mockAgents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  if (!agent.capabilities.includes(capability)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid capability for this agent'
    });
  }
  
  // Simulate execution
  res.json({
    success: true,
    data: {
      executionId: `exec_${Date.now()}`,
      agentId,
      capability,
      status: 'completed',
      result: {
        message: `Successfully executed ${capability} for ${agent.name}`,
        data: parameters,
        timestamp: new Date().toISOString()
      }
    }
  });
});

app.post('/api/ai/agents/:agentId/chat', (req, res) => {
  const { agentId } = req.params;
  const { message, context } = req.body;
  
  const agent = mockAgents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      conversationId: `conv_${Date.now()}`,
      agentId,
      message: {
        role: 'assistant',
        content: `Hello! I'm the ${agent.name}. You said: "${message}". How can I help you today?`,
        timestamp: new Date().toISOString()
      }
    }
  });
});

app.get('/api/ai/agents/:agentId/metrics', (req, res) => {
  const { agentId } = req.params;
  
  const agent = mockAgents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      agentId,
      timeframe: req.query.timeframe || 'day',
      metrics: {
        totalExecutions: Math.floor(Math.random() * 1000),
        successRate: 95 + Math.random() * 5,
        averageResponseTime: 200 + Math.random() * 300,
        userSatisfaction: 4.5 + Math.random() * 0.5,
        errorRate: Math.random() * 5
      }
    }
  });
});

app.post('/api/ai/agents/:agentId/feedback', (req, res) => {
  res.json({
    success: true,
    data: {
      feedbackId: `feedback_${Date.now()}`,
      agentId: req.params.agentId,
      rating: req.body.rating,
      feedback: req.body.feedback,
      executionId: req.body.executionId,
      timestamp: new Date().toISOString()
    }
  });
});

// Basic AI routes
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

// Admin routes
app.post('/api/ai/agents/admin/refresh', (req, res) => {
  res.json({
    success: true,
    message: 'Agent registry refreshed successfully',
    data: {
      agentsDiscovered: 158,
      newAgents: 0,
      updatedAgents: 5,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/ai/agents/admin/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalAgents: 158,
      activeAgents: 156,
      inactiveAgents: 2,
      pythonAgents: 120,
      typescriptAgents: 38,
      totalExecutions: 45678,
      averageSuccessRate: 96.5,
      systemHealth: 'excellent'
    }
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
app.use((err, req, res, next) => {
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