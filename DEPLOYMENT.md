# Deployment & Production Guide

Complete step-by-step instructions for deploying the Cart Drawer app to production.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Choose a Hosting Provider](#choose-a-hosting-provider)
3. [Database Setup](#database-setup)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment](#post-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] App works locally (`npm run dev`)
- [ ] All environment variables are set
- [ ] GDPR webhooks are implemented and tested
- [ ] Privacy policy URL is ready
- [ ] Support email is configured
- [ ] Database migrations are up-to-date (`npm run setup`)
- [ ] Theme App Extension builds without errors (`shopify app build`)
- [ ] App submission requirements are met (see App Store checklist below)

---

## Choose a Hosting Provider

### Option 1: Heroku (Easiest)

**Pros:**
- One-click PostgreSQL database
- Built-in environment variable management
- Simple deployment with `git push`
- Good free tier for learning

**Cons:**
- Can be expensive at scale ($7-50+/month)
- Slower dyno performance than alternatives

**Cost:** Free tier (550 hours/month), then $7-50/month

### Option 2: Render

**Pros:**
- Modern infrastructure
- Free PostgreSQL database included
- Competitive pricing ($7-12/month)
- Native GitHub integration

**Cons:**
- Smaller ecosystem than Heroku
- Less documentation online

**Cost:** Free tier, then $7+/month

### Option 3: Railway

**Pros:**
- Very affordable ($5-15/month)
- Simple CLI deployment
- Generous free tier ($5 credit)
- PostgreSQL included

**Cons:**
- Smaller community
- Less mature platform

**Cost:** Free $5 credit, then $5+/month

### Option 4: Fly.io

**Pros:**
- Global distribution (low latency)
- Affordable ($3+/month)
- Excellent performance
- PostgreSQL available

**Cons:**
- Newer platform
- Steeper learning curve

**Cost:** $3+/month

### Option 5: AWS / DigitalOcean / Azure (Advanced)

For large-scale deployment or enterprise requirements. Recommend using managed services (RDS, App Platform, Azure App Service).

---

## Database Setup

### Using PostgreSQL

For production, use **managed PostgreSQL** (don't self-host):

- **Heroku Postgres** — included in plan
- **AWS RDS** — AWS managed PostgreSQL
- **Railway PostgreSQL** — included free
- **Render PostgreSQL** — included free
- **DigitalOcean Managed Databases** — $15+/month

### Connection String Format

```
postgresql://username:password@host:5432/database_name
```

Example (Heroku):
```
postgresql://user:pass@ec2-xxx.compute-1.amazonaws.com:5432/db123
```

### Local Testing with PostgreSQL

```bash
# Install PostgreSQL locally
brew install postgresql       # macOS
sudo apt install postgresql   # Ubuntu

# Start service
brew services start postgresql

# Create database
createdb cart_drawer_db

# Set DATABASE_URL in .env
DATABASE_URL=postgresql://localhost:5432/cart_drawer_db

# Run migrations
npm run setup
```

---

## Deployment Steps

### 1. Create Git Repository

```bash
cd cart-drawer-app
git init
git add .
git commit -m "Initial commit: Cart Drawer app"
git remote add origin https://github.com/your-username/cart-drawer-app.git
git push -u origin main
```

### 2. Deploy to Heroku

```bash
# Install Heroku CLI
brew install heroku
heroku login

# Create Heroku app
heroku create your-cart-drawer-app

# Configure environment variables
heroku config:set SHOPIFY_API_KEY=your_api_key
heroku config:set SHOPIFY_API_SECRET=your_api_secret
heroku config:set SHOPIFY_APP_URL=https://your-cart-drawer-app.herokuapp.com
heroku config:set SCOPES="read_products,write_cart_transforms,read_themes,write_themes,read_orders"

# Add PostgreSQL database (FREE)
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main

# Setup database
heroku run npm run setup

# View logs
heroku logs --tail
```

### 2b. Deploy to Render

```bash
# Go to https://dashboard.render.com → New → Web Service
# Connect your GitHub repository

# In Render dashboard, set environment:
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-app.onrender.com
SCOPES=read_products,write_cart_transforms,read_themes,write_themes,read_orders
NODE_ENV=production

# Add PostgreSQL database (free)
# Set DATABASE_URL to the connection string provided

# Render auto-deploys on git push
```

### 2c. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set SHOPIFY_API_KEY=xxx
railway variables set SHOPIFY_API_SECRET=yyy
railway variables set SHOPIFY_APP_URL=https://your-railway-url.railway.app
railway variables set SCOPES="read_products,write_cart_transforms,read_themes,write_themes,read_orders"

# Add PostgreSQL
railway add        # Select PostgreSQL

# Deploy
railway up

# Watch logs
railway logs
```

### 3. Update Shopify App Settings

In your **Shopify Partner Dashboard**:

1. Go to **Apps and sales channels** → your app
2. Update **App URL** to your production domain:
   ```
   https://your-production-domain.com
   ```
3. Update **Redirect URLs**:
   ```
   https://your-production-domain.com/auth/callback
   https://your-production-domain.com/auth/shopify/callback
   https://your-production-domain.com/shopify/auth/callback
   ```
4. Update **App proxy URL** (if using custom domain):
   ```
   https://your-production-domain.com/proxy
   ```
5. Set **Privacy policy URL** (required for App Store):
   ```
   https://your-site.com/privacy
   ```
6. Set **Support email**:
   ```
   support@your-site.com
   ```

### 4. Deploy Theme App Extension

```bash
# Build extension
shopify app build

# Deploy to Shopify (via CLI)
shopify app deploy

# Verify deployment
# Go to test store → Theme → Apps → Cart Drawer should be listed
```

---

## Post-Deployment

### 1. Verify App is Live

1. Go to **Shopify Partner Dashboard**
2. Install app on your **development store**
3. Open the embedded admin dashboard
4. Verify all pages load correctly:
   - Dashboard (`/app`)
   - Settings (`/app/settings`)
   - Upsells (`/app/upsells`)

### 2. Test on Storefront

1. Visit your test store
2. Click cart icon — drawer should slide in
3. Try adding a product — cart should update
4. Change quantity — updates should be instant
5. Apply a discount code — should work
6. Check mobile — ensure responsive design

### 3. Configure Custom Domain (Optional)

If using a custom domain instead of the provider's subdomain:

```bash
# Point DNS to your hosting provider
# For Heroku:
# CNAME: your-domain.com → your-app.herokuapp.com

# For Render:
# CNAME: your-domain.com → your-app.onrender.com

# Wait for DNS to propagate (can take 24-48 hours)

# Then update Shopify app settings with your domain
```

### 4. Enable HTTPS

Most providers auto-enable HTTPS. Verify:

```bash
curl -I https://your-domain.com/app
# Should return HTTP/2 200, not HTTP 301 redirect
```

---

## Monitoring & Maintenance

### Error Tracking

Add **Sentry** for production error monitoring:

```bash
npm install @sentry/remix
```

In `app/root.jsx`:

```jsx
import * as Sentry from "@sentry/remix";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const ErrorBoundary = Sentry.captureRemixErrorBoundary(BoundaryComponent);
```

In `app/entry.server.jsx`:

```jsx
export default function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  // ... existing code
  return new Response(body, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
```

### Performance Monitoring

Track key metrics:

- **App load time** — should be <2 seconds
- **Drawer render time** — should be <500ms
- **Cart update latency** — should be <1 second
- **API response time** — settings/upsells should be <200ms

### Database Maintenance

#### Backup Strategy

**Heroku:**
```bash
# Automatic daily backups included
# Manual backup:
heroku pg:backups:capture

# Download backup:
heroku pg:backups:download
```

**Render:**
```bash
# Automatic backups enabled on paid tier
# Free tier: manual exports only
```

**Railway:**
```bash
# Backups available via dashboard
```

#### Monitor Database Size

```bash
# Heroku
heroku pg:info

# Railway (via CLI)
railway postgres:info
```

#### Cleanup Old Sessions (Optional)

Sessions expire after 24 hours. To clean up:

```javascript
// Add to a daily cron job
await prisma.session.deleteMany({
  where: { expires: { lt: new Date() } }
});
```

### Uptime Monitoring

Use a service to monitor availability:

- **Pingdom** (free plan available)
- **StatusCake** (free tier)
- **UptimeRobot** (free monitoring)

Set up alerts for when the app goes down.

---

## Troubleshooting

### "App URL not accessible"

```bash
# Test connectivity
curl -I https://your-domain.com/app

# Check logs
heroku logs --tail
# or
railway logs
```

### "502 Bad Gateway"

1. Check app is running:
   ```bash
   heroku ps
   # Should show: web.1 up
   ```

2. Check logs for errors:
   ```bash
   heroku logs --tail
   ```

3. Restart if needed:
   ```bash
   heroku restart
   ```

### "Database connection failed"

1. Verify `DATABASE_URL` is set correctly:
   ```bash
   heroku config:get DATABASE_URL
   ```

2. Test connection:
   ```bash
   heroku pg:info
   ```

3. Run migrations:
   ```bash
   heroku run npm run setup
   ```

### "Cart drawer not showing on storefront"

1. Verify theme app extension is deployed:
   - Go to test store → Theme Editor
   - Look for "Cart Drawer" section under "Apps"

2. Verify app proxy is working:
   ```bash
   curl "https://your-domain.com/proxy?endpoint=settings&shop=test.myshopify.com"
   # Should return JSON settings
   ```

3. Check for JavaScript errors:
   - Open browser DevTools → Console
   - Look for errors starting with `ECD`

### "Storefront JS not loading (404 on cart-drawer.js)"

1. Verify theme app extension deployed:
   ```bash
   shopify app deploy --reset
   ```

2. Check extension version in Partner Dashboard

3. Hard refresh storefront (Ctrl+Shift+R)

### "Discount code not working"

- Verify code exists in Shopify Admin
- Check discount requirements (min spend, specific products, etc.)
- Discount must be active (not scheduled for future)

---

## App Store Submission

Before submitting to the Shopify App Store:

### Requirements Checklist

- [ ] **Privacy policy** — public URL set
- [ ] **Support email** — configured in Partner Dashboard
- [ ] **GDPR compliance**:
  - [ ] `customers/data_request` webhook implemented
  - [ ] `customers/redact` webhook implemented
  - [ ] `shop/redact` webhook implemented
- [ ] **Theme compatibility** — tested on 3+ themes
- [ ] **Mobile responsive** — tested on mobile devices
- [ ] **No errors in logs** — production logs clean
- [ ] **Screenshots ready** — show dashboard and storefront
- [ ] **Description** — clear, benefit-focused copy

### Submission Process

1. Go to **Shopify Partner Dashboard** → **Apps and sales channels**
2. Click your app → **Listings**
3. Create **App Store listing**:
   - Icon (square PNG, 1200x1200px)
   - Screenshots (3-5, showing features)
   - Category (Sales tools → Checkout / Shopping cart)
   - Description
   - Pricing (free, paid plans, usage-based)
4. Click **Submit for review**
5. Shopify reviews (typically 3-5 business days)
6. Once approved, app appears in App Store

---

## Performance Optimization

### Reduce Bundle Size

Current storefront JS: **~30KB minified**

To further optimize:

1. **Code splitting** — load upsells JS only if enabled
2. **Lazy load images** — already implemented with `loading="lazy"`
3. **Defer non-critical CSS** — move non-essential styles

### Database Query Optimization

```javascript
// Instead of this (N+1 queries):
cart.items.forEach(item => {
  const product = await admin.graphql(`query { product(id: "${item.product_id}") { ... } }`);
});

// Do this (single query):
const ids = cart.items.map(i => i.product_id);
const products = await admin.graphql(`
  query GetProducts($ids: [ID!]!) {
    nodes(ids: $ids) { ... }
  }
`, { variables: { ids } });
```

### CDN for Static Assets

Serve CSS/JS from a CDN:

```bash
# Build extension assets
shopify app build

# Upload to your CDN (CloudFront, Cloudflare, etc.)
# Reference in Liquid block
```

---

## Scaling Considerations

For high-traffic stores (100k+ installs):

1. **Enable database connection pooling** (PgBouncer)
2. **Add Redis for caching** (session, settings)
3. **Use CDN for storefront JS** (Cloudflare, AWS CloudFront)
4. **Implement rate limiting** on proxy endpoints
5. **Monitor and alert** on high latency

---

## Security Checklist

- [ ] API keys/secrets **never** in code or logs
- [ ] HTTPS enforced on all endpoints
- [ ] HMAC signature verification (Shopify middleware handles this)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (sanitize user input if rendering)
- [ ] CORS headers configured correctly on proxy
- [ ] Sensitive endpoints require authentication
- [ ] Rate limiting on public endpoints

---

## Summary

1. **Choose provider** (Heroku/Render/Railway recommended)
2. **Set up database** (managed PostgreSQL)
3. **Deploy app** (git push or CLI)
4. **Update Shopify settings** (app URL, redirect URLs)
5. **Deploy theme extension** (`shopify app deploy`)
6. **Test thoroughly** (dashboard, storefront, mobile)
7. **Monitor & maintain** (logs, performance, backups)
8. **Submit to App Store** (after testing and compliance)

You're ready to scale! 🚀
