import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  const router = useRouter();

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #0A0E21;
          color: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 14, 33, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(72, 112, 255, 0.3)',
        zIndex: 1000,
        transition: 'all 0.3s ease',
      }}>
        <div className="container">
          <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 0',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            {/* Logo */}
            <Link href="/">
              <a style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1.5rem',
                fontWeight: 'bold',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}>
                  AI
                </div>
                <span>LOGOS ECOSYSTEM</span>
              </a>
            </Link>

            {/* Navigation Links */}
            <div style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <Link href="/">
                <a style={{ 
                  opacity: router.pathname === '/' ? 1 : 0.7,
                  transition: 'opacity 0.3s',
                  borderBottom: router.pathname === '/' ? '2px solid #4870FF' : 'none',
                  paddingBottom: '2px',
                }}>
                  Inicio
                </a>
              </Link>
              
              <Link href="/dashboard">
                <a style={{ 
                  opacity: router.pathname === '/dashboard' ? 1 : 0.7,
                  transition: 'opacity 0.3s',
                  borderBottom: router.pathname === '/dashboard' ? '2px solid #4870FF' : 'none',
                  paddingBottom: '2px',
                }}>
                  Dashboard
                </a>
              </Link>
              
              <Link href="/products">
                <a style={{ 
                  opacity: router.pathname === '/products' ? 1 : 0.7,
                  transition: 'opacity 0.3s',
                  borderBottom: router.pathname === '/products' ? '2px solid #4870FF' : 'none',
                  paddingBottom: '2px',
                }}>
                  Productos
                </a>
              </Link>
              
              <Link href="/support">
                <a style={{ 
                  opacity: router.pathname === '/support' ? 1 : 0.7,
                  transition: 'opacity 0.3s',
                  borderBottom: router.pathname === '/support' ? '2px solid #4870FF' : 'none',
                  paddingBottom: '2px',
                }}>
                  Soporte
                </a>
              </Link>

              <Link href="/auth/signin">
                <a style={{
                  background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(72, 112, 255, 0.3)',
                  display: 'inline-block',
                }}>
                  Login
                </a>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        paddingTop: '80px',
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 20% 50%, rgba(72, 112, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(0, 246, 255, 0.1) 0%, transparent 50%)
        `,
      }}>
        <div className="animate-fadeIn">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(72, 112, 255, 0.05) 100%)',
        borderTop: '1px solid rgba(72, 112, 255, 0.2)',
        padding: '3rem 0',
        marginTop: '5rem',
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem',
          }}>
            {/* Company Info */}
            <div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                }}>
                  AI
                </div>
                LOGOS ECOSYSTEM
              </h3>
              <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
                Liderando la revolución de la inteligencia artificial con más de 100 agentes especializados.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#4870FF' }}>Enlaces Rápidos</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link href="/about"><a style={{ opacity: 0.8 }}>Sobre Nosotros</a></Link>
                <Link href="/products"><a style={{ opacity: 0.8 }}>Productos</a></Link>
                <Link href="/pricing"><a style={{ opacity: 0.8 }}>Precios</a></Link>
                <Link href="/contact"><a style={{ opacity: 0.8 }}>Contacto</a></Link>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#4870FF' }}>Soporte</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link href="/docs"><a style={{ opacity: 0.8 }}>Documentación</a></Link>
                <Link href="/api"><a style={{ opacity: 0.8 }}>API Reference</a></Link>
                <Link href="/faq"><a style={{ opacity: 0.8 }}>FAQ</a></Link>
                <Link href="/support"><a style={{ opacity: 0.8 }}>Centro de Ayuda</a></Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#4870FF' }}>Contacto</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.8 }}>
                <p>Email: info@logos-ecosystem.com</p>
                <p>Tel: +1 (555) 123-4567</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <a href="#" style={{ fontSize: '1.25rem' }}>📧</a>
                  <a href="#" style={{ fontSize: '1.25rem' }}>💼</a>
                  <a href="#" style={{ fontSize: '1.25rem' }}>🐦</a>
                  <a href="#" style={{ fontSize: '1.25rem' }}>📱</a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{
            borderTop: '1px solid rgba(72, 112, 255, 0.1)',
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <p style={{ opacity: 0.7 }}>
              © 2024 LOGOS ECOSYSTEM. Todos los derechos reservados.
            </p>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <Link href="/privacy"><a style={{ opacity: 0.7 }}>Privacidad</a></Link>
              <Link href="/terms"><a style={{ opacity: 0.7 }}>Términos</a></Link>
              <Link href="/cookies"><a style={{ opacity: 0.7 }}>Cookies</a></Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Action Button */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        background: 'linear-gradient(135deg, #00F6FF 0%, #4870FF 100%)',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0, 246, 255, 0.4)',
        cursor: 'pointer',
        transition: 'all 0.3s',
        zIndex: 999,
      }}>
        <span style={{ fontSize: '1.5rem' }}>💬</span>
      </div>
    </>
  );
};

export default SimpleLayout;