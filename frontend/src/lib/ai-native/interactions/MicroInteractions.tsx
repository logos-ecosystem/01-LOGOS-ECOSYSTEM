/**
 * Advanced Micro-Interactions System
 * AI-powered contextual animations and feedback
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Box, styled, keyframes } from '@mui/material';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import confetti from 'canvas-confetti';

// Quantum particle system for interactions
const quantumGlow = keyframes`
  0% { 
    box-shadow: 0 0 5px rgba(72, 112, 255, 0.5),
                0 0 10px rgba(0, 246, 255, 0.3),
                inset 0 0 5px rgba(72, 112, 255, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 20px rgba(72, 112, 255, 0.8),
                0 0 40px rgba(0, 246, 255, 0.6),
                inset 0 0 10px rgba(72, 112, 255, 0.4);
    transform: scale(1.05);
  }
  100% { 
    box-shadow: 0 0 5px rgba(72, 112, 255, 0.5),
                0 0 10px rgba(0, 246, 255, 0.3),
                inset 0 0 5px rgba(72, 112, 255, 0.2);
    transform: scale(1);
  }
`;

const neuralPulse = keyframes`
  0% { 
    opacity: 0;
    transform: scale(0.8) rotate(0deg);
  }
  50% { 
    opacity: 1;
    transform: scale(1.1) rotate(180deg);
  }
  100% { 
    opacity: 0;
    transform: scale(1.3) rotate(360deg);
  }
`;

// Particle effect component
interface ParticleFieldProps {
  intensity: number;
  color: string;
  count?: number;
}

function ParticleField({ intensity, color, count = 100 }: ParticleFieldProps) {
  const particles = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 10;
      pos[i + 1] = (Math.random() - 0.5) * 10;
      pos[i + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  });

  useFrame((state) => {
    if (particles.current) {
      particles.current.rotation.x = state.clock.elapsedTime * 0.1 * intensity;
      particles.current.rotation.y = state.clock.elapsedTime * 0.15 * intensity;
    }
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={color} transparent opacity={0.6} />
    </points>
  );
}

// Haptic feedback simulation
export const hapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 10, 20]);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 20, 40, 20, 40]);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10, 50, 10]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 30, 100, 30, 100]);
    }
  }
};

// AI-powered gesture recognition
export class GestureRecognizer {
  private gestureHistory: Array<{ x: number; y: number; time: number }> = [];
  private recognizedGestures = new Map<string, (data: any) => void>();

  addGesturePoint(x: number, y: number) {
    const now = Date.now();
    this.gestureHistory.push({ x, y, time: now });
    
    // Keep only recent points (last 500ms)
    this.gestureHistory = this.gestureHistory.filter(p => now - p.time < 500);
    
    this.recognizeGesture();
  }

  private recognizeGesture() {
    if (this.gestureHistory.length < 3) return;

    // Simple swipe detection
    const first = this.gestureHistory[0];
    const last = this.gestureHistory[this.gestureHistory.length - 1];
    const deltaX = last.x - first.x;
    const deltaY = last.y - first.y;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

    if (distance > 100) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      if (Math.abs(angle) < 45) {
        this.triggerGesture('swipe-right', { distance, velocity: distance / 500 });
      } else if (Math.abs(angle) > 135) {
        this.triggerGesture('swipe-left', { distance, velocity: distance / 500 });
      } else if (angle > 45 && angle < 135) {
        this.triggerGesture('swipe-down', { distance, velocity: distance / 500 });
      } else if (angle < -45 && angle > -135) {
        this.triggerGesture('swipe-up', { distance, velocity: distance / 500 });
      }
    }

    // Circle detection
    if (this.gestureHistory.length > 10) {
      const isCircle = this.detectCircle();
      if (isCircle) {
        this.triggerGesture('circle', { radius: distance / 2 });
      }
    }
  }

  private detectCircle(): boolean {
    // Simplified circle detection
    const points = this.gestureHistory;
    if (points.length < 8) return false;

    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    
    const distances = points.map(p => 
      Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
    );
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.abs(d - avgDistance), 0) / distances.length;
    
    return variance < avgDistance * 0.2;
  }

  onGesture(gesture: string, handler: (data: any) => void) {
    this.recognizedGestures.set(gesture, handler);
  }

  private triggerGesture(gesture: string, data: any) {
    const handler = this.recognizedGestures.get(gesture);
    if (handler) {
      handler(data);
      hapticFeedback.light();
    }
  }
}

// Magnetic cursor effect
export const MagneticCursor: React.FC<{ children: React.ReactNode; strength?: number }> = ({ 
  children, 
  strength = 0.3 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current || !isHovered) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    x.set(distanceX * strength);
    y.set(distanceY * strength);
  }, [isHovered, strength, x, y]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      animate={{ scale: isHovered ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
};

// Ripple effect with AI color adaptation
export const AIRipple: React.FC<{ 
  color?: string; 
  duration?: number;
  adaptive?: boolean;
}> = ({ 
  color = '#4870FF', 
  duration = 600,
  adaptive = true 
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Date.now() };
    setRipples(prev => [...prev, newRipple]);

    // AI color adaptation based on context
    if (adaptive) {
      const bgColor = window.getComputedStyle(containerRef.current).backgroundColor;
      // Adapt ripple color based on background
      // This is a simplified version - in production, use a proper color contrast algorithm
    }

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, duration);
  }, [duration, adaptive]);

  return (
    <Box
      ref={containerRef}
      onClick={handleClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration / 1000 }}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: color,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </Box>
  );
};

// Success celebration with AI-powered intensity
export const celebrateSuccess = (intensity: 'low' | 'medium' | 'high' = 'medium') => {
  const configs = {
    low: {
      particleCount: 50,
      spread: 40,
      origin: { y: 0.6 }
    },
    medium: {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4870FF', '#00F6FF', '#FFD700']
    },
    high: {
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#4870FF', '#00F6FF', '#FFD700', '#FF6B6B', '#4ECDC4'],
      shapes: ['star', 'circle', 'square'],
      gravity: 0.5,
      scalar: 1.2
    }
  };

  confetti(configs[intensity]);
  hapticFeedback.success();
};

// Morphing shape component
export const MorphingShape: React.FC<{ 
  shapes: string[]; 
  interval?: number;
  color?: string;
}> = ({ 
  shapes, 
  interval = 3000,
  color = '#4870FF' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % shapes.length);
    }, interval);

    return () => clearInterval(timer);
  }, [shapes, interval]);

  return (
    <motion.svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
    >
      <motion.path
        d={shapes[currentIndex]}
        fill={color}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
};

// Typing indicator with AI personality
export const AITypingIndicator: React.FC<{ 
  personality?: 'friendly' | 'professional' | 'playful';
  isTyping: boolean;
}> = ({ 
  personality = 'friendly', 
  isTyping 
}) => {
  const dots = [0, 1, 2];
  
  const animations = {
    friendly: {
      y: [0, -10, 0],
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
    },
    professional: {
      opacity: [0.3, 1, 0.3],
      transition: { duration: 1, repeat: Infinity, ease: 'linear' }
    },
    playful: {
      scale: [1, 1.5, 1],
      rotate: [0, 180, 360],
      transition: { duration: 0.8, repeat: Infinity, ease: 'backInOut' }
    }
  };

  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{ display: 'flex', gap: '4px' }}
        >
          {dots.map((dot) => (
            <motion.div
              key={dot}
              animate={animations[personality]}
              transition={{ delay: dot * 0.1 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#4870FF',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Smart tooltip with context awareness
export const SmartTooltip: React.FC<{
  children: React.ReactNode;
  content: React.ReactNode;
  aiHints?: boolean;
}> = ({ children, content, aiHints = true }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [aiSuggestion, setAiSuggestion] = useState<string>('');

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsVisible(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });

    if (aiHints) {
      // Simulate AI context analysis
      setTimeout(() => {
        setAiSuggestion('Pro tip: Use keyboard shortcut Cmd+K for quick access');
      }, 500);
    }
  }, [aiHints]);

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => {
        setIsVisible(false);
        setAiSuggestion('');
      }}
      sx={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'rgba(10, 14, 33, 0.95)',
              border: '1px solid rgba(72, 112, 255, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              zIndex: 9999,
              maxWidth: 200,
            }}
          >
            <Box sx={{ color: '#fff', fontSize: '14px' }}>{content}</Box>
            {aiSuggestion && (
              <Box sx={{ 
                color: '#00F6FF', 
                fontSize: '12px', 
                mt: 1,
                pt: 1,
                borderTop: '1px solid rgba(72, 112, 255, 0.2)'
              }}>
                💡 {aiSuggestion}
              </Box>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

// Export all micro-interactions
export default {
  MagneticCursor,
  AIRipple,
  celebrateSuccess,
  MorphingShape,
  AITypingIndicator,
  SmartTooltip,
  GestureRecognizer,
  hapticFeedback,
  ParticleField,
};