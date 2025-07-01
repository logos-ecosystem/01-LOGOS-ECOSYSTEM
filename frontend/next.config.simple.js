/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Permitir conexiones desde cualquier host
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },

  // Configuración del servidor
  serverRuntimeConfig: {
    host: '0.0.0.0',
    port: 3000,
  },

  // Deshabilitar optimizaciones problemáticas temporalmente
  experimental: {
    optimizeCss: false,
    scrollRestoration: false,
  },
};

module.exports = nextConfig;