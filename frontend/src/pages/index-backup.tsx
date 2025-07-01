import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Button, Grid, Paper, IconButton, Chip, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { AutoAwesome, Speed, Security, Public, Accessibility, Palette, ArrowForward } from '@mui/icons-material';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy components
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

// Matrix rain effect component
const MatrixRain = () => {
  useEffect(() => {
    const canvas = document.getElementById('matrix') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    const matrixArray = matrix.split("");
    
    const fontSize = 10;
    const columns = canvas.width / fontSize;
    
    const drops: number[] = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }
    
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#00F6FF';
      ctx.font = fontSize + 'px monospace';
      
      for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, 35);
    
    return () => clearInterval(interval);
  }, []);
  
  return <canvas id="matrix" style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, opacity: 0.05 }} />;
};

// Animated counter component
const AnimatedCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [target]);
  
  return <span>{count.toLocaleString()}{suffix}</span>;
};

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: <AutoAwesome />,
      title: 'AI-Powered Intelligence',
      description: 'Advanced machine learning models that adapt in real-time',
      color: '#4870FF',
    },
    {
      icon: <Security />,
      title: 'Quantum-Resistant Security',
      description: 'Next-gen cryptography with AI threat detection',
      color: '#00F6FF',
    },
    {
      icon: <Speed />,
      title: 'Lightning Performance',
      description: '12ms response time with intelligent caching',
      color: '#FFD700',
    },
    {
      icon: <Public />,
      title: 'Global Intelligence',
      description: '50+ languages with cultural adaptation',
      color: '#FF6B6B',
    },
    {
      icon: <Accessibility />,
      title: 'Universal Access',
      description: 'WCAG AAA compliant with AI assistance',
      color: '#4ECB71',
    },
    {
      icon: <Palette />,
      title: 'Adaptive Themes',
      description: 'Dynamic UI that adapts to your environment',
      color: '#B84EFF',
    },
  ];

  const stats = [
    { value: 2500000, label: 'Active Users' },
    { value: 150, label: 'AI Agents', suffix: '+' },
    { value: 500, label: 'TB Processed' },
    { value: 99.99, label: '% Uptime' },
  ];

  // Chart data
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'AI Performance',
        data: [65, 78, 84, 89, 94, 97],
        borderColor: '#4870FF',
        backgroundColor: 'rgba(72, 112, 255, 0.1)',
        tension: 0.4,
      },
      {
        label: 'User Growth',
        data: [45, 62, 75, 82, 88, 95],
        borderColor: '#00F6FF',
        backgroundColor: 'rgba(0, 246, 255, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <>
      <MatrixRain />
      
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Logo and Brand */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  >
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(72, 112, 255, 0.3)',
                      }}
                    >
                      <AutoAwesome sx={{ color: 'white', fontSize: 32 }} />
                    </Box>
                  </motion.div>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    LOGOS Ecosystem
                  </Typography>
                </Box>

                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    fontWeight: 800,
                    mb: 3,
                    lineHeight: 1.2,
                  }}
                >
                  The Future of
                  <Box
                    component="span"
                    sx={{
                      display: 'block',
                      background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 50%, #4870FF 100%)',
                      backgroundSize: '200% 200%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      animation: 'gradient 5s ease infinite',
                    }}
                  >
                    AI is Here
                  </Box>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    color: 'text.secondary',
                    fontWeight: 300,
                  }}
                >
                  Experience the next generation of AI-powered solutions with 100+ intelligent agents, 
                  quantum-resistant security, and adaptive interfaces.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => router.push('/auth/signup')}
                    sx={{
                      background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      boxShadow: '0 8px 32px rgba(72, 112, 255, 0.3)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 48px rgba(72, 112, 255, 0.4)',
                      },
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => router.push('/marketplace')}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      borderColor: 'rgba(72, 112, 255, 0.5)',
                      '&:hover': {
                        borderColor: '#4870FF',
                        background: 'rgba(72, 112, 255, 0.1)',
                      },
                    }}
                  >
                    Explore Marketplace
                  </Button>
                </Box>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* AI Orb */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 300,
                      height: 300,
                      background: 'radial-gradient(circle at 30% 30%, #4870FF, #00F6FF)',
                      borderRadius: '50%',
                      filter: 'blur(60px)',
                      opacity: 0.6,
                      animation: 'pulse 4s ease-in-out infinite',
                    }}
                  />
                  
                  {/* Interactive Core */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Box
                      sx={{
                        width: 200,
                        height: 200,
                        background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 0 60px rgba(72, 112, 255, 0.6)',
                        position: 'relative',
                        zIndex: 1,
                      }}
                      onClick={() => router.push('/dashboard/ai-chat')}
                    >
                      <AutoAwesome sx={{ fontSize: 80, color: 'white' }} />
                    </Box>
                  </motion.div>

                  {/* Floating particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -20, 0],
                        x: [0, 10, 0],
                      }}
                      transition={{
                        duration: 3 + i,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      style={{
                        position: 'absolute',
                        width: 8,
                        height: 8,
                        background: '#00F6FF',
                        borderRadius: '50%',
                        top: `${20 + i * 15}%`,
                        left: `${20 + i * 12}%`,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box
        sx={{
          py: 8,
          background: 'rgba(72, 112, 255, 0.02)',
          borderTop: '1px solid rgba(72, 112, 255, 0.1)',
          borderBottom: '1px solid rgba(72, 112, 255, 0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Paper
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(72, 112, 255, 0.2)',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        borderColor: 'rgba(72, 112, 255, 0.5)',
                        boxShadow: '0 10px 30px rgba(72, 112, 255, 0.2)',
                      },
                    }}
                  >
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        color: '#4870FF',
                        mb: 1,
                      }}
                    >
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 10 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{ mb: 2, fontWeight: 700 }}
          >
            AI-Native Features
          </Typography>
          <Typography
            variant="h5"
            align="center"
            color="text.secondary"
            sx={{ mb: 8, maxWidth: 800, mx: 'auto' }}
          >
            Built from the ground up with artificial intelligence at its core, 
            delivering unprecedented capabilities and performance.
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Paper
                    sx={{
                      p: 4,
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(72, 112, 255, 0.2)',
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        borderColor: feature.color,
                        boxShadow: `0 20px 40px ${feature.color}40`,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        background: `linear-gradient(135deg, ${feature.color}40 0%, ${feature.color}20 100%)`,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                        color: feature.color,
                      }}
                    >
                      {React.cloneElement(feature.icon, { fontSize: 'large' })}
                    </Box>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {feature.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Live Metrics Section */}
      <Box
        sx={{
          py: 8,
          background: 'rgba(72, 112, 255, 0.02)',
          borderTop: '1px solid rgba(72, 112, 255, 0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ mb: 3, fontWeight: 700 }}>
                Real-time Performance
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Watch our AI system adapt and optimize in real-time
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Processing Speed</Typography>
                  <Typography color="primary">12ms</Typography>
                </Box>
                <Box
                  sx={{
                    height: 8,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '88%' }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #4870FF 0%, #00F6FF 100%)',
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Accuracy</Typography>
                  <Typography color="primary">99.7%</Typography>
                </Box>
                <Box
                  sx={{
                    height: 8,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '99.7%' }}
                    transition={{ duration: 2, ease: 'easeOut', delay: 0.2 }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #00F6FF 0%, #4870FF 100%)',
                    }}
                  />
                </Box>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Learning Progress</Typography>
                  <Typography color="primary">Growing</Typography>
                </Box>
                <Box
                  sx={{
                    height: 8,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: '60%' }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 3, ease: 'easeOut', delay: 0.4 }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #FFD700 0%, #4870FF 100%)',
                    }}
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(72, 112, 255, 0.2)',
                }}
              >
                <Chart data={chartData} options={chartOptions} />
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 10, textAlign: 'center' }}>
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Typography variant="h2" sx={{ mb: 3, fontWeight: 700 }}>
              Ready to Transform Your Business?
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 5 }}>
              Join thousands of companies using LOGOS Ecosystem to power their AI transformation
            </Typography>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={() => router.push('/auth/signup')}
              sx={{
                background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                boxShadow: '0 8px 32px rgba(72, 112, 255, 0.3)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 48px rgba(72, 112, 255, 0.4)',
                },
              }}
            >
              Get Started Today
            </Button>
          </motion.div>
        </Container>
      </Box>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}