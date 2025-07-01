import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '@/components/Auth/withAuth';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface APIKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  created: string;
  lastUsed: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
  permissions: string[];
  environment: 'development' | 'staging' | 'production';
  usageStats: {
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
  };
  rateLimit: {
    requests: number;
    period: string;
  };
}

interface APIKeyLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
  responseTime: number;
  ip: string;
  userAgent: string;
}

interface SecurityAlert {
  id: string;
  type: 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access';
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

const APIKeysPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'keys' | 'logs' | 'security'>('keys');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: 'key_1',
      name: 'Production API Key',
      key: 'sk_live_51234567890abcdef',
      prefix: 'sk_live_',
      created: '2024-11-15T10:00:00Z',
      lastUsed: '2024-12-26T15:30:00Z',
      status: 'active',
      permissions: ['read', 'write', 'delete'],
      environment: 'production',
      usageStats: {
        totalCalls: 45230,
        successRate: 99.2,
        avgResponseTime: 120
      },
      rateLimit: {
        requests: 1000,
        period: 'hour'
      }
    },
    {
      id: 'key_2',
      name: 'Development API Key',
      key: 'sk_test_09876543210fedcba',
      prefix: 'sk_test_',
      created: '2024-10-20T14:00:00Z',
      lastUsed: '2024-12-26T10:00:00Z',
      status: 'active',
      permissions: ['read', 'write'],
      environment: 'development',
      usageStats: {
        totalCalls: 12450,
        successRate: 97.8,
        avgResponseTime: 150
      },
      rateLimit: {
        requests: 100,
        period: 'hour'
      }
    },
    {
      id: 'key_3',
      name: 'Mobile App Key',
      key: 'sk_mobile_abcdef123456789',
      prefix: 'sk_mobile_',
      created: '2024-09-10T09:00:00Z',
      lastUsed: '2024-12-20T18:00:00Z',
      expiresAt: '2025-01-10T09:00:00Z',
      status: 'active',
      permissions: ['read'],
      environment: 'production',
      usageStats: {
        totalCalls: 89000,
        successRate: 98.5,
        avgResponseTime: 180
      },
      rateLimit: {
        requests: 500,
        period: 'hour'
      }
    }
  ]);

  const [apiLogs, setApiLogs] = useState<APIKeyLog[]>([
    {
      id: 'log_1',
      timestamp: '2024-12-26T15:30:00Z',
      method: 'POST',
      endpoint: '/api/v1/ai/generate',
      status: 200,
      responseTime: 120,
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0...'
    },
    {
      id: 'log_2',
      timestamp: '2024-12-26T15:25:00Z',
      method: 'GET',
      endpoint: '/api/v1/bots/list',
      status: 200,
      responseTime: 85,
      ip: '192.168.1.101',
      userAgent: 'Chrome/120.0...'
    },
    {
      id: 'log_3',
      timestamp: '2024-12-26T15:20:00Z',
      method: 'PUT',
      endpoint: '/api/v1/bots/configure',
      status: 401,
      responseTime: 15,
      ip: '192.168.1.102',
      userAgent: 'PostmanRuntime/7.32.1'
    }
  ]);

  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([
    {
      id: 'alert_1',
      type: 'rate_limit_exceeded',
      message: 'API key sk_test_098... exceeded rate limit (150 requests in 10 minutes)',
      timestamp: '2024-12-26T14:00:00Z',
      severity: 'medium',
      resolved: false
    },
    {
      id: 'alert_2',
      type: 'suspicious_activity',
      message: 'Unusual pattern detected: Multiple failed authentication attempts',
      timestamp: '2024-12-26T12:00:00Z',
      severity: 'high',
      resolved: true
    }
  ]);

  const [newKeyConfig, setNewKeyConfig] = useState({
    name: '',
    environment: 'development',
    permissions: [] as string[],
    expiresIn: 'never',
    rateLimit: '1000',
    rateLimitPeriod: 'hour'
  });

  useEffect(() => {
    // Initialize real-time monitoring
    startRealTimeMonitoring();
  }, []);

  const startRealTimeMonitoring = () => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      // Update usage stats
      setApiKeys(prevKeys => 
        prevKeys.map(key => ({
          ...key,
          usageStats: {
            ...key.usageStats,
            totalCalls: key.usageStats.totalCalls + Math.floor(Math.random() * 10)
          }
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const createAPIKey = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(newKeyConfig)
      });

      if (response.ok) {
        const newKey = await response.json();
        setApiKeys([newKey, ...apiKeys]);
        setShowCreateModal(false);
        // Reset form
        setNewKeyConfig({
          name: '',
          environment: 'development',
          permissions: [],
          expiresIn: 'never',
          rateLimit: '1000',
          rateLimitPeriod: 'hour'
        });
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/api-keys/${keyId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        setApiKeys(prevKeys => 
          prevKeys.map(key => 
            key.id === keyId ? { ...key, status: 'revoked' as const } : key
          )
        );
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const regenerateAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to regenerate this API key? The old key will stop working immediately.')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/api-keys/${keyId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const updatedKey = await response.json();
        setApiKeys(prevKeys => 
          prevKeys.map(key => 
            key.id === keyId ? updatedKey : key
          )
        );
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
    }
  };

  // Chart data for API usage
  const getUsageData = (key: APIKey) => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'API Calls',
      data: [5200, 4800, 6100, 5900, 7200, 4500, 3800],
      borderColor: '#4870FF',
      backgroundColor: 'rgba(72, 112, 255, 0.1)',
      tension: 0.4,
      fill: true
    }]
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
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
      }
    }
  };

  const getStatusColor = (status: APIKey['status']) => {
    switch (status) {
      case 'active': return '#47FF88';
      case 'expired': return '#FFD700';
      case 'revoked': return '#FF5757';
      default: return '#7B859A';
    }
  };

  const getSeverityColor = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'low': return '#00F6FF';
      case 'medium': return '#FFD700';
      case 'high': return '#FF5757';
      default: return '#7B859A';
    }
  };

  return (
    <>
      <div className="api-keys-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <i className="fas fa-key"></i> API Key Management
            </h1>
            <p className="page-subtitle">
              Secure API access and monitor usage across your applications
            </p>
          </div>
          
          <button 
            className="create-key-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus"></i> Create New Key
          </button>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon active">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{apiKeys.filter(k => k.status === 'active').length}</span>
              <span className="stat-label">Active Keys</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {apiKeys.reduce((sum, key) => sum + key.usageStats.totalCalls, 0).toLocaleString()}
              </span>
              <span className="stat-label">Total API Calls</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon success">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {(apiKeys.reduce((sum, key) => sum + key.usageStats.successRate, 0) / apiKeys.length).toFixed(1)}%
              </span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon alerts">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{securityAlerts.filter(a => !a.resolved).length}</span>
              <span className="stat-label">Active Alerts</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="api-tabs">
          <button 
            className={`tab-button ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
          >
            <i className="fas fa-key"></i> API Keys
          </button>
          <button 
            className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <i className="fas fa-history"></i> Access Logs
          </button>
          <button 
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <i className="fas fa-shield-alt"></i> Security
          </button>
        </div>

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <div className="keys-section">
            <div className="keys-grid">
              {apiKeys.map(key => (
                <div key={key.id} className="key-card">
                  <div className="key-header">
                    <div className="key-info">
                      <h3 className="key-name">{key.name}</h3>
                      <div className="key-meta">
                        <span className="environment" data-env={key.environment}>
                          {key.environment}
                        </span>
                        <span 
                          className="status"
                          style={{ color: getStatusColor(key.status) }}
                        >
                          {key.status}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      className="details-btn"
                      onClick={() => {
                        setSelectedKey(key);
                        setShowDetailsModal(true);
                      }}
                    >
                      <i className="fas fa-info-circle"></i>
                    </button>
                  </div>

                  <div className="key-value">
                    <code>{key.prefix}{'•'.repeat(24)}</code>
                    <button 
                      className="copy-btn"
                      onClick={() => copyToClipboard(key.key, key.id)}
                    >
                      <i className={`fas fa-${copiedKeyId === key.id ? 'check' : 'copy'}`}></i>
                    </button>
                  </div>

                  <div className="key-permissions">
                    {key.permissions.map((perm, idx) => (
                      <span key={idx} className="permission-badge">{perm}</span>
                    ))}
                  </div>

                  <div className="key-stats">
                    <div className="stat">
                      <span className="stat-label">Total Calls</span>
                      <span className="stat-value">{key.usageStats.totalCalls.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Success Rate</span>
                      <span className="stat-value">{key.usageStats.successRate}%</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Avg Response</span>
                      <span className="stat-value">{key.usageStats.avgResponseTime}ms</span>
                    </div>
                  </div>

                  <div className="key-usage-chart">
                    <h4>Usage (Last 7 Days)</h4>
                    <div style={{ height: '100px' }}>
                      <Line data={getUsageData(key)} options={chartOptions} />
                    </div>
                  </div>

                  <div className="key-footer">
                    <div className="key-dates">
                      <span className="created">
                        Created: {new Date(key.created).toLocaleDateString()}
                      </span>
                      {key.expiresAt && (
                        <span className="expires">
                          Expires: {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="key-actions">
                      <button 
                        className="action-btn"
                        onClick={() => regenerateAPIKey(key.id)}
                        disabled={key.status !== 'active'}
                      >
                        <i className="fas fa-sync-alt"></i> Regenerate
                      </button>
                      <button 
                        className="action-btn danger"
                        onClick={() => revokeAPIKey(key.id)}
                        disabled={key.status === 'revoked'}
                      >
                        <i className="fas fa-ban"></i> Revoke
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Access Logs Tab */}
        {activeTab === 'logs' && (
          <div className="logs-section">
            <div className="logs-header">
              <div className="logs-filters">
                <select className="filter-select">
                  <option>All Keys</option>
                  {apiKeys.map(key => (
                    <option key={key.id} value={key.id}>{key.name}</option>
                  ))}
                </select>
                
                <select className="filter-select">
                  <option>All Methods</option>
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                
                <select className="filter-select">
                  <option>All Status</option>
                  <option value="200">Success (2xx)</option>
                  <option value="400">Client Error (4xx)</option>
                  <option value="500">Server Error (5xx)</option>
                </select>
                
                <input 
                  type="text" 
                  placeholder="Search endpoint..." 
                  className="search-input"
                />
              </div>
              
              <button className="export-btn">
                <i className="fas fa-download"></i> Export Logs
              </button>
            </div>
            
            <div className="logs-table">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>IP Address</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {apiLogs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        <span className={`method-badge ${log.method.toLowerCase()}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="endpoint">{log.endpoint}</td>
                      <td>
                        <span className={`status-code ${log.status < 400 ? 'success' : 'error'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.responseTime}ms</td>
                      <td>{log.ip}</td>
                      <td className="user-agent" title={log.userAgent}>
                        {log.userAgent.substring(0, 30)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="logs-pagination">
              <button className="pagination-btn" disabled>
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="pagination-info">Page 1 of 10</span>
              <button className="pagination-btn">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="security-section">
            <div className="security-grid">
              {/* Security Settings */}
              <div className="security-card">
                <h3 className="card-title">
                  <i className="fas fa-cog"></i> Security Settings
                </h3>
                
                <div className="security-settings">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>IP Whitelist</h4>
                      <p>Restrict API access to specific IP addresses</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Rate Limiting</h4>
                      <p>Prevent API abuse with request limits</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>CORS Configuration</h4>
                      <p>Control cross-origin resource sharing</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Request Signing</h4>
                      <p>Require cryptographic signatures for requests</p>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                
                <button className="save-settings-btn">
                  Save Security Settings
                </button>
              </div>

              {/* Security Alerts */}
              <div className="security-card">
                <h3 className="card-title">
                  <i className="fas fa-bell"></i> Security Alerts
                </h3>
                
                <div className="alerts-list">
                  {securityAlerts.map(alert => (
                    <div key={alert.id} className={`alert-item ${alert.resolved ? 'resolved' : ''}`}>
                      <div className="alert-header">
                        <div className="alert-type">
                          <i className={`fas fa-${
                            alert.type === 'rate_limit_exceeded' ? 'tachometer-alt' :
                            alert.type === 'suspicious_activity' ? 'exclamation-triangle' :
                            'ban'
                          }`}></i>
                          <span>{alert.type.replace('_', ' ')}</span>
                        </div>
                        <span 
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(alert.severity) + '33', color: getSeverityColor(alert.severity) }}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      
                      <p className="alert-message">{alert.message}</p>
                      
                      <div className="alert-footer">
                        <span className="alert-time">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                        {!alert.resolved && (
                          <button className="resolve-btn">
                            Mark as Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IP Whitelist */}
              <div className="security-card">
                <h3 className="card-title">
                  <i className="fas fa-network-wired"></i> IP Whitelist
                </h3>
                
                <div className="ip-list">
                  <div className="ip-item">
                    <span className="ip-address">192.168.1.100</span>
                    <span className="ip-label">Office Network</span>
                    <button className="remove-ip">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="ip-item">
                    <span className="ip-address">10.0.0.0/24</span>
                    <span className="ip-label">VPN Range</span>
                    <button className="remove-ip">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
                
                <div className="add-ip">
                  <input type="text" placeholder="Enter IP address or CIDR" />
                  <button className="add-ip-btn">
                    <i className="fas fa-plus"></i> Add IP
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New API Key</h2>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Key Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Production Server Key"
                    value={newKeyConfig.name}
                    onChange={(e) => setNewKeyConfig({...newKeyConfig, name: e.target.value})}
                  />
                  <small>A descriptive name to identify this key</small>
                </div>
                
                <div className="form-group">
                  <label>Environment</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="environment" 
                        value="development"
                        checked={newKeyConfig.environment === 'development'}
                        onChange={(e) => setNewKeyConfig({...newKeyConfig, environment: e.target.value as any})}
                      />
                      <span>Development</span>
                    </label>
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="environment" 
                        value="staging"
                        checked={newKeyConfig.environment === 'staging'}
                        onChange={(e) => setNewKeyConfig({...newKeyConfig, environment: e.target.value as any})}
                      />
                      <span>Staging</span>
                    </label>
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="environment" 
                        value="production"
                        checked={newKeyConfig.environment === 'production'}
                        onChange={(e) => setNewKeyConfig({...newKeyConfig, environment: e.target.value as any})}
                      />
                      <span>Production</span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Permissions</label>
                  <div className="permissions-grid">
                    {['read', 'write', 'delete', 'admin'].map(perm => (
                      <label key={perm} className="checkbox-label">
                        <input 
                          type="checkbox"
                          checked={newKeyConfig.permissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKeyConfig({
                                ...newKeyConfig, 
                                permissions: [...newKeyConfig.permissions, perm]
                              });
                            } else {
                              setNewKeyConfig({
                                ...newKeyConfig, 
                                permissions: newKeyConfig.permissions.filter(p => p !== perm)
                              });
                            }
                          }}
                        />
                        <span>{perm.charAt(0).toUpperCase() + perm.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Expiration</label>
                  <select 
                    value={newKeyConfig.expiresIn}
                    onChange={(e) => setNewKeyConfig({...newKeyConfig, expiresIn: e.target.value})}
                  >
                    <option value="never">Never expire</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                    <option value="1y">1 year</option>
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Rate Limit</label>
                    <input 
                      type="number" 
                      placeholder="1000"
                      value={newKeyConfig.rateLimit}
                      onChange={(e) => setNewKeyConfig({...newKeyConfig, rateLimit: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Period</label>
                    <select
                      value={newKeyConfig.rateLimitPeriod}
                      onChange={(e) => setNewKeyConfig({...newKeyConfig, rateLimitPeriod: e.target.value})}
                    >
                      <option value="minute">Per minute</option>
                      <option value="hour">Per hour</option>
                      <option value="day">Per day</option>
                    </select>
                  </div>
                </div>
                
                <div className="security-notice">
                  <i className="fas fa-info-circle"></i>
                  <p>This key will be shown only once. Make sure to copy and store it securely.</p>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="create-btn"
                  onClick={createAPIKey}
                  disabled={!newKeyConfig.name || loading}
                >
                  {loading ? 'Creating...' : 'Create API Key'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Key Details Modal */}
        {showDetailsModal && selectedKey && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedKey.name} - Details</h2>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="detail-section">
                  <h3>Configuration</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Environment</span>
                      <span className="detail-value">{selectedKey.environment}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value" style={{ color: getStatusColor(selectedKey.status) }}>
                        {selectedKey.status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created</span>
                      <span className="detail-value">{new Date(selectedKey.created).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Used</span>
                      <span className="detail-value">{new Date(selectedKey.lastUsed).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>Rate Limits</h3>
                  <div className="rate-limit-info">
                    <span className="limit-value">{selectedKey.rateLimit.requests}</span>
                    <span className="limit-period">requests per {selectedKey.rateLimit.period}</span>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>Permissions</h3>
                  <div className="permissions-list">
                    {selectedKey.permissions.map((perm, idx) => (
                      <span key={idx} className="permission-item">
                        <i className="fas fa-check"></i> {perm}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>Usage Statistics</h3>
                  <div className="usage-stats">
                    <div className="usage-stat">
                      <span className="usage-label">Total Calls</span>
                      <span className="usage-value">{selectedKey.usageStats.totalCalls.toLocaleString()}</span>
                    </div>
                    <div className="usage-stat">
                      <span className="usage-label">Success Rate</span>
                      <span className="usage-value">{selectedKey.usageStats.successRate}%</span>
                    </div>
                    <div className="usage-stat">
                      <span className="usage-label">Avg Response Time</span>
                      <span className="usage-value">{selectedKey.usageStats.avgResponseTime}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .api-keys-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .page-title i {
          color: #4870FF;
        }

        .page-subtitle {
          font-size: 1.125rem;
          opacity: 0.7;
        }

        .create-key-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .create-key-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        /* Stats Overview */
        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
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

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-icon.active { background: rgba(71, 255, 136, 0.2); color: #47FF88; }
        .stat-icon.total { background: rgba(72, 112, 255, 0.2); color: #4870FF; }
        .stat-icon.success { background: rgba(0, 246, 255, 0.2); color: #00F6FF; }
        .stat-icon.alerts { background: rgba(255, 87, 87, 0.2); color: #FF5757; }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        /* Tabs */
        .api-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(72, 112, 255, 0.2);
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          color: #F5F7FA;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }

        .tab-button:hover {
          color: #4870FF;
        }

        .tab-button.active {
          color: #4870FF;
        }

        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #4870FF;
        }

        /* Keys Grid */
        .keys-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 2rem;
        }

        .key-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
        }

        .key-card:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .key-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .key-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .key-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .environment {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .environment[data-env="development"] {
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
        }

        .environment[data-env="staging"] {
          background: rgba(0, 246, 255, 0.2);
          color: #00F6FF;
        }

        .environment[data-env="production"] {
          background: rgba(255, 71, 255, 0.2);
          color: #FF47FF;
        }

        .status {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .details-btn {
          background: transparent;
          border: none;
          color: #4870FF;
          font-size: 1.25rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.3s;
        }

        .details-btn:hover {
          opacity: 1;
        }

        .key-value {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .key-value code {
          flex: 1;
          font-family: 'Fira Code', monospace;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .copy-btn {
          padding: 0.5rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 6px;
          color: #4870FF;
          cursor: pointer;
          transition: all 0.3s;
        }

        .copy-btn:hover {
          background: rgba(72, 112, 255, 0.2);
        }

        .key-permissions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .permission-badge {
          background: rgba(72, 112, 255, 0.1);
          color: #4870FF;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .key-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .key-stats .stat {
          text-align: center;
        }

        .key-stats .stat-label {
          display: block;
          font-size: 0.75rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .key-stats .stat-value {
          font-weight: 600;
          color: #4870FF;
        }

        .key-usage-chart {
          margin-bottom: 1.5rem;
        }

        .key-usage-chart h4 {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.75rem;
        }

        .key-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .key-dates {
          display: flex;
          flex-direction: column;
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .key-actions {
          display: flex;
          gap: 0.75rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .action-btn:hover:not(:disabled) {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .action-btn.danger {
          border-color: rgba(255, 87, 87, 0.3);
          color: #FF5757;
        }

        .action-btn.danger:hover:not(:disabled) {
          background: rgba(255, 87, 87, 0.1);
          border-color: #FF5757;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Logs Section */
        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .logs-filters {
          display: flex;
          gap: 1rem;
        }

        .filter-select,
        .search-input {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          transition: all 0.3s;
        }

        .filter-select:focus,
        .search-input:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px solid #4870FF;
          border-radius: 8px;
          color: #4870FF;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .export-btn:hover {
          background: #4870FF;
          color: white;
        }

        .logs-table {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          overflow: hidden;
        }

        .logs-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .logs-table th {
          background: rgba(255, 255, 255, 0.05);
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 1px solid rgba(72, 112, 255, 0.2);
        }

        .logs-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(72, 112, 255, 0.1);
        }

        .logs-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .method-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .method-badge.get { background: rgba(71, 255, 136, 0.2); color: #47FF88; }
        .method-badge.post { background: rgba(72, 112, 255, 0.2); color: #4870FF; }
        .method-badge.put { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .method-badge.delete { background: rgba(255, 87, 87, 0.2); color: #FF5757; }

        .endpoint {
          font-family: 'Fira Code', monospace;
          font-size: 0.875rem;
        }

        .status-code {
          font-weight: 600;
        }

        .status-code.success { color: #47FF88; }
        .status-code.error { color: #FF5757; }

        .user-agent {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .logs-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
        }

        .pagination-btn {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        /* Security Section */
        .security-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .security-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
        }

        .security-card:hover {
          border-color: rgba(72, 112, 255, 0.3);
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-title i {
          color: #4870FF;
        }

        .security-settings {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
        }

        .setting-info h4 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .setting-info p {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .toggle {
          position: relative;
          width: 50px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          transition: 0.4s;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background: white;
          border-radius: 50%;
          transition: 0.4s;
        }

        .toggle input:checked + .toggle-slider {
          background: #4870FF;
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .save-settings-btn {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .save-settings-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .alert-item {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(72, 112, 255, 0.2);
          transition: all 0.3s;
        }

        .alert-item.resolved {
          opacity: 0.5;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .alert-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .severity-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .alert-message {
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .alert-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-time {
          font-size: 0.75rem;
          opacity: 0.5;
        }

        .resolve-btn {
          padding: 0.375rem 0.875rem;
          background: rgba(71, 255, 136, 0.1);
          border: 1px solid rgba(71, 255, 136, 0.3);
          border-radius: 6px;
          color: #47FF88;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .resolve-btn:hover {
          background: rgba(71, 255, 136, 0.2);
        }

        .ip-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .ip-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .ip-address {
          font-family: 'Fira Code', monospace;
          font-weight: 600;
        }

        .ip-label {
          flex: 1;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .remove-ip {
          padding: 0.375rem 0.5rem;
          background: transparent;
          border: 1px solid rgba(255, 87, 87, 0.3);
          border-radius: 4px;
          color: #FF5757;
          cursor: pointer;
          transition: all 0.3s;
        }

        .remove-ip:hover {
          background: rgba(255, 87, 87, 0.1);
        }

        .add-ip {
          display: flex;
          gap: 0.75rem;
        }

        .add-ip input {
          flex: 1;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
        }

        .add-ip input:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .add-ip-btn {
          padding: 0.75rem 1.5rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px solid #4870FF;
          border-radius: 8px;
          color: #4870FF;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .add-ip-btn:hover {
          background: #4870FF;
          color: white;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal-content {
          background: #0A0E21;
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .modal-close {
          background: transparent;
          border: none;
          color: #F5F7FA;
          font-size: 1.5rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.3s;
        }

        .modal-close:hover {
          opacity: 1;
        }

        .modal-body {
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          transition: all 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .form-group small {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .radio-group {
          display: flex;
          gap: 1rem;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .security-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(72, 112, 255, 0.1);
          border-radius: 8px;
          margin-top: 1rem;
        }

        .security-notice i {
          color: #4870FF;
          margin-top: 0.25rem;
        }

        .security-notice p {
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cancel-btn,
        .create-btn {
          padding: 0.875rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .cancel-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #F5F7FA;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .create-btn {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .create-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        .create-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Details Modal */
        .detail-section {
          margin-bottom: 2rem;
        }

        .detail-section h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
          color: #4870FF;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .detail-item {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .detail-label {
          display: block;
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .detail-value {
          font-weight: 600;
        }

        .rate-limit-info {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .limit-value {
          font-size: 2rem;
          font-weight: 700;
          color: #4870FF;
        }

        .limit-period {
          opacity: 0.7;
        }

        .permissions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .permission-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(72, 112, 255, 0.1);
          border-radius: 20px;
          color: #4870FF;
        }

        .permission-item i {
          color: #47FF88;
        }

        .usage-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .usage-stat {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .usage-label {
          display: block;
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.5rem;
        }

        .usage-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #4870FF;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .keys-grid {
            grid-template-columns: 1fr;
          }
          
          .security-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .api-keys-page {
            padding: 1rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .logs-filters {
            flex-direction: column;
            width: 100%;
          }
          
          .logs-table {
            overflow-x: auto;
          }
          
          .key-stats {
            grid-template-columns: 1fr;
          }
          
          .detail-grid {
            grid-template-columns: 1fr;
          }
          
          .usage-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default withAuth(APIKeysPage);