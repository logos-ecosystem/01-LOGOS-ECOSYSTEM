import React, { useState, useRef, useEffect } from 'react'
import { NextPage } from 'next'
import {
  Container,
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Divider,
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
} from '@mui/material'
import {
  Send,
  SmartToy,
  Person,
  MoreVert,
  Delete,
  ContentCopy,
  Refresh,
  Info,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { DashboardLayout } from '@/components/Layout/DashboardLayout'
import { withAuth } from '@/components/Auth/withAuth'
import { useAuthStore } from '@/store/auth'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  tokens_used?: number
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  total_tokens: number
}

const AIChatPage: NextPage = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [input, setInput] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)

  const { data: conversations, isPending: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await axios.get<Conversation[]>('/api/ai/conversations')
      return response.data
    },
  })

  const { data: messages, isPending: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return []
      const response = await axios.get<Message[]>(`/api/ai/conversations/${selectedConversation}/messages`)
      return response.data
    },
    enabled: !!selectedConversation,
  })

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/ai/conversations')
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedConversation(data.id)
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const response = await axios.post(`/api/ai/conversations/${conversationId}/messages`, {
        content,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConversation] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setInput('')
    },
  })

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await axios.delete(`/api/ai/conversations/${conversationId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (selectedConversation) {
        setSelectedConversation(null)
      }
    },
  })

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    if (!selectedConversation) {
      const conversation = await createConversationMutation.mutateAsync()
      sendMessageMutation.mutate({ conversationId: conversation.id, content: input })
    } else {
      sendMessageMutation.mutate({ conversationId: selectedConversation, content: input })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, messageId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedMessage(messageId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedMessage(null)
  }

  const handleCopyMessage = () => {
    const message = messages?.find(m => m.id === selectedMessage)
    if (message) {
      navigator.clipboard.writeText(message.content)
    }
    handleMenuClose()
  }

  const handleNewConversation = () => {
    setSelectedConversation(null)
    queryClient.invalidateQueries({ queryKey: ['conversation-messages'] })
  }

  return (
    <DashboardLayout>
      <Container maxWidth="lg" sx={{ height: 'calc(100vh - 100px)', display: 'flex' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', height: '100%' }}>
          {/* Conversations Sidebar */}
          <Paper sx={{ width: 300, p: 2, display: 'flex', flexDirection: 'column' }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleNewConversation}
              sx={{ mb: 2 }}
            >
              New Conversation
            </Button>
            
            <Typography variant="h6" sx={{ mb: 2 }}>
              Conversations
            </Typography>
            
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {conversationsLoading ? (
                [...Array(3)].map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                ))
              ) : conversations?.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  No conversations yet
                </Typography>
              ) : (
                <List>
                  {conversations?.map((conversation) => (
                    <ListItem
                      key={conversation.id}
                      button
                      selected={selectedConversation === conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      sx={{ borderRadius: 1, mb: 1 }}
                    >
                      <ListItemText
                        primary={conversation.title || 'New Conversation'}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {conversation.message_count} messages
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                            </Typography>
                          </Box>
                        }
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversationMutation.mutate(conversation.id)
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>

          {/* Chat Area */}
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToy />
                  <Typography variant="h6">AI Assistant</Typography>
                </Box>
                <Chip
                  icon={<Info />}
                  label="Claude Opus 4"
                  size="small"
                  color="primary"
                />
              </Box>
            </Box>

            {/* Messages Area */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messagesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : messages?.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Start a conversation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ask me anything about the LOGOS ecosystem or get help with your tasks
                  </Typography>
                </Box>
              ) : (
                <List>
                  {messages?.map((message) => (
                    <ListItem
                      key={message.id}
                      sx={{
                        flexDirection: 'column',
                        alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          maxWidth: '70%',
                          flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                        }}
                      >
                        <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                          {message.role === 'user' ? <Person /> : <SmartToy />}
                        </Avatar>
                        <Card sx={{ flex: 1 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {message.role === 'user' ? user?.username : 'AI Assistant'}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, message.id)}
                              >
                                <MoreVert fontSize="small" />
                              </IconButton>
                            </Box>
                            {message.role === 'assistant' ? (
                              <ReactMarkdown
                                components={{
                                  code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '')
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
                                    )
                                  }
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            ) : (
                              <Typography variant="body1">{message.content}</Typography>
                            )}
                            {message.tokens_used && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {message.tokens_used} tokens
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendMessageMutation.isPending}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Send />
                  )}
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleCopyMessage}>
            <ContentCopy sx={{ mr: 1 }} /> Copy
          </MenuItem>
        </Menu>
      </Container>
    </DashboardLayout>
  )
}

export default withAuth(AIChatPage)