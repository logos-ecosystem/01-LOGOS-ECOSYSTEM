import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Hero Section */}
      <section style={{ 
        padding: '120px 20px 80px', 
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{ 
          fontSize: '4rem', 
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          LOGOS AI Ecosystem
        </h1>
        
        <p style={{ 
          fontSize: '1.5rem', 
          opacity: 0.8, 
          marginBottom: '3rem',
          maxWidth: '800px',
          margin: '0 auto 3rem'
        }}>
          The Most Advanced AI-Native Platform for Modern Businesses
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{
            padding: '1rem 2.5rem',
            background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '50px',
            fontSize: '1.125rem',
            fontWeight: '600',
            display: 'inline-block',
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }}>
            Get Started
          </Link>
          
          <Link href="/productos" style={{
            padding: '1rem 2.5rem',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '50px',
            fontSize: '1.125rem',
            fontWeight: '600',
            display: 'inline-block',
            border: '2px solid rgba(72, 112, 255, 0.5)',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}>
            View Products
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ 
        padding: '80px 20px', 
        background: 'rgba(255,255,255,0.02)',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '3rem' }}>
          Powerful Features
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            { title: 'AI-Powered', desc: 'Advanced artificial intelligence at your fingertips' },
            { title: 'Real-time Analytics', desc: 'Monitor your business metrics in real-time' },
            { title: 'Secure & Scalable', desc: 'Enterprise-grade security and infinite scalability' },
            { title: 'Multi-language', desc: 'Support for multiple languages and regions' },
            { title: 'API Integration', desc: 'Seamless integration with your existing tools' },
            { title: '24/7 Support', desc: 'Round-the-clock support from our expert team' }
          ].map((feature, index) => (
            <div key={index} style={{
              padding: '2rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(72, 112, 255, 0.2)',
              transition: 'transform 0.2s'
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                {feature.title}
              </h3>
              <p style={{ opacity: 0.7 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        padding: '80px 20px', 
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(72, 112, 255, 0.1) 0%, rgba(0, 246, 255, 0.1) 100%)'
      }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
          Ready to Transform Your Business?
        </h2>
        <p style={{ fontSize: '1.25rem', opacity: 0.8, marginBottom: '2rem' }}>
          Join thousands of companies using LOGOS AI Ecosystem
        </p>
        <Link href="/contacto" style={{
          padding: '1rem 3rem',
          background: 'white',
          color: '#1a1a2e',
          textDecoration: 'none',
          borderRadius: '50px',
          fontSize: '1.25rem',
          fontWeight: '600',
          display: 'inline-block',
          transition: 'transform 0.2s'
        }}>
          Contact Sales
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
        opacity: 0.7
      }}>
        <p>&copy; 2025 LOGOS AI Ecosystem. All rights reserved.</p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/privacy" style={{ color: 'white', marginRight: '2rem' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'white' }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}