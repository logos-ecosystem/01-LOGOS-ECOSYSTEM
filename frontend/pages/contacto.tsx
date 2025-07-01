import React, { useState } from 'react';

export default function Contacto() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Mensaje enviado! Nos pondremos en contacto pronto.');
  };

  return (
    <div style={{ padding: '120px 20px 80px', minHeight: '100vh', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>Contáctanos</h1>
      <p style={{ fontSize: '1.5rem', opacity: 0.8, marginBottom: '2rem', textAlign: 'center' }}>Estamos aquí para ayudarte</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Nombre"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
          style={{
            padding: '0.875rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(72, 112, 255, 0.2)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem'
          }}
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
          style={{
            padding: '0.875rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(72, 112, 255, 0.2)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem'
          }}
        />
        <textarea
          placeholder="Mensaje"
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
          required
          rows={5}
          style={{
            padding: '0.875rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(72, 112, 255, 0.2)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem',
            resize: 'vertical'
          }}
        />
        <button
          type="submit"
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
          Enviar Mensaje
        </button>
      </form>
      
      <div style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.8 }}>
        <p>Email: info@logos-ecosystem.com</p>
        <p>Teléfono: +1 (555) 123-4567</p>
      </div>
    </div>
  );
}