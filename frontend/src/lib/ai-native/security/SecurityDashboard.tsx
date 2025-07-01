/**
 * Real-time Security Monitoring Dashboard
 * AI-powered threat detection and visualization
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  AlertTitle,
  IconButton,
  Button,
  Stack,
  Badge,
  Tooltip,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Fingerprint as FingerprintIcon,
  Lock as LockIcon,
  VpnKey as KeyIcon,
  BugReport as BugIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Cloud as CloudIcon,
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  FlashOn as FlashIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Canvas } from '@react-three/fiber';
import { Sphere, Box as ThreeBox, OrbitControls } from '@react-three/drei';
import QuantumSecurityLayer from './QuantumSecurity';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface ThreatAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  status: 'active' | 'mitigated' | 'investigating';
  source: string;
  affectedSystems: string[];
}

interface SecurityMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface NetworkNode {
  id: string;
  type: 'server' | 'client' | 'firewall' | 'database' | 'api';
  status: 'secure' | 'warning' | 'compromised';
  connections: string[];
  position: [number, number, number];
}

const SecurityDashboard: React.FC = () => {
  const theme = useTheme();
  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [quantumSecurity] = useState(() => new QuantumSecurityLayer());
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize metrics
  useEffect(() => {
    setMetrics([
      {
        name: 'Threat Score',
        value: 92,
        trend: 'up',
        status: 'good',
        icon: <ShieldIcon />,
      },
      {
        name: 'Active Threats',
        value: 2,
        trend: 'down',
        status: 'warning',
        icon: <WarningIcon />,
      },
      {
        name: 'Blocked Attacks',
        value: 147,
        trend: 'up',
        status: 'good',
        icon: <BlockIcon />,
      },
      {
        name: 'System Health',
        value: 98,
        trend: 'stable',
        status: 'good',
        icon: <CheckIcon />,
      },
    ]);

    // Initialize network nodes
    setNetworkNodes([
      {
        id: 'firewall-1',
        type: 'firewall',
        status: 'secure',
        connections: ['server-1', 'api-1'],
        position: [0, 0, 0],
      },
      {
        id: 'server-1',
        type: 'server',
        status: 'secure',
        connections: ['database-1', 'api-1'],
        position: [2, 0, 0],
      },
      {
        id: 'database-1',
        type: 'database',
        status: 'warning',
        connections: ['server-1'],
        position: [2, -2, 0],
      },
      {
        id: 'api-1',
        type: 'api',
        status: 'secure',
        connections: ['server-1', 'client-1'],
        position: [-2, 0, 0],
      },
      {
        id: 'client-1',
        type: 'client',
        status: 'secure',
        connections: ['api-1'],
        position: [-2, 2, 0],
      },
    ]);

    // Simulate real-time threat detection
    const threatInterval = setInterval(() => {
      const random = Math.random();
      if (random < 0.1) { // 10% chance of new threat
        const newThreat: ThreatAlert = {
          id: `threat-${Date.now()}`,
          type: ['SQL Injection', 'XSS Attack', 'Brute Force', 'DDoS', 'Malware'][Math.floor(Math.random() * 5)],
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
          message: 'Suspicious activity detected',
          timestamp: new Date(),
          status: 'active',
          source: `IP: ${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
          affectedSystems: ['server-1', 'api-1'],
        };
        setThreats(prev => [newThreat, ...prev].slice(0, 10));
      }
    }, 5000);

    return () => clearInterval(threatInterval);
  }, []);

  // Real-time metrics update
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.name === 'Active Threats' 
          ? threats.filter(t => t.status === 'active').length
          : Math.max(0, Math.min(100, metric.value + (Math.random() - 0.5) * 5)),
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      })));
    };

    const interval = setInterval(updateMetrics, 3000);
    return () => clearInterval(interval);
  }, [threats]);

  const handleScan = async () => {
    setIsScanning(true);
    
    // Simulate quantum threat detection
    setTimeout(async () => {
      const mockData = {
        encryptionStrength: 256,
        keyLength: 2048,
        algorithmAge: 5,
        quantumVulnerabilityScore: 0.3,
      };
      
      const quantumThreats = await quantumSecurity.detectQuantumThreats(mockData);
      
      quantumThreats.forEach(threat => {
        setThreats(prev => [{
          id: threat.id,
          type: `Quantum: ${threat.type}`,
          severity: threat.severity,
          message: `Quantum threat detected. Estimated ${threat.estimatedQubits} qubits required. Time to threat: ${threat.timeToThreat} years`,
          timestamp: new Date(),
          status: 'active',
          source: 'Quantum Threat Analysis',
          affectedSystems: ['encryption-layer'],
        }, ...prev].slice(0, 10));
      });
      
      setIsScanning(false);
    }, 3000);
  };

  const handleMitigateThreat = (threatId: string) => {
    setThreats(prev => prev.map(threat => 
      threat.id === threatId 
        ? { ...threat, status: 'mitigated' }
        : threat
    ));
  };

  // Chart data
  const threatTrendData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    datasets: [
      {
        label: 'Threats Detected',
        data: [12, 19, 15, 25, 22, 30, 28],
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Threats Mitigated',
        data: [10, 17, 14, 22, 20, 28, 25],
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const threatTypeData = {
    labels: ['SQL Injection', 'XSS', 'DDoS', 'Malware', 'Brute Force'],
    datasets: [
      {
        data: [30, 25, 20, 15, 10],
        backgroundColor: [
          '#FF6B6B',
          '#4870FF',
          '#00F6FF',
          '#FFD93D',
          '#6BCF7F',
        ],
        borderWidth: 0,
      },
    ],
  };

  const severityIcon = (severity: ThreatAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon sx={{ color: '#FF6B6B' }} />;
      case 'high':
        return <WarningIcon sx={{ color: '#FFD93D' }} />;
      case 'medium':
        return <WarningIcon sx={{ color: '#FFA500' }} />;
      case 'low':
        return <InfoIcon sx={{ color: '#4870FF' }} />;
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#0A0E21', 
      color: '#fff',
      p: 3,
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{
                background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Security Command Center
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Real-time threat monitoring and quantum security analysis
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<FlashIcon />}
                onClick={handleScan}
                disabled={isScanning}
                sx={{
                  borderColor: '#4870FF',
                  color: '#4870FF',
                  '&:hover': {
                    borderColor: '#00F6FF',
                    bgcolor: 'rgba(0, 246, 255, 0.1)',
                  },
                }}
              >
                {isScanning ? 'Scanning...' : 'Quantum Scan'}
              </Button>
              <IconButton sx={{ color: '#4870FF' }}>
                <VisibilityIcon />
              </IconButton>
            </Stack>
          </Stack>
        </motion.div>

        {/* Security Metrics */}
        <Grid container spacing={3} mb={4}>
          {metrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={metric.name}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(72, 112, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 30px rgba(72, 112, 255, 0.3)',
                  },
                }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {metric.name}
                        </Typography>
                        <Typography variant="h4" sx={{ 
                          color: metric.status === 'good' ? '#4ECDC4' 
                            : metric.status === 'warning' ? '#FFD93D' 
                            : '#FF6B6B' 
                        }}>
                          {metric.value}
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2,
                        bgcolor: 'rgba(72, 112, 255, 0.1)',
                        color: '#4870FF',
                      }}>
                        {metric.icon}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* 3D Network Visualization */}
          <Grid item xs={12} lg={8}>
            <Card sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(72, 112, 255, 0.2)',
              height: 400,
            }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Network Security Map
                </Typography>
                <Box sx={{ height: 'calc(100% - 40px)' }}>
                  <Canvas camera={{ position: [0, 0, 8] }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <OrbitControls enableZoom={false} />
                    
                    {networkNodes.map(node => (
                      <group key={node.id} position={node.position}>
                        <Sphere
                          args={[0.5, 32, 32]}
                          onClick={() => setSelectedNode(node.id)}
                        >
                          <meshStandardMaterial 
                            color={
                              node.status === 'secure' ? '#4ECDC4'
                              : node.status === 'warning' ? '#FFD93D'
                              : '#FF6B6B'
                            }
                            emissive={selectedNode === node.id ? '#00F6FF' : '#000000'}
                            emissiveIntensity={selectedNode === node.id ? 0.5 : 0}
                          />
                        </Sphere>
                        {node.connections.map(targetId => {
                          const target = networkNodes.find(n => n.id === targetId);
                          if (!target) return null;
                          
                          return (
                            <line key={`${node.id}-${targetId}`}>
                              <bufferGeometry>
                                <bufferAttribute
                                  attach="attributes-position"
                                  count={2}
                                  array={new Float32Array([
                                    0, 0, 0,
                                    target.position[0] - node.position[0],
                                    target.position[1] - node.position[1],
                                    target.position[2] - node.position[2],
                                  ])}
                                  itemSize={3}
                                />
                              </bufferGeometry>
                              <lineBasicMaterial color="#4870FF" opacity={0.3} transparent />
                            </line>
                          );
                        })}
                      </group>
                    ))}
                  </Canvas>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Threats */}
          <Grid item xs={12} lg={4}>
            <Card sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(72, 112, 255, 0.2)',
              height: 400,
              overflow: 'hidden',
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Active Threats</Typography>
                  <Chip 
                    label={threats.filter(t => t.status === 'active').length}
                    size="small"
                    sx={{
                      bgcolor: threats.filter(t => t.status === 'active').length > 0 
                        ? 'rgba(255, 107, 107, 0.2)' 
                        : 'rgba(78, 205, 196, 0.2)',
                      color: threats.filter(t => t.status === 'active').length > 0 
                        ? '#FF6B6B' 
                        : '#4ECDC4',
                    }}
                  />
                </Stack>
                <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                  <AnimatePresence>
                    {threats.map((threat, index) => (
                      <motion.div
                        key={threat.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Alert 
                          severity={
                            threat.severity === 'critical' ? 'error'
                            : threat.severity === 'high' ? 'warning'
                            : 'info'
                          }
                          sx={{ 
                            mb: 1,
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                            '& .MuiAlert-icon': {
                              color: threat.severity === 'critical' ? '#FF6B6B'
                                : threat.severity === 'high' ? '#FFD93D'
                                : '#4870FF',
                            },
                          }}
                          action={
                            threat.status === 'active' && (
                              <Button 
                                size="small" 
                                onClick={() => handleMitigateThreat(threat.id)}
                                sx={{ color: '#4ECDC4' }}
                              >
                                Mitigate
                              </Button>
                            )
                          }
                        >
                          <AlertTitle>{threat.type}</AlertTitle>
                          <Typography variant="body2">
                            {threat.message}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {threat.source} • {new Date(threat.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Alert>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Threat Analytics */}
          <Grid item xs={12} md={8}>
            <Card sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(72, 112, 255, 0.2)',
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Threat Timeline
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={threatTrendData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                          },
                        },
                      },
                      scales: {
                        x: {
                          grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                          },
                          ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                          },
                        },
                        y: {
                          grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                          },
                          ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Threat Distribution */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(72, 112, 255, 0.2)',
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Threat Types
                </Typography>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut 
                    data={threatTypeData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            padding: 15,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quantum Security Status */}
          <Grid item xs={12}>
            <Card sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(72, 112, 255, 0.2)',
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quantum Security Status
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(72, 112, 255, 0.1)',
                      border: '1px solid rgba(72, 112, 255, 0.3)',
                    }}>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Post-Quantum Ready
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CheckIcon sx={{ color: '#4ECDC4' }} />
                          <Typography variant="h6">Active</Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(255, 193, 61, 0.1)',
                      border: '1px solid rgba(255, 193, 61, 0.3)',
                    }}>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Threat Level
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <WarningIcon sx={{ color: '#FFD93D' }} />
                          <Typography variant="h6">Medium</Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(0, 246, 255, 0.1)',
                      border: '1px solid rgba(0, 246, 255, 0.3)',
                    }}>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Active Mitigations
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <ShieldIcon sx={{ color: '#00F6FF' }} />
                          <Typography variant="h6">6</Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(78, 205, 196, 0.1)',
                      border: '1px solid rgba(78, 205, 196, 0.3)',
                    }}>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Privacy Budget
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LockIcon sx={{ color: '#4ECDC4' }} />
                          <Typography variant="h6">85%</Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

// Fix: Add missing import
const InfoIcon = WarningIcon;

export default SecurityDashboard;