import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';

const TestStyles: React.FC = () => {
  return (
    <MainLayout>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '2rem', color: 'var(--primary)' }}>
          🎨 Test de Estilos - LOGOS ECOSYSTEM
        </h1>
        
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '2rem', 
          borderRadius: '16px',
          border: '1px solid rgba(72, 112, 255, 0.3)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>
            ✅ Si puedes ver este contenido, los estilos están funcionando
          </h2>
          
          <p style={{ marginBottom: '1rem' }}>
            Este es un test para verificar que:
          </p>
          
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              ✓ El header está fijo en la parte superior
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              ✓ El contenido tiene padding-top para no quedar oculto
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              ✓ El background es oscuro (--bg-dark: #0A0E21)
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              ✓ Los colores del tema están aplicados
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              ✓ Los efectos de partículas y matrix están activos
            </li>
          </ul>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          marginTop: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            padding: '2rem',
            borderRadius: '16px',
            color: 'white'
          }}>
            <h3>Gradiente Primario</h3>
            <p>Este box usa el gradiente del tema</p>
          </div>
          
          <div style={{
            background: 'var(--surface-dark)',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ color: 'var(--primary)' }}>Surface Dark</h3>
            <p>Background: var(--surface-dark)</p>
          </div>
          
          <div style={{
            background: 'rgba(0, 246, 255, 0.1)',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid var(--secondary)'
          }}>
            <h3 style={{ color: 'var(--secondary)' }}>Secondary Color</h3>
            <p>Color secundario del tema</p>
          </div>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Variables CSS del Tema:</h2>
          <pre style={{
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '1rem',
            borderRadius: '8px',
            overflow: 'auto'
          }}>
{`--primary: #4870FF
--secondary: #00F6FF
--accent: #FFD700
--bg-dark: #0A0E21
--bg-light: #F8F9FD
--surface-dark: #131729
--text-dark: #FFFFFF`}
          </pre>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a 
            href="/" 
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(72, 112, 255, 0.3)',
              transition: 'all 0.3s'
            }}
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    </MainLayout>
  );
};

export default TestStyles;