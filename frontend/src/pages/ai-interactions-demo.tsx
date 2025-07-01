/**
 * AI Interactions Demo Page
 * Showcases all micro-interactions and animations
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Paper,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Favorite as HeartIcon,
  ShoppingCart as CartIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  ThumbUp as LikeIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import MicroInteractions from '../lib/ai-native/interactions/MicroInteractions';
import Animations from '../lib/ai-native/animations/AdvancedAnimations';

const {
  MagneticCursor,
  AIRipple,
  celebrateSuccess,
  MorphingShape,
  AITypingIndicator,
  SmartTooltip,
  GestureRecognizer,
  hapticFeedback,
  ParticleField,
} = MicroInteractions;

const {
  MorphSVG,
  FloatingElement,
  LiquidMorph,
  ParticleTrail,
  StaggerChildren,
  ParallaxLayer,
  GooeyEffect,
  RevealOnScroll,
  MagneticHover,
  InfiniteMarquee,
  SkeletonShimmer,
} = Animations;

const AIInteractionsDemo: React.FC = () => {
  const [isTyping, setIsTyping] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showParticles, setShowParticles] = useState(true);
  const [likeCount, setLikeCount] = useState(42);
  const [cartItems, setCartItems] = useState(0);
  const [notifications, setNotifications] = useState(3);
  const gestureRef = useRef(new GestureRecognizer());

  // SVG paths for morphing demo
  const shapePaths = [
    'M50 10 L90 90 L10 90 Z', // Triangle
    'M25 25 L75 25 L75 75 L25 75 Z', // Square
    'M50 10 A40 40 0 0 1 50 90 A40 40 0 0 1 50 10', // Circle
    'M50 10 L65 40 L95 45 L72 65 L80 95 L50 77 L20 95 L28 65 L5 45 L35 40 Z', // Star
  ];

  const handleLike = () => {
    setLikeCount(prev => prev + 1);
    celebrateSuccess('medium');
    hapticFeedback.success();
  };

  const handleAddToCart = () => {
    setCartItems(prev => prev + 1);
    hapticFeedback.medium();
  };

  const handleNotification = () => {
    setNotifications(prev => Math.max(0, prev - 1));
    hapticFeedback.light();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  React.useEffect(() => {
    // Setup gesture recognition
    gestureRef.current.onGesture('swipe-right', () => {
      console.log('Swiped right!');
      hapticFeedback.medium();
    });

    gestureRef.current.onGesture('circle', () => {
      console.log('Drew a circle!');
      celebrateSuccess('high');
    });
  }, []);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#0A0E21',
      color: '#fff',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Particle trail effect */}
      {showParticles && <ParticleTrail mousePosition={mousePos} color="#4870FF" />}

      {/* 3D Background */}
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <ParticleField intensity={0.5} color="#4870FF" />
        </Canvas>
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Typography variant="h2" gutterBottom sx={{ 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 6,
          }}>
            AI-Native Interactions Showcase
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {/* Micro-interactions Section */}
          <Grid item xs={12}>
            <RevealOnScroll animation="slide">
              <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
                Micro-Interactions
              </Typography>
            </RevealOnScroll>
          </Grid>

          {/* Magnetic Cursor Demo */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.1}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Magnetic Cursor</Typography>
                  <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                    <MagneticCursor strength={0.4}>
                      <Button
                        variant="contained"
                        size="large"
                        sx={{
                          background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                          px: 4,
                          py: 2,
                        }}
                      >
                        Hover Me
                      </Button>
                    </MagneticCursor>
                  </Box>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Smart Tooltip Demo */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.2}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Smart Tooltips</Typography>
                  <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <SmartTooltip content="Settings and preferences" aiHints>
                      <IconButton color="primary">
                        <SettingsIcon />
                      </IconButton>
                    </SmartTooltip>
                    <SmartTooltip content={`You have ${notifications} new notifications`} aiHints>
                      <IconButton 
                        color="primary" 
                        onClick={handleNotification}
                        sx={{ position: 'relative' }}
                      >
                        <NotificationIcon />
                        {notifications > 0 && (
                          <Box sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: '#FF6B6B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                          }}>
                            {notifications}
                          </Box>
                        )}
                      </IconButton>
                    </SmartTooltip>
                  </Box>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Haptic Feedback Demo */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.3}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Haptic Feedback</Typography>
                  <Stack spacing={2} sx={{ py: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => hapticFeedback.light()}
                      fullWidth
                    >
                      Light Feedback
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={() => hapticFeedback.medium()}
                      fullWidth
                    >
                      Medium Feedback
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={() => hapticFeedback.heavy()}
                      fullWidth
                    >
                      Heavy Feedback
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Success Celebration Demo */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.4}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Success Celebrations</Typography>
                  <Stack spacing={2} sx={{ py: 2 }}>
                    <Button 
                      variant="contained" 
                      onClick={() => celebrateSuccess('low')}
                      fullWidth
                    >
                      Small Win 🎉
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={() => celebrateSuccess('medium')}
                      color="success"
                      fullWidth
                    >
                      Medium Success 🎊
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={() => celebrateSuccess('high')}
                      sx={{ 
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      }}
                      fullWidth
                    >
                      Epic Achievement 🏆
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* AI Typing Indicator */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.5}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>AI Typing Indicators</Typography>
                  <Stack spacing={3} sx={{ py: 2 }}>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>Friendly</Typography>
                      <AITypingIndicator personality="friendly" isTyping={true} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>Professional</Typography>
                      <AITypingIndicator personality="professional" isTyping={true} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>Playful</Typography>
                      <AITypingIndicator personality="playful" isTyping={true} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Interactive Elements */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.6}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Interactive Elements</Typography>
                  <Stack spacing={2} sx={{ py: 2 }}>
                    <MagneticHover strength={0.3}>
                      <Button
                        variant="contained"
                        startIcon={<HeartIcon />}
                        onClick={handleLike}
                        fullWidth
                        sx={{
                          background: likeCount > 42 ? '#FF6B6B' : '#4870FF',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Like ({likeCount})
                      </Button>
                    </MagneticHover>
                    <MagneticHover strength={0.3}>
                      <Button
                        variant="contained"
                        startIcon={<CartIcon />}
                        onClick={handleAddToCart}
                        fullWidth
                        color="success"
                      >
                        Add to Cart ({cartItems})
                      </Button>
                    </MagneticHover>
                  </Stack>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Advanced Animations Section */}
          <Grid item xs={12}>
            <RevealOnScroll animation="slide">
              <Typography variant="h4" gutterBottom sx={{ mb: 4, mt: 4 }}>
                Advanced Animations
              </Typography>
            </RevealOnScroll>
          </Grid>

          {/* Morphing Shapes */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom">
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Morphing Shapes</Typography>
                  <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                    <MorphSVG paths={shapePaths} duration={2} color="#00F6FF" />
                  </Box>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* 3D Liquid Morph */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.1}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>3D Liquid Morph</Typography>
                  <Box sx={{ height: 200 }}>
                    <Canvas>
                      <ambientLight intensity={0.5} />
                      <pointLight position={[10, 10, 10]} />
                      <FloatingElement>
                        <LiquidMorph color="#4870FF" intensity={0.6} />
                      </FloatingElement>
                    </Canvas>
                  </Box>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Skeleton Loading */}
          <Grid item xs={12} md={6} lg={4}>
            <RevealOnScroll animation="zoom" delay={0.2}>
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Skeleton Loading</Typography>
                  <Stack spacing={2} sx={{ py: 2 }}>
                    <SkeletonShimmer height={40} borderRadius={8} />
                    <SkeletonShimmer height={60} borderRadius={8} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <SkeletonShimmer width={80} height={80} borderRadius="50%" />
                      <Stack spacing={1} sx={{ flex: 1 }}>
                        <SkeletonShimmer height={20} width="60%" />
                        <SkeletonShimmer height={20} width="80%" />
                        <SkeletonShimmer height={20} width="40%" />
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Infinite Marquee */}
          <Grid item xs={12}>
            <RevealOnScroll animation="fade">
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
                overflow: 'hidden',
              }}>
                <CardContent sx={{ p: 0 }}>
                  <InfiniteMarquee speed={30} pauseOnHover>
                    <Box sx={{ display: 'flex', gap: 4, py: 3, px: 2 }}>
                      {['AI-Powered', 'Next Generation', 'Ultra Performance', 'Quantum Computing', 'Neural Networks', 'Machine Learning'].map((text, i) => (
                        <Chip
                          key={i}
                          label={text}
                          sx={{
                            background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                            color: '#fff',
                            fontSize: '16px',
                            py: 2,
                            px: 3,
                          }}
                        />
                      ))}
                    </Box>
                  </InfiniteMarquee>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>

          {/* Controls */}
          <Grid item xs={12}>
            <RevealOnScroll animation="fade">
              <Card sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Demo Controls</Typography>
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showParticles}
                          onChange={(e) => setShowParticles(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Show Particle Trail"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AIInteractionsDemo;