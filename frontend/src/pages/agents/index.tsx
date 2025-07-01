import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  Skeleton,
  IconButton,
  Tooltip,
  Avatar,
  Rating
} from '@mui/material';
import { Search, GridView, ViewList, Favorite, FavoriteBorder } from '@mui/icons-material';
import { useRouter } from 'next/router';
import SEOHead from '../../components/SEO/SEOHead';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { api } from '../../services/api';

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  capabilities: string[];
  rating: number;
  reviews_count: number;
  price: number;
  icon: string;
  is_favorite?: boolean;
  usage_count: number;
  last_updated: string;
}

const categories = [
  { value: 'all', label: 'All Categories', icon: '🌐' },
  { value: 'medical', label: 'Medical & Health', icon: '🏥' },
  { value: 'business', label: 'Business & Finance', icon: '💼' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'science', label: 'Science', icon: '🔬' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'engineering', label: 'Engineering', icon: '🔧' },
  { value: 'arts', label: 'Arts & Culture', icon: '🎨' },
  { value: 'mathematics', label: 'Mathematics', icon: '📐' },
  { value: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
];

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAgents();
    fetchFavorites();
  }, [page, searchQuery, selectedCategory]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
      });

      const response = await api.get(`/agents?${params}`);
      setAgents(response.data.data);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/users/favorites');
      setFavorites(new Set(response.data.data.map((f: any) => f.agent_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (agentId: string) => {
    try {
      if (favorites.has(agentId)) {
        await api.delete(`/agents/${agentId}/favorite`);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(agentId);
          return newSet;
        });
      } else {
        await api.post(`/agents/${agentId}/favorite`);
        setFavorites(prev => new Set([...prev, agentId]));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAgentClick = (agentId: string) => {
    router.push(`/marketplace/agent/${agentId}`);
  };

  const AgentCard = ({ agent }: { agent: Agent }) => (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={() => handleAgentClick(agent.id)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ width: 56, height: 56, fontSize: '2rem', bgcolor: 'primary.main' }}>
            {agent.icon}
          </Avatar>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(agent.id);
            }}
          >
            {favorites.has(agent.id) ? <Favorite color="error" /> : <FavoriteBorder />}
          </IconButton>
        </Box>

        <Typography variant="h6" gutterBottom>
          {agent.name}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: 40, overflow: 'hidden' }}>
          {agent.description}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={agent.category} size="small" color="primary" />
          {agent.subcategory && <Chip label={agent.subcategory} size="small" variant="outlined" />}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Rating value={agent.rating} readOnly size="small" precision={0.5} />
          <Typography variant="body2" color="text.secondary">
            ({agent.reviews_count})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {agent.usage_count.toLocaleString()} uses
          </Typography>
          <Typography variant="h6" color="primary">
            ${agent.price}/mo
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const AgentListItem = ({ agent }: { agent: Agent }) => (
    <Card
      sx={{
        mb: 2,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 3,
        },
      }}
      onClick={() => handleAgentClick(agent.id)}
    >
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 64, height: 64, fontSize: '2.5rem', bgcolor: 'primary.main' }}>
              {agent.icon}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{agent.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {agent.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={agent.category} size="small" color="primary" />
                  {agent.subcategory && <Chip label={agent.subcategory} size="small" variant="outlined" />}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right', ml: 2 }}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(agent.id);
                  }}
                >
                  {favorites.has(agent.id) ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
                <Typography variant="h6" color="primary">
                  ${agent.price}/mo
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={agent.rating} readOnly size="small" precision={0.5} />
                  <Typography variant="body2" color="text.secondary">
                    ({agent.reviews_count})
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <SEOHead
        title="AI Agents Directory - LOGOS ECOSYSTEM"
        description="Browse and discover specialized AI agents for every field. Medical, legal, business, technology, and more."
        keywords="AI agents, specialized AI, agent marketplace, AI directory"
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          AI Agents Directory
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Discover specialized AI agents for every field of knowledge
        </Typography>

        {/* Search and Filters */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, value) => value && setViewMode(value)}
                  size="small"
                >
                  <ToggleButton value="grid">
                    <Tooltip title="Grid view">
                      <GridView />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="list">
                    <Tooltip title="List view">
                      <ViewList />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Category Filters */}
        <Box sx={{ mb: 4, overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 1, minWidth: 'max-content', pb: 1 }}>
            {categories.map((category) => (
              <Chip
                key={category.value}
                label={`${category.icon} ${category.label}`}
                onClick={() => setSelectedCategory(category.value)}
                color={selectedCategory === category.value ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Agents Grid/List */}
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(12)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Skeleton variant="rectangular" height={280} />
              </Grid>
            ))}
          </Grid>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={3}>
            {agents.map((agent) => (
              <Grid item xs={12} sm={6} md={4} key={agent.id}>
                <AgentCard agent={agent} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box>
            {agents.map((agent) => (
              <AgentListItem key={agent.id} agent={agent} />
            ))}
          </Box>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Container>
    </DashboardLayout>
  );
}