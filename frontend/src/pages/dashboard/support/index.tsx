import React, { useState } from 'react';
import { NextPage } from 'next';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Message,
  AttachFile,
  CheckCircle,
  HourglassEmpty,
  Warning,
  Article,
  LiveHelp,
  ExpandLess,
  ExpandMore,
  QuestionAnswer,
  School,
  ChatBubbleOutline
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import withAuth from '@/components/Auth/withAuth';
import { useQuery } from '@tanstack/react-query';
import { supportAPI } from '@/services/api/support';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TicketStatus, TicketPriority, TicketCategory } from '@/types/support';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`support-tabpanel-${index}`}
      aria-labelledby={`support-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const SupportCenter: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuEl, setFilterMenuEl] = useState<null | HTMLElement>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Queries
  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['support', 'tickets', statusFilter],
    queryFn: () => supportAPI.getTickets({
      status: statusFilter || undefined,
      limit: 20
    })
  });

  const { data: ticketStats } = useQuery({
    queryKey: ['support', 'stats'],
    queryFn: supportAPI.getTicketStats
  });

  const { data: faqs } = useQuery({
    queryKey: ['support', 'faqs'],
    queryFn: () => supportAPI.getFAQs()
  });

  const { data: knowledgeArticles } = useQuery({
    queryKey: ['support', 'knowledge-base', searchQuery],
    queryFn: () => searchQuery ? supportAPI.searchKnowledgeBase(searchQuery) : Promise.resolve([]),
    enabled: searchQuery.length > 2
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: TicketStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'open':
        return 'info';
      case 'in-progress':
        return 'primary';
      case 'waiting-customer':
        return 'warning';
      case 'waiting-support':
        return 'secondary';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: TicketPriority): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'primary';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: TicketCategory) => {
    switch (category) {
      case 'technical':
        return '🛠️';
      case 'billing':
        return '💳';
      case 'account':
        return '👤';
      case 'feature-request':
        return '✨';
      case 'bug-report':
        return '🐛';
      case 'integration':
        return '🔌';
      default:
        return '📋';
    }
  };

  const quickActions = [
    {
      title: 'Centro de Conocimiento',
      description: 'Busca respuestas en nuestra base de conocimiento',
      icon: <School />,
      action: () => setTabValue(2)
    },
    {
      title: 'FAQ',
      description: 'Preguntas frecuentes',
      icon: <LiveHelp />,
      action: () => setTabValue(3)
    },
    {
      title: 'Chat en Vivo',
      description: 'Habla con un agente de soporte',
      icon: <ChatBubbleOutline />,
      action: () => router.push('/dashboard/support/live-chat')
    }
  ];

  return (
    <DashboardLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              Centro de Soporte
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/dashboard/support/new')}
            >
              Nuevo Ticket
            </Button>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Gestiona tus tickets de soporte y encuentra respuestas rápidas
          </Typography>
        </Box>

        {/* Stats Cards */}
        {ticketStats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Tickets Abiertos
                      </Typography>
                      <Typography variant="h4">
                        {ticketStats.open}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                      <HourglassEmpty color="info" />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        En Progreso
                      </Typography>
                      <Typography variant="h4">
                        {ticketStats.inProgress}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                      <Warning color="primary" />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Resueltos
                      </Typography>
                      <Typography variant="h4">
                        {ticketStats.resolved}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                      <CheckCircle color="success" />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Tiempo Respuesta
                      </Typography>
                      <Typography variant="h4">
                        {ticketStats.avgResponseTime}h
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                      <Message color="secondary" />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="support tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Mis Tickets" />
            <Tab label="Acciones Rápidas" />
            <Tab label="Base de Conocimiento" />
            <Tab label="Preguntas Frecuentes" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {/* Tickets List */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Buscar tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={(e) => setFilterMenuEl(e.currentTarget)}
                        edge="end"
                      >
                        <FilterList />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Menu
                anchorEl={filterMenuEl}
                open={Boolean(filterMenuEl)}
                onClose={() => setFilterMenuEl(null)}
              >
                <MenuItem onClick={() => { setStatusFilter(''); setFilterMenuEl(null); }}>
                  Todos
                </MenuItem>
                <MenuItem onClick={() => { setStatusFilter('open'); setFilterMenuEl(null); }}>
                  Abiertos
                </MenuItem>
                <MenuItem onClick={() => { setStatusFilter('in-progress'); setFilterMenuEl(null); }}>
                  En Progreso
                </MenuItem>
                <MenuItem onClick={() => { setStatusFilter('resolved'); setFilterMenuEl(null); }}>
                  Resueltos
                </MenuItem>
              </Menu>
            </Box>

            {tickets && tickets.tickets.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Asunto</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Prioridad</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Última Actualización</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.tickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/dashboard/support/tickets/${ticket.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            #{ticket.id.slice(0, 8)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {ticket.subject}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ticket.description.slice(0, 60)}...
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {getCategoryIcon(ticket.category)}
                            </Typography>
                            {ticket.category}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ticket.priority}
                            size="small"
                            color={getPriorityColor(ticket.priority)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ticket.status}
                            size="small"
                            color={getStatusColor(ticket.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(ticket.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/support/tickets/${ticket.id}`);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No tienes tickets de soporte
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => router.push('/dashboard/support/new')}
                  sx={{ mt: 2 }}
                >
                  Crear Primer Ticket
                </Button>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Quick Actions */}
            <Grid container spacing={3}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}
                    onClick={action.action}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                          {action.icon}
                        </Avatar>
                        <Typography variant="h6">
                          {action.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* Knowledge Base */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Buscar en la base de conocimiento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            
            {knowledgeArticles && knowledgeArticles.length > 0 ? (
              <Grid container spacing={2}>
                {knowledgeArticles.map((article) => (
                  <Grid item xs={12} md={6} key={article.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { boxShadow: theme.shadows[4] }
                      }}
                      onClick={() => router.push(`/dashboard/support/kb/${article.id}`)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'start' }}>
                          <Article sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom>
                              {article.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {article.content.slice(0, 150)}...
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {article.tags.slice(0, 3).map((tag) => (
                                <Chip key={tag} label={tag} size="small" />
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchQuery ? 'No se encontraron artículos' : 'Ingresa un término de búsqueda'}
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* FAQ */}
            <List>
              {faqs?.map((faq) => (
                <React.Fragment key={faq.id}>
                  <ListItemButton
                    onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  >
                    <ListItemIcon>
                      <QuestionAnswer />
                    </ListItemIcon>
                    <ListItemText primary={faq.question} />
                    {expandedFAQ === faq.id ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={expandedFAQ === faq.id} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 3, bgcolor: 'background.default' }}>
                      <Typography variant="body2" paragraph>
                        {faq.answer}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => supportAPI.rateFAQ(faq.id, true)}
                        >
                          Útil ({faq.helpful})
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => supportAPI.rateFAQ(faq.id, false)}
                        >
                          No útil ({faq.notHelpful})
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>
                </React.Fragment>
              ))}
            </List>
          </TabPanel>
        </Paper>
      </Container>
    </DashboardLayout>
  );
};

export default withAuth(SupportCenter);