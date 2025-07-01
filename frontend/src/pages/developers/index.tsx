import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  TextField,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import {
  Code,
  Api,
  GitHub,
  Book,
  Terminal,
  ContentCopy,
  Check,
  ExpandMore,
  Language,
  Speed,
  Security,
  Extension,
  CloudUpload
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import SEOHead from '../../components/SEO/SEOHead';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const codeExamples = {
  javascript: `// Initialize LOGOS SDK
import { LogosClient } from '@logos/sdk';

const client = new LogosClient({
  apiKey: process.env.LOGOS_API_KEY,
  environment: 'production'
});

// Chat with an AI agent
async function chatWithAgent() {
  const response = await client.agents.chat({
    agentId: 'medical-expert',
    message: 'What are the symptoms of diabetes?',
    context: {
      patientAge: 45,
      patientHistory: ['hypertension']
    }
  });
  
  console.log(response.content);
  
  // Stream response
  const stream = await client.agents.streamChat({
    agentId: 'medical-expert',
    message: 'Explain the treatment options'
  });
  
  for await (const chunk of stream) {
    process.stdout.write(chunk.content);
  }
}`,
  python: `# Initialize LOGOS SDK
from logos import LogosClient
import os

client = LogosClient(
    api_key=os.environ.get('LOGOS_API_KEY'),
    environment='production'
)

# Chat with an AI agent
async def chat_with_agent():
    response = await client.agents.chat(
        agent_id='medical-expert',
        message='What are the symptoms of diabetes?',
        context={
            'patient_age': 45,
            'patient_history': ['hypertension']
        }
    )
    
    print(response.content)
    
    # Stream response
    stream = await client.agents.stream_chat(
        agent_id='medical-expert',
        message='Explain the treatment options'
    )
    
    async for chunk in stream:
        print(chunk.content, end='')`,
  curl: `# Basic chat request
curl -X POST https://api.logos-ecosystem.ai/v1/agents/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "medical-expert",
    "message": "What are the symptoms of diabetes?",
    "context": {
      "patient_age": 45,
      "patient_history": ["hypertension"]
    }
  }'

# Voice chat request
curl -X POST https://api.logos-ecosystem.ai/v1/agents/voice-chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "agent_id=medical-expert" \\
  -F "audio=@voice-message.wav"

# List available agents
curl https://api.logos-ecosystem.ai/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY"`
};

const sdkFeatures = [
  { icon: <Speed />, title: 'High Performance', description: 'Optimized for low latency and high throughput' },
  { icon: <Security />, title: 'Secure by Default', description: 'End-to-end encryption and secure key management' },
  { icon: <Extension />, title: 'Extensible', description: 'Plugin system for custom integrations' },
  { icon: <Language />, title: 'Multi-Language', description: 'SDKs for JavaScript, Python, Java, Go, and more' }
];

const apiEndpoints = [
  { method: 'GET', path: '/agents', description: 'List all available agents' },
  { method: 'GET', path: '/agents/{id}', description: 'Get agent details' },
  { method: 'POST', path: '/agents/chat', description: 'Send message to agent' },
  { method: 'POST', path: '/agents/voice-chat', description: 'Send voice message' },
  { method: 'GET', path: '/conversations', description: 'List user conversations' },
  { method: 'POST', path: '/webhooks', description: 'Configure webhooks' },
  { method: 'GET', path: '/usage', description: 'Get usage statistics' }
];

export default function DevelopersPage() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [codeTab, setCodeTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <SEOHead
        title="Developers - LOGOS ECOSYSTEM"
        description="Build with LOGOS AI. APIs, SDKs, and documentation for developers."
        keywords="AI API, developer tools, SDK, API documentation"
      />

      <Box sx={{ minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
        {/* Hero Section */}
        <Box sx={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', py: 8 }}>
          <Container maxWidth="lg">
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Build with LOGOS AI
                </Typography>
                <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                  Powerful APIs and SDKs to integrate specialized AI into your applications
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Book />}
                    onClick={() => setTabValue(1)}
                  >
                    View Documentation
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<GitHub />}
                    sx={{ borderColor: 'white', color: 'white' }}
                    href="https://github.com/logos-ecosystem"
                    target="_blank"
                  >
                    GitHub
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ position: 'relative' }}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Terminal />
                      <Typography variant="body2">Quick Start</Typography>
                    </Box>
                    <SyntaxHighlighter language="bash" style={vscDarkPlus}>
                      {`npm install @logos/sdk
# or
yarn add @logos/sdk`}
                    </SyntaxHighlighter>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Overview" />
              <Tab label="Documentation" />
              <Tab label="API Reference" />
              <Tab label="SDKs" />
              <Tab label="Examples" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {/* Overview */}
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Typography variant="h4" gutterBottom>
                  Developer Platform Overview
                </Typography>
                <Typography variant="body1" paragraph sx={{ opacity: 0.9 }}>
                  The LOGOS Developer Platform provides everything you need to integrate our AI agents 
                  into your applications. From simple REST APIs to advanced SDKs with streaming support, 
                  we've got you covered.
                </Typography>
              </Grid>

              {sdkFeatures.map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card sx={{ height: '100%', background: 'rgba(255,255,255,0.05)' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ color: 'primary.main', fontSize: 48, mb: 2 }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}

              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 4 }}>
                  <Typography variant="body2">
                    New to LOGOS? Check out our{' '}
                    <Link href="#" sx={{ color: 'primary.light' }}>
                      Getting Started Guide
                    </Link>{' '}
                    or explore our{' '}
                    <Link href="#" sx={{ color: 'primary.light' }}>
                      Interactive Tutorials
                    </Link>
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Documentation */}
            <Typography variant="h4" gutterBottom>
              Documentation
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Getting Started</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      To get started with LOGOS API, you'll need an API key. You can generate one from your dashboard.
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><Check /></ListItemIcon>
                        <ListItemText primary="Sign up for a LOGOS account" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Check /></ListItemIcon>
                        <ListItemText primary="Generate your API key from the dashboard" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Check /></ListItemIcon>
                        <ListItemText primary="Install the SDK for your language" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Check /></ListItemIcon>
                        <ListItemText primary="Make your first API call" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Authentication</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      All API requests must include your API key in the Authorization header:
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.5)' }}>
                      <SyntaxHighlighter language="bash" style={vscDarkPlus}>
                        {`Authorization: Bearer YOUR_API_KEY`}
                      </SyntaxHighlighter>
                    </Paper>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Rate Limits</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      API rate limits vary by plan:
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Starter: 1,000 requests/month" 
                          secondary="Rate limit: 10 requests/minute"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Professional: 10,000 requests/month" 
                          secondary="Rate limit: 100 requests/minute"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Business: 50,000 requests/month" 
                          secondary="Rate limit: 500 requests/minute"
                        />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Error Handling</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      The API uses standard HTTP status codes. Error responses include a JSON body with details:
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.5)' }}>
                      <SyntaxHighlighter language="json" style={vscDarkPlus}>
                        {`{
  "error": {
    "code": "invalid_request",
    "message": "The agent_id field is required",
    "details": {
      "field": "agent_id"
    }
  }
}`}
                      </SyntaxHighlighter>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                  <Typography variant="h6" gutterBottom>
                    Quick Links
                  </Typography>
                  <List>
                    <ListItem button>
                      <ListItemIcon><Api /></ListItemIcon>
                      <ListItemText primary="API Reference" />
                    </ListItem>
                    <ListItem button>
                      <ListItemIcon><Code /></ListItemIcon>
                      <ListItemText primary="Code Examples" />
                    </ListItem>
                    <ListItem button>
                      <ListItemIcon><GitHub /></ListItemIcon>
                      <ListItemText primary="GitHub Repos" />
                    </ListItem>
                    <ListItem button>
                      <ListItemIcon><CloudUpload /></ListItemIcon>
                      <ListItemText primary="Postman Collection" />
                    </ListItem>
                  </List>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Need Help?
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Join our Discord community or contact developer support
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* API Reference */}
            <Typography variant="h4" gutterBottom>
              API Reference
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Base URL: <code>https://api.logos-ecosystem.ai/v1</code>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Endpoints
            </Typography>
            
            <List>
              {apiEndpoints.map((endpoint, index) => (
                <ListItem key={index} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 1, borderRadius: 1 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip 
                          label={endpoint.method} 
                          size="small" 
                          color={endpoint.method === 'GET' ? 'success' : 'primary'}
                        />
                        <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                          {endpoint.path}
                        </Typography>
                      </Box>
                    }
                    secondary={endpoint.description}
                  />
                </ListItem>
              ))}
            </List>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Example Request
            </Typography>
            
            <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.5)', position: 'relative' }}>
              <IconButton
                size="small"
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => handleCopy(codeExamples.curl)}
              >
                {copied ? <Check /> : <ContentCopy />}
              </IconButton>
              <SyntaxHighlighter language="bash" style={vscDarkPlus}>
                {codeExamples.curl}
              </SyntaxHighlighter>
            </Paper>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* SDKs */}
            <Typography variant="h4" gutterBottom>
              Official SDKs
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      JavaScript/TypeScript
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                      Full-featured SDK with TypeScript support
                    </Typography>
                    <Button variant="contained" fullWidth href="https://www.npmjs.com/package/@logos/sdk" target="_blank">
                      View on NPM
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Python
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                      Pythonic SDK with async support
                    </Typography>
                    <Button variant="contained" fullWidth href="https://pypi.org/project/logos-sdk/" target="_blank">
                      View on PyPI
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Java
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                      Enterprise-ready Java SDK
                    </Typography>
                    <Button variant="contained" fullWidth href="https://mvnrepository.com/artifact/ai.logos/sdk" target="_blank">
                      View on Maven
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Go
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                      High-performance Go SDK
                    </Typography>
                    <Button variant="contained" fullWidth href="https://pkg.go.dev/github.com/logos-ecosystem/go-sdk" target="_blank">
                      View Docs
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Ruby
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                      Elegant Ruby SDK
                    </Typography>
                    <Button variant="contained" fullWidth href="https://rubygems.org/gems/logos-sdk" target="_blank">
                      View on RubyGems
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      PHP
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                      Modern PHP SDK
                    </Typography>
                    <Button variant="contained" fullWidth href="https://packagist.org/packages/logos/sdk" target="_blank">
                      View on Packagist
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            {/* Examples */}
            <Typography variant="h4" gutterBottom>
              Code Examples
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={codeTab} onChange={(e, v) => setCodeTab(v)}>
                <Tab label="JavaScript" />
                <Tab label="Python" />
                <Tab label="cURL" />
              </Tabs>
            </Box>

            <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.5)', position: 'relative' }}>
              <IconButton
                size="small"
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => handleCopy(Object.values(codeExamples)[codeTab])}
              >
                <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                  {copied ? <Check /> : <ContentCopy />}
                </Tooltip>
              </IconButton>
              <SyntaxHighlighter 
                language={codeTab === 0 ? 'javascript' : codeTab === 1 ? 'python' : 'bash'} 
                style={vscDarkPlus}
              >
                {Object.values(codeExamples)[codeTab]}
              </SyntaxHighlighter>
            </Paper>

            <Grid container spacing={3} sx={{ mt: 4 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      More Examples
                    </Typography>
                    <List>
                      <ListItem button>
                        <ListItemText primary="Voice Integration Example" secondary="Implement voice chat in your app" />
                      </ListItem>
                      <ListItem button>
                        <ListItemText primary="IoT Device Integration" secondary="Connect smart devices to AI agents" />
                      </ListItem>
                      <ListItem button>
                        <ListItemText primary="Webhook Configuration" secondary="Set up real-time notifications" />
                      </ListItem>
                      <ListItem button>
                        <ListItemText primary="Batch Processing" secondary="Process multiple requests efficiently" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Interactive Playground
                    </Typography>
                    <Typography variant="body2" paragraph sx={{ opacity: 0.8 }}>
                      Try our API directly in your browser with our interactive playground
                    </Typography>
                    <Button variant="contained" fullWidth>
                      Open API Playground
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Container>

        {/* Footer */}
        <Box sx={{ py: 4, borderTop: '1px solid rgba(255,255,255,0.1)', mt: 8 }}>
          <Container maxWidth="lg">
            <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
              © 2024 LOGOS ECOSYSTEM. All rights reserved. · API Status · Support
            </Typography>
          </Container>
        </Box>
      </Box>
    </>
  );
}