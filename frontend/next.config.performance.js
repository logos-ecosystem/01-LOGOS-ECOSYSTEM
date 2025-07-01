/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Production optimizations
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  
  // React optimizations
  reactStrictMode: true,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: {
    domains: [
      'logos-ecosystem.com',
      'cdn.logos-ecosystem.com',
      'images.unsplash.com',
      'avatars.githubusercontent.com',
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        concatenateModules: true,
        
        // Split chunks optimization
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            
            // Vendor splitting
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier());
              },
              name(module) {
                const hash = require('crypto').createHash('sha1');
                hash.update(module.identifier());
                return hash.digest('hex').substring(0, 8);
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 20,
            },
            
            shared: {
              name(module, chunks) {
                return require('crypto')
                  .createHash('sha1')
                  .update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
                  .digest('hex') + (isServer ? '-server' : '');
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
          
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
        },
      };

      // Replace React with Preact in production
      if (process.env.PREACT === 'true') {
        Object.assign(config.resolve.alias, {
          'react': 'preact/compat',
          'react-dom/test-utils': 'preact/test-utils',
          'react-dom': 'preact/compat',
        });
      }
    }

    // Module federation for micro-frontends
    if (process.env.MODULE_FEDERATION === 'true') {
      const { ModuleFederationPlugin } = require('webpack').container;
      
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'logos_ecosystem',
          filename: 'remoteEntry.js',
          remotes: {},
          exposes: {
            './Header': './src/components/Layout/Header',
            './Footer': './src/components/Layout/Footer',
            './Dashboard': './src/pages/dashboard',
          },
          shared: {
            react: { singleton: true, requiredVersion: false },
            'react-dom': { singleton: true, requiredVersion: false },
          },
        })
      );
    }

    return config;
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Rewrites for API proxy
  async rewrites() {
    return {
      beforeFiles: [
        // Static assets from CDN
        {
          source: '/cdn/:path*',
          destination: 'https://cdn.logos-ecosystem.com/:path*',
        },
      ],
      afterFiles: [
        // API proxy
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
        },
      ],
    };
  },

  // Experimental features for performance
  experimental: {
    // Enable React Server Components
    serverComponents: true,
    
    // Optimize CSS
    optimizeCss: true,
    
    // Modern JS for modern browsers
    legacyBrowsers: false,
    
    // Optimize package imports
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lodash',
      'date-fns',
    ],
  },

  // Output configuration
  output: 'standalone',
  
  // PoweredByHeader
  poweredByHeader: false,

  // Generate build ID based on git commit
  generateBuildId: async () => {
    if (process.env.BUILD_ID) {
      return process.env.BUILD_ID;
    }
    // Use git commit hash as build ID
    return require('child_process')
      .execSync('git rev-parse HEAD')
      .toString()
      .trim();
  },

  // Environment variables to expose
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID || 'development',
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

// Performance monitoring integration
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const { withSentryConfig } = require('@sentry/nextjs');
  
  module.exports = withSentryConfig(
    withBundleAnalyzer(nextConfig),
    {
      silent: true,
      org: 'logos-ecosystem',
      project: 'frontend',
    },
    {
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
    }
  );
} else {
  module.exports = withBundleAnalyzer(nextConfig);
}