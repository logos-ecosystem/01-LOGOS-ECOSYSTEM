// Simple HTTP server without external dependencies
const http = require('http');
const url = require('url');

const PORT = 8000;

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

// Helper to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Request handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  console.log(`${new Date().toISOString()} - ${method} ${pathname}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Routes
  if (pathname === '/health' && method === 'GET') {
    sendJSON(res, 200, {
      status: 'healthy',
      service: 'LOGOS Ecosystem Test Server',
      timestamp: new Date().toISOString()
    });
  }
  else if (pathname === '/api/ai/agents' && method === 'GET') {
    let filtered = [...mockAgents];
    
    if (query.category) {
      filtered = filtered.filter(agent => agent.category === query.category);
    }
    
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description.toLowerCase().includes(searchLower)
      );
    }
    
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAgents = filtered.slice(startIndex, endIndex);
    
    sendJSON(res, 200, {
      success: true,
      data: {
        agents: paginatedAgents,
        pagination: {
          page: page,
          limit: limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit)
        }
      }
    });
  }
  else if (pathname === '/api/ai/agents/categories' && method === 'GET') {
    sendJSON(res, 200, {
      success: true,
      data: categories
    });
  }
  else if (pathname.match(/^\/api\/ai\/agents\/([^\/]+)$/) && method === 'GET') {
    const agentId = pathname.split('/')[4];
    const agent = mockAgents.find(a => a.id === agentId);
    
    if (!agent) {
      sendJSON(res, 404, {
        success: false,
        error: 'Agent not found'
      });
    } else {
      sendJSON(res, 200, {
        success: true,
        data: agent
      });
    }
  }
  else if (pathname.match(/^\/api\/ai\/agents\/([^\/]+)\/capabilities$/) && method === 'GET') {
    const agentId = pathname.split('/')[4];
    const agent = mockAgents.find(a => a.id === agentId);
    
    if (!agent) {
      sendJSON(res, 404, {
        success: false,
        error: 'Agent not found'
      });
    } else {
      const capabilityDetails = agent.capabilities.map(cap => ({
        name: cap,
        description: `${cap.replace(/_/g, ' ')} capability`,
        parameters: [
          { name: 'input', type: 'string', required: true },
          { name: 'options', type: 'object', required: false }
        ]
      }));
      
      sendJSON(res, 200, {
        success: true,
        data: {
          agentId: agent.id,
          capabilities: capabilityDetails
        }
      });
    }
  }
  else if (pathname.match(/^\/api\/ai\/agents\/([^\/]+)\/execute$/) && method === 'POST') {
    try {
      const agentId = pathname.split('/')[4];
      const body = await parseBody(req);
      const { capability, parameters } = body;
      
      const agent = mockAgents.find(a => a.id === agentId);
      
      if (!agent) {
        sendJSON(res, 404, {
          success: false,
          error: 'Agent not found'
        });
      } else if (!agent.capabilities.includes(capability)) {
        sendJSON(res, 400, {
          success: false,
          error: 'Invalid capability for this agent'
        });
      } else {
        sendJSON(res, 200, {
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
      }
    } catch (e) {
      sendJSON(res, 400, { error: 'Invalid request body' });
    }
  }
  else if (pathname.match(/^\/api\/ai\/agents\/([^\/]+)\/chat$/) && method === 'POST') {
    try {
      const agentId = pathname.split('/')[4];
      const body = await parseBody(req);
      const { message } = body;
      
      const agent = mockAgents.find(a => a.id === agentId);
      
      if (!agent) {
        sendJSON(res, 404, {
          success: false,
          error: 'Agent not found'
        });
      } else {
        sendJSON(res, 200, {
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
      }
    } catch (e) {
      sendJSON(res, 400, { error: 'Invalid request body' });
    }
  }
  else if (pathname === '/api/ai/agents/admin/stats' && method === 'GET') {
    sendJSON(res, 200, {
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
  }
  else {
    sendJSON(res, 404, {
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: pathname
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 LOGOS ECOSYSTEM Test Server (No Dependencies)
📡 Port: ${PORT}
🌍 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
🤖 Agents API: http://localhost:${PORT}/api/ai/agents
✅ Server is running!
  `);
});