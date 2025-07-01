// A2A Protocol Test Server with Google Agent-to-Agent Communication
const http = require('http');
const url = require('url');
const crypto = require('crypto');

const PORT = 8001;

// A2A Protocol Constants
const A2A_VERSION = '1.0';
const A2A_CONTEXT = 'https://w3id.org/a2a/v1';

// Mock A2A Agents with DIDs
const a2aAgents = new Map([
  ['did:logos:medical-specialist-001', {
    id: 'medical-specialist-001',
    name: 'Medical Specialist Agent',
    type: 'specialist',
    category: 'medical',
    capabilities: ['diagnosis', 'treatment_plan', 'medical_research'],
    publicKey: generatePublicKey('medical-specialist-001'),
    status: 'active'
  }],
  ['did:logos:civil-engineering-001', {
    id: 'civil-engineering-001',
    name: 'Civil Engineering Agent',
    type: 'specialist',
    category: 'engineering',
    capabilities: ['structural_analysis', 'project_planning', 'cost_estimation'],
    publicKey: generatePublicKey('civil-engineering-001'),
    status: 'active'
  }],
  ['did:logos:ecosystem-meta-001', {
    id: 'ecosystem-meta-001',
    name: 'Ecosystem Meta Assistant',
    type: 'coordinator',
    category: 'system',
    capabilities: ['agent_coordination', 'task_routing', 'system_optimization'],
    publicKey: generatePublicKey('ecosystem-meta-001'),
    status: 'active'
  }]
]);

// Message queue for async communication
const messageQueue = new Map();
const sessions = new Map();

// Helper functions
function generatePublicKey(agentId) {
  return {
    id: `${agentId}-key`,
    type: 'RSA',
    publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
    purposes: ['authentication', 'keyAgreement']
  };
}

function generateMessageId() {
  return crypto.randomBytes(16).toString('hex');
}

function createA2AMessage(type, from, to, body, options = {}) {
  return {
    '@context': A2A_CONTEXT,
    '@type': type,
    id: options.id || generateMessageId(),
    timestamp: new Date().toISOString(),
    version: A2A_VERSION,
    from: from,
    to: to,
    body: body,
    ...options
  };
}

function validateA2AMessage(message) {
  const required = ['@context', '@type', 'id', 'timestamp', 'version', 'from', 'to', 'body'];
  for (const field of required) {
    if (!message[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  if (message.version !== A2A_VERSION) {
    return { valid: false, error: `Unsupported version: ${message.version}` };
  }
  
  if (!message.from.startsWith('did:logos:')) {
    return { valid: false, error: `Invalid sender DID: ${message.from}` };
  }
  
  return { valid: true };
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-A2A-Version'
  });
  res.end(JSON.stringify(data));
}

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

// A2A Message Router
async function routeA2AMessage(message) {
  const validation = validateA2AMessage(message);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // Store in message queue
  messageQueue.set(message.id, {
    message,
    receivedAt: new Date().toISOString(),
    status: 'received'
  });
  
  // Process based on message type
  switch (message['@type']) {
    case 'request':
      return await handleA2ARequest(message);
    case 'response':
      return await handleA2AResponse(message);
    case 'notification':
      return await handleA2ANotification(message);
    case 'query':
      return await handleA2AQuery(message);
    default:
      throw new Error(`Unsupported message type: ${message['@type']}`);
  }
}

async function handleA2ARequest(message) {
  const toAgent = a2aAgents.get(message.to);
  if (!toAgent) {
    throw new Error(`Agent not found: ${message.to}`);
  }
  
  // Simulate agent processing
  const response = createA2AMessage(
    'response',
    message.to,
    message.from,
    {
      result: `Processed by ${toAgent.name}`,
      originalRequest: message.body,
      processingTime: Math.random() * 1000
    },
    {
      correlationId: message.id
    }
  );
  
  return response;
}

async function handleA2AResponse(message) {
  // Update message queue
  if (message.correlationId && messageQueue.has(message.correlationId)) {
    const original = messageQueue.get(message.correlationId);
    original.status = 'completed';
    original.response = message;
  }
  
  return { status: 'acknowledged', messageId: message.id };
}

async function handleA2ANotification(message) {
  // Broadcast to relevant agents
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  const results = [];
  
  for (const recipient of recipients) {
    if (a2aAgents.has(recipient)) {
      results.push({
        agent: recipient,
        status: 'delivered',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return { delivered: results.length, results };
}

async function handleA2AQuery(message) {
  const { queryType, parameters } = message.body;
  
  switch (queryType) {
    case 'discover_agents':
      const agents = Array.from(a2aAgents.values())
        .filter(agent => {
          if (parameters.category && agent.category !== parameters.category) {
            return false;
          }
          if (parameters.capabilities) {
            return parameters.capabilities.some(cap => agent.capabilities.includes(cap));
          }
          return true;
        });
      
      return createA2AMessage(
        'response',
        message.to,
        message.from,
        { agents },
        { correlationId: message.id }
      );
      
    case 'agent_status':
      const agent = a2aAgents.get(parameters.agentDid);
      return createA2AMessage(
        'response',
        message.to,
        message.from,
        { 
          status: agent ? agent.status : 'not_found',
          agent: agent || null
        },
        { correlationId: message.id }
      );
      
    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${new Date().toISOString()} - ${method} ${pathname}`);

  // Handle CORS
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-A2A-Version'
    });
    res.end();
    return;
  }

  try {
    // A2A Protocol Endpoints
    if (pathname === '/a2a/health' && method === 'GET') {
      sendJSON(res, 200, {
        status: 'healthy',
        protocol: 'Google A2A',
        version: A2A_VERSION,
        timestamp: new Date().toISOString()
      });
    }
    else if (pathname === '/a2a/agents' && method === 'GET') {
      const agents = Array.from(a2aAgents.entries()).map(([did, agent]) => ({
        did,
        ...agent
      }));
      sendJSON(res, 200, { agents });
    }
    else if (pathname === '/a2a/message' && method === 'POST') {
      const body = await parseBody(req);
      const result = await routeA2AMessage(body);
      sendJSON(res, 200, {
        success: true,
        receipt: {
          messageId: body.id,
          receivedAt: new Date().toISOString(),
          status: 'processed'
        },
        result
      });
    }
    else if (pathname === '/a2a/discover' && method === 'POST') {
      const body = await parseBody(req);
      const queryMessage = createA2AMessage(
        'query',
        'did:logos:client',
        'did:logos:discovery-service',
        {
          queryType: 'discover_agents',
          parameters: body
        }
      );
      
      const result = await handleA2AQuery(queryMessage);
      sendJSON(res, 200, result.body);
    }
    else if (pathname.match(/^\/a2a\/agents\/([^\/]+)\/execute$/) && method === 'POST') {
      const agentDid = decodeURIComponent(pathname.split('/')[3]);
      const body = await parseBody(req);
      
      const message = createA2AMessage(
        'request',
        'did:logos:client',
        agentDid,
        {
          action: 'execute_capability',
          capability: body.capability,
          parameters: body.parameters
        }
      );
      
      const result = await routeA2AMessage(message);
      sendJSON(res, 200, result);
    }
    else if (pathname === '/a2a/session' && method === 'POST') {
      const body = await parseBody(req);
      const sessionId = generateMessageId();
      
      sessions.set(sessionId, {
        id: sessionId,
        participants: body.participants || [],
        created: new Date().toISOString(),
        state: 'active',
        context: body.context || {}
      });
      
      sendJSON(res, 200, {
        sessionId,
        status: 'created'
      });
    }
    else if (pathname === '/a2a/stats' && method === 'GET') {
      sendJSON(res, 200, {
        totalAgents: a2aAgents.size,
        messageQueue: messageQueue.size,
        activeSessions: sessions.size,
        uptime: process.uptime()
      });
    }
    else {
      sendJSON(res, 404, {
        error: 'Not Found',
        message: 'The requested A2A endpoint was not found'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    sendJSON(res, 500, {
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 Google A2A Protocol Test Server
📡 Port: ${PORT}
🌍 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/a2a/health
🤖 Agents: http://localhost:${PORT}/a2a/agents
💬 Message: http://localhost:${PORT}/a2a/message
🔍 Discover: http://localhost:${PORT}/a2a/discover
📈 Stats: http://localhost:${PORT}/a2a/stats
✅ A2A Protocol Active!

Available Agent DIDs:
${Array.from(a2aAgents.keys()).map(did => `  - ${did}`).join('\n')}
  `);
});