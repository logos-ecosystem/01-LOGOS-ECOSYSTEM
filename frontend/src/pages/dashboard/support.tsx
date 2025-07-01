import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '@/components/Auth/withAuth';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  created: string;
  updated: string;
  sla: {
    target: string;
    remaining: string;
    status: 'on_track' | 'at_risk' | 'breached';
  };
  assignee?: {
    name: string;
    avatar: string;
  };
  messages: number;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  views: number;
  helpful: number;
  icon: string;
}

const SupportPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tickets' | 'knowledge' | 'chat'>('tickets');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketFilter, setTicketFilter] = useState('all');
  
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'TK-2024-001',
      subject: 'API Rate Limiting Issue',
      description: 'Getting 429 errors when making API calls',
      status: 'in_progress',
      priority: 'high',
      category: 'Technical',
      created: '2024-12-26T10:00:00Z',
      updated: '2024-12-26T14:30:00Z',
      sla: {
        target: '4 hours',
        remaining: '1h 30m',
        status: 'at_risk'
      },
      assignee: {
        name: 'Sarah Chen',
        avatar: '/api/placeholder/32/32'
      },
      messages: 5
    },
    {
      id: 'TK-2024-002',
      subject: 'Billing Question - Invoice Clarification',
      description: 'Need clarification on last month invoice charges',
      status: 'waiting_customer',
      priority: 'medium',
      category: 'Billing',
      created: '2024-12-25T15:00:00Z',
      updated: '2024-12-26T09:00:00Z',
      sla: {
        target: '24 hours',
        remaining: '16h',
        status: 'on_track'
      },
      assignee: {
        name: 'Mike Johnson',
        avatar: '/api/placeholder/32/32'
      },
      messages: 3
    },
    {
      id: 'TK-2024-003',
      subject: 'Feature Request - Export Functionality',
      description: 'Would like to export data in CSV format',
      status: 'open',
      priority: 'low',
      category: 'Feature Request',
      created: '2024-12-26T08:00:00Z',
      updated: '2024-12-26T08:00:00Z',
      sla: {
        target: '72 hours',
        remaining: '68h',
        status: 'on_track'
      },
      messages: 1
    }
  ]);

  const [knowledgeArticles] = useState<KnowledgeArticle[]>([
    {
      id: '1',
      title: 'Getting Started with LOGOS AI Bots',
      category: 'Getting Started',
      views: 1523,
      helpful: 89,
      icon: 'fas fa-rocket'
    },
    {
      id: '2',
      title: 'API Rate Limits and Best Practices',
      category: 'API Documentation',
      views: 987,
      helpful: 92,
      icon: 'fas fa-code'
    },
    {
      id: '3',
      title: 'Managing Your Subscription and Billing',
      category: 'Billing',
      views: 756,
      helpful: 85,
      icon: 'fas fa-credit-card'
    },
    {
      id: '4',
      title: 'Troubleshooting Common Issues',
      category: 'Troubleshooting',
      views: 2341,
      helpful: 94,
      icon: 'fas fa-tools'
    },
    {
      id: '5',
      title: 'Security Best Practices',
      category: 'Security',
      views: 543,
      helpful: 97,
      icon: 'fas fa-shield-alt'
    },
    {
      id: '6',
      title: 'Webhook Configuration Guide',
      category: 'Integration',
      views: 412,
      helpful: 88,
      icon: 'fas fa-plug'
    }
  ]);

  useEffect(() => {
    // Initialize live chat widget
    initializeLiveChat();
  }, []);

  const initializeLiveChat = () => {
    // Live chat initialization logic
  };

  const getTicketStats = () => {
    const stats = {
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      waiting: tickets.filter(t => t.status === 'waiting_customer').length,
      resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length
    };
    return stats;
  };

  const stats = getTicketStats();

  const ticketStatusData = {
    labels: ['Open', 'In Progress', 'Waiting', 'Resolved'],
    datasets: [{
      data: [stats.open, stats.in_progress, stats.waiting, stats.resolved],
      backgroundColor: ['#FF5757', '#FFD700', '#00F6FF', '#47FF88'],
      borderWidth: 0
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 20
        }
      }
    }
  };

  const createNewTicket = () => {
    setShowNewTicketModal(true);
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return '#FF5757';
      case 'in_progress': return '#FFD700';
      case 'waiting_customer': return '#00F6FF';
      case 'resolved': return '#47FF88';
      case 'closed': return '#7B859A';
      default: return '#7B859A';
    }
  };

  const getPriorityIcon = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'critical': return 'fas fa-fire';
      case 'high': return 'fas fa-arrow-up';
      case 'medium': return 'fas fa-minus';
      case 'low': return 'fas fa-arrow-down';
      default: return 'fas fa-minus';
    }
  };

  return (
    <>
      <div className="support-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <i className="fas fa-headset"></i> Support Center
            </h1>
            <p className="page-subtitle">
              Get help with your LOGOS AI ecosystem
            </p>
          </div>
          
          <button className="create-ticket-btn" onClick={createNewTicket}>
            <i className="fas fa-plus"></i> New Ticket
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon open">
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.open}</span>
              <span className="stat-label">Open Tickets</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon progress">
              <i className="fas fa-spinner"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.in_progress}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon sla">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">98%</span>
              <span className="stat-label">SLA Compliance</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon satisfaction">
              <i className="fas fa-smile"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">4.8/5</span>
              <span className="stat-label">Satisfaction</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="support-tabs">
          <button 
            className={`tab-button ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <i className="fas fa-ticket-alt"></i> My Tickets
          </button>
          <button 
            className={`tab-button ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            <i className="fas fa-book"></i> Knowledge Base
          </button>
          <button 
            className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <i className="fas fa-comments"></i> Live Chat
          </button>
        </div>

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="tickets-section">
            <div className="tickets-sidebar">
              <div className="ticket-filters">
                <button 
                  className={`filter-btn ${ticketFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTicketFilter('all')}
                >
                  All Tickets ({tickets.length})
                </button>
                <button 
                  className={`filter-btn ${ticketFilter === 'open' ? 'active' : ''}`}
                  onClick={() => setTicketFilter('open')}
                >
                  Open ({stats.open})
                </button>
                <button 
                  className={`filter-btn ${ticketFilter === 'in_progress' ? 'active' : ''}`}
                  onClick={() => setTicketFilter('in_progress')}
                >
                  In Progress ({stats.in_progress})
                </button>
                <button 
                  className={`filter-btn ${ticketFilter === 'waiting' ? 'active' : ''}`}
                  onClick={() => setTicketFilter('waiting')}
                >
                  Waiting ({stats.waiting})
                </button>
                <button 
                  className={`filter-btn ${ticketFilter === 'resolved' ? 'active' : ''}`}
                  onClick={() => setTicketFilter('resolved')}
                >
                  Resolved ({stats.resolved})
                </button>
              </div>

              <div className="ticket-stats-chart">
                <h3>Ticket Status Overview</h3>
                <div style={{ height: '200px' }}>
                  <Doughnut data={ticketStatusData} options={doughnutOptions} />
                </div>
              </div>
            </div>

            <div className="tickets-list">
              {tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  className="ticket-card"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="ticket-header">
                    <div className="ticket-info">
                      <h3 className="ticket-subject">{ticket.subject}</h3>
                      <p className="ticket-id">{ticket.id}</p>
                    </div>
                    <div className="ticket-meta">
                      <span 
                        className="ticket-status"
                        style={{ color: getStatusColor(ticket.status) }}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`ticket-priority ${ticket.priority}`}>
                        <i className={getPriorityIcon(ticket.priority)}></i>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  <p className="ticket-description">{ticket.description}</p>

                  <div className="ticket-footer">
                    <div className="ticket-details">
                      <span className="ticket-category">
                        <i className="fas fa-tag"></i> {ticket.category}
                      </span>
                      <span className="ticket-messages">
                        <i className="fas fa-comment"></i> {ticket.messages} messages
                      </span>
                      <span className="ticket-time">
                        <i className="fas fa-clock"></i> Updated {new Date(ticket.updated).toLocaleDateString()}
                      </span>
                    </div>

                    {ticket.sla && (
                      <div className={`ticket-sla ${ticket.sla.status}`}>
                        <span className="sla-label">SLA:</span>
                        <span className="sla-time">{ticket.sla.remaining}</span>
                      </div>
                    )}
                  </div>

                  {ticket.assignee && (
                    <div className="ticket-assignee">
                      <img src={ticket.assignee.avatar} alt={ticket.assignee.name} />
                      <span>{ticket.assignee.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="knowledge-section">
            <div className="knowledge-search">
              <input 
                type="text" 
                placeholder="Search knowledge base..."
                className="search-input"
              />
              <button className="search-btn">
                <i className="fas fa-search"></i>
              </button>
            </div>

            <div className="knowledge-categories">
              <button className="category-btn active">All Categories</button>
              <button className="category-btn">Getting Started</button>
              <button className="category-btn">API Documentation</button>
              <button className="category-btn">Billing</button>
              <button className="category-btn">Troubleshooting</button>
            </div>

            <div className="knowledge-grid">
              {knowledgeArticles.map(article => (
                <div key={article.id} className="article-card">
                  <div className="article-icon" style={{
                    background: `rgba(72, 112, 255, 0.2)`,
                    color: '#4870FF'
                  }}>
                    <i className={article.icon}></i>
                  </div>
                  
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-category">{article.category}</p>
                  
                  <div className="article-stats">
                    <span className="article-views">
                      <i className="fas fa-eye"></i> {article.views} views
                    </span>
                    <span className="article-helpful">
                      <i className="fas fa-thumbs-up"></i> {article.helpful}% helpful
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="knowledge-footer">
              <p>Can't find what you're looking for?</p>
              <button className="contact-support-btn" onClick={createNewTicket}>
                Contact Support
              </button>
            </div>
          </div>
        )}

        {/* Live Chat Tab */}
        {activeTab === 'chat' && (
          <div className="chat-section">
            <div className="chat-container">
              <div className="chat-header">
                <div className="chat-agent">
                  <img src="/api/placeholder/40/40" alt="Support Agent" />
                  <div className="agent-info">
                    <h4>LOGOS Support</h4>
                    <span className="agent-status">Online</span>
                  </div>
                </div>
                <button className="chat-options">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>

              <div className="chat-messages">
                <div className="chat-message agent">
                  <div className="message-content">
                    Hello! I'm here to help you with any questions about LOGOS AI. How can I assist you today?
                  </div>
                  <span className="message-time">10:30 AM</span>
                </div>

                <div className="chat-suggestions">
                  <button className="suggestion-btn">How do I configure my AI bot?</button>
                  <button className="suggestion-btn">API rate limits explained</button>
                  <button className="suggestion-btn">Billing questions</button>
                  <button className="suggestion-btn">Technical issue</button>
                </div>
              </div>

              <div className="chat-input">
                <input 
                  type="text" 
                  placeholder="Type your message..."
                  className="message-input"
                />
                <button className="send-btn">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Ticket Modal */}
        {showNewTicketModal && (
          <div className="modal-overlay" onClick={() => setShowNewTicketModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Support Ticket</h2>
                <button className="modal-close" onClick={() => setShowNewTicketModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Subject</label>
                  <input type="text" placeholder="Brief description of your issue" />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select>
                      <option>Technical Issue</option>
                      <option>Billing Question</option>
                      <option>Feature Request</option>
                      <option>Account Management</option>
                      <option>Other</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Priority</label>
                    <select>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    rows={6} 
                    placeholder="Please provide detailed information about your issue..."
                  />
                </div>
                
                <div className="form-group">
                  <label>Attachments (optional)</label>
                  <div className="file-upload">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p>Drag and drop files here or click to browse</p>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowNewTicketModal(false)}
                >
                  Cancel
                </button>
                <button className="submit-btn">
                  Create Ticket
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .support-page {
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

        .create-ticket-btn {
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

        .create-ticket-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        /* Stats Grid */
        .stats-grid {
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

        .stat-icon.open { background: rgba(255, 87, 87, 0.2); color: #FF5757; }
        .stat-icon.progress { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .stat-icon.sla { background: rgba(0, 246, 255, 0.2); color: #00F6FF; }
        .stat-icon.satisfaction { background: rgba(71, 255, 136, 0.2); color: #47FF88; }

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
        .support-tabs {
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

        /* Tickets Section */
        .tickets-section {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 2rem;
        }

        .tickets-sidebar {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .ticket-filters {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-btn {
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: #F5F7FA;
          text-align: left;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .filter-btn.active {
          background: rgba(72, 112, 255, 0.2);
          color: #4870FF;
        }

        .ticket-stats-chart {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .ticket-stats-chart h3 {
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }

        .tickets-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ticket-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .ticket-card:hover {
          transform: translateY(-2px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .ticket-subject {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .ticket-id {
          font-size: 0.875rem;
          opacity: 0.5;
        }

        .ticket-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .ticket-status {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .ticket-priority {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .ticket-priority.low { background: rgba(71, 255, 136, 0.2); color: #47FF88; }
        .ticket-priority.medium { background: rgba(0, 246, 255, 0.2); color: #00F6FF; }
        .ticket-priority.high { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .ticket-priority.critical { background: rgba(255, 87, 87, 0.2); color: #FF5757; }

        .ticket-description {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .ticket-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ticket-details {
          display: flex;
          gap: 1.5rem;
        }

        .ticket-details span {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .ticket-sla {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .ticket-sla.on_track { background: rgba(71, 255, 136, 0.2); color: #47FF88; }
        .ticket-sla.at_risk { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .ticket-sla.breached { background: rgba(255, 87, 87, 0.2); color: #FF5757; }

        .ticket-assignee {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .ticket-assignee img {
          width: 32px;
          height: 32px;
          border-radius: 8px;
        }

        .ticket-assignee span {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        /* Knowledge Base */
        .knowledge-section {
          max-width: 1000px;
          margin: 0 auto;
        }

        .knowledge-search {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .search-input {
          flex: 1;
          padding: 1rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          font-size: 1.125rem;
          transition: all 0.3s;
        }

        .search-input:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .search-btn {
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 1.125rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .search-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        .knowledge-categories {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .category-btn {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 25px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
        }

        .category-btn:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .category-btn.active {
          background: #4870FF;
          border-color: #4870FF;
          color: white;
        }

        .knowledge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .article-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .article-card:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .article-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .article-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .article-category {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 1rem;
        }

        .article-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .knowledge-footer {
          text-align: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
        }

        .knowledge-footer p {
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }

        .contact-support-btn {
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .contact-support-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        /* Live Chat */
        .chat-section {
          max-width: 800px;
          margin: 0 auto;
        }

        .chat-container {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          overflow: hidden;
          height: 600px;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(72, 112, 255, 0.2);
        }

        .chat-agent {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .chat-agent img {
          width: 40px;
          height: 40px;
          border-radius: 10px;
        }

        .agent-info h4 {
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }

        .agent-status {
          font-size: 0.875rem;
          color: #47FF88;
        }

        .chat-options {
          background: transparent;
          border: none;
          color: #F5F7FA;
          font-size: 1.25rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.3s;
        }

        .chat-options:hover {
          opacity: 1;
        }

        .chat-messages {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }

        .chat-message {
          margin-bottom: 1.5rem;
        }

        .chat-message.agent .message-content {
          background: rgba(72, 112, 255, 0.1);
          padding: 1rem 1.5rem;
          border-radius: 16px 16px 16px 4px;
          display: inline-block;
          max-width: 70%;
        }

        .message-time {
          font-size: 0.75rem;
          opacity: 0.5;
          margin-top: 0.5rem;
          display: block;
        }

        .chat-suggestions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-top: 2rem;
        }

        .suggestion-btn {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
        }

        .suggestion-btn:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .chat-input {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(72, 112, 255, 0.2);
        }

        .message-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
        }

        .message-input:focus {
          outline: none;
          border-color: #4870FF;
        }

        .send-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1.125rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .send-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(72, 112, 255, 0.4);
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

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .file-upload {
          padding: 3rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px dashed rgba(72, 112, 255, 0.3);
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .file-upload:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: #4870FF;
        }

        .file-upload i {
          font-size: 3rem;
          color: #4870FF;
          margin-bottom: 1rem;
          display: block;
        }

        .file-upload p {
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
        .submit-btn {
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

        .submit-btn {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .tickets-section {
            grid-template-columns: 1fr;
          }
          
          .tickets-sidebar {
            flex-direction: row;
            overflow-x: auto;
          }
          
          .ticket-filters {
            min-width: 250px;
          }
          
          .ticket-stats-chart {
            min-width: 300px;
          }
        }

        @media (max-width: 768px) {
          .support-page {
            padding: 1rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .support-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          .knowledge-grid {
            grid-template-columns: 1fr;
          }
          
          .chat-suggestions {
            grid-template-columns: 1fr;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default withAuth(SupportPage);