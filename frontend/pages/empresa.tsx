import React from 'react';

export default function Empresa() {
  return (
    <div style={{ padding: '120px 20px 80px', minHeight: '100vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Sobre LOGOS ECOSYSTEM</h1>
      <p style={{ fontSize: '1.5rem', opacity: 0.8, marginBottom: '2rem' }}>Liderando la revolución de la IA empresarial</p>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', lineHeight: 1.8 }}>
        <h2>Nuestra Misión</h2>
        <p>Democratizar el acceso a la inteligencia artificial avanzada, proporcionando herramientas poderosas y seguras.</p>
        <h2>Valores</h2>
        <ul>
          <li>Innovación constante</li>
          <li>Seguridad quantum-resistente</li>
          <li>Colaboración global</li>
          <li>Excelencia en el servicio</li>
        </ul>
      </div>
    </div>
  );
}