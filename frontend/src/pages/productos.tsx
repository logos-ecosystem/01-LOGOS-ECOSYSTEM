import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Productos() {
  const router = useRouter();

  useEffect(() => {
    // Initialize animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate').forEach(element => {
      observer.observe(element);
    });
  }, []);

  const products = [
    {
      id: 1,
      name: 'LOGOS AI Expert Bot Pro',
      description: 'Asistente AI avanzado con capacidades de procesamiento de lenguaje natural y aprendizaje continuo.',
      price: '$99/mes',
      features: [
        'Procesamiento de lenguaje natural avanzado',
        'Integración con más de 100 APIs',
        'Soporte 24/7',
        'Análisis predictivo',
        'Personalización completa'
      ],
      icon: 'fa-robot',
      color: '#4870FF'
    },
    {
      id: 2,
      name: 'LOGOS Analytics Suite',
      description: 'Plataforma completa de análisis de datos con visualizaciones en tiempo real y reportes automatizados.',
      price: '$199/mes',
      features: [
        'Dashboard personalizable',
        'Análisis en tiempo real',
        'Exportación de reportes',
        'Integración con bases de datos',
        'Machine Learning integrado'
      ],
      icon: 'fa-chart-line',
      color: '#00F6FF'
    },
    {
      id: 3,
      name: 'LOGOS Security Shield',
      description: 'Protección de seguridad quantum-resistente con monitoreo continuo y respuesta automatizada.',
      price: '$299/mes',
      features: [
        'Encriptación quantum-resistente',
        'Monitoreo 24/7',
        'Detección de amenazas AI',
        'Respuesta automatizada',
        'Auditorías de seguridad'
      ],
      icon: 'fa-shield-alt',
      color: '#FFD700'
    },
    {
      id: 4,
      name: 'LOGOS Voice Assistant',
      description: 'Asistente de voz inteligente con reconocimiento multiidioma y procesamiento contextual.',
      price: '$79/mes',
      features: [
        'Reconocimiento de voz en 50+ idiomas',
        'Procesamiento contextual',
        'Integración con dispositivos IoT',
        'Comandos personalizados',
        'Síntesis de voz natural'
      ],
      icon: 'fa-microphone',
      color: '#47FF88'
    },
    {
      id: 5,
      name: 'LOGOS Blockchain Platform',
      description: 'Infraestructura blockchain empresarial con smart contracts y trazabilidad completa.',
      price: '$499/mes',
      features: [
        'Smart contracts personalizados',
        'Red privada empresarial',
        'Trazabilidad completa',
        'Integración con sistemas existentes',
        'Consenso optimizado'
      ],
      icon: 'fa-link',
      color: '#FF5757'
    },
    {
      id: 6,
      name: 'LOGOS AR/VR Studio',
      description: 'Plataforma de realidad aumentada y virtual para experiencias inmersivas empresariales.',
      price: '$399/mes',
      features: [
        'Editor visual AR/VR',
        'Biblioteca de assets 3D',
        'Multiplataforma',
        'Analytics de interacción',
        'Colaboración en tiempo real'
      ],
      icon: 'fa-vr-cardboard',
      color: '#B794F4'
    }
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg"></div>
        <div className="particles" id="particles"></div>
        <div className="container">
          <div className="hero-content text-center">
            <h1 className="hero-title scroll-animate">
              Nuestros Productos
            </h1>
            <p className="hero-subtitle scroll-animate">
              Soluciones AI de vanguardia para transformar tu negocio
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="products-section">
        <div className="container">
          <div className="products-grid">
            {products.map((product, index) => (
              <div key={product.id} className="product-card scroll-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="product-header">
                  <div className="product-icon" style={{ background: `linear-gradient(135deg, ${product.color}33 0%, ${product.color}66 100%)` }}>
                    <i className={`fas ${product.icon}`} style={{ color: product.color }}></i>
                  </div>
                  <div className="product-price">{product.price}</div>
                </div>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <ul className="product-features">
                  {product.features.map((feature, idx) => (
                    <li key={idx}>
                      <i className="fas fa-check" style={{ color: product.color }}></i>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="product-actions">
                  <button 
                    className="cta-button full-width"
                    onClick={() => router.push(`/checkout?product=${product.id}`)}
                  >
                    Comenzar Ahora
                  </button>
                  <button className="secondary-button full-width">
                    Más Información
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content text-center">
            <h2 className="cta-title scroll-animate">
              ¿No encuentras lo que buscas?
            </h2>
            <p className="cta-subtitle scroll-animate">
              Contáctanos para crear una solución personalizada para tu empresa
            </p>
            <button 
              className="cta-button"
              onClick={() => router.push('/contacto')}
            >
              Solicitar Demo Personalizada
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        .hero-section {
          padding: 120px 0 80px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(10, 14, 33, 0.9) 0%, rgba(10, 14, 33, 1) 100%);
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.5rem;
          opacity: 0.8;
        }

        .products-section {
          padding: 80px 0;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .product-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
          opacity: 0;
          transform: translateY(20px);
        }

        .product-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .product-card:hover {
          transform: translateY(-5px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .product-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .product-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .product-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .product-description {
          opacity: 0.8;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .product-features {
          list-style: none;
          padding: 0;
          margin: 0 0 2rem 0;
        }

        .product-features li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          opacity: 0.8;
        }

        .product-features i {
          font-size: 0.875rem;
        }

        .product-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .full-width {
          width: 100%;
        }

        .secondary-button {
          padding: 0.875rem 2rem;
          background: transparent;
          color: var(--primary);
          border: 2px solid var(--primary);
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .secondary-button:hover {
          background: rgba(72, 112, 255, 0.1);
          transform: translateY(-2px);
        }

        .cta-section {
          padding: 80px 0;
          background: rgba(72, 112, 255, 0.05);
          border-top: 1px solid rgba(72, 112, 255, 0.2);
        }

        .cta-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .cta-subtitle {
          font-size: 1.25rem;
          opacity: 0.8;
          margin-bottom: 2rem;
        }

        .text-center {
          text-align: center;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .hero-subtitle {
            font-size: 1.2rem;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .product-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}