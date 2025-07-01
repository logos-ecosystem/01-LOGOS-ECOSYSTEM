import React from 'react';
import { useRouter } from 'next/router';

export default function Productos() {
  const router = useRouter();

  return (
    <div style={{ padding: '120px 20px 80px', minHeight: '100vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Nuestros Productos</h1>
      <p style={{ fontSize: '1.5rem', opacity: 0.8, marginBottom: '2rem' }}>Soluciones AI de vanguardia</p>
      <button 
        className="cta-button"
        onClick={() => router.push('/dashboard')}
        style={{
          padding: '1rem 2rem',
          background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          fontSize: '1.125rem',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Ver Dashboard
      </button>
    </div>
  );
}