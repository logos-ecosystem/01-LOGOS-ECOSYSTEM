import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  Lightbulb,
  Security,
  Speed,
  Public,
  Groups,
  Extension
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import SEOHead from '../components/SEO/SEOHead';

const teamMembers = [
  {
    name: 'Dr. Sarah Chen',
    role: 'CEO & Co-Founder',
    bio: 'Former AI Research Lead at DeepMind',
    avatar: '/images/team/sarah.jpg'
  },
  {
    name: 'Marcus Rodriguez',
    role: 'CTO & Co-Founder',
    bio: '15+ years in distributed systems',
    avatar: '/images/team/marcus.jpg'
  },
  {
    name: 'Dr. Emily Watson',
    role: 'Chief AI Officer',
    bio: 'PhD in Machine Learning from MIT',
    avatar: '/images/team/emily.jpg'
  },
  {
    name: 'James Park',
    role: 'VP of Engineering',
    bio: 'Former Tesla Autopilot Team',
    avatar: '/images/team/james.jpg'
  }
];

const values = [
  {
    icon: <Lightbulb />,
    title: 'Innovation First',
    description: 'Pushing the boundaries of AI to create unprecedented value'
  },
  {
    icon: <Security />,
    title: 'Privacy & Security',
    description: 'Your data is yours. End-to-end encryption and zero-knowledge architecture'
  },
  {
    icon: <Public />,
    title: 'Global Access',
    description: 'AI should be accessible to everyone, everywhere'
  },
  {
    icon: <Groups />,
    title: 'Community Driven',
    description: 'Built with and for our community of users and developers'
  }
];

const milestones = [
  { year: '2023', event: 'Company founded with mission to democratize AI' },
  { year: '2023', event: 'Launched beta with 10 specialized AI agents' },
  { year: '2024', event: 'Reached 100+ AI agents across all domains' },
  { year: '2024', event: 'Integrated voice, IoT, and automotive support' },
  { year: '2024', event: 'Launched marketplace and white-label platform' }
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <>
      <SEOHead
        title="About Us - LOGOS ECOSYSTEM"
        description="Learn about LOGOS ECOSYSTEM's mission to bring specialized AI to every field of human knowledge"
        keywords="about LOGOS, AI company, AI mission, AI team"
      />

      <Box sx={{ minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
        {/* Hero Section */}
        <Box sx={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', py: 12 }}>
          <Container maxWidth="lg">
            <Typography variant="h2" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
              Building the Future of AI
            </Typography>
            <Typography variant="h5" align="center" sx={{ opacity: 0.9, maxWidth: 800, mx: 'auto' }}>
              Our mission is to make specialized AI accessible to everyone, transforming how we work, 
              learn, and solve problems across every domain of human knowledge.
            </Typography>
          </Container>
        </Box>

        {/* Mission Section */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" gutterBottom>
                Our Mission
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1.2rem', opacity: 0.9 }}>
                We believe AI should be more than a general-purpose tool. Every field of human 
                knowledge deserves specialized, expert-level AI assistance.
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1.2rem', opacity: 0.9 }}>
                LOGOS ECOSYSTEM brings together the world's most advanced AI agents, each trained 
                in specific domains, accessible through a unified platform that works everywhere - 
                from your phone to your car to your smart home.
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="100+ specialized AI agents and growing" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Voice-first interaction design" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Seamless integration with all your devices" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/images/mission-graphic.svg"
                alt="Our Mission"
                sx={{ width: '100%', maxWidth: 500, height: 'auto' }}
              />
            </Grid>
          </Grid>
        </Container>

        {/* Values Section */}
        <Box sx={{ background: 'rgba(255,255,255,0.05)', py: 8 }}>
          <Container maxWidth="lg">
            <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6 }}>
              Our Values
            </Typography>
            <Grid container spacing={4}>
              {values.map((value, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card sx={{ height: '100%', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                    <CardContent sx={{ textAlign: 'center', p: 4 }}>
                      <Box sx={{ color: 'primary.main', fontSize: 48, mb: 2 }}>
                        {value.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {value.title}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {value.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Team Section */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6 }}>
            Meet Our Team
          </Typography>
          <Grid container spacing={4}>
            {teamMembers.map((member, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Avatar
                      src={member.avatar}
                      sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                    />
                    <Typography variant="h6" gutterBottom>
                      {member.name}
                    </Typography>
                    <Chip label={member.role} size="small" sx={{ mb: 2 }} />
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {member.bio}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Timeline Section */}
        <Box sx={{ background: 'rgba(255,255,255,0.05)', py: 8 }}>
          <Container maxWidth="lg">
            <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6 }}>
              Our Journey
            </Typography>
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
              {milestones.map((milestone, index) => (
                <Box key={index} sx={{ display: 'flex', mb: 4 }}>
                  <Box sx={{ 
                    width: 80, 
                    flexShrink: 0, 
                    textAlign: 'right', 
                    pr: 3,
                    borderRight: '2px solid',
                    borderColor: 'primary.main'
                  }}>
                    <Typography variant="h6" color="primary">
                      {milestone.year}
                    </Typography>
                  </Box>
                  <Box sx={{ pl: 3 }}>
                    <Typography variant="body1">
                      {milestone.event}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* CTA Section */}
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            Join Us in Shaping the Future
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Be part of the AI revolution
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/auth/signup')}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ borderColor: 'white', color: 'white' }}
              onClick={() => router.push('/careers')}
            >
              Join Our Team
            </Button>
          </Box>
        </Container>

        {/* Footer */}
        <Box sx={{ py: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Container maxWidth="lg">
            <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
              © 2024 LOGOS ECOSYSTEM. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </Box>
    </>
  );
}