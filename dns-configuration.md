# LOGOS ECOSYSTEM - DNS Configuration

## 🌐 Current Domain Setup

### Custom Domains:
- **Primary:** `logos-ecosystem.com`
- **WWW:** `www.logos-ecosystem.com`

### Vercel Deployments:
- **Latest Production:** `logos-ecosystem-5w4y8anj3-juan-jaureguis-projects.vercel.app`
- **Current Domain Points to:** `frontend-ckhxcllxt-juan-jaureguis-projects.vercel.app`

## 🔧 DNS Records Required

### For logos-ecosystem.com:

#### Option 1: Using CNAME (Recommended)
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

#### Option 2: Using A Records
```
Type: A
Name: @
Value: 76.76.21.21
```

### For www.logos-ecosystem.com:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## 📋 Update Domain to Latest Deployment

To point your domain to the latest deployment, run:

```bash
# Remove old alias
vercel alias rm logos-ecosystem.com

# Add alias to new deployment
vercel alias set logos-ecosystem-5w4y8anj3-juan-jaureguis-projects.vercel.app logos-ecosystem.com

# Add www subdomain
vercel alias set logos-ecosystem-5w4y8anj3-juan-jaureguis-projects.vercel.app www.logos-ecosystem.com
```

## 🔍 DNS Verification

### Check DNS Propagation:
```bash
# Check A record
dig logos-ecosystem.com A

# Check CNAME record
dig www.logos-ecosystem.com CNAME

# Check with specific DNS server
dig @8.8.8.8 logos-ecosystem.com
```

### Verify in Browser:
- https://logos-ecosystem.com
- https://www.logos-ecosystem.com

## 🛡️ SSL Certificate
Vercel automatically provisions SSL certificates for custom domains. No additional configuration needed.

## ⚡ CDN Configuration
Vercel automatically serves your site through their global CDN network with edge locations worldwide.

## 📊 DNS Providers Configuration

### Cloudflare:
1. Add CNAME record pointing to `cname.vercel-dns.com`
2. Set proxy status to "DNS only" (gray cloud)

### GoDaddy:
1. Go to DNS Management
2. Add CNAME record with host "@" pointing to `cname.vercel-dns.com`

### Namecheap:
1. Go to Advanced DNS
2. Add CNAME Record with host "@" and value `cname.vercel-dns.com`

### Route 53 (AWS):
1. Create hosted zone for logos-ecosystem.com
2. Add CNAME record with name "" and value `cname.vercel-dns.com`

## 🚀 Quick Commands

```bash
# View current aliases
vercel alias ls

# Add new alias
vercel alias set [deployment-url] [custom-domain]

# Remove alias
vercel alias rm [custom-domain]

# Check domain configuration
vercel domains inspect logos-ecosystem.com
```

---

**Note:** DNS changes can take up to 48 hours to propagate globally, but typically complete within 1-4 hours.