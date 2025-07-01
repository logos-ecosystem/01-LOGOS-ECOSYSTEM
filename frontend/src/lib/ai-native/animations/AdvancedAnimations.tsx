/**
 * Advanced Animation System
 * Physics-based and AI-driven animations for ultra-smooth UX
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Box, styled } from '@mui/material';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Trail, Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import { useSpring as useSpringThree, animated } from '@react-spring/three';

// Physics-based spring configurations
export const springConfigs = {
  wobbly: { mass: 1, tension: 180, friction: 12 },
  gentle: { mass: 1, tension: 120, friction: 14 },
  stiff: { mass: 1, tension: 210, friction: 20 },
  molasses: { mass: 1, tension: 280, friction: 120 },
  quantum: { mass: 0.5, tension: 350, friction: 8 },
};

// Advanced easing functions
export const customEasings = {
  easeInOutElastic: (t: number): number => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  easeInOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
};

// Morph SVG paths animation
export const MorphSVG: React.FC<{
  paths: string[];
  duration?: number;
  color?: string;
  loop?: boolean;
}> = ({ paths, duration = 2, color = '#4870FF', loop = true }) => {
  const [pathIndex, setPathIndex] = useState(0);

  useEffect(() => {
    if (!loop) return;
    
    const interval = setInterval(() => {
      setPathIndex((prev) => (prev + 1) % paths.length);
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [paths.length, duration, loop]);

  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      <motion.path
        d={paths[pathIndex]}
        fill={color}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration, ease: 'easeInOut' },
          opacity: { duration: 0.5 }
        }}
      />
    </svg>
  );
};

// 3D Floating elements
export const FloatingElement: React.FC<{
  children: React.ReactNode;
  floatSpeed?: number;
  rotationSpeed?: number;
  floatDistance?: number;
}> = ({ 
  children, 
  floatSpeed = 3, 
  rotationSpeed = 5,
  floatDistance = 20 
}) => {
  return (
    <Float
      speed={floatSpeed}
      rotationIntensity={1}
      floatIntensity={2}
      floatingRange={[-floatDistance / 100, floatDistance / 100]}
    >
      <group>
        {children}
      </group>
    </Float>
  );
};

// Liquid morph effect
export const LiquidMorph: React.FC<{
  intensity?: number;
  color?: string;
}> = ({ intensity = 0.8, color = '#4870FF' }) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.2;
      mesh.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 32, 32]} />
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={intensity}
        speed={2}
        roughness={0}
        metalness={0.8}
      />
    </mesh>
  );
};

// Particle trail effect
export const ParticleTrail: React.FC<{
  mousePosition: { x: number; y: number };
  color?: string;
  decay?: number;
}> = ({ mousePosition, color = '#4870FF', decay = 0.95 }) => {
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([]);

  useEffect(() => {
    const newPoint = { ...mousePosition, id: Date.now() };
    setTrail((prev) => [...prev.slice(-20), newPoint]);
  }, [mousePosition]);

  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {trail.map((point, index) => (
        <motion.div
          key={point.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ 
            scale: 1 - (index / trail.length) * 0.5,
            opacity: (index / trail.length) * decay
          }}
          style={{
            position: 'absolute',
            left: point.x,
            top: point.y,
            width: 10,
            height: 10,
            backgroundColor: color,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </Box>
  );
};

// Stagger children animation
export const StaggerChildren: React.FC<{
  children: React.ReactNode[];
  staggerDelay?: number;
  animation?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideIn';
}> = ({ children, staggerDelay = 0.1, animation = 'fadeUp' }) => {
  const animations = {
    fadeUp: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    scaleIn: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
    },
    slideIn: {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0 },
    },
  };

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const item = {
    hidden: animations[animation].hidden,
    visible: animations[animation].visible,
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Parallax scrolling layer
export const ParallaxLayer: React.FC<{
  children: React.ReactNode;
  offset?: number;
  speed?: number;
}> = ({ children, offset = 0, speed = 0.5 }) => {
  const y = useMotionValue(0);
  const transform = useTransform(y, [0, 1000], [0, 1000 * speed]);

  useEffect(() => {
    const handleScroll = () => {
      y.set(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [y]);

  return (
    <motion.div
      style={{
        y: transform,
        position: 'relative',
        top: offset,
      }}
    >
      {children}
    </motion.div>
  );
};

// Gooey effect for connected elements
const GooeyFilter = styled('svg')`
  position: absolute;
  width: 0;
  height: 0;
`;

export const GooeyEffect: React.FC<{ blur?: number; children: React.ReactNode }> = ({ 
  blur = 10, 
  children 
}) => {
  const filterId = useMemo(() => `gooey-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <>
      <GooeyFilter>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </GooeyFilter>
      <Box sx={{ filter: `url(#${filterId})` }}>
        {children}
      </Box>
    </>
  );
};

// Reveal on scroll with AI prediction
export const RevealOnScroll: React.FC<{
  children: React.ReactNode;
  threshold?: number;
  animation?: 'fade' | 'slide' | 'zoom' | 'flip';
  duration?: number;
  delay?: number;
  predictive?: boolean;
}> = ({ 
  children, 
  threshold = 0.1, 
  animation = 'fade',
  duration = 0.6,
  delay = 0,
  predictive = true
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold,
        rootMargin: predictive ? '50px 0px' : '0px 0px' // Predict scroll for smoother reveals
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, predictive]);

  const animations = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    slide: {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0 },
    },
    zoom: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
    },
    flip: {
      hidden: { opacity: 0, rotateX: -90 },
      visible: { opacity: 1, rotateX: 0 },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={animations[animation]}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

// Magnetic hover effect
export const MagneticHover: React.FC<{
  children: React.ReactNode;
  strength?: number;
  radius?: number;
}> = ({ children, strength = 0.5, radius = 100 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, springConfigs.gentle);
  const y = useSpring(0, springConfigs.gentle);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

    if (distance < radius) {
      const force = (1 - distance / radius) * strength;
      x.set(distanceX * force);
      y.set(distanceY * force);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
    >
      {children}
    </motion.div>
  );
};

// Infinite marquee
export const InfiniteMarquee: React.FC<{
  children: React.ReactNode;
  speed?: number;
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
}> = ({ children, speed = 20, direction = 'left', pauseOnHover = true }) => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <Box
      sx={{ 
        overflow: 'hidden', 
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <motion.div
        animate={{ x: direction === 'left' ? '-100%' : '100%' }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: speed,
            ease: 'linear',
          },
        }}
        style={{ 
          display: 'inline-block',
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      >
        {children}
        {children} {/* Duplicate for seamless loop */}
      </motion.div>
    </Box>
  );
};

// Skeleton loading with shimmer
export const SkeletonShimmer: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}> = ({ width = '100%', height = 20, borderRadius = 4 }) => {
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'rgba(72, 112, 255, 0.1)',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          transform: 'translateX(-100%)',
          backgroundImage: 'linear-gradient(90deg, transparent, rgba(72, 112, 255, 0.2), transparent)',
          animation: 'shimmer 1.5s infinite',
        },
        '@keyframes shimmer': {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      }}
    />
  );
};

// Export all animations
export default {
  springConfigs,
  customEasings,
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
};