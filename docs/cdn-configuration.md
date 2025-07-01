# CDN Configuration Guide

## Overview

This guide covers CDN (Content Delivery Network) setup for optimal performance and global content delivery for the LOGOS AI Ecosystem.

## Recommended CDN: CloudFlare

### Why CloudFlare?
- Global network with 300+ PoPs
- Free SSL certificates
- DDoS protection included
- Web Application Firewall (WAF)
- Image optimization
- Automatic minification
- HTTP/3 support
- Edge workers for serverless functions

## Setup Instructions

### 1. CloudFlare Account Setup

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain (logos-ecosystem.com)
3. Update nameservers at your registrar
4. Wait for DNS propagation (5-30 minutes)

### 2. DNS Configuration

```
# Production DNS Records
Type  Name    Content                   Proxy   TTL
A     @       YOUR_FRONTEND_IP         ✓       Auto
A     api     YOUR_BACKEND_IP          ✓       Auto
CNAME www     @                        ✓       Auto
CNAME cdn     logos-ecosystem.com.cdn.cloudflare.net ✓    Auto

# Development/Staging
A     dev     YOUR_DEV_IP              ✓       Auto
A     staging YOUR_STAGING_IP          ✓       Auto
```

### 3. SSL/TLS Configuration

1. **SSL/TLS Mode**: Full (strict)
2. **Edge Certificates**: Automatic HTTPS Rewrites ON
3. **Always Use HTTPS**: ON
4. **HSTS**: Enable with max-age=31536000
5. **Minimum TLS Version**: 1.2
6. **TLS 1.3**: ON

### 4. Caching Rules

#### Page Rules Configuration

1. **API Bypass Rule**
```
URL: api.logos-ecosystem.com/*
Settings:
- Cache Level: Bypass
- Security Level: High
- Performance: Disable
```

2. **Static Assets Rule**
```
URL: *.logos-ecosystem.com/_next/static/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 year
- Browser Cache TTL: 1 year
```

3. **Images Rule**
```
URL: *.logos-ecosystem.com/*.{jpg,jpeg,png,gif,svg,webp,avif}
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Polish: Lossy
- WebP: On
- Mirage: On (mobile optimization)
```

4. **Font Files Rule**
```
URL: *.logos-ecosystem.com/*.{woff,woff2,ttf,otf}
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 year
- Browser Cache TTL: 1 year
```

### 5. Performance Settings

#### Speed Optimization
- **Auto Minify**: JavaScript, CSS, HTML
- **Brotli Compression**: ON
- **Rocket Loader**: ON (test first)
- **HTTP/2**: ON
- **HTTP/3 (QUIC)**: ON
- **0-RTT Connection Resumption**: ON

#### Polish & Mirage
- **Polish**: Lossy (WebP conversion)
- **Mirage**: ON (mobile image optimization)
- **Resize Images**: Configure for responsive images

### 6. Security Configuration

#### Firewall Rules
```javascript
// Block countries (if needed)
(ip.geoip.country in {"XX" "YY"})
Action: Block

// Rate limiting for API
(http.request.uri.path contains "/api/" and rate(5m) > 1000)
Action: Challenge

// Block bad bots
(cf.client.bot) 
Action: Challenge

// Protect admin routes
(http.request.uri.path contains "/admin" and not ip.src in $office_ips)
Action: Challenge
```

#### WAF Settings
- **OWASP Core Ruleset**: ON
- **Cloudflare Managed Ruleset**: ON
- **Sensitivity**: High
- **Challenge Passage**: 30 minutes

### 7. Cache Headers Configuration

Add to your Next.js app:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}
```

### 8. CloudFlare Workers (Edge Functions)

#### A/B Testing Worker
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // A/B test for homepage
  if (url.pathname === '/') {
    const cookie = request.headers.get('Cookie')
    const variant = cookie?.includes('variant=B') ? 'B' : 'A'
    
    if (!cookie?.includes('variant=')) {
      const random = Math.random()
      const selectedVariant = random < 0.5 ? 'A' : 'B'
      
      const response = await fetch(request)
      response.headers.append('Set-Cookie', `variant=${selectedVariant}; path=/`)
      return response
    }
  }
  
  return fetch(request)
}
```

#### Geolocation Redirect
```javascript
async function handleRequest(request) {
  const country = request.cf.country
  const url = new URL(request.url)
  
  // Redirect based on country
  const redirects = {
    'ES': 'https://es.logos-ecosystem.com',
    'FR': 'https://fr.logos-ecosystem.com',
    'DE': 'https://de.logos-ecosystem.com',
  }
  
  if (redirects[country] && url.hostname === 'logos-ecosystem.com') {
    return Response.redirect(redirects[country], 302)
  }
  
  return fetch(request)
}
```

### 9. Analytics & Monitoring

#### CloudFlare Analytics
- Enable Web Analytics
- Set up custom dashboards
- Configure alerts for:
  - Traffic spikes
  - Error rates > 1%
  - Origin response time > 2s
  - Cache hit ratio < 80%

#### Real User Monitoring (RUM)
```html
<!-- Add to _document.tsx -->
<script src="/cdn-cgi/zaraz/s.js?z=JTdCJTIyZXhlY3V0ZWQlMjIlM0ElNUIlNUQlN0Q=" defer></script>
```

### 10. Cache Purging Strategy

#### API Endpoints for Cache Purge
```javascript
// Purge specific URLs
const purgeUrls = async (urls) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );
  return response.json();
};

// Purge by tag
const purgeTags = async (tags) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags }),
    }
  );
  return response.json();
};
```

### 11. Image Optimization

#### CloudFlare Images
```javascript
// Upload to CloudFlare Images
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_IMAGES_TOKEN}`,
      },
      body: formData,
    }
  );
  
  return response.json();
};

// Serve optimized images
// https://imagedelivery.net/{account_hash}/{image_id}/{variant_name}
```

#### Image Variants
```json
{
  "thumbnail": {
    "width": 150,
    "height": 150,
    "fit": "cover"
  },
  "preview": {
    "width": 400,
    "height": 300,
    "fit": "contain"
  },
  "full": {
    "width": 1920,
    "height": 1080,
    "fit": "scale-down",
    "quality": 85
  }
}
```

### 12. Performance Monitoring

#### Key Metrics to Track
- **Cache Hit Ratio**: Target > 85%
- **Origin Response Time**: Target < 200ms
- **Edge Response Time**: Target < 50ms
- **Bandwidth Saved**: Monitor monthly
- **Requests Served**: Track patterns

#### CloudFlare Analytics API
```javascript
const getAnalytics = async () => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/analytics/dashboard`,
    {
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
      },
    }
  );
  
  const data = await response.json();
  return {
    requests: data.result.totals.requests.all,
    bandwidth: data.result.totals.bandwidth.all,
    threats: data.result.totals.threats.all,
    cacheHitRatio: data.result.totals.requests.cached / data.result.totals.requests.all,
  };
};
```

## Alternative CDN Options

### 1. AWS CloudFront
- Tight integration with AWS services
- Lambda@Edge for serverless
- Real-time logs
- More expensive than CloudFlare

### 2. Fastly
- Real-time purging
- Advanced VCL configuration
- Better for video streaming
- Enterprise-focused

### 3. Akamai
- Largest network
- Enterprise features
- Advanced security
- Highest cost

## CDN Checklist

### Initial Setup
- [ ] Domain added to CloudFlare
- [ ] DNS records configured
- [ ] SSL certificate active
- [ ] Page rules created
- [ ] Firewall rules configured
- [ ] Cache headers optimized

### Performance
- [ ] Minification enabled
- [ ] Brotli compression active
- [ ] HTTP/3 enabled
- [ ] Image optimization configured
- [ ] Cache hit ratio > 85%

### Security
- [ ] WAF enabled
- [ ] DDoS protection active
- [ ] Rate limiting configured
- [ ] Bot protection enabled
- [ ] Security headers set

### Monitoring
- [ ] Analytics configured
- [ ] Alerts set up
- [ ] Custom dashboards created
- [ ] Performance baseline established

## Troubleshooting

### Common Issues

1. **Low Cache Hit Ratio**
   - Check cache headers
   - Verify page rules
   - Look for cache-busting query params

2. **Slow Origin Response**
   - Enable Argo Smart Routing
   - Check origin server performance
   - Consider origin shield

3. **SSL Errors**
   - Verify SSL mode is Full (strict)
   - Check origin certificate validity
   - Ensure CloudFlare IPs are whitelisted

4. **Cache Not Updating**
   - Use cache tags for granular purging
   - Implement smart cache invalidation
   - Check cache TTL settings

## Cost Optimization

1. **Bandwidth Optimization**
   - Enable Polish for images
   - Use appropriate cache TTLs
   - Implement lazy loading

2. **Request Optimization**
   - Combine static assets
   - Use HTTP/2 multiplexing
   - Implement service workers

3. **Plan Selection**
   - Free plan: Basic sites
   - Pro plan ($20/mo): Most applications
   - Business plan ($200/mo): E-commerce
   - Enterprise: Custom pricing