/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone', // Commented out for Vercel deployment
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['react-syntax-highlighter'],
  swcMinify: true,
  productionBrowserSourceMaps: false,
  optimizeFonts: true,
  
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // API proxy configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/:path*',
      },
    ]
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ],
      },
    ]
  },
  
  // Image optimization
  images: {
    domains: [
      'localhost',
      'logos-ecosystem.com',
      'api.logos-ecosystem.com',
      'uploads.logos-ecosystem.com',
      'logos-ecosystem.com',
      'api.logos-ecosystem.com',
      'storage.googleapis.com',
      's3.amazonaws.com',
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'LOGOS AI Ecosystem',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_APP_DESCRIPTION: 'AI-Native Ecosystem Platform',
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })
    
    // Ensure CSS is properly loaded in production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          styles: {
            name: 'styles',
            test: /\.(css|scss)$/,
            chunks: 'all',
            enforce: true,
            priority: 10,
          },
        },
      };
    }
    
    return config
  },
}

module.exports = {
  ...nextConfig,
  // Performance optimizations
  experimental: {
    workerThreads: false,
    cpus: 1,
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Bundle analyzer (run with ANALYZE=true npm run build)
  ...(process.env.ANALYZE === 'true' && {
    webpack(config, { isServer }) {
      if (!isServer) {
        try {
          const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              reportFilename: './analyze.html',
              openAnalyzer: true,
            })
          );
        } catch (e) {
          console.warn('webpack-bundle-analyzer not found. Skipping bundle analysis.');
        }
      }
      return config;
    },
  }),
  
  // Ensure CSS is properly handled
  compiler: {
    emotion: true,
  },
}