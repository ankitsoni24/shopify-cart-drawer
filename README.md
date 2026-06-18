# Cart Drawer App

A production-ready Shopify cart drawer app built with Remix, React, and Polaris. Provides merchants with a modern, customizable side drawer for their store's cart experience.

## Features

✅ **Slide-out cart drawer** with smooth animations  
✅ **Free shipping progress bar** with customizable threshold  
✅ **Upsell product carousel** (up to 6 products)  
✅ **Quantity adjustment** with single-tap changes  
✅ **Discount code** application  
✅ **Order notes** field (optional)  
✅ **Sticky Add to Cart bar** on product pages  
✅ **Urgency countdown timer** for cart reservations  
✅ **Completely theme-agnostic** — works on any Shopify theme  
✅ **Mobile-optimized** with full responsive design  
✅ **GDPR compliant** with required webhooks  
✅ **Admin dashboard** with live customization  
✅ **Zero external dependencies** in storefront JS  

---

## Project Structure

```
cart-drawer-app/
├── app/
│   ├── routes/
│   │   ├── app.jsx                 # Embedded app layout
│   │   ├── app._index.jsx          # Dashboard
│   │   ├── app.settings.jsx        # Settings page
│   │   ├── app.upsells.jsx         # Upsell product picker
│   │   ├── auth.$.jsx              # OAuth callback
│   │   ├── webhooks.jsx            # Webhook handler
│   │   └── proxy.jsx               # App Proxy (settings + upsells API)
│   ├── shopify.server.js           # Shopify OAuth config
│   ├── db.server.js                # Prisma client singleton
│   └── root.jsx                    # Root layout
├── extensions/
│   └── cart-drawer/
│       ├── shopify.extension.toml  # Extension config
│       ├── blocks/
│       │   └── cart-drawer.liquid  # Liquid block (injected into theme)
│       └── assets/
│           ├── cart-drawer.js      # Storefront JavaScript (30KB minified)
│           └── cart-drawer.css     # Storefront CSS
├── prisma/
│   └── schema.prisma               # Database schema (Sessions + CartDrawerSettings)
├── package.json
├── vite.config.js
├── remix.config.js
├── shopify.app.toml                # Shopify app manifest
└── .env.example
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18.20.0
- **PostgreSQL** database (local for dev, managed for production)
- **Shopify Partner account** and a test store
- **Shopify CLI** installed (`npm install -g @shopify/cli`)

### 1. Clone & Setup

```bash
# Clone this repo
git clone <repo-url> cart-drawer-app
cd cart-drawer-app

# Install dependencies
npm install

# Setup Prisma
npm run setup

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 2. Create a Shopify App

1. Go to https://partners.shopify.com → Apps & sales channels
2. Click **Create an app** → **Create app manually**
3. Name: `Cart Drawer`
4. App type: **Public app**
5. Copy **API key** and **API secret** → paste into `.env`

### 3. Set Redirect URLs (in Partner Dashboard)

```
https://your-tunnel.trycloudflare.com/auth/callback
https://your-tunnel.trycloudflare.com/auth/shopify/callback
```

### 4. Configure Scopes

In **Admin API access scopes**, enable:
- `read_products`
- `write_cart_transforms`
- `read_themes`
- `write_themes`
- `read_orders`

### 5. Start Dev Server

```bash
npm run dev
```

The CLI will:
- Generate a Cloudflare tunnel URL (paste into `.env` as `SHOPIFY_APP_URL`)
- Log you into your test store
- Open the app in the embedded admin

---

## How It Works

### Storefront Layer

The **Theme App Extension** (`extensions/cart-drawer/`) injects a Liquid block into merchants' themes without code edits. The block loads:

- **cart-drawer.js** — 30KB minified, zero dependencies, vanilla JS
- **cart-drawer.css** — Fully namespaced with `.ecd-` prefix

The JS intercepts:
- Add-to-cart forms (across the entire theme)
- Cart icon clicks
- Product page variant changes

And opens the drawer instead of redirecting to `/cart`.

### Admin Layer

Merchants configure the drawer via `/admin/apps/cart-drawer/`:

- **Settings** — colors, text, thresholds, toggles
- **Upsells** — pick up to 6 products to promote
- **Dashboard** — view live configuration

All settings are stored in **app installation metafields** and synced to the storefront via the **App Proxy**.

### Cart API

The app uses Shopify's **native cart API** (`/cart.js`, `/cart/add.js`, `/cart/change.js`):

- No cart interception needed
- Works with all themes
- Supports order notes, attributes, line item properties
- Real-time updates without page reload

---

## Configuration Guide

### Settings Page (`app/routes/app.settings.jsx`)

**General Tab**
- Drawer title (e.g., "Your Cart")
- Accent color (applies to buttons, progress bar, etc.)
- Button text color (for contrast on custom accent colors)
- Empty cart state message + CTA button

**Shipping Bar Tab**
- Free shipping threshold (in dollars)
- Progress bar text with `{amount}` placeholder
- "Unlocked" message when threshold is reached

**Upsells Tab**
- Enable/disable upsell carousel
- Section title
- Product selection via resource picker (up to 6)

**Checkout Tab**
- Checkout button text
- Discount code field toggle + placeholder
- Order note field toggle + label

**Advanced Tab**
- Sticky Add to Cart (product pages)
- Countdown timer toggle + duration + text

### Remote Settings API

Settings are fetched on page load via:

```
GET /apps/cart-drawer?endpoint=settings&shop=mystore.myshopify.com
```

Returns JSON with all merchant settings. Merchants can customize colors, text, and features without code.

---

## Customization Examples

### Change Drawer Width

Edit `extensions/cart-drawer/assets/cart-drawer.css`:

```css
:root {
  --ecd-width: 500px; /* default: 420px */
}
```

### Add Custom Fonts

In the Liquid block (`cart-drawer.liquid`), add before the `<script>` tag:

```liquid
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">

<style>
  .ecd-drawer__title {
    font-family: 'Playfair Display', serif;
  }
</style>
```

### Customize Empty Cart Image

Edit `cart-drawer.liquid` to replace the SVG icon, or serve from Shopify CDN:

```liquid
<img src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/empty-cart.png" alt="Empty" />
```

---

## Deployment

### 1. Buy a Production Domain

Use a domain you own (e.g., `cartdrawer.example.com`).

### 2. Deploy to Production (Heroku, Render, Railway, Fly.io)

#### Option A: Heroku

```bash
# Create Heroku app
heroku create your-cart-drawer-app
heroku config:set SHOPIFY_API_KEY=xxx SHOPIFY_API_SECRET=yyy
heroku config:set SHOPIFY_APP_URL=https://your-cart-drawer-app.herokuapp.com
heroku config:set DATABASE_URL=postgres://...

# Deploy
git push heroku main

# Setup DB
heroku run npm run setup
```

#### Option B: Render

1. Create account at https://render.com
2. New → **Web Service**
3. Connect GitHub repo
4. Set environment variables (see `.env.example`)
5. Build command: `npm run build`
6. Start command: `npm start`
7. Add PostgreSQL database

#### Option C: Railway

```bash
npm install -g railway
railway init
railway up

# Set variables
railway variables set SHOPIFY_API_KEY=xxx
railway variables set SHOPIFY_APP_URL=https://your-url.railway.app
```

### 3. Update Shopify App Settings

In **Shopify Partner Dashboard**:

1. Go to your app settings
2. Set **App URL** to your production domain
3. Update **Redirect URLs**:
   ```
   https://your-domain.com/auth/callback
   https://your-domain.com/auth/shopify/callback
   ```
4. Set **Privacy policy** and **Support email**

### 4. Deploy Extensions

```bash
npm run build
shopify app deploy
```

This deploys the Theme App Extension to Shopify's servers.

---

## Testing

### Local Testing

1. Install your app on your test store:
   ```
   npm run dev
   ```

2. Open the embedded admin dashboard
3. Go to **Settings** → customize colors, text, thresholds
4. Go to **Upsells** → pick some products
5. Visit your test store's homepage
6. Click the cart icon or add a product
7. Verify the drawer opens with your settings

### Cross-Theme Testing

Test on multiple themes to ensure compatibility:

1. **Dawn** (Shopify's default) — via test store
2. **Debut** (legacy, older DOM structure)
3. **Popular 3rd-party theme** (Brooklyn, Prestige, etc.)

Most themes use the standard `/cart` link and `[name="add-to-cart"]` forms, which our interception handles. Check theme code if ATC doesn't work.

### Mobile Testing

Use Chrome DevTools device emulation or actual mobile browser:

- Drawer should occupy full width on mobile
- Touch interactions should feel smooth
- Qty buttons should be easily tappable (44px minimum)

---

## GDPR Compliance (Required for App Store)

The app implements all required GDPR webhooks:

### `CUSTOMERS_DATA_REQUEST`
- Fires when a customer requests their data
- App logs the request (you have 30 days to respond)
- Email the data to `payload.customer.email`

### `CUSTOMERS_REDACT`
- Fires when a customer requests deletion
- App deletes any stored customer PII
- We don't store customer data, so this is logged only

### `SHOP_REDACT`
- Fires 48 hours after app uninstall
- Deletes all shop data from the database
- Implemented in `app/routes/webhooks.jsx`

---

## Troubleshooting

### "Cart drawer not loading"
1. Check browser console for JS errors
2. Verify theme has the cart drawer block added (Theme Editor → Cart Drawer section)
3. Check that `/apps/cart-drawer?endpoint=settings` returns valid JSON

### "ATC button not intercepted"
1. Inspect the form: does it have `action="/cart/add"` or `data-product-form`?
2. Some custom themes use non-standard forms — you may need to add `data-ecdIgnore` attribute to bypass our interception
3. Check JS is loading: `window.ECD` should exist in console

### "Settings not syncing"
1. Clear browser cache (or open in incognito)
2. Check that settings are saved in the admin dashboard
3. Verify app proxy is configured correctly in `shopify.app.toml`

### "Discount code not working"
1. Discount codes must exist in Shopify admin
2. Codes must be valid and not expired
3. Cart must meet discount requirements (minimum spend, specific products, etc.)

---

## Database Schema

```prisma
model Session {
  id           String   @id
  shop         String
  accessToken  String
  scope        String?
  expiresAt    DateTime?
  isOnline     Boolean  @default(false)
  // ... other fields
}

model CartDrawerSettings {
  id                     String   @id @default(cuid())
  shop                   String   @unique
  
  // Appearance
  drawerTitle            String
  accentColor            String
  buttonTextColor        String
  
  // Shipping bar
  enableShippingBar      Boolean
  freeShippingThreshold  Int      // in cents
  shippingBarText        String
  shippingUnlockedText   String
  
  // Upsells
  enableUpsells          Boolean
  upsellProductIds       String   // JSON: ["gid://shopify/Product/123", ...]
  
  // ... other settings
  
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

---

## Monitoring & Analytics

### Logs

```bash
# View logs in production
heroku logs --tail
# or
railway logs
# or
fly logs
```

### Error Tracking

Add Sentry, LogRocket, or similar:

```bash
npm install @sentry/remix
```

Then instrument in `app/root.jsx`:

```jsx
import * as Sentry from "@sentry/remix";

export const ErrorBoundary = Sentry.captureRemixErrorBoundary(YourBoundary);
```

### Performance

Monitor:
- **Storefront JS load time** — should be <1s
- **App Proxy response time** — should be <200ms
- **Database query time** — typical <50ms

---

## Support & Contributing

- **Issues**: Report bugs via GitHub issues
- **Feature requests**: Describe your use case
- **Security**: Email security@example.com with details

---

## License

This app is provided as-is for educational and commercial use.

---

## Quick Reference

### Common Commands

```bash
npm run dev          # Start dev server with tunnel
npm run build        # Build for production
npm start            # Run production build
npm run setup        # Setup Prisma migrations
npm run lint         # Run ESLint
shopify app deploy   # Deploy theme extension
```

### File Locations

| Purpose | File |
|---------|------|
| Cart drawer HTML | `extensions/cart-drawer/blocks/cart-drawer.liquid` |
| Drawer styling | `extensions/cart-drawer/assets/cart-drawer.css` |
| Drawer logic | `extensions/cart-drawer/assets/cart-drawer.js` |
| Admin dashboard | `app/routes/app._index.jsx` |
| Settings UI | `app/routes/app.settings.jsx` |
| Upsell picker | `app/routes/app.upsells.jsx` |
| Settings API | `app/routes/proxy.jsx` |
| Database | `prisma/schema.prisma` |

---

## Next Steps

1. ✅ Install and test locally
2. ✅ Customize colors, text, and settings in the admin
3. ✅ Deploy to production (Heroku, Render, Railway)
4. ✅ Submit to Shopify App Store
5. ✅ Market to merchants

Good luck! 🚀
