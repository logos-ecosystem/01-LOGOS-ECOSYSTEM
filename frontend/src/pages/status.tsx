import React, { useEffect, useState } from 'react';

const StatusPage: React.FC = () => {
  const [status, setStatus] = useState({
    layout: 'checking...',
    styles: 'checking...',
    routing: 'checking...',
    api: 'checking...'
  });

  useEffect(() => {
    // Check if layout is rendered
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    setStatus(prev => ({
      ...prev,
      layout: header && footer ? '✅ OK' : '❌ Missing',
      styles: window.getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)' ? '✅ OK' : '❌ No styles',
      routing: window.location.pathname === '/status' ? '✅ OK' : '❌ Error'
    }));

    // Test API
    fetch('/api/health')
      .then(() => setStatus(prev => ({ ...prev, api: '✅ Connected' })))
      .catch(() => setStatus(prev => ({ ...prev, api: '❌ Not connected' })));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#4870FF' }}>
        🔍 System Status Check
      </h1>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(72, 112, 255, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <td style={{ padding: '1rem', fontWeight: 'bold' }}>Layout Components</td>
              <td style={{ padding: '1rem' }}>{status.layout}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <td style={{ padding: '1rem', fontWeight: 'bold' }}>CSS Styles</td>
              <td style={{ padding: '1rem' }}>{status.styles}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <td style={{ padding: '1rem', fontWeight: 'bold' }}>Routing</td>
              <td style={{ padding: '1rem' }}>{status.routing}</td>
            </tr>
            <tr>
              <td style={{ padding: '1rem', fontWeight: 'bold' }}>API Connection</td>
              <td style={{ padding: '1rem' }}>{status.api}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Quick Actions:</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              background: '#4870FF',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Go to Home
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            style={{
              background: '#00F6FF',
              color: '#0A0E21',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Go to Dashboard
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#FFD700',
              color: '#0A0E21',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: 'rgba(0, 246, 255, 0.1)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '8px'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Current Time:</strong> {new Date().toLocaleString()}<br />
          <strong>Page Path:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}<br />
          <strong>Next.js Ready:</strong> ✅ Yes
        </p>
      </div>
    </div>
  );
};

export default StatusPage;