# 🚀 Railway Deployment Instructions for LOGOS Ecosystem

## Important: Service Configuration

Railway requires you to deploy each service separately. You need to create **TWO separate services** in Railway:

1. **Backend Service** (from `/backend` directory)
2. **Frontend Service** (from `/frontend` directory)

## Step 1: Deploy Backend Service

1. Go to [Railway Dashboard](https://railway.app/new)
2. Click "Deploy from GitHub repo"
3. Select `logos-ecosystem/01-LOGOS-ECOSYSTEM`
4. **IMPORTANT**: Set the **Root Directory** to `backend`
5. Railway will now detect the backend configuration

### Backend Environment Variables:
```
NODE_ENV=production
PORT=8000
DATABASE_URL=(will be auto-generated when you add PostgreSQL)
REDIS_URL=(will be auto-generated when you add Redis)
JWT_SECRET=your-super-secure-jwt-secret-change-this
ANTHROPIC_API_KEY=your-anthropic-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
CLOUDFLARE_API_TOKEN=Uq6Wfm05mJVMsF452lWcl-jyEtyDefsj-lzAnAKJ
CLOUDFLARE_ZONE_ID=4bc1271bd6a132931dcf2b7cdc7ccce7
EMAIL_FROM=noreply@logos-ecosystem.com
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Add Backend Services:
1. Click "+ New" → "Database" → "Add PostgreSQL"
2. Click "+ New" → "Database" → "Add Redis"

## Step 2: Deploy Frontend Service

1. In the same Railway project, click "+ New"
2. Select "GitHub Repo" again
3. Select `logos-ecosystem/01-LOGOS-ECOSYSTEM`
4. **IMPORTANT**: Set the **Root Directory** to `frontend`
5. Railway will now detect the frontend configuration

### Frontend Environment Variables:
```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://api.logos-ecosystem.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
NEXT_PUBLIC_CLOUDFLARE_SITE_KEY=your-cloudflare-turnstile-site-key
```

## Step 3: Configure Custom Domains

### For Backend Service:
1. Go to Backend service → Settings → Networking
2. Click "Generate Domain" to get a temporary Railway URL
3. Click "Add Custom Domain"
4. Add: `api.logos-ecosystem.com`
5. Copy the CNAME target Railway provides

### For Frontend Service:
1. Go to Frontend service → Settings → Networking
2. Click "Generate Domain" to get a temporary Railway URL
3. Click "Add Custom Domain"
4. Add: `logos-ecosystem.com`
5. Add another: `www.logos-ecosystem.com`
6. Copy the CNAME targets Railway provides

## Step 4: Configure DNS in Cloudflare

Once you have the Railway CNAME targets, run:

```bash
./configure-dns-railway.sh FRONTEND_CNAME BACKEND_CNAME
```

Example:
```bash
./configure-dns-railway.sh amazing-app.up.railway.app amazing-api.up.railway.app
```

## Troubleshooting

### If deployment fails:
1. Check the build logs in Railway
2. Ensure all environment variables are set
3. Make sure PostgreSQL and Redis are connected
4. Verify the root directory is set correctly for each service

### Common Issues:
- **No start command found**: Make sure you set the root directory
- **Database connection failed**: Wait for PostgreSQL to fully provision
- **Build failed**: Check if all dependencies are in package.json

## Success Checklist

- [ ] Backend deployed with root directory set to `/backend`
- [ ] Frontend deployed with root directory set to `/frontend`
- [ ] PostgreSQL added and connected to backend
- [ ] Redis added and connected to backend
- [ ] All environment variables configured
- [ ] Custom domains added in Railway
- [ ] DNS configured in Cloudflare
- [ ] Site accessible at https://logos-ecosystem.com

## Notes

- Railway automatically handles SSL certificates
- Deployments are triggered on every push to main branch
- Each service scales independently
- Monitor logs in Railway dashboard for any issues