import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Servicios() {
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

  const services = [
    {
      id: 1,
      title: 'Consultoría AI',
      description: 'Asesoramiento experto para implementar soluciones de inteligencia artificial en tu empresa.',
      icon: 'fa-brain',
      features: [
        'Análisis de necesidades',
        'Diseño de arquitectura AI',
        'Roadmap de implementación',
        'Capacitación del equipo'
      ]
    },
    {
      id: 2,
      title: 'Desarrollo Personalizado',
      description: 'Creamos soluciones AI a medida para resolver tus desafíos empresariales específicos.',
      icon: 'fa-code',
      features: [
        'Desarrollo de modelos ML',
        'APIs personalizadas',
        'Integración con sistemas',
        'Mantenimiento continuo'
      ]
    },
    {
      id: 3,
      title: 'Soporte Técnico 24/7',
      description: 'Equipo especializado disponible las 24 horas para asegurar el funcionamiento óptimo.',
      icon: 'fa-headset',
      features: [
        'Soporte multicanal',
        'SLA garantizado',
        'Monitoreo proactivo',
        'Actualizaciones regulares'
      ]
    },
    {
      id: 4,
      title: 'Capacitación y Formación',
      description: 'Programas de formación para que tu equipo aproveche al máximo las herramientas AI.',
      icon: 'fa-graduation-cap',
      features: [
        'Cursos personalizados',
        'Certificación oficial',
        'Material didáctico',
        'Workshops prácticos'
      ]
    },
    {
      id: 5,
      title: 'Migración de Datos',
      description: 'Servicios profesionales de migración y optimización de bases de datos para AI.',
      icon: 'fa-database',
      features: [
        'Análisis de datos',
        'Limpieza y preparación',
        'Migración segura',
        'Optimización de rendimiento'
      ]
    },
    {
      id: 6,
      title: 'Auditoría de Seguridad',
      description: 'Evaluación completa de seguridad con enfoque en protección quantum-resistente.',
      icon: 'fa-shield-virus',
      features: [
        'Pentesting especializado',
        'Análisis de vulnerabilidades',
        'Recomendaciones detalladas',
        'Implementación de mejoras'
      ]
    }
  ];

  const process = [
    {
      step: 1,
      title: 'Consulta Inicial',
      description: 'Analizamos tus necesidades y objetivos empresariales'
    },
    {
      step: 2,
      title: 'Propuesta Personalizada',
      description: 'Diseñamos una solución específica para tu empresa'
    },
    {
      step: 3,
      title: 'Implementación',
      description: 'Desarrollamos e integramos la solución en tu infraestructura'
    },
    {
      step: 4,
      title: 'Soporte Continuo',
      description: 'Mantenimiento y optimización constante de la solución'
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
              Servicios Profesionales
            </h1>
            <p className="hero-subtitle scroll-animate">
              Transformamos tu negocio con soluciones AI de clase mundial
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="services-section">
        <div className="container">
          <h2 className="section-title text-center scroll-animate">
            Nuestros Servicios
          </h2>
          <p className="section-subtitle text-center scroll-animate">
            Soluciones integrales para cada etapa de tu transformación digital
          </p>
          
          <div className="services-grid">
            {services.map((service, index) => (
              <div key={service.id} className="service-card scroll-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="service-icon">
                  <i className={`fas ${service.icon}`}></i>
                </div>
                <h3 className="service-title">{service.title}</h3>
                <p className="service-description">{service.description}</p>
                <ul className="service-features">
                  {service.features.map((feature, idx) => (
                    <li key={idx}>
                      <i className="fas fa-check-circle"></i>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="learn-more-btn">
                  Saber más <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="process-section">
        <div className="container">
          <h2 className="section-title text-center scroll-animate">
            Nuestro Proceso
          </h2>
          <p className="section-subtitle text-center scroll-animate">
            Un enfoque probado para el éxito de tu proyecto
          </p>
          
          <div className="process-timeline">
            {process.map((item, index) => (
              <div key={item.step} className="process-step scroll-animate" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="step-number">{item.step}</div>
                <div className="step-content">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
                {index < process.length - 1 && <div className="step-connector"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item scroll-animate">
              <div className="stat-number">500+</div>
              <div className="stat-label">Proyectos Completados</div>
            </div>
            <div className="stat-item scroll-animate">
              <div className="stat-number">98%</div>
              <div className="stat-label">Satisfacción del Cliente</div>
            </div>
            <div className="stat-item scroll-animate">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Soporte Disponible</div>
            </div>
            <div className="stat-item scroll-animate">
              <div className="stat-number">150+</div>
              <div className="stat-label">Expertos en el Equipo</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content text-center">
            <h2 className="cta-title scroll-animate">
              ¿Listo para transformar tu empresa?
            </h2>
            <p className="cta-subtitle scroll-animate">
              Agenda una consulta gratuita con nuestros expertos
            </p>
            <div className="cta-buttons">
              <button 
                className="cta-button"
                onClick={() => router.push('/contacto')}
              >
                Agendar Consulta
              </button>
              <button className="secondary-button">
                Descargar Brochure
              </button>
            </div>
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

        .services-section {
          padding: 80px 0;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1.25rem;
          opacity: 0.8;
          margin-bottom: 3rem;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .service-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
          opacity: 0;
          transform: translateY(20px);
          text-align: center;
        }

        .service-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .service-card:hover {
          transform: translateY(-5px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .service-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
        }

        .service-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .service-description {
          opacity: 0.8;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .service-features {
          list-style: none;
          padding: 0;
          margin: 0 0 2rem 0;
          text-align: left;
        }

        .service-features li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          opacity: 0.8;
        }

        .service-features i {
          color: var(--secondary);
          font-size: 0.875rem;
        }

        .learn-more-btn {
          background: transparent;
          color: var(--primary);
          border: none;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s;
        }

        .learn-more-btn:hover {
          color: var(--secondary);
          gap: 0.75rem;
        }

        .process-section {
          padding: 80px 0;
          background: rgba(72, 112, 255, 0.03);
        }

        .process-timeline {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }

        .process-step {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 3rem;
          position: relative;
          opacity: 0;
          transform: translateX(-20px);
        }

        .process-step.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .step-number {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .step-content h4 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step-content p {
          opacity: 0.8;
        }

        .step-connector {
          position: absolute;
          left: 30px;
          top: 60px;
          width: 2px;
          height: 3rem;
          background: linear-gradient(180deg, var(--primary) 0%, transparent 100%);
        }

        .stats-section {
          padding: 80px 0;
          background: rgba(0, 246, 255, 0.03);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          text-align: center;
        }

        .stat-item {
          opacity: 0;
          transform: translateY(20px);
        }

        .stat-item.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .stat-number {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stat-label {
          font-size: 1.125rem;
          opacity: 0.8;
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

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
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

          .services-grid {
            grid-template-columns: 1fr;
          }

          .process-step {
            flex-direction: column;
            text-align: center;
          }

          .step-connector {
            left: 50%;
            transform: translateX(-50%);
          }

          .cta-buttons {
            flex-direction: column;
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
          }

          .cta-buttons button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}