import React from 'react';
import Link from 'next/link';

const DebugPage: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0A0E21', 
      color: 'white', 
      padding: '2rem' 
    }}>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 14, 33, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(72, 112, 255, 0.3)',
        padding: '1rem 2rem',
        zIndex: 1000
      }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            🚀 LOGOS ECOSYSTEM
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link href="/">
              <a style={{ color: 'white' }}>Home</a>
            </Link>
            <Link href="/dashboard">
              <a style={{ color: 'white' }}>Dashboard</a>
            </Link>
            <Link href="/auth/signin">
              <a style={{ 
                background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                color: 'white'
              }}>
                Login
              </a>
            </Link>
          </div>
        </nav>
      </header>

      <main style={{ paddingTop: '100px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>
          🔍 Debug Page - Sistema de Diagnóstico
        </h1>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(72, 112, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#00F6FF', marginBottom: '1rem' }}>
            Estado del Sistema
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              ✅ <strong>Página renderizada correctamente</strong>
            </div>
            <div>
              ✅ <strong>Estilos inline funcionando</strong>
            </div>
            <div>
              ✅ <strong>Navegación básica disponible</strong>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(0, 246, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#00F6FF', marginBottom: '1rem' }}>
            Enlaces Rápidos
          </h2>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/">
              <a style={{
                display: 'inline-block',
                background: '#4870FF',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                color: 'white',
                transition: 'transform 0.3s'
              }}>
                Página Principal
              </a>
            </Link>
            
            <Link href="/dashboard">
              <a style={{
                display: 'inline-block',
                background: '#00F6FF',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                color: '#0A0E21',
                transition: 'transform 0.3s'
              }}>
                Dashboard
              </a>
            </Link>
            
            <Link href="/test-styles">
              <a style={{
                display: 'inline-block',
                background: '#FFD700',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                color: '#0A0E21',
                transition: 'transform 0.3s'
              }}>
                Test de Estilos
              </a>
            </Link>
            
            <Link href="/auth/signin">
              <a style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                color: 'white',
                transition: 'transform 0.3s'
              }}>
                Login
              </a>
            </Link>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h2 style={{ color: '#FF5757', marginBottom: '1rem' }}>
            Posibles Problemas Detectados
          </h2>
          
          <ol style={{ paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              El MainLayout podría no estar cargando correctamente
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Los archivos CSS externos podrían tener conflictos
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Material-UI CssBaseline podría estar sobrescribiendo estilos
            </li>
          </ol>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            Solución Recomendada:
          </h3>
          <p>
            Esta página usa solo estilos inline para evitar conflictos. 
            Si puedes ver todo correctamente aquí, el problema está en la 
            integración de los archivos CSS o en el MainLayout.
          </p>
        </div>
      </main>
    </div>
  );
};

export default DebugPage;