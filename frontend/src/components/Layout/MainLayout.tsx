import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import NotificationCenter from '@/components/Notifications/NotificationCenter';
import MatrixBackground from '@/components/Effects/MatrixBackground';
import ParticlesBackground from '@/components/Effects/ParticlesBackground';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = savedTheme ? savedTheme === 'dark' : true;
    setIsDarkMode(prefersDark);
    if (!prefersDark) {
      document.body.classList.add('light-mode');
    }

    // Hide loading screen after delay
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

  const changeLanguage = (value: string) => {
    setLanguage(value);
    // In a real app, this would trigger i18n change
    showNotification('Language', `Switched to ${value.toUpperCase()}`);
  };

  const showNotification = (title: string, message: string) => {
    const notification = document.getElementById('notification');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    
    if (notification && titleEl && messageEl) {
      titleEl.textContent = title;
      messageEl.textContent = message;
      notification.classList.add('show');
      
      setTimeout(() => {
        notification.classList.remove('show');
      }, 4000);
    }
  };

  return (
    <>
      {/* Background Effects */}
      <MatrixBackground />
      <ParticlesBackground />

      {/* Loading Screen */}
      {isLoading && (
        <div className="loading-overlay" id="loadingScreen">
          <div className="loading-content">
            <div className="loading-logo">AI</div>
            <div className="loading-text">Initializing LOGOS ECOSYSTEM</div>
            <div className="loading-progress">
              <div className="loading-bar"></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header>
        <div className="container">
          <nav>
            <Link href="/">
              <a className="logo">
                <div className="logo-icon">AI</div>
                <span>LOGOS ECOSYSTEM</span>
              </a>
            </Link>
            
            <ul className="nav-links">
              <li><Link href="/"><a>Inicio</a></Link></li>
              <li><Link href="/productos"><a>Productos</a></Link></li>
              <li><Link href="/servicios"><a>Servicios</a></Link></li>
              <li><Link href="/empresa"><a>Empresa</a></Link></li>
              <li><Link href="/contacto"><a>Contacto</a></Link></li>
            </ul>
            
            <div className="nav-controls">
              <NotificationCenter />
              
              <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                <i className={`fas fa-${isDarkMode ? 'moon' : 'sun'}`}></i>
              </button>
              
              <select 
                className="language-selector" 
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="ja">🇯🇵 日本語</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
              
              <button 
                className="cta-button"
                onClick={() => router.push('/auth/signin')}
              >
                <i className="fas fa-sign-in-alt"></i>
                Login
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* AI Activity Monitor */}
      <div className="ai-activity" onClick={() => showNotification('AI Status', 'AI is processing...')}>
        <div className="ai-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <span id="ai-status">AI is processing</span>
      </div>

      {/* Notification */}
      <div className="notification" id="notification">
        <div className="notification-icon">
          <i className="fas fa-info-circle"></i>
        </div>
        <div className="notification-content">
          <div className="notification-title" id="notificationTitle">Notification</div>
          <div className="notification-message" id="notificationMessage">Message</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer-gradient">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <div className="logo-icon">AI</div>
                <h3>LOGOS ECOSYSTEM</h3>
              </div>
              <p className="footer-description">
                Liderando la revolución de la inteligencia artificial empresarial con más de 150 agentes especializados.
              </p>
              <div className="social-links">
                <a href="#" className="social-link"><i className="fab fa-linkedin"></i></a>
                <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
                <a href="#" className="social-link"><i className="fab fa-github"></i></a>
                <a href="#" className="social-link"><i className="fab fa-youtube"></i></a>
              </div>
            </div>
            
            <div className="footer-section">
              <h4>Productos</h4>
              <ul className="footer-links">
                <li><Link href="/productos"><a>AI Expert Bot</a></Link></li>
                <li><Link href="/productos"><a>Analytics Suite</a></Link></li>
                <li><Link href="/productos"><a>Security Shield</a></Link></li>
                <li><Link href="/productos"><a>Voice Assistant</a></Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Empresa</h4>
              <ul className="footer-links">
                <li><Link href="/empresa"><a>Sobre Nosotros</a></Link></li>
                <li><Link href="/empresa#team"><a>Equipo</a></Link></li>
                <li><Link href="/blog"><a>Blog</a></Link></li>
                <li><Link href="/careers"><a>Carreras</a></Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Recursos</h4>
              <ul className="footer-links">
                <li><a href="/docs">Documentación</a></li>
                <li><a href="/api">API Reference</a></li>
                <li><a href="/support">Soporte</a></li>
                <li><a href="/status">Estado del Sistema</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Newsletter</h4>
              <p>Mantente actualizado con las últimas noticias AI</p>
              <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="tu@email.com" 
                  className="newsletter-input"
                />
                <button type="submit" className="cta-button">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <p>&copy; 2024 LOGOS ECOSYSTEM. Todos los derechos reservados.</p>
              <div className="footer-bottom-links">
                <a href="/privacy">Privacidad</a>
                <a href="/terms">Términos</a>
                <a href="/cookies">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(10, 14, 33, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(72, 112, 255, 0.2);
          z-index: 1000;
          padding: 1rem 0;
          transition: all 0.3s ease;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 1.5rem;
          font-weight: 700;
          text-decoration: none;
          color: inherit;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: spin 10s linear infinite;
          font-weight: bold;
          color: white;
        }

        nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
          align-items: center;
          margin: 0;
          padding: 0;
        }

        .nav-links a {
          color: inherit;
          text-decoration: none;
          transition: color 0.3s;
          position: relative;
        }

        .nav-links a::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--primary);
          transition: width 0.3s;
        }

        .nav-links a:hover::after {
          width: 100%;
        }

        .nav-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .theme-toggle {
          background: none;
          border: none;
          color: inherit;
          font-size: 1.2rem;
          cursor: pointer;
          transition: transform 0.3s;
        }

        .theme-toggle:hover {
          transform: rotate(180deg);
        }

        .language-selector {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          color: inherit;
          cursor: pointer;
        }

        .cta-button {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(72, 112, 255, 0.3);
          position: relative;
          overflow: hidden;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.5s, height 0.5s;
        }

        .cta-button:hover::before {
          width: 300px;
          height: 300px;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(72, 112, 255, 0.5);
        }

        main {
          min-height: 100vh;
          padding-top: 80px; /* Compensar el header fijo */
        }

        /* Footer Styles */
        .footer-gradient {
          background: linear-gradient(180deg, transparent 0%, rgba(72, 112, 255, 0.05) 100%);
          border-top: 1px solid rgba(72, 112, 255, 0.2);
          margin-top: 5rem;
          padding: 3rem 0 1rem;
        }

        .footer-content {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .footer-logo h3 {
          margin: 0;
          font-size: 1.5rem;
        }

        .footer-description {
          opacity: 0.8;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .social-links {
          display: flex;
          gap: 0.75rem;
        }

        .footer-section h4 {
          font-size: 1.125rem;
          margin-bottom: 1.5rem;
          color: var(--primary);
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 0.75rem;
        }

        .footer-links a {
          color: inherit;
          text-decoration: none;
          opacity: 0.8;
          transition: all 0.3s;
        }

        .footer-links a:hover {
          opacity: 1;
          color: var(--secondary);
        }

        .newsletter-form {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .newsletter-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 8px;
          color: var(--text-dark);
          outline: none;
          transition: all 0.3s;
        }

        .newsletter-input:focus {
          border-color: var(--secondary);
          box-shadow: 0 0 20px rgba(0, 246, 255, 0.2);
        }

        .newsletter-form .cta-button {
          padding: 0.75rem 1.5rem;
          min-width: auto;
        }

        .footer-bottom {
          border-top: 1px solid rgba(72, 112, 255, 0.1);
          padding-top: 2rem;
        }

        .footer-bottom-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-bottom-content p {
          margin: 0;
          opacity: 0.7;
        }

        .footer-bottom-links {
          display: flex;
          gap: 2rem;
        }

        .footer-bottom-links a {
          color: inherit;
          text-decoration: none;
          opacity: 0.7;
          transition: all 0.3s;
        }

        .footer-bottom-links a:hover {
          opacity: 1;
          color: var(--primary);
        }

        /* AI Activity Monitor */
        .ai-activity {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: rgba(10, 14, 33, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 246, 255, 0.3);
          border-radius: 50px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          z-index: 100;
        }

        .ai-activity:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 246, 255, 0.3);
        }

        .ai-dots {
          display: flex;
          gap: 4px;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: var(--secondary);
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        /* Notification */
        .notification {
          position: fixed;
          bottom: 30px;
          left: 30px;
          background: rgba(10, 14, 33, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transform: translateX(-400px);
          transition: transform 0.3s ease;
          z-index: 1000;
          max-width: 350px;
        }

        .notification.show {
          transform: translateX(0);
        }

        .notification-icon {
          font-size: 1.5rem;
          color: var(--primary);
        }

        .notification-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .notification-message {
          opacity: 0.8;
          font-size: 0.875rem;
        }

        /* Loading Screen */
        .loading-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .loading-content {
          text-align: center;
        }

        .loading-logo {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem;
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          animation: pulse 2s infinite;
        }

        .loading-text {
          font-size: 1.25rem;
          margin-bottom: 2rem;
          opacity: 0.8;
        }

        .loading-progress {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto;
        }

        .loading-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 2px;
          animation: loading 2s ease;
        }

        @media (max-width: 1024px) {
          .footer-content {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 2rem;
          }

          .footer-section:first-child {
            grid-column: 1 / -1;
            text-align: center;
          }

          .footer-logo {
            justify-content: center;
          }

          .social-links {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .nav-controls {
            flex-wrap: wrap;
          }

          .footer-content {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .footer-bottom-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .footer-bottom-links {
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
          }

          .ai-activity {
            bottom: 100px;
            right: 20px;
          }

          .notification {
            left: 20px;
            right: 20px;
            max-width: none;
          }
        }
      `}</style>
    </>
  );
};

export default MainLayout;