import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '@/components/Auth/withAuth';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'error';
  created: string;
  lastTriggered?: string;
  secret: string;
  headers: { key: string; value: string }[];
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  stats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    avgResponseTime: number;
  };
}

interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  responseCode?: number;
  responseTime?: number;
  payload: any;
  error?: string;
  attempts: number;
}

interface EventType {
  id: string;
  name: string;
  category: string;
  description: string;
}

const WebhooksPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'webhooks' | 'events' | 'test'>('webhooks');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: 'wh_1',
      name: 'Production Payment Webhook',
      url: 'https://api.myapp.com/webhooks/payments',
      events: ['payment.succeeded', 'payment.failed', 'subscription.created', 'subscription.cancelled'],
      status: 'active',
      created: '2024-11-15T10:00:00Z',
      lastTriggered: '2024-12-26T15:30:00Z',
      secret: 'whsec_abcdef123456789',
      headers: [
        { key: 'Authorization', value: 'Bearer sk_live_xxx' },
        { key: 'Content-Type', value: 'application/json' }
      ],
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      },
      stats: {
        totalCalls: 4523,
        successfulCalls: 4498,
        failedCalls: 25,
        avgResponseTime: 250
      }
    },
    {
      id: 'wh_2',
      name: 'Development Webhook',
      url: 'https://webhook.site/unique-url',
      events: ['bot.configured', 'bot.error', 'api_key.created'],
      status: 'active',
      created: '2024-10-20T14:00:00Z',
      lastTriggered: '2024-12-26T10:00:00Z',
      secret: 'whsec_dev_987654321',
      headers: [
        { key: 'X-Custom-Header', value: 'development' }
      ],
      retryPolicy: {
        maxAttempts: 5,
        backoffMultiplier: 1.5,
        initialDelay: 500
      },
      stats: {
        totalCalls: 1245,
        successfulCalls: 1200,
        failedCalls: 45,
        avgResponseTime: 180
      }
    },
    {
      id: 'wh_3',
      name: 'Slack Notifications',
      url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
      events: ['support.ticket_created', 'support.ticket_resolved'],
      status: 'error',
      created: '2024-09-10T09:00:00Z',
      lastTriggered: '2024-12-20T18:00:00Z',
      secret: 'whsec_slack_abc123',
      headers: [],
      retryPolicy: {
        maxAttempts: 1,
        backoffMultiplier: 1,
        initialDelay: 0
      },
      stats: {
        totalCalls: 890,
        successfulCalls: 850,
        failedCalls: 40,
        avgResponseTime: 350
      }
    }
  ]);

  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([
    {
      id: 'evt_1',
      webhookId: 'wh_1',
      event: 'payment.succeeded',
      timestamp: '2024-12-26T15:30:00Z',
      status: 'success',
      responseCode: 200,
      responseTime: 234,
      payload: { amount: 299, currency: 'USD', customerId: 'cus_123' },
      attempts: 1
    },
    {
      id: 'evt_2',
      webhookId: 'wh_1',
      event: 'subscription.cancelled',
      timestamp: '2024-12-26T14:00:00Z',
      status: 'failed',
      responseCode: 500,
      responseTime: 5000,
      payload: { subscriptionId: 'sub_456', reason: 'customer_request' },
      error: 'Internal server error',
      attempts: 3
    },
    {
      id: 'evt_3',
      webhookId: 'wh_2',
      event: 'bot.configured',
      timestamp: '2024-12-26T10:00:00Z',
      status: 'success',
      responseCode: 200,
      responseTime: 156,
      payload: { botId: 'bot_789', configuration: { model: 'gpt-4' } },
      attempts: 1
    }
  ]);

  const eventTypes: EventType[] = [
    // Payments
    { id: 'payment.succeeded', name: 'Payment Succeeded', category: 'Payments', description: 'A payment was successfully processed' },
    { id: 'payment.failed', name: 'Payment Failed', category: 'Payments', description: 'A payment attempt failed' },
    { id: 'payment.refunded', name: 'Payment Refunded', category: 'Payments', description: 'A payment was refunded' },
    
    // Subscriptions
    { id: 'subscription.created', name: 'Subscription Created', category: 'Subscriptions', description: 'A new subscription was created' },
    { id: 'subscription.updated', name: 'Subscription Updated', category: 'Subscriptions', description: 'A subscription was modified' },
    { id: 'subscription.cancelled', name: 'Subscription Cancelled', category: 'Subscriptions', description: 'A subscription was cancelled' },
    { id: 'subscription.renewed', name: 'Subscription Renewed', category: 'Subscriptions', description: 'A subscription was automatically renewed' },
    
    // Bots
    { id: 'bot.configured', name: 'Bot Configured', category: 'AI Bots', description: 'A bot configuration was updated' },
    { id: 'bot.error', name: 'Bot Error', category: 'AI Bots', description: 'A bot encountered an error' },
    { id: 'bot.usage_limit', name: 'Bot Usage Limit', category: 'AI Bots', description: 'A bot reached its usage limit' },
    
    // API
    { id: 'api_key.created', name: 'API Key Created', category: 'API', description: 'A new API key was generated' },
    { id: 'api_key.revoked', name: 'API Key Revoked', category: 'API', description: 'An API key was revoked' },
    { id: 'rate_limit.exceeded', name: 'Rate Limit Exceeded', category: 'API', description: 'Rate limit was exceeded' },
    
    // Support
    { id: 'support.ticket_created', name: 'Ticket Created', category: 'Support', description: 'A support ticket was created' },
    { id: 'support.ticket_resolved', name: 'Ticket Resolved', category: 'Support', description: 'A support ticket was resolved' },
  ];

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    headers: [{ key: '', value: '' }],
    retryPolicy: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  });

  const [testPayload, setTestPayload] = useState('{\n  "event": "test.webhook",\n  "data": {\n    "message": "Hello from LOGOS AI"\n  }\n}');

  useEffect(() => {
    // Start real-time monitoring
    const interval = setInterval(() => {
      // Simulate real-time updates
      setWebhooks(prevWebhooks => 
        prevWebhooks.map(webhook => ({
          ...webhook,
          stats: {
            ...webhook.stats,
            totalCalls: webhook.stats.totalCalls + Math.floor(Math.random() * 2)
          }
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = async (text: string, webhookId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWebhookId(webhookId);
      setTimeout(() => setCopiedWebhookId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const createWebhook = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(newWebhook)
      });

      if (response.ok) {
        const webhook = await response.json();
        setWebhooks([webhook, ...webhooks]);
        setShowCreateModal(false);
        // Reset form
        setNewWebhook({
          name: '',
          url: '',
          events: [],
          headers: [{ key: '', value: '' }],
          retryPolicy: {
            maxAttempts: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
          }
        });
      }
    } catch (error) {
      console.error('Error creating webhook:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWebhook = async (webhookId: string) => {
    try {
      const webhook = webhooks.find(w => w.id === webhookId);
      if (!webhook) return;

      const newStatus = webhook.status === 'active' ? 'inactive' : 'active';
      
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setWebhooks(prevWebhooks => 
          prevWebhooks.map(w => 
            w.id === webhookId ? { ...w, status: newStatus } : w
          )
        );
      }
    } catch (error) {
      console.error('Error toggling webhook:', error);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        setWebhooks(prevWebhooks => prevWebhooks.filter(w => w.id !== webhookId));
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: testPayload
      });

      if (response.ok) {
        alert('Test webhook sent successfully!');
      } else {
        alert('Failed to send test webhook');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('Error sending test webhook');
    }
  };

  // Chart data
  const getWebhookPerformanceData = (webhook: Webhook) => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Successful',
        data: [120, 135, 128, 142, 139, 145, 150],
        borderColor: '#47FF88',
        backgroundColor: 'rgba(71, 255, 136, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Failed',
        data: [5, 3, 7, 2, 4, 1, 3],
        borderColor: '#FF5757',
        backgroundColor: 'rgba(255, 87, 87, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
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

  const getStatusColor = (status: Webhook['status']) => {
    switch (status) {
      case 'active': return '#47FF88';
      case 'inactive': return '#7B859A';
      case 'error': return '#FF5757';
      default: return '#7B859A';
    }
  };

  const getEventStatusColor = (status: WebhookEvent['status']) => {
    switch (status) {
      case 'success': return '#47FF88';
      case 'failed': return '#FF5757';
      case 'pending': return '#FFD700';
      default: return '#7B859A';
    }
  };

  return (
    <>
      <div className="webhooks-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <i className="fas fa-plug"></i> Webhook Configuration
            </h1>
            <p className="page-subtitle">
              Real-time event notifications for your applications
            </p>
          </div>
          
          <button 
            className="create-webhook-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus"></i> Create Webhook
          </button>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon active">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{webhooks.filter(w => w.status === 'active').length}</span>
              <span className="stat-label">Active Webhooks</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="fas fa-paper-plane"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {webhooks.reduce((sum, w) => sum + w.stats.totalCalls, 0).toLocaleString()}
              </span>
              <span className="stat-label">Total Events Sent</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon success">
              <i className="fas fa-check"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {(
                  (webhooks.reduce((sum, w) => sum + w.stats.successfulCalls, 0) / 
                   webhooks.reduce((sum, w) => sum + w.stats.totalCalls, 0) * 100) || 0
                ).toFixed(1)}%
              </span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon response">
              <i className="fas fa-tachometer-alt"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {Math.round(webhooks.reduce((sum, w) => sum + w.stats.avgResponseTime, 0) / webhooks.length)}ms
              </span>
              <span className="stat-label">Avg Response Time</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="webhook-tabs">
          <button 
            className={`tab-button ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => setActiveTab('webhooks')}
          >
            <i className="fas fa-plug"></i> Webhooks
          </button>
          <button 
            className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <i className="fas fa-history"></i> Event Log
          </button>
          <button 
            className={`tab-button ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            <i className="fas fa-vial"></i> Test Webhooks
          </button>
        </div>

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="webhooks-section">
            <div className="webhooks-grid">
              {webhooks.map(webhook => (
                <div key={webhook.id} className="webhook-card">
                  <div className="webhook-header">
                    <div className="webhook-info">
                      <h3 className="webhook-name">{webhook.name}</h3>
                      <div className="webhook-url">
                        <code>{webhook.url}</code>
                        <button 
                          className="copy-btn"
                          onClick={() => copyToClipboard(webhook.url, webhook.id)}
                        >
                          <i className={`fas fa-${copiedWebhookId === webhook.id ? 'check' : 'copy'}`}></i>
                        </button>
                      </div>
                    </div>
                    
                    <div className="webhook-status">
                      <span 
                        className="status-badge"
                        style={{ color: getStatusColor(webhook.status) }}
                      >
                        {webhook.status}
                      </span>
                    </div>
                  </div>

                  <div className="webhook-events">
                    <h4>Subscribed Events ({webhook.events.length})</h4>
                    <div className="events-list">
                      {webhook.events.slice(0, 3).map((event, idx) => (
                        <span key={idx} className="event-tag">{event}</span>
                      ))}
                      {webhook.events.length > 3 && (
                        <span className="event-tag more">+{webhook.events.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <div className="webhook-stats">
                    <div className="stat">
                      <span className="stat-label">Total Calls</span>
                      <span className="stat-value">{webhook.stats.totalCalls.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Success Rate</span>
                      <span className="stat-value">
                        {((webhook.stats.successfulCalls / webhook.stats.totalCalls) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Avg Response</span>
                      <span className="stat-value">{webhook.stats.avgResponseTime}ms</span>
                    </div>
                  </div>

                  <div className="webhook-performance">
                    <h4>Performance (Last 7 Days)</h4>
                    <div style={{ height: '100px' }}>
                      <Line data={getWebhookPerformanceData(webhook)} options={chartOptions} />
                    </div>
                  </div>

                  <div className="webhook-footer">
                    <div className="webhook-dates">
                      <span className="created">
                        Created: {new Date(webhook.created).toLocaleDateString()}
                      </span>
                      {webhook.lastTriggered && (
                        <span className="last-triggered">
                          Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="webhook-actions">
                      <button 
                        className="action-btn"
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setShowDetailsModal(true);
                        }}
                      >
                        <i className="fas fa-cog"></i> Configure
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => toggleWebhook(webhook.id)}
                      >
                        <i className={`fas fa-${webhook.status === 'active' ? 'pause' : 'play'}`}></i>
                        {webhook.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        className="action-btn danger"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Log Tab */}
        {activeTab === 'events' && (
          <div className="events-section">
            <div className="events-header">
              <div className="events-filters">
                <select className="filter-select">
                  <option>All Webhooks</option>
                  {webhooks.map(webhook => (
                    <option key={webhook.id} value={webhook.id}>{webhook.name}</option>
                  ))}
                </select>
                
                <select className="filter-select">
                  <option>All Events</option>
                  {Array.from(new Set(webhookEvents.map(e => e.event))).map(event => (
                    <option key={event} value={event}>{event}</option>
                  ))}
                </select>
                
                <select className="filter-select">
                  <option>All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              <button className="refresh-btn">
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
            
            <div className="events-table">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Webhook</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Response</th>
                    <th>Attempts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookEvents.map(event => (
                    <tr key={event.id}>
                      <td>{new Date(event.timestamp).toLocaleString()}</td>
                      <td>{webhooks.find(w => w.id === event.webhookId)?.name}</td>
                      <td className="event-name">{event.event}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ color: getEventStatusColor(event.status) }}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td>
                        {event.responseCode && (
                          <span className={`response-code ${event.responseCode < 400 ? 'success' : 'error'}`}>
                            {event.responseCode} ({event.responseTime}ms)
                          </span>
                        )}
                      </td>
                      <td>{event.attempts}</td>
                      <td>
                        <button className="view-payload-btn">
                          <i className="fas fa-eye"></i> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Test Webhooks Tab */}
        {activeTab === 'test' && (
          <div className="test-section">
            <div className="test-container">
              <div className="test-config">
                <h3>Test Webhook Configuration</h3>
                
                <div className="form-group">
                  <label>Select Webhook</label>
                  <select>
                    <option>Choose a webhook to test</option>
                    {webhooks.map(webhook => (
                      <option key={webhook.id} value={webhook.id}>{webhook.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Event Type</label>
                  <select>
                    <option>Choose an event type</option>
                    {eventTypes.map(event => (
                      <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Payload (JSON)</label>
                  <textarea 
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    rows={10}
                    className="payload-editor"
                  />
                </div>
                
                <div className="test-actions">
                  <button className="validate-btn">
                    <i className="fas fa-check"></i> Validate JSON
                  </button>
                  <button className="send-test-btn">
                    <i className="fas fa-paper-plane"></i> Send Test Webhook
                  </button>
                </div>
              </div>
              
              <div className="test-results">
                <h3>Test Results</h3>
                <div className="results-placeholder">
                  <i className="fas fa-info-circle"></i>
                  <p>Send a test webhook to see the results here</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Webhook Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content large" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Webhook</h2>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Webhook Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Production Payment Handler"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Endpoint URL</label>
                  <input 
                    type="url" 
                    placeholder="https://api.example.com/webhooks"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                  />
                  <small>Must be a valid HTTPS URL</small>
                </div>
                
                <div className="form-group">
                  <label>Events to Subscribe</label>
                  <div className="events-selector">
                    {Object.entries(
                      eventTypes.reduce((acc, event) => {
                        if (!acc[event.category]) acc[event.category] = [];
                        acc[event.category].push(event);
                        return acc;
                      }, {} as Record<string, EventType[]>)
                    ).map(([category, events]) => (
                      <div key={category} className="event-category">
                        <h4>{category}</h4>
                        {events.map(event => (
                          <label key={event.id} className="event-checkbox">
                            <input 
                              type="checkbox"
                              checked={newWebhook.events.includes(event.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewWebhook({
                                    ...newWebhook,
                                    events: [...newWebhook.events, event.id]
                                  });
                                } else {
                                  setNewWebhook({
                                    ...newWebhook,
                                    events: newWebhook.events.filter(id => id !== event.id)
                                  });
                                }
                              }}
                            />
                            <div>
                              <span className="event-name">{event.name}</span>
                              <span className="event-description">{event.description}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Custom Headers (Optional)</label>
                  <div className="headers-list">
                    {newWebhook.headers.map((header, idx) => (
                      <div key={idx} className="header-row">
                        <input 
                          type="text" 
                          placeholder="Header Name"
                          value={header.key}
                          onChange={(e) => {
                            const newHeaders = [...newWebhook.headers];
                            newHeaders[idx].key = e.target.value;
                            setNewWebhook({...newWebhook, headers: newHeaders});
                          }}
                        />
                        <input 
                          type="text" 
                          placeholder="Header Value"
                          value={header.value}
                          onChange={(e) => {
                            const newHeaders = [...newWebhook.headers];
                            newHeaders[idx].value = e.target.value;
                            setNewWebhook({...newWebhook, headers: newHeaders});
                          }}
                        />
                        <button 
                          className="remove-header"
                          onClick={() => {
                            const newHeaders = newWebhook.headers.filter((_, i) => i !== idx);
                            setNewWebhook({...newWebhook, headers: newHeaders});
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    <button 
                      className="add-header-btn"
                      onClick={() => {
                        setNewWebhook({
                          ...newWebhook,
                          headers: [...newWebhook.headers, { key: '', value: '' }]
                        });
                      }}
                    >
                      <i className="fas fa-plus"></i> Add Header
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Retry Policy</label>
                  <div className="retry-config">
                    <div className="retry-field">
                      <label>Max Attempts</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="10"
                        value={newWebhook.retryPolicy.maxAttempts}
                        onChange={(e) => setNewWebhook({
                          ...newWebhook,
                          retryPolicy: {
                            ...newWebhook.retryPolicy,
                            maxAttempts: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div className="retry-field">
                      <label>Backoff Multiplier</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="5"
                        step="0.5"
                        value={newWebhook.retryPolicy.backoffMultiplier}
                        onChange={(e) => setNewWebhook({
                          ...newWebhook,
                          retryPolicy: {
                            ...newWebhook.retryPolicy,
                            backoffMultiplier: parseFloat(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div className="retry-field">
                      <label>Initial Delay (ms)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="10000"
                        step="100"
                        value={newWebhook.retryPolicy.initialDelay}
                        onChange={(e) => setNewWebhook({
                          ...newWebhook,
                          retryPolicy: {
                            ...newWebhook.retryPolicy,
                            initialDelay: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
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
                  onClick={createWebhook}
                  disabled={!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0 || loading}
                >
                  {loading ? 'Creating...' : 'Create Webhook'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhook Details Modal */}
        {showDetailsModal && selectedWebhook && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedWebhook.name} - Configuration</h2>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="detail-section">
                  <h3>Webhook Details</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Webhook ID</span>
                      <span className="detail-value">{selectedWebhook.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value" style={{ color: getStatusColor(selectedWebhook.status) }}>
                        {selectedWebhook.status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created</span>
                      <span className="detail-value">{new Date(selectedWebhook.created).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Triggered</span>
                      <span className="detail-value">
                        {selectedWebhook.lastTriggered ? new Date(selectedWebhook.lastTriggered).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>Webhook Secret</h3>
                  <div className="secret-display">
                    <code>{selectedWebhook.secret}</code>
                    <button 
                      className="copy-btn"
                      onClick={() => copyToClipboard(selectedWebhook.secret, selectedWebhook.id)}
                    >
                      <i className={`fas fa-${copiedWebhookId === selectedWebhook.id ? 'check' : 'copy'}`}></i>
                    </button>
                  </div>
                  <small>Use this secret to verify webhook signatures</small>
                </div>
                
                <div className="detail-section">
                  <h3>Performance Statistics</h3>
                  <div className="performance-stats">
                    <div className="perf-stat">
                      <span className="perf-label">Total Calls</span>
                      <span className="perf-value">{selectedWebhook.stats.totalCalls.toLocaleString()}</span>
                    </div>
                    <div className="perf-stat">
                      <span className="perf-label">Successful</span>
                      <span className="perf-value success">{selectedWebhook.stats.successfulCalls.toLocaleString()}</span>
                    </div>
                    <div className="perf-stat">
                      <span className="perf-label">Failed</span>
                      <span className="perf-value error">{selectedWebhook.stats.failedCalls.toLocaleString()}</span>
                    </div>
                    <div className="perf-stat">
                      <span className="perf-label">Success Rate</span>
                      <span className="perf-value">
                        {((selectedWebhook.stats.successfulCalls / selectedWebhook.stats.totalCalls) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .webhooks-page {
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

        .create-webhook-btn {
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

        .create-webhook-btn:hover {
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
        .stat-icon.response { background: rgba(255, 215, 0, 0.2); color: #FFD700; }

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
        .webhook-tabs {
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

        /* Webhooks Grid */
        .webhooks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 2rem;
        }

        .webhook-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
        }

        .webhook-card:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .webhook-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .webhook-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .webhook-url {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .webhook-url code {
          flex: 1;
          font-family: 'Fira Code', monospace;
          font-size: 0.875rem;
          opacity: 0.7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .copy-btn {
          padding: 0.375rem 0.5rem;
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

        .status-badge {
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.875rem;
        }

        .webhook-events {
          margin-bottom: 1.5rem;
        }

        .webhook-events h4 {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.75rem;
        }

        .events-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .event-tag {
          background: rgba(72, 112, 255, 0.1);
          color: #4870FF;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
        }

        .event-tag.more {
          background: rgba(0, 246, 255, 0.1);
          color: #00F6FF;
        }

        .webhook-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .webhook-stats .stat {
          text-align: center;
        }

        .webhook-stats .stat-label {
          display: block;
          font-size: 0.75rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .webhook-stats .stat-value {
          font-weight: 600;
          color: #4870FF;
        }

        .webhook-performance {
          margin-bottom: 1.5rem;
        }

        .webhook-performance h4 {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.75rem;
        }

        .webhook-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .webhook-dates {
          display: flex;
          flex-direction: column;
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .webhook-actions {
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

        .action-btn:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .action-btn.danger {
          border-color: rgba(255, 87, 87, 0.3);
          color: #FF5757;
        }

        .action-btn.danger:hover {
          background: rgba(255, 87, 87, 0.1);
          border-color: #FF5757;
        }

        /* Events Section */
        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .events-filters {
          display: flex;
          gap: 1rem;
        }

        .filter-select {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          transition: all 0.3s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .refresh-btn {
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

        .refresh-btn:hover {
          background: #4870FF;
          color: white;
        }

        .events-table {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          overflow: hidden;
        }

        .events-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .events-table th {
          background: rgba(255, 255, 255, 0.05);
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 1px solid rgba(72, 112, 255, 0.2);
        }

        .events-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(72, 112, 255, 0.1);
        }

        .events-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .event-name {
          font-family: 'Fira Code', monospace;
          font-size: 0.875rem;
        }

        .response-code {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .response-code.success { color: #47FF88; }
        .response-code.error { color: #FF5757; }

        .view-payload-btn {
          padding: 0.375rem 0.75rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 6px;
          color: #4870FF;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .view-payload-btn:hover {
          background: rgba(72, 112, 255, 0.2);
        }

        /* Test Section */
        .test-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .test-config,
        .test-results {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
        }

        .test-config h3,
        .test-results h3 {
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
        }

        .payload-editor {
          font-family: 'Fira Code', monospace;
          font-size: 0.875rem;
          background: rgba(0, 0, 0, 0.3);
          border-color: rgba(72, 112, 255, 0.3);
        }

        .test-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .validate-btn,
        .send-test-btn {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .validate-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.3);
          color: #F5F7FA;
        }

        .validate-btn:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .send-test-btn {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .send-test-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        .results-placeholder {
          text-align: center;
          padding: 4rem;
          opacity: 0.5;
        }

        .results-placeholder i {
          font-size: 3rem;
          margin-bottom: 1rem;
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

        .modal-content.large {
          max-width: 900px;
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
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          transition: all 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
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

        .events-selector {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          padding: 1rem;
        }

        .event-category {
          margin-bottom: 1.5rem;
        }

        .event-category h4 {
          margin-bottom: 0.75rem;
          color: #4870FF;
        }

        .event-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
        }

        .event-checkbox input[type="checkbox"] {
          margin-top: 0.25rem;
        }

        .event-checkbox .event-name {
          display: block;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .event-checkbox .event-description {
          display: block;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .headers-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .header-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 0.75rem;
          align-items: center;
        }

        .remove-header {
          padding: 0.5rem;
          background: transparent;
          border: 1px solid rgba(255, 87, 87, 0.3);
          border-radius: 6px;
          color: #FF5757;
          cursor: pointer;
          transition: all 0.3s;
        }

        .remove-header:hover {
          background: rgba(255, 87, 87, 0.1);
        }

        .add-header-btn {
          padding: 0.75rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px dashed #4870FF;
          border-radius: 8px;
          color: #4870FF;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .add-header-btn:hover {
          background: rgba(72, 112, 255, 0.2);
        }

        .retry-config {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .retry-field label {
          display: block;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          opacity: 0.7;
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

        .secret-display {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .secret-display code {
          flex: 1;
          font-family: 'Fira Code', monospace;
          font-size: 0.875rem;
        }

        .performance-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .perf-stat {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .perf-label {
          display: block;
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.5rem;
        }

        .perf-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #4870FF;
        }

        .perf-value.success { color: #47FF88; }
        .perf-value.error { color: #FF5757; }

        /* Responsive */
        @media (max-width: 1200px) {
          .webhooks-grid {
            grid-template-columns: 1fr;
          }
          
          .test-container {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .webhooks-page {
            padding: 1rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .events-filters {
            flex-direction: column;
            width: 100%;
          }
          
          .events-table {
            overflow-x: auto;
          }
          
          .webhook-stats {
            grid-template-columns: 1fr;
          }
          
          .detail-grid {
            grid-template-columns: 1fr;
          }
          
          .retry-config {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default withAuth(WebhooksPage);