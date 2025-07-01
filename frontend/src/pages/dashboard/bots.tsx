import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import withAuth from '@/components/Auth/withAuth';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface AIBot {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'error' | 'configuring';
  version: string;
  created: string;
  lastActive: string;
  usage: {
    tokens: number;
    requests: number;
    errors: number;
  };
  configuration: {
    model: string;
    temperature: number;
    maxTokens: number;
    personality: string;
    skills: string[];
  };
  performance: {
    responseTime: number;
    successRate: number;
    userSatisfaction: number;
  };
}

const BotsConfiguration = () => {
  const router = useRouter();
  const [selectedBot, setSelectedBot] = useState<AIBot | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [aiMode, setAiMode] = useState<'development' | 'production'>('production');
  
  const [bots, setBots] = useState<AIBot[]>([
    {
      id: '1',
      name: 'CodeMaster Pro',
      type: 'Development Assistant',
      status: 'active',
      version: '2.1.0',
      created: '2024-11-15',
      lastActive: '2 minutes ago',
      usage: {
        tokens: 125000,
        requests: 3450,
        errors: 12
      },
      configuration: {
        model: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 4000,
        personality: 'Professional, precise, and helpful',
        skills: ['Code Generation', 'Bug Detection', 'Refactoring', 'Documentation']
      },
      performance: {
        responseTime: 1.2,
        successRate: 98.5,
        userSatisfaction: 4.8
      }
    },
    {
      id: '2',
      name: 'DataMind Analytics',
      type: 'Data Analysis',
      status: 'active',
      version: '1.5.2',
      created: '2024-10-20',
      lastActive: '1 hour ago',
      usage: {
        tokens: 89000,
        requests: 1890,
        errors: 5
      },
      configuration: {
        model: 'claude-3-opus',
        temperature: 0.5,
        maxTokens: 8000,
        personality: 'Analytical, detailed, and insightful',
        skills: ['Data Analysis', 'Visualization', 'Predictive Modeling', 'Reporting']
      },
      performance: {
        responseTime: 2.1,
        successRate: 99.2,
        userSatisfaction: 4.9
      }
    },
    {
      id: '3',
      name: 'Customer Support Pro',
      type: 'Customer Service',
      status: 'paused',
      version: '3.0.1',
      created: '2024-09-10',
      lastActive: '3 days ago',
      usage: {
        tokens: 250000,
        requests: 8900,
        errors: 45
      },
      configuration: {
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 2000,
        personality: 'Friendly, empathetic, and solution-oriented',
        skills: ['Ticket Resolution', 'Live Chat', 'Email Support', 'Knowledge Base']
      },
      performance: {
        responseTime: 0.8,
        successRate: 96.2,
        userSatisfaction: 4.7
      }
    }
  ]);

  useEffect(() => {
    // Initialize animations
    initializeAnimations();
  }, []);

  const initializeAnimations = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(element => {
      observer.observe(element);
    });
  };

  const handleBotToggle = (botId: string) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId 
          ? { ...bot, status: bot.status === 'active' ? 'paused' as const : 'active' as const }
          : bot
      )
    );
  };

  const handleConfigureBot = (bot: AIBot) => {
    setSelectedBot(bot);
    setShowConfigModal(true);
  };

  const handleSaveConfiguration = () => {
    // Save configuration logic here
    setShowConfigModal(false);
    setSelectedBot(null);
  };

  // Chart data for bot performance
  const getPerformanceData = (bot: AIBot) => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Response Time (s)',
      data: [1.2, 1.1, 1.3, 1.2, 1.0, 1.1, 1.2],
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

  return (
    <>
      <div className="bots-configuration">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <i className="fas fa-robot"></i> LOGOS AI Expert Bots
            </h1>
            <p className="page-subtitle">
              Configure and manage your AI-powered assistants
            </p>
          </div>
          
          <div className="header-actions">
            <button className="mode-toggle">
              <span className={`mode-option ${aiMode === 'development' ? 'active' : ''}`}
                onClick={() => setAiMode('development')}>
                Development
              </span>
              <span className={`mode-option ${aiMode === 'production' ? 'active' : ''}`}
                onClick={() => setAiMode('production')}>
                Production
              </span>
            </button>
            
            <button className="action-button primary" onClick={() => router.push('/marketplace/enhanced')}>
              <i className="fas fa-plus"></i> Add New Bot
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon active">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{bots.filter(b => b.status === 'active').length}</span>
              <span className="stat-label">Active Bots</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="fas fa-robot"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{bots.length}</span>
              <span className="stat-label">Total Bots</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon usage">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {(bots.reduce((acc, bot) => acc + bot.usage.tokens, 0) / 1000).toFixed(0)}K
              </span>
              <span className="stat-label">Tokens Used</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon performance">
              <i className="fas fa-tachometer-alt"></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {(bots.reduce((acc, bot) => acc + bot.performance.successRate, 0) / bots.length).toFixed(1)}%
              </span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>
        </div>

        {/* Bots Grid */}
        <div className="bots-grid">
          {bots.map(bot => (
            <div key={bot.id} className="bot-card fade-in">
              <div className="bot-header">
                <div className="bot-icon" style={{
                  background: bot.status === 'active' ? 'rgba(71, 255, 136, 0.2)' : 
                              bot.status === 'paused' ? 'rgba(255, 215, 0, 0.2)' :
                              'rgba(255, 87, 87, 0.2)'
                }}>
                  <i className={`fas fa-${
                    bot.type.includes('Development') ? 'code' :
                    bot.type.includes('Data') ? 'chart-bar' :
                    'headset'
                  }`}></i>
                </div>
                
                <div className="bot-info">
                  <h3 className="bot-name">{bot.name}</h3>
                  <p className="bot-type">{bot.type}</p>
                </div>
                
                <div className="bot-status">
                  <span className={`status-badge ${bot.status}`}>
                    {bot.status}
                  </span>
                </div>
              </div>

              <div className="bot-metrics">
                <div className="metric">
                  <span className="metric-label">Version</span>
                  <span className="metric-value">{bot.version}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Last Active</span>
                  <span className="metric-value">{bot.lastActive}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Requests</span>
                  <span className="metric-value">{bot.usage.requests.toLocaleString()}</span>
                </div>
              </div>

              <div className="bot-performance">
                <div className="performance-header">
                  <span className="performance-title">Performance</span>
                  <span className="performance-score">{bot.performance.successRate}%</span>
                </div>
                
                <div className="chart-container" style={{ height: '100px' }}>
                  <Line data={getPerformanceData(bot)} options={chartOptions} />
                </div>
              </div>

              <div className="bot-skills">
                {bot.configuration.skills.slice(0, 3).map((skill, idx) => (
                  <span key={idx} className="skill-tag">{skill}</span>
                ))}
                {bot.configuration.skills.length > 3 && (
                  <span className="skill-tag more">+{bot.configuration.skills.length - 3}</span>
                )}
              </div>

              <div className="bot-actions">
                <button 
                  className="toggle-button"
                  onClick={() => handleBotToggle(bot.id)}
                >
                  <i className={`fas fa-${bot.status === 'active' ? 'pause' : 'play'}`}></i>
                  {bot.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                
                <button 
                  className="configure-button"
                  onClick={() => handleConfigureBot(bot)}
                >
                  <i className="fas fa-cog"></i>
                  Configure
                </button>
                
                <button className="more-button">
                  <i className="fas fa-ellipsis-v"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {bots.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-robot" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
            <h3>No AI Bots Configured</h3>
            <p>Get started by adding your first AI assistant from the marketplace</p>
            <button 
              className="action-button primary"
              onClick={() => router.push('/marketplace/enhanced')}
            >
              Browse AI Bots
            </button>
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && selectedBot && (
          <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Configure {selectedBot.name}</h2>
                <button className="modal-close" onClick={() => setShowConfigModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="config-section">
                  <h3>Model Configuration</h3>
                  <div className="config-grid">
                    <div className="config-field">
                      <label>AI Model</label>
                      <select defaultValue={selectedBot.configuration.model}>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      </select>
                    </div>
                    
                    <div className="config-field">
                      <label>Temperature</label>
                      <div className="slider-container">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1"
                          defaultValue={selectedBot.configuration.temperature}
                        />
                        <span>{selectedBot.configuration.temperature}</span>
                      </div>
                    </div>
                    
                    <div className="config-field">
                      <label>Max Tokens</label>
                      <input 
                        type="number" 
                        defaultValue={selectedBot.configuration.maxTokens}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="config-section">
                  <h3>Personality & Behavior</h3>
                  <textarea 
                    placeholder="Describe the bot's personality and behavior..."
                    defaultValue={selectedBot.configuration.personality}
                    rows={4}
                  />
                </div>
                
                <div className="config-section">
                  <h3>Skills & Capabilities</h3>
                  <div className="skills-manager">
                    {selectedBot.configuration.skills.map((skill, idx) => (
                      <div key={idx} className="skill-item">
                        <span>{skill}</span>
                        <button className="remove-skill">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    <button className="add-skill">
                      <i className="fas fa-plus"></i> Add Skill
                    </button>
                  </div>
                </div>
                
                <div className="config-section">
                  <h3>Advanced Settings</h3>
                  <div className="advanced-options">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <span>Enable context memory</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <span>Auto-learn from interactions</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span>Debug mode</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="cancel-button"
                  onClick={() => setShowConfigModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleSaveConfiguration}
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .bots-configuration {
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

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .mode-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 25px;
          padding: 4px;
        }

        .mode-option {
          padding: 0.5rem 1.5rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.875rem;
          color: #F5F7FA;
        }

        .mode-option.active {
          background: #4870FF;
          color: white;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .action-button.primary {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.3);
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
        .stat-icon.usage { background: rgba(0, 246, 255, 0.2); color: #00F6FF; }
        .stat-icon.performance { background: rgba(255, 215, 0, 0.2); color: #FFD700; }

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

        /* Bots Grid */
        .bots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 2rem;
        }

        .bot-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
        }

        .bot-card:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .bot-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .bot-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          flex-shrink: 0;
        }

        .bot-info {
          flex: 1;
        }

        .bot-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .bot-type {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: rgba(71, 255, 136, 0.2);
          color: #47FF88;
        }

        .status-badge.paused {
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
        }

        .status-badge.error {
          background: rgba(255, 87, 87, 0.2);
          color: #FF5757;
        }

        .bot-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
        }

        .metric {
          text-align: center;
        }

        .metric-label {
          display: block;
          font-size: 0.75rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .metric-value {
          font-weight: 600;
          color: #4870FF;
        }

        .bot-performance {
          margin-bottom: 1.5rem;
        }

        .performance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .performance-title {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .performance-score {
          font-weight: 600;
          color: #47FF88;
        }

        .bot-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .skill-tag {
          background: rgba(72, 112, 255, 0.1);
          color: #4870FF;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
        }

        .skill-tag.more {
          background: rgba(0, 246, 255, 0.1);
          color: #00F6FF;
        }

        .bot-actions {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 0.75rem;
        }

        .toggle-button,
        .configure-button,
        .more-button {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
        }

        .toggle-button:hover,
        .configure-button:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .more-button {
          width: 40px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          border: 1px solid rgba(72, 112, 255, 0.2);
        }

        .empty-state h3 {
          margin: 1rem 0;
          font-size: 1.5rem;
        }

        .empty-state p {
          opacity: 0.7;
          margin-bottom: 2rem;
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
          max-width: 700px;
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

        .config-section {
          margin-bottom: 2rem;
        }

        .config-section h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
          color: #4870FF;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .config-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .config-field label {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .config-field input,
        .config-field select,
        .config-section textarea {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          padding: 0.75rem;
          color: #F5F7FA;
          transition: all 0.3s;
        }

        .config-field input:focus,
        .config-field select:focus,
        .config-section textarea:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .config-section textarea {
          width: 100%;
          resize: vertical;
        }

        .slider-container {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .slider-container input[type="range"] {
          flex: 1;
        }

        .skills-manager {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .skill-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(72, 112, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 20px;
        }

        .remove-skill {
          background: transparent;
          border: none;
          color: #FF5757;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.3s;
        }

        .remove-skill:hover {
          opacity: 1;
        }

        .add-skill {
          background: rgba(72, 112, 255, 0.1);
          border: 1px dashed #4870FF;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          color: #4870FF;
          cursor: pointer;
          transition: all 0.3s;
        }

        .add-skill:hover {
          background: rgba(72, 112, 255, 0.2);
        }

        .advanced-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cancel-button,
        .save-button {
          padding: 0.875rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .cancel-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #F5F7FA;
        }

        .cancel-button:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .save-button {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .save-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        .fade-in {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease;
        }

        .fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .bots-configuration {
            padding: 1rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }
          
          .header-actions {
            width: 100%;
            flex-direction: column;
          }
          
          .bots-grid {
            grid-template-columns: 1fr;
          }
          
          .bot-actions {
            grid-template-columns: 1fr 1fr;
          }
          
          .more-button {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default withAuth(BotsConfiguration);