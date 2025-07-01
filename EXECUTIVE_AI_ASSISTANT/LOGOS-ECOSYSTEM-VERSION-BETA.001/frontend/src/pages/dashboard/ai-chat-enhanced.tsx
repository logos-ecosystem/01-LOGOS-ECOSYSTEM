import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Chip,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Button,
  Skeleton,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Tooltip,
  LinearProgress,
  Alert,
  Fab,
  Drawer,
  InputAdornment,
  Badge
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  MoreVert,
  Delete,
  ContentCopy,
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  Category,
  Search,
  Settings,
  Stop,
  PlayArrow,
  AttachFile,
  Image as ImageIcon,
  PictureAsPdf,
  Description,
  Code,
  MenuOpen,
  Close
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SEOHead from '../../components/SEO/SEOHead';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: Agent;
  created_at: string;
  tokens_used?: number;
  audio_url?: string;
  attachments?: Attachment[];
  status?: 'sending' | 'sent' | 'error';
}

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  capabilities: string[];
  voice_enabled: boolean;
}

interface Attachment {
  id: string;
  type: 'image' | 'pdf' | 'text' | 'code';
  name: string;
  url: string;
  size: number;
}

interface Conversation {
  id: string;
  title: string;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  total_tokens: number;
}

export default function EnhancedAIChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, connected } = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentCategories, setAgentCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  
  // MediaRecorder for voice
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load initial data
  useEffect(() => {
    loadAgents();
    loadConversations();
    
    // Check for agent in URL params (from marketplace)
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agent');
    if (agentId) {
      selectAgentById(agentId);
    }
  }, []);

  // WebSocket message handling
  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      playMessageSound();
    });

    socket.on('agent_typing', ({ conversationId }: { conversationId: string }) => {
      // Show typing indicator
    });

    return () => {
      socket.off('message');
      socket.off('agent_typing');
    };
  }, [socket, connected]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadAgents = async () => {
    try {
      const response = await api.get('/agents/available');
      setAgents(response.data.data);
      const categories = [...new Set(response.data.data.map((a: Agent) => a.category))];
      setAgentCategories(categories);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/ai/conversations');
      setConversations(response.data.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const selectAgentById = async (agentId: string) => {
    try {
      const response = await api.get(`/agents/${agentId}`);
      setSelectedAgent(response.data.data);
    } catch (error) {
      console.error('Error loading agent:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const playMessageSound = () => {
    if (!voiceEnabled) return;
    const audio = new Audio('/sounds/message.mp3');
    audio.play().catch(e => console.error('Error playing sound:', e));
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (!selectedAgent) {
      setAgentDialogOpen(true);
      return;
    }

    const messageId = Date.now().toString();
    const newMessage: Message = {
      id: messageId,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
      status: 'sending',
      attachments: attachments.map(file => ({
        id: Date.now().toString(),
        type: getFileType(file),
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size
      }))
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', input);
      formData.append('agent_id', selectedAgent.id);
      if (selectedConversation) {
        formData.append('conversation_id', selectedConversation);
      }
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await api.post('/ai/chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update message status
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, status: 'sent' } : m
      ));

      // Add AI response
      const aiMessage: Message = {
        id: response.data.data.id,
        role: 'assistant',
        content: response.data.data.content,
        agent: selectedAgent,
        created_at: new Date().toISOString(),
        tokens_used: response.data.data.tokens_used,
        audio_url: response.data.data.audio_url
      };

      setMessages(prev => [...prev, aiMessage]);

      // Play audio response if available
      if (aiMessage.audio_url && voiceEnabled) {
        playAudioResponse(aiMessage.audio_url);
      }

      // Update conversation
      if (!selectedConversation) {
        setSelectedConversation(response.data.data.conversation_id);
        loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, status: 'error' } : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          await sendVoiceMessage(audioBlob);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedAgent) {
      setAgentDialogOpen(true);
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.wav');
    formData.append('agent_id', selectedAgent.id);
    if (selectedConversation) {
      formData.append('conversation_id', selectedConversation);
    }

    try {
      setLoading(true);
      const response = await api.post('/ai/voice-chat', formData);
      
      // Add transcribed message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: response.data.data.transcription,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // Add AI response
      const aiMessage: Message = {
        id: response.data.data.id,
        role: 'assistant',
        content: response.data.data.content,
        agent: selectedAgent,
        created_at: new Date().toISOString(),
        audio_url: response.data.data.audio_url
      };
      setMessages(prev => [...prev, aiMessage]);

      // Play audio response
      if (aiMessage.audio_url && voiceEnabled) {
        playAudioResponse(aiMessage.audio_url);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.play().catch(e => console.error('Error playing audio:', e));
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileType = (file: File): 'image' | 'pdf' | 'text' | 'code' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.name.match(/\.(js|ts|py|java|cpp|c|html|css|json|xml)$/i)) return 'code';
    return 'text';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon />;
      case 'pdf': return <PictureAsPdf />;
      case 'code': return <Code />;
      default: return <Description />;
    }
  };

  const filteredAgents = agents.filter(agent => {
    const categoryMatch = selectedCategory === 'all' || agent.category === selectedCategory;
    const searchMatch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  return (
    <DashboardLayout>
      <SEOHead
        title="AI Chat - LOGOS ECOSYSTEM"
        description="Chat with specialized AI agents for any field"
        keywords="AI chat, AI agents, voice chat"
      />

      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? 300 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
              position: 'relative',
              height: '100%'
            },
          }}
        >
          <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Conversations</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <Close />
              </IconButton>
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setSelectedConversation(null);
                setMessages([]);
                setSelectedAgent(null);
              }}
              sx={{ mb: 2 }}
            >
              New Chat
            </Button>

            <List sx={{ flex: 1, overflow: 'auto' }}>
              {conversations.map((conv) => (
                <ListItem
                  key={conv.id}
                  button
                  selected={selectedConversation === conv.id}
                  onClick={() => {
                    setSelectedConversation(conv.id);
                    // Load conversation messages
                  }}
                  sx={{ borderRadius: 1, mb: 1 }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {agents.find(a => a.id === conv.agent_id)?.icon || <SmartToy />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={conv.title}
                    secondary={`${conv.message_count} messages`}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Delete conversation
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Main Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Paper sx={{ p: 2, borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {!drawerOpen && (
                <IconButton onClick={() => setDrawerOpen(true)}>
                  <MenuOpen />
                </IconButton>
              )}
              
              <Avatar sx={{ bgcolor: selectedAgent ? 'primary.main' : 'grey.500' }}>
                {selectedAgent?.icon || <SmartToy />}
              </Avatar>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                  {selectedAgent?.name || 'Select an AI Agent'}
                </Typography>
                {selectedAgent && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedAgent.description}
                  </Typography>
                )}
              </Box>

              <Button
                variant="outlined"
                startIcon={<Category />}
                onClick={() => setAgentDialogOpen(true)}
              >
                Change Agent
              </Button>

              <Tooltip title={voiceEnabled ? 'Disable voice' : 'Enable voice'}>
                <IconButton onClick={() => setVoiceEnabled(!voiceEnabled)}>
                  {voiceEnabled ? <VolumeUp /> : <VolumeOff />}
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>

          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {selectedAgent ? `Chat with ${selectedAgent.name}` : 'Select an AI Agent to Start'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedAgent ? selectedAgent.description : 'Choose from 100+ specialized AI agents'}
                </Typography>
                {!selectedAgent && (
                  <Button
                    variant="contained"
                    startIcon={<Category />}
                    onClick={() => setAgentDialogOpen(true)}
                    sx={{ mt: 2 }}
                  >
                    Browse Agents
                  </Button>
                )}
              </Box>
            ) : (
              <List>
                {messages.map((message) => (
                  <ListItem
                    key={message.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        maxWidth: '70%',
                        flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                      }}
                    >
                      <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                        {message.role === 'user' ? <Person /> : (message.agent?.icon || <SmartToy />)}
                      </Avatar>
                      <Card sx={{ flex: 1 }}>
                        <CardContent>
                          {message.attachments && message.attachments.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              {message.attachments.map((attachment) => (
                                <Chip
                                  key={attachment.id}
                                  icon={getFileIcon(attachment.type)}
                                  label={attachment.name}
                                  size="small"
                                  sx={{ mr: 1, mb: 1 }}
                                />
                              ))}
                            </Box>
                          )}
                          
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              components={{
                                code({node, inline, className, children, ...props}) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <Typography>{message.content}</Typography>
                          )}
                          
                          {message.audio_url && (
                            <Box sx={{ mt: 2 }}>
                              <audio controls src={message.audio_url} style={{ width: '100%' }} />
                            </Box>
                          )}
                          
                          {message.status === 'sending' && (
                            <LinearProgress sx={{ mt: 1 }} />
                          )}
                          
                          {message.status === 'error' && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              Failed to send message
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  </ListItem>
                ))}
                {loading && (
                  <ListItem>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        {selectedAgent?.icon || <SmartToy />}
                      </Avatar>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2">Thinking...</Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  </ListItem>
                )}
              </List>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Paper sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {attachments.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {attachments.map((file, index) => (
                  <Chip
                    key={index}
                    icon={getFileIcon(getFileType(file))}
                    label={file.name}
                    onDelete={() => removeAttachment(index)}
                  />
                ))}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={selectedAgent ? `Ask ${selectedAgent.name}...` : 'Select an agent first...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={loading || !selectedAgent}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        multiple
                        onChange={handleFileAttachment}
                      />
                      <IconButton
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                      >
                        <AttachFile />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Tooltip title={isRecording ? 'Stop recording' : 'Start voice message'}>
                <IconButton
                  color={isRecording ? 'error' : 'default'}
                  onClick={handleVoiceRecord}
                  disabled={loading || !selectedAgent}
                >
                  {isRecording ? <Stop /> : <Mic />}
                </IconButton>
              </Tooltip>
              
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={loading || (!input.trim() && attachments.length === 0) || !selectedAgent}
              >
                {loading ? <CircularProgress size={24} /> : <Send />}
              </IconButton>
            </Box>
          </Paper>
        </Box>

        {/* Agent Selection Dialog */}
        <Dialog
          open={agentDialogOpen}
          onClose={() => setAgentDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">Select AI Agent</Typography>
              <TextField
                size="small"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search />,
                }}
                sx={{ ml: 'auto' }}
              />
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {agentCategories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Grid container spacing={2}>
              {filteredAgents.map((agent) => (
                <Grid item xs={12} sm={6} md={4} key={agent.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3,
                      },
                      border: selectedAgent?.id === agent.id ? 2 : 0,
                      borderColor: 'primary.main'
                    }}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setAgentDialogOpen(false);
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {agent.icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1">{agent.name}</Typography>
                          <Chip label={agent.category} size="small" />
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {agent.description}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        {agent.voice_enabled && (
                          <Chip icon={<Mic />} label="Voice" size="small" variant="outlined" />
                        )}
                        <Chip label={`${agent.capabilities.length} capabilities`} size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}