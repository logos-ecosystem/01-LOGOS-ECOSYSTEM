import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Empresa() {
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

  const values = [
    {
      icon: 'fa-rocket',
      title: 'Innovación',
      description: 'Impulsamos el progreso tecnológico con soluciones AI de vanguardia'
    },
    {
      icon: 'fa-shield-alt',
      title: 'Seguridad',
      description: 'Protección quantum-resistente para garantizar la integridad de los datos'
    },
    {
      icon: 'fa-users',
      title: 'Colaboración',
      description: 'Trabajamos junto a nuestros clientes para alcanzar objetivos comunes'
    },
    {
      icon: 'fa-star',
      title: 'Excelencia',
      description: 'Comprometidos con la calidad y el servicio excepcional'
    }
  ];

  const milestones = [
    {
      year: '2020',
      title: 'Fundación',
      description: 'LOGOS ECOSYSTEM nace con la visión de democratizar la IA'
    },
    {
      year: '2021',
      title: 'Primera Versión',
      description: 'Lanzamiento de nuestra plataforma AI con 50+ agentes inteligentes'
    },
    {
      year: '2022',
      title: 'Expansión Global',
      description: 'Presencia en 25 países y más de 10,000 usuarios activos'
    },
    {
      year: '2023',
      title: 'Innovación Quantum',
      description: 'Implementación de seguridad quantum-resistente'
    },
    {
      year: '2024',
      title: 'Liderazgo AI',
      description: '150+ agentes AI y reconocimiento como líder del sector'
    }
  ];

  const team = [
    {
      name: 'Dr. Elena Rodriguez',
      role: 'CEO & Co-Fundadora',
      image: '/team/ceo.jpg',
      bio: 'PhD en Inteligencia Artificial con 15 años de experiencia'
    },
    {
      name: 'Carlos Mendoza',
      role: 'CTO',
      image: '/team/cto.jpg',
      bio: 'Experto en arquitectura de sistemas y seguridad quantum'
    },
    {
      name: 'Ana García',
      role: 'Head of AI Research',
      image: '/team/research.jpg',
      bio: 'Investigadora líder en machine learning y redes neuronales'
    },
    {
      name: 'Miguel Torres',
      role: 'VP of Engineering',
      image: '/team/engineering.jpg',
      bio: 'Ingeniero senior con experiencia en sistemas distribuidos'
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
              Sobre LOGOS ECOSYSTEM
            </h1>
            <p className="hero-subtitle scroll-animate">
              Liderando la revolución de la inteligencia artificial empresarial
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-grid">
            <div className="mission-content scroll-animate">
              <h2 className="section-title">Nuestra Misión</h2>
              <p className="lead-text">
                Democratizar el acceso a la inteligencia artificial avanzada, 
                proporcionando herramientas poderosas y seguras que permitan a 
                las empresas de todos los tamaños transformar sus operaciones 
                y alcanzar su máximo potencial.
              </p>
              <div className="mission-stats">
                <div className="stat">
                  <div className="stat-number">2.5M+</div>
                  <div className="stat-label">Usuarios Activos</div>
                </div>
                <div className="stat">
                  <div className="stat-number">150+</div>
                  <div className="stat-label">Agentes AI</div>
                </div>
                <div className="stat">
                  <div className="stat-number">99.9%</div>
                  <div className="stat-label">Uptime</div>
                </div>
              </div>
            </div>
            <div className="mission-visual scroll-animate">
              <div className="visual-element">
                <i className="fas fa-brain"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <h2 className="section-title text-center scroll-animate">
            Nuestros Valores
          </h2>
          <p className="section-subtitle text-center scroll-animate">
            Los principios que guían cada decisión que tomamos
          </p>
          
          <div className="values-grid">
            {values.map((value, index) => (
              <div key={index} className="value-card scroll-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="value-icon">
                  <i className={`fas ${value.icon}`}></i>
                </div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="timeline-section">
        <div className="container">
          <h2 className="section-title text-center scroll-animate">
            Nuestra Historia
          </h2>
          <p className="section-subtitle text-center scroll-animate">
            Un viaje de innovación continua
          </p>
          
          <div className="timeline">
            {milestones.map((milestone, index) => (
              <div key={index} className="timeline-item scroll-animate" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="timeline-marker">
                  <div className="marker-dot"></div>
                </div>
                <div className="timeline-content">
                  <div className="timeline-year">{milestone.year}</div>
                  <h4>{milestone.title}</h4>
                  <p>{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <h2 className="section-title text-center scroll-animate">
            Nuestro Equipo
          </h2>
          <p className="section-subtitle text-center scroll-animate">
            Expertos apasionados por la innovación
          </p>
          
          <div className="team-grid">
            {team.map((member, index) => (
              <div key={index} className="team-card scroll-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="member-photo">
                  <i className="fas fa-user-circle"></i>
                </div>
                <h3>{member.name}</h3>
                <div className="member-role">{member.role}</div>
                <p className="member-bio">{member.bio}</p>
                <div className="member-social">
                  <a href="#" className="social-link"><i className="fab fa-linkedin"></i></a>
                  <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="partners-section">
        <div className="container">
          <h2 className="section-title text-center scroll-animate">
            Confían en Nosotros
          </h2>
          <div className="partners-grid scroll-animate">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="partner-logo">
                <i className="fas fa-building"></i>
                <span>Partner {i}</span>
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
              Únete a la Revolución AI
            </h2>
            <p className="cta-subtitle scroll-animate">
              Descubre cómo LOGOS ECOSYSTEM puede transformar tu empresa
            </p>
            <div className="cta-buttons">
              <button 
                className="cta-button"
                onClick={() => router.push('/contacto')}
              >
                Contáctanos
              </button>
              <button 
                className="secondary-button"
                onClick={() => router.push('/productos')}
              >
                Ver Productos
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

        .mission-section {
          padding: 80px 0;
        }

        .mission-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }

        .lead-text {
          font-size: 1.25rem;
          line-height: 1.8;
          opacity: 0.9;
          margin-bottom: 2rem;
        }

        .mission-stats {
          display: flex;
          gap: 2rem;
        }

        .stat {
          text-align: center;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.7;
          text-transform: uppercase;
        }

        .mission-visual {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .visual-element {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, rgba(72, 112, 255, 0.1) 0%, rgba(0, 246, 255, 0.1) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8rem;
          color: var(--primary);
          animation: float 3s ease-in-out infinite;
        }

        .values-section {
          padding: 80px 0;
          background: rgba(72, 112, 255, 0.03);
        }

        .section-subtitle {
          font-size: 1.25rem;
          opacity: 0.8;
          margin-bottom: 3rem;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .value-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s;
          opacity: 0;
          transform: translateY(20px);
        }

        .value-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .value-card:hover {
          transform: translateY(-5px);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .value-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
        }

        .value-card h3 {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .timeline-section {
          padding: 80px 0;
        }

        .timeline {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 100%;
          background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%);
        }

        .timeline-item {
          position: relative;
          padding: 2rem 0;
          opacity: 0;
          transform: translateX(-20px);
        }

        .timeline-item.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .timeline-item:nth-child(even) .timeline-content {
          margin-left: auto;
          text-align: right;
        }

        .timeline-marker {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          background: var(--bg-dark);
          border: 3px solid var(--primary);
          border-radius: 50%;
          z-index: 1;
        }

        .timeline-content {
          width: 45%;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .timeline-year {
          font-size: 2rem;
          font-weight: 800;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .timeline-content h4 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .timeline-content p {
          opacity: 0.8;
        }

        .team-section {
          padding: 80px 0;
          background: rgba(0, 246, 255, 0.03);
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .team-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s;
          opacity: 0;
          transform: translateY(20px);
        }

        .team-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .team-card:hover {
          transform: translateY(-5px);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .member-photo {
          width: 120px;
          height: 120px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          color: white;
        }

        .team-card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .member-role {
          color: var(--primary);
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .member-bio {
          opacity: 0.8;
          margin-bottom: 1.5rem;
        }

        .member-social {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .social-link {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dark);
          transition: all 0.3s;
        }

        .social-link:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          transform: translateY(-2px);
        }

        .partners-section {
          padding: 80px 0;
        }

        .partners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
          opacity: 0;
          transform: translateY(20px);
        }

        .partners-grid.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .partner-logo {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s;
        }

        .partner-logo:hover {
          transform: translateY(-5px);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .partner-logo i {
          font-size: 2rem;
          color: var(--primary);
        }

        .partner-logo span {
          font-size: 0.875rem;
          opacity: 0.7;
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

          .mission-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .mission-stats {
            justify-content: center;
          }

          .timeline::before {
            left: 20px;
          }

          .timeline-marker {
            left: 20px;
          }

          .timeline-content {
            width: calc(100% - 60px);
            margin-left: 60px !important;
            text-align: left !important;
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