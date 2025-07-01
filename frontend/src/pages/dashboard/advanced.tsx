import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import withAuth from '@/components/Auth/withAuth';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });

interface RealTimeMetrics {
  cpu_usage: number;
  memory_usage: number;
  api_calls: number;
  active_users: number;
  response_time: number;
  error_rate: number;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
}

interface ActiveSubscription {
  id: string;
  product: string;
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  next_billing: string;
  amount: number;
  features: string[];
}

const AdvancedDashboard = () => {
  const router = useRouter();
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics>({
    cpu_usage: 45,
    memory_usage: 62,
    api_calls: 15420,
    active_users: 1247,
    response_time: 185,
    error_rate: 0.3
  });

  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([
    {
      id: '1',
      type: 'warning',
      title: 'High API Usage',
      message: 'API usage is approaching daily limit (85%)',
      timestamp: '2024-12-26T10:30:00Z',
      priority: 'high',
      resolved: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Scheduled Maintenance',
      message: 'System maintenance scheduled for Dec 28, 2024',
      timestamp: '2024-12-26T09:00:00Z',
      priority: 'medium',
      resolved: false
    }
  ]);

  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([
    {
      id: '1',
      product: 'CodeMaster Pro',
      status: 'active',
      next_billing: '2025-01-26',
      amount: 299,
      features: ['Unlimited API calls', 'Priority support', 'Custom models']
    },
    {
      id: '2',
      product: 'DataMind Analytics',
      status: 'active',
      next_billing: '2025-01-15',
      amount: 399,
      features: ['Real-time analytics', 'Custom dashboards', '10TB storage']
    }
  ]);

  useEffect(() => {
    // Initialize matrix background
    createMatrixBackground();
    // Start real-time updates
    const interval = startRealTimeUpdates();
    return () => clearInterval(interval);
  }, []);

  const createMatrixBackground = () => {
    const canvas = document.getElementById('dashboardMatrix') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const matrix = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01";
    const matrixArray = matrix.split("");
    const fontSize = 10;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];
    
    for (let x = 0; x < columns; x++) {
      drops[x] = Math.floor(Math.random() * -100);
    }
    
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 14, 33, 0.05)';
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
    
    setInterval(draw, 35);
  };

  const startRealTimeUpdates = () => {
    return setInterval(() => {
      setRealTimeMetrics(prev => ({
        cpu_usage: Math.max(20, Math.min(90, prev.cpu_usage + (Math.random() - 0.5) * 10)),
        memory_usage: Math.max(30, Math.min(85, prev.memory_usage + (Math.random() - 0.5) * 5)),
        api_calls: prev.api_calls + Math.floor(Math.random() * 50),
        active_users: Math.max(1000, prev.active_users + Math.floor((Math.random() - 0.5) * 20)),
        response_time: Math.max(100, Math.min(300, prev.response_time + (Math.random() - 0.5) * 20)),
        error_rate: Math.max(0, Math.min(5, prev.error_rate + (Math.random() - 0.5) * 0.2))
      }));
    }, 2000);
  };

  // Chart configurations
  const performanceData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: 'Response Time (ms)',
        data: [120, 135, 125, 185, 165, 180],
        borderColor: '#4870FF',
        backgroundColor: 'rgba(72, 112, 255, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Error Rate (%)',
        data: [0.1, 0.2, 0.1, 0.3, 0.2, 0.3],
        borderColor: '#FF5757',
        backgroundColor: 'rgba(255, 87, 87, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y1'
      }
    ]
  };

  const usageData = {
    labels: ['AI Tokens', 'API Calls', 'Storage', 'Bandwidth'],
    datasets: [{
      label: 'Usage %',
      data: [75, 85, 62, 48],
      backgroundColor: ['#4870FF', '#00F6FF', '#FFD700', '#47FF88'],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 33, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#4870FF',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      }
    }
  };

  return (
    <>
      <Script src="https://kit.fontawesome.com/your-fontawesome-kit.js" />
      
      {/* Matrix Background */}
      <canvas id="dashboardMatrix" className="matrix-canvas"></canvas>
      
      <div className="advanced-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">
              <span className="gradient-text">LOGOS AI Control Center</span>
            </h1>
            <p className="dashboard-subtitle">
              Advanced monitoring and management for your AI ecosystem
            </p>
          </div>
          
          <div className="header-actions">
            <button className="notification-button">
              <i className="fas fa-bell"></i>
              {systemAlerts.filter(a => !a.resolved).length > 0 && (
                <span className="notification-count">
                  {systemAlerts.filter(a => !a.resolved).length}
                </span>
              )}
            </button>
            
            <button className="settings-button" onClick={() => router.push('/dashboard/settings')}>
              <i className="fas fa-cog"></i>
            </button>
            
            <div className="user-menu">
              <img src="/api/placeholder/40/40" alt="User" className="user-avatar" />
              <div className="user-info">
                <span className="user-name">Admin User</span>
                <span className="user-role">System Administrator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Metrics Bar */}
        <div className="metrics-bar">
          <div className="metric-item">
            <div className="metric-icon cpu">
              <i className="fas fa-microchip"></i>
            </div>
            <div className="metric-data">
              <span className="metric-label">CPU Usage</span>
              <span className="metric-value">{realTimeMetrics.cpu_usage.toFixed(1)}%</span>
            </div>
            <div className="metric-chart">
              <div className="mini-bar" style={{ width: `${realTimeMetrics.cpu_usage}%` }}></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon memory">
              <i className="fas fa-memory"></i>
            </div>
            <div className="metric-data">
              <span className="metric-label">Memory</span>
              <span className="metric-value">{realTimeMetrics.memory_usage.toFixed(1)}%</span>
            </div>
            <div className="metric-chart">
              <div className="mini-bar" style={{ width: `${realTimeMetrics.memory_usage}%` }}></div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon api">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <div className="metric-data">
              <span className="metric-label">API Calls</span>
              <span className="metric-value">{realTimeMetrics.api_calls.toLocaleString()}</span>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon users">
              <i className="fas fa-users"></i>
            </div>
            <div className="metric-data">
              <span className="metric-label">Active Users</span>
              <span className="metric-value">{realTimeMetrics.active_users.toLocaleString()}</span>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon response">
              <i className="fas fa-tachometer-alt"></i>
            </div>
            <div className="metric-data">
              <span className="metric-label">Response Time</span>
              <span className="metric-value">{realTimeMetrics.response_time}ms</span>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon error">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="metric-data">
              <span className="metric-label">Error Rate</span>
              <span className="metric-value">{realTimeMetrics.error_rate.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="dashboard-grid">
          {/* System Alerts */}
          <div className="dashboard-card alerts-card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-bell"></i> System Alerts
              </h2>
              <Link href="/dashboard/alerts">
                <a className="view-all">View All <i className="fas fa-arrow-right"></i></a>
              </Link>
            </div>
            
            <div className="alerts-list">
              {systemAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className={`alert-item ${alert.type}`}>
                  <div className="alert-icon">
                    <i className={`fas fa-${
                      alert.type === 'error' ? 'times-circle' :
                      alert.type === 'warning' ? 'exclamation-triangle' :
                      alert.type === 'info' ? 'info-circle' :
                      'check-circle'
                    }`}></i>
                  </div>
                  <div className="alert-content">
                    <h4 className="alert-title">{alert.title}</h4>
                    <p className="alert-message">{alert.message}</p>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <button className="alert-action">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="dashboard-card performance-card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-chart-line"></i> Performance Metrics
              </h2>
              <div className="time-range">
                <button className="time-btn active">24H</button>
                <button className="time-btn">7D</button>
                <button className="time-btn">30D</button>
              </div>
            </div>
            
            <div className="chart-container" style={{ height: '300px' }}>
              <Line data={performanceData} options={chartOptions} />
            </div>
          </div>

          {/* Active Subscriptions */}
          <div className="dashboard-card subscriptions-card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-credit-card"></i> Active Subscriptions
              </h2>
              <Link href="/dashboard/billing">
                <a className="view-all">Manage <i className="fas fa-arrow-right"></i></a>
              </Link>
            </div>
            
            <div className="subscriptions-list">
              {activeSubscriptions.map(sub => (
                <div key={sub.id} className="subscription-item">
                  <div className="subscription-header">
                    <h3 className="subscription-name">{sub.product}</h3>
                    <span className={`subscription-status ${sub.status}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="subscription-details">
                    <div className="subscription-info">
                      <span className="info-label">Next billing:</span>
                      <span className="info-value">
                        {new Date(sub.next_billing).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="subscription-info">
                      <span className="info-label">Amount:</span>
                      <span className="info-value amount">${sub.amount}/mo</span>
                    </div>
                  </div>
                  <div className="subscription-features">
                    {sub.features.map((feature, idx) => (
                      <span key={idx} className="feature-tag">
                        <i className="fas fa-check"></i> {feature}
                      </span>
                    ))}
                  </div>
                  <button className="manage-btn">
                    Manage Subscription
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Usage */}
          <div className="dashboard-card usage-card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-chart-pie"></i> Resource Usage
              </h2>
            </div>
            
            <div className="chart-container" style={{ height: '250px' }}>
              <Bar data={usageData} options={{
                ...chartOptions,
                indexAxis: 'y' as const,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    display: false
                  }
                }
              }} />
            </div>
            
            <div className="usage-details">
              <div className="usage-item">
                <span className="usage-label">AI Tokens</span>
                <span className="usage-value">750K / 1M</span>
              </div>
              <div className="usage-item">
                <span className="usage-label">API Calls</span>
                <span className="usage-value">85K / 100K</span>
              </div>
              <div className="usage-item">
                <span className="usage-label">Storage</span>
                <span className="usage-value">62GB / 100GB</span>
              </div>
              <div className="usage-item">
                <span className="usage-label">Bandwidth</span>
                <span className="usage-value">480GB / 1TB</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card actions-card">
            <h2 className="card-title">
              <i className="fas fa-rocket"></i> Quick Actions
            </h2>
            
            <div className="actions-grid">
              <button className="action-btn" onClick={() => router.push('/dashboard/bots')}>
                <i className="fas fa-robot"></i>
                <span>Configure Bots</span>
              </button>
              
              <button className="action-btn" onClick={() => router.push('/marketplace/enhanced')}>
                <i className="fas fa-store"></i>
                <span>Marketplace</span>
              </button>
              
              <button className="action-btn" onClick={() => router.push('/dashboard/support')}>
                <i className="fas fa-headset"></i>
                <span>Get Support</span>
              </button>
              
              <button className="action-btn" onClick={() => router.push('/dashboard/analytics')}>
                <i className="fas fa-chart-bar"></i>
                <span>Analytics</span>
              </button>
              
              <button className="action-btn" onClick={() => router.push('/dashboard/api-keys')}>
                <i className="fas fa-key"></i>
                <span>API Keys</span>
              </button>
              
              <button className="action-btn" onClick={() => router.push('/dashboard/webhooks')}>
                <i className="fas fa-plug"></i>
                <span>Webhooks</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card activity-card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="fas fa-history"></i> Recent Activity
              </h2>
              <Link href="/dashboard/activity">
                <a className="view-all">View All <i className="fas fa-arrow-right"></i></a>
              </Link>
            </div>
            
            <div className="activity-timeline">
              <div className="timeline-item">
                <div className="timeline-marker api"></div>
                <div className="timeline-content">
                  <h4>API Key Generated</h4>
                  <p>New API key created for production environment</p>
                  <span className="timeline-time">2 minutes ago</span>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-marker bot"></div>
                <div className="timeline-content">
                  <h4>Bot Configuration Updated</h4>
                  <p>CodeMaster Pro settings modified</p>
                  <span className="timeline-time">1 hour ago</span>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-marker payment"></div>
                <div className="timeline-content">
                  <h4>Payment Processed</h4>
                  <p>Monthly subscription renewed successfully</p>
                  <span className="timeline-time">3 hours ago</span>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-marker support"></div>
                <div className="timeline-content">
                  <h4>Support Ticket Resolved</h4>
                  <p>Ticket #1234 has been closed</p>
                  <span className="timeline-time">5 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Widget */}
        <div className="support-widget">
          <button className="support-trigger">
            <i className="fas fa-headset"></i>
            <span>Need Help?</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .matrix-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          opacity: 0.03;
        }

        .advanced-dashboard {
          padding: 2rem;
          max-width: 1600px;
          margin: 0 auto;
          position: relative;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(72, 112, 255, 0.1);
        }

        .header-content {
          flex: 1;
        }

        .dashboard-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .gradient-text {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% 200%;
          animation: gradient 5s ease infinite;
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .dashboard-subtitle {
          font-size: 1.25rem;
          opacity: 0.7;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .notification-button,
        .settings-button {
          position: relative;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .notification-button:hover,
        .settings-button:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
          transform: translateY(-2px);
        }

        .notification-count {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #FF5757;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 20px;
          text-align: center;
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .user-menu:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 2px solid rgba(72, 112, 255, 0.3);
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .user-role {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        /* Metrics Bar */
        .metrics-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .metric-item {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s;
        }

        .metric-item:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.2);
        }

        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .metric-icon.cpu { background: rgba(72, 112, 255, 0.2); color: #4870FF; }
        .metric-icon.memory { background: rgba(0, 246, 255, 0.2); color: #00F6FF; }
        .metric-icon.api { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .metric-icon.users { background: rgba(71, 255, 136, 0.2); color: #47FF88; }
        .metric-icon.response { background: rgba(255, 71, 255, 0.2); color: #FF47FF; }
        .metric-icon.error { background: rgba(255, 87, 87, 0.2); color: #FF5757; }

        .metric-data {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .metric-chart {
          width: 60px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .mini-bar {
          height: 100%;
          background: linear-gradient(90deg, #4870FF 0%, #00F6FF 100%);
          transition: width 0.5s ease;
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .dashboard-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
        }

        .dashboard-card:hover {
          border-color: rgba(72, 112, 255, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-title i {
          color: #4870FF;
        }

        .view-all {
          color: #00F6FF;
          text-decoration: none;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s;
        }

        .view-all:hover {
          color: #4870FF;
          transform: translateX(2px);
        }

        /* Alerts */
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid transparent;
          transition: all 0.3s;
        }

        .alert-item.error { border-color: rgba(255, 87, 87, 0.3); }
        .alert-item.warning { border-color: rgba(255, 215, 0, 0.3); }
        .alert-item.info { border-color: rgba(0, 246, 255, 0.3); }
        .alert-item.success { border-color: rgba(71, 255, 136, 0.3); }

        .alert-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .alert-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .alert-item.error .alert-icon { background: rgba(255, 87, 87, 0.2); color: #FF5757; }
        .alert-item.warning .alert-icon { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .alert-item.info .alert-icon { background: rgba(0, 246, 255, 0.2); color: #00F6FF; }
        .alert-item.success .alert-icon { background: rgba(71, 255, 136, 0.2); color: #47FF88; }

        .alert-content {
          flex: 1;
        }

        .alert-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .alert-message {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .alert-time {
          font-size: 0.75rem;
          opacity: 0.5;
        }

        .alert-action {
          background: transparent;
          border: none;
          color: #F5F7FA;
          opacity: 0.5;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .alert-action:hover {
          opacity: 1;
        }

        /* Time Range */
        .time-range {
          display: flex;
          gap: 0.5rem;
        }

        .time-btn {
          padding: 0.375rem 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .time-btn.active {
          background: #4870FF;
          border-color: #4870FF;
        }

        .time-btn:hover:not(.active) {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        /* Subscriptions */
        .subscriptions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .subscription-item {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(72, 112, 255, 0.2);
          transition: all 0.3s;
        }

        .subscription-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(72, 112, 255, 0.3);
        }

        .subscription-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .subscription-name {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .subscription-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .subscription-status.active {
          background: rgba(71, 255, 136, 0.2);
          color: #47FF88;
        }

        .subscription-details {
          display: flex;
          gap: 2rem;
          margin-bottom: 1rem;
        }

        .subscription-info {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .info-value {
          font-weight: 600;
        }

        .info-value.amount {
          color: #4870FF;
        }

        .subscription-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .feature-tag {
          background: rgba(72, 112, 255, 0.1);
          color: #4870FF;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .manage-btn {
          width: 100%;
          padding: 0.75rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px solid #4870FF;
          border-radius: 8px;
          color: #4870FF;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .manage-btn:hover {
          background: #4870FF;
          color: white;
        }

        /* Usage Details */
        .usage-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .usage-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .usage-label {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .usage-value {
          font-weight: 600;
          color: #4870FF;
        }

        /* Actions Grid */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
        }

        .action-btn:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
          transform: translateY(-4px);
        }

        .action-btn i {
          font-size: 2rem;
          color: #4870FF;
        }

        .action-btn span {
          font-size: 0.875rem;
          font-weight: 600;
        }

        /* Activity Timeline */
        .activity-timeline {
          position: relative;
          padding-left: 2rem;
        }

        .activity-timeline::before {
          content: '';
          position: absolute;
          left: 12px;
          top: 20px;
          bottom: 20px;
          width: 2px;
          background: rgba(72, 112, 255, 0.2);
        }

        .timeline-item {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .timeline-marker {
          position: absolute;
          left: -1.5rem;
          top: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }

        .timeline-marker.api { background: rgba(72, 112, 255, 0.2); border: 2px solid #4870FF; }
        .timeline-marker.bot { background: rgba(0, 246, 255, 0.2); border: 2px solid #00F6FF; }
        .timeline-marker.payment { background: rgba(71, 255, 136, 0.2); border: 2px solid #47FF88; }
        .timeline-marker.support { background: rgba(255, 215, 0, 0.2); border: 2px solid #FFD700; }

        .timeline-content {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          transition: all 0.3s;
        }

        .timeline-content:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .timeline-content h4 {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .timeline-content p {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .timeline-time {
          font-size: 0.75rem;
          opacity: 0.5;
        }

        /* Support Widget */
        .support-widget {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 1000;
        }

        .support-trigger {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          border-radius: 50px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.5);
          transition: all 0.3s;
        }

        .support-trigger:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(72, 112, 255, 0.6);
        }

        .support-trigger i {
          font-size: 1.25rem;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          
          .metrics-bar {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .advanced-dashboard {
            padding: 1rem;
          }
          
          .dashboard-header {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }
          
          .header-actions {
            width: 100%;
            justify-content: center;
          }
          
          .dashboard-title {
            font-size: 2rem;
          }
          
          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  );
};

export default withAuth(AdvancedDashboard);