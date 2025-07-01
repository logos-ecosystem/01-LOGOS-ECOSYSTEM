import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';

const validationSchema = yup.object({
  name: yup.string().required('El nombre es requerido'),
  email: yup.string().email('Email inválido').required('El email es requerido'),
  company: yup.string(),
  phone: yup.string(),
  subject: yup.string().required('El asunto es requerido'),
  message: yup.string().required('El mensaje es requerido').min(10, 'El mensaje debe tener al menos 10 caracteres'),
});

export default function Contacto() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

    // Create particles
    createParticles();
  }, []);

  const createParticles = () => {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      particlesContainer.appendChild(particle);
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      company: '',
      phone: '',
      subject: '',
      message: '',
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsSubmitting(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccess(true);
        resetForm();
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      }, 2000);
    },
  });

  const contactInfo = [
    {
      icon: 'fa-map-marker-alt',
      title: 'Dirección',
      content: 'Torre Tecnológica, Piso 15\nAv. Innovación 1234\nCiudad Tech, CP 12345'
    },
    {
      icon: 'fa-phone',
      title: 'Teléfono',
      content: '+1 (555) 123-4567\n+1 (555) 987-6543'
    },
    {
      icon: 'fa-envelope',
      title: 'Email',
      content: 'info@logos-ecosystem.com\nsupport@logos-ecosystem.com'
    },
    {
      icon: 'fa-clock',
      title: 'Horario',
      content: 'Lunes - Viernes: 9:00 - 18:00\nSoporte 24/7 disponible'
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
              Contáctanos
            </h1>
            <p className="hero-subtitle scroll-animate">
              Estamos aquí para ayudarte a transformar tu negocio con AI
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Form */}
            <div className="contact-form-wrapper scroll-animate">
              <h2 className="form-title">Envíanos un Mensaje</h2>
              <p className="form-subtitle">
                Completa el formulario y nos pondremos en contacto contigo en menos de 24 horas
              </p>
              
              {showSuccess && (
                <div className="success-message">
                  <i className="fas fa-check-circle"></i>
                  ¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.
                </div>
              )}
              
              <form onSubmit={formik.handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Nombre Completo *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Tu nombre"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`form-input ${formik.touched.name && formik.errors.name ? 'error' : ''}`}
                    />
                    {formik.touched.name && formik.errors.name && (
                      <div className="error-message">{formik.errors.name}</div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`form-input ${formik.touched.email && formik.errors.email ? 'error' : ''}`}
                    />
                    {formik.touched.email && formik.errors.email && (
                      <div className="error-message">{formik.errors.email}</div>
                    )}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="company">Empresa</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Tu empresa"
                      value={formik.values.company}
                      onChange={formik.handleChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Teléfono</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Asunto *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formik.values.subject}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`form-input ${formik.touched.subject && formik.errors.subject ? 'error' : ''}`}
                  >
                    <option value="">Selecciona un asunto</option>
                    <option value="demo">Solicitar Demo</option>
                    <option value="pricing">Información de Precios</option>
                    <option value="support">Soporte Técnico</option>
                    <option value="partnership">Alianzas Comerciales</option>
                    <option value="other">Otro</option>
                  </select>
                  {formik.touched.subject && formik.errors.subject && (
                    <div className="error-message">{formik.errors.subject}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Mensaje *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Cuéntanos cómo podemos ayudarte..."
                    value={formik.values.message}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`form-input ${formik.touched.message && formik.errors.message ? 'error' : ''}`}
                  />
                  {formik.touched.message && formik.errors.message && (
                    <div className="error-message">{formik.errors.message}</div>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="cta-button full-width"
                  disabled={isSubmitting || !formik.isValid}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Mensaje
                      <i className="fas fa-paper-plane"></i>
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Contact Info */}
            <div className="contact-info-wrapper">
              <div className="info-cards">
                {contactInfo.map((info, index) => (
                  <div key={index} className="info-card scroll-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="info-icon">
                      <i className={`fas ${info.icon}`}></i>
                    </div>
                    <div className="info-content">
                      <h3>{info.title}</h3>
                      <p>{info.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Links */}
              <div className="quick-links scroll-animate">
                <h3>Enlaces Rápidos</h3>
                <div className="links-grid">
                  <a href="/docs" className="quick-link">
                    <i className="fas fa-book"></i>
                    Documentación
                  </a>
                  <a href="/faq" className="quick-link">
                    <i className="fas fa-question-circle"></i>
                    FAQ
                  </a>
                  <a href="/status" className="quick-link">
                    <i className="fas fa-server"></i>
                    Estado del Sistema
                  </a>
                  <a href="/blog" className="quick-link">
                    <i className="fas fa-blog"></i>
                    Blog
                  </a>
                </div>
              </div>
              
              {/* Social Media */}
              <div className="social-section scroll-animate">
                <h3>Síguenos</h3>
                <div className="social-links">
                  <a href="#" className="social-link">
                    <i className="fab fa-linkedin"></i>
                  </a>
                  <a href="#" className="social-link">
                    <i className="fab fa-twitter"></i>
                  </a>
                  <a href="#" className="social-link">
                    <i className="fab fa-facebook"></i>
                  </a>
                  <a href="#" className="social-link">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="#" className="social-link">
                    <i className="fab fa-youtube"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section">
        <div className="map-container">
          <div className="map-overlay">
            <h3>Encuéntranos</h3>
            <p>Torre Tecnológica, Ciudad Tech</p>
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

        .contact-section {
          padding: 80px 0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
        }

        .contact-form-wrapper {
          opacity: 0;
          transform: translateX(-20px);
        }

        .contact-form-wrapper.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .form-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .form-subtitle {
          opacity: 0.8;
          margin-bottom: 2rem;
        }

        .success-message {
          background: rgba(71, 255, 136, 0.1);
          border: 1px solid rgba(71, 255, 136, 0.3);
          color: #47FF88;
          padding: 1rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          animation: slideIn 0.3s ease;
        }

        .contact-form {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.7;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: var(--text-dark);
          font-size: 1rem;
          transition: all 0.3s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 20px rgba(72, 112, 255, 0.15);
        }

        .form-input.error {
          border-color: #FF5757;
        }

        textarea.form-input {
          resize: vertical;
          min-height: 120px;
        }

        .error-message {
          font-size: 0.875rem;
          color: #FF5757;
          margin-top: 0.25rem;
        }

        .full-width {
          width: 100%;
        }

        .info-cards {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          transition: all 0.3s;
          opacity: 0;
          transform: translateX(20px);
        }

        .info-card.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .info-card:hover {
          transform: translateX(-5px);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .info-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: white;
          flex-shrink: 0;
        }

        .info-content h3 {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }

        .info-content p {
          opacity: 0.8;
          white-space: pre-line;
          line-height: 1.6;
        }

        .quick-links {
          margin-top: 2rem;
          opacity: 0;
          transform: translateY(20px);
        }

        .quick-links.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .quick-links h3 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .links-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .quick-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: inherit;
          text-decoration: none;
          transition: all 0.3s;
        }

        .quick-link:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .quick-link i {
          color: var(--primary);
        }

        .social-section {
          margin-top: 2rem;
          opacity: 0;
          transform: translateY(20px);
        }

        .social-section.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .social-section h3 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .social-links {
          display: flex;
          gap: 1rem;
        }

        .social-link {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dark);
          font-size: 1.25rem;
          transition: all 0.3s;
        }

        .social-link:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          transform: translateY(-2px);
        }

        .map-section {
          height: 400px;
          position: relative;
          overflow: hidden;
        }

        .map-container {
          width: 100%;
          height: 100%;
          background: rgba(72, 112, 255, 0.05);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-overlay {
          background: rgba(10, 14, 33, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 20px;
          padding: 2rem 3rem;
          text-align: center;
        }

        .map-overlay h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .map-overlay p {
          opacity: 0.8;
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

          .contact-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .links-grid {
            grid-template-columns: 1fr;
          }

          .contact-form {
            padding: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}