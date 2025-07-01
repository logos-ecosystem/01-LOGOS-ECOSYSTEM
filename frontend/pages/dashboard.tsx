import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();

  const dashboardItems = [
    { 
      title: 'Products', 
      description: 'Manage your LOGOS AI products and configurations',
      href: '/productos',
      icon: '📦'
    },
    {
      title: 'Analytics',
      description: 'View real-time analytics and insights',
      href: '/dashboard/analytics',
      icon: '📊'
    },
    {
      title: 'Billing',
      description: 'Manage your subscription and payments',
      href: '/dashboard/billing',
      icon: '💳'
    },
    {
      title: 'API Keys',
      description: 'Manage your API keys and webhooks',
      href: '/dashboard/api-keys',
      icon: '🔑'
    },
    {
      title: 'Support',
      description: 'Get help and contact support',
      href: '/contacto',
      icon: '🆘'
    },
    {
      title: 'Settings',
      description: 'Configure your account settings',
      href: '/dashboard/settings',
      icon: '⚙️'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'white',
          textDecoration: 'none'
        }}>
          LOGOS AI Ecosystem
        </Link>
        
        <nav style={{ display: 'flex', gap: '2rem' }}>
          <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
          <Link href="/productos" style={{ color: 'white', textDecoration: 'none' }}>Products</Link>
          <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
        </nav>
      </header>

      {/* Dashboard Content */}
      <main style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Dashboard
        </h1>
        
        <p style={{ fontSize: '1.25rem', opacity: 0.8, marginBottom: '3rem' }}>
          Welcome to your LOGOS AI control center
        </p>

        {/* Dashboard Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '2rem'
        }}>
          {dashboardItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(72, 112, 255, 0.2)',
                borderRadius: '16px',
                padding: '2rem',
                textDecoration: 'none',
                color: 'white',
                transition: 'all 0.3s',
                display: 'block',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(72, 112, 255, 0.5)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(72, 112, 255, 0.2)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ opacity: 0.7 }}>{item.description}</p>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div style={{
          marginTop: '4rem',
          padding: '2rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px solid rgba(72, 112, 255, 0.1)'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Quick Stats</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem'
          }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4870FF' }}>0</div>
              <div style={{ opacity: 0.7 }}>Active Products</div>
            </div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#00F6FF' }}>0</div>
              <div style={{ opacity: 0.7 }}>API Calls Today</div>
            </div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4870FF' }}>$0</div>
              <div style={{ opacity: 0.7 }}>Current Balance</div>
            </div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#00F6FF' }}>Free</div>
              <div style={{ opacity: 0.7 }}>Current Plan</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '4rem',
        padding: '2rem',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
        opacity: 0.7
      }}>
        <p>&copy; 2025 LOGOS AI Ecosystem. All rights reserved.</p>
      </footer>
    </div>
  );
}