# Cart Drawer App — Visual Architecture & Quick Reference

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHOPIFY INFRASTRUCTURE                      │
│                                                                  │
│  ┌──────────────────┐        ┌──────────────────┐              │
│  │  MERCHANT'S STORE│        │  THEME EDITOR    │              │
│  │                  │        │                  │              │
│  │  Storefront with │        │  • Add cart      │              │
│  │  Theme installed │        │    drawer block  │              │
│  │                  │        │  • Customize     │              │
│  │  • Liquid block  │        │    text, colors  │              │
│  │  • JS (30KB)     │        │  • Enable        │              │
│  │  • CSS           │        │    features      │              │
│  └──────────────────┘        └──────────────────┘              │
│           │                           │                         │
│           │ Uses                      │ Writes                  │
│           ↓                           ↓                         │
│  ┌────────────────────────────────────────────────┐            │
│  │         SHOPIFY'S SERVERS                     │            │
│  │  • /cart.js — fetch/update cart              │            │
│  │  • /cart/add.js — add items                  │            │
│  │  • /cart/change.js — modify qty/remove      │            │
│  │  • /checkout — process orders               │            │
│  └────────────────────────────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↑
                           │ API calls
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
┌───────┴──────────────┐        ┌─────────────┴───────┐
│   YOUR REMIX SERVER   │        │  SHOPIFY APP PROXY  │
│   (nodejs, heroku)    │        │  (/apps/cart-drawer)│
│                       │        │                     │
│ ┌──────────────────┐  │        │  GET endpoint=      │
│ │ Admin Dashboard  │  │        │  settings           │
│ │ /app/*           │  │        │  → Returns JSON     │
│ │ • Settings       │  │        │                     │
│ │ • Upsells        │  │        │  GET endpoint=      │
│ │ • Analytics      │  │        │  upsells            │
│ └──────────────────┘  │        │  → Returns products │
│                       │        │                     │
│ ┌──────────────────┐  │        └─────────────────────┘
│ │ GDPR Webhooks    │  │
│ │ /webhooks        │  │        ┌─────────────────────┐
│ │ • app/uninstalled│  │        │  POSTGRESQL DB      │
│ │ • customer/*     │  │        │                     │
│ │ • shop/redact    │  │        │ • Sessions          │
│ └──────────────────┘  │        │ • CartDrawerSettings│
│                       │        │   (per merchant)    │
└─────────────┬─────────┘        └─────────────────────┘
              │
              │ Reads/Writes
              ↓
        ┌──────────────┐
        │  PostgreSQL  │
        │  Database    │
        └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│         SHOPIFY PARTNER DASHBOARD (Admin)                        │
│  https://partners.shopify.com                                    │
│                                                                  │
│  • Create/manage app                                            │
│  • Set API key, secret                                          │
│  • Configure scopes                                             │
│  • Manage test stores                                           │
│  • Submit to App Store                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. Customer Adds Item to Cart

```
┌──────────────────┐
│ Customer clicks  │
│ "Add to Cart"    │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────┐
│ cart-drawer.js intercepts    │
│ form submission (capture)    │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ JS calls /cart/add.js        │
│ (Shopify's native endpoint)  │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Shopify updates cart on      │
│ its servers                  │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ JS fetches cart from         │
│ /cart.js                     │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Render.update() re-renders   │
│ cart items, totals,          │
│ shipping bar                 │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Drawer opens automatically   │
└──────────────────────────────┘
```

### 2. Merchant Customizes Settings

```
┌────────────────────┐
│ Merchant changes   │
│ accent color in    │
│ /app/settings      │
└────────┬───────────┘
         │
         ↓
┌────────────────────────────────┐
│ React Form submits to          │
│ Remix action (POST)            │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────┐
│ Remix action validates,        │
│ updates database via Prisma    │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────┐
│ Returns JSON { success: true } │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────┐
│ Browser shows "Saved!" message │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│ NEXT: Customer's cart drawer uses  │
│ new color (via App Proxy on load)  │
└────────────────────────────────────┘
```

### 3. App Proxy (Settings Sync)

```
Storefront loads
         │
         ↓
┌────────────────────────────┐
│ JS boots, calls:           │
│ /apps/cart-drawer?         │
│ endpoint=settings&         │
│ shop=store.myshopify.com   │
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│ Shopify validates proxy    │
│ signature, forwards to     │
│ your server                │
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│ /proxy.jsx handles:        │
│ • Queries database         │
│ • Returns JSON with colors,│
│   text, thresholds, etc.   │
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│ JS receives JSON, applies: │
│ • CSS variables            │
│ • Dynamic text             │
│ • Feature toggles          │
└────────────────────────────┘
```

---

## 📊 Component Dependency Map

```
browser
  └─ app/root.jsx (HTML shell)
      └─ app/routes/app.jsx (embedded app)
          ├─ app/routes/app._index.jsx (dashboard)
          ├─ app/routes/app.settings.jsx (settings with Form)
          │   └─ Prisma update (CartDrawerSettings)
          ├─ app/routes/app.upsells.jsx (product picker)
          │   ├─ shopify.resourcePicker() (theme integration)
          │   └─ Prisma update (upsellProductIds JSON)
          └─ app/routes/app.analytics.jsx (placeholder)

storefront
  └─ extensions/cart-drawer/blocks/cart-drawer.liquid
      ├─ cart-drawer.js (vanilla JS, 30KB)
      │   ├─ /cart.js (Shopify native API)
      │   ├─ /cart/add.js (Shopify native API)
      │   ├─ /cart/change.js (Shopify native API)
      │   └─ /apps/cart-drawer proxy (settings + upsells)
      └─ cart-drawer.css (scoped styles, 25KB)

server
  ├─ app/shopify.server.js (OAuth, Webhook subscriptions)
  ├─ app/routes/auth.$.jsx (OAuth callback)
  ├─ app/routes/webhooks.jsx (GDPR webhooks)
  │   └─ app/db.server.js (Prisma client)
  ├─ app/routes/proxy.jsx (App Proxy handler)
  │   ├─ settings endpoint (returns CartDrawerSettings JSON)
  │   └─ upsells endpoint (fetches products via Admin API)
  └─ Prisma models
      ├─ Session (automatic session storage)
      └─ CartDrawerSettings (merchant config)
```

---

## 📈 Traffic Flow

```
Merchant Stores:    100    (each has 1 test store)
├─ Test Stores:     100
│  └─ Customers:    1,000-10,000 per store
│     └─ Requests:  5-20 per session

Request Types:
├─ Storefront:
│  ├─ cart-drawer.js       (cached, loads once)
│  ├─ cart-drawer.css      (cached, loads once)
│  ├─ /cart.js             (fetch on page load + add item)
│  ├─ /cart/add.js         (add item)
│  ├─ /cart/change.js      (qty update)
│  └─ /apps/cart-drawer    (settings + upsells, once per session)
│
├─ Admin:
│  ├─ /app                 (load once per session)
│  ├─ /app/settings        (load + occasional POST)
│  └─ /app/upsells         (load + occasional POST)
│
└─ Backend:
   ├─ /auth/*              (OAuth, once per install)
   └─ /webhooks            (app uninstall, GDPR events)

Database Load:
├─ Writes: 1-10 per merchant per day (settings changes)
├─ Reads:  1 per customer session (settings fetch via proxy)
└─ Sessions auto-cleanup (> 24hr old deleted)
```

---

## 🎯 Key Metrics

### Performance
| Metric | Target | Current |
|--------|--------|---------|
| Storefront JS load | <1s | ~30KB minified |
| CSS load | <500ms | ~25KB minified |
| Settings API response | <200ms | Database query |
| Drawer open animation | smooth | 320ms cubic-bezier |
| Cart update | instant | Async fetch |

### Scalability
| Metric | Limit | Notes |
|--------|-------|-------|
| Merchants per app | Unlimited | One CartDrawerSettings per shop |
| Upsell products | 6 max | Per merchant config |
| Database size | <10GB | For 10,000+ merchants |
| Concurrent requests | Unlimited | Load balancing via host |

### Costs (Estimated)
| Component | Free Tier | Paid Tier |
|-----------|-----------|-----------|
| Hosting (Heroku) | 550 hrs/month | $7-25/month |
| PostgreSQL | Included | Included |
| Shopify CDN | Included | Included |
| Bandwidth | Included | Included |

---

## 🔐 Security Architecture

```
OAuth 2.0 Flow
├─ Merchant clicks "Install"
├─ Redirected to Shopify consent
├─ Shopify generates auth code
├─ App exchanges code for token
├─ Token stored in PostgreSQL (encrypted)
└─ Session validated on each request

Webhook Verification
├─ Shopify signs webhook with HMAC-SHA256
├─ App verifies signature
├─ Webhook must be valid or rejected
└─ Prevents spoofed webhooks

API Proxy Protection
├─ Shopify signs proxy requests
├─ App verifies signature
├─ Only genuine requests processed
└─ CORS headers prevent abuse

Storefront JS
├─ No secrets in code
├─ Uses only public Shopify endpoints
├─ No API keys embedded
└─ App Proxy used for settings (authenticated)
```

---

## 📋 File Size Reference

| File | Minified | Gzipped | Notes |
|------|----------|---------|-------|
| cart-drawer.js | 30KB | 10KB | Vanilla JS, zero dependencies |
| cart-drawer.css | 25KB | 8KB | Fully scoped, responsive |
| Remix bundle | 200KB | 65KB | Includes React + Polaris (cached) |
| Liquid block | 3KB | 1KB | HTML structure only |
| **Total storefront** | **58KB** | **19KB** | Per page load (except on first visit) |

---

## 🚀 Deployment Pipeline

```
Code Changes
     │
     ↓
Git Push
     │
     ├─ Lint check
     ├─ Build check
     ├─ Prisma migrations
     └─ Deploy to production
           │
           ├─ Node.js server restarts
           ├─ Remix recompiles
           ├─ Next user sees new version
           └─ ✅ Live

Theme Extension
     │
     ↓
shopify app deploy
     │
     ├─ Uploads to Shopify CDN
     ├─ Registers in app
     └─ Instantly available
           │
           ├─ New installations see latest
           ├─ Existing installs auto-update (24-48hrs)
           └─ ✅ Live
```

---

## 🔧 Configuration Cascade

```
Defaults (Hardcoded)
  └─ .env variables
      └─ Theme Editor settings (merchant picks in theme)
          └─ Database settings (merchant picks in admin)
              └─ Dynamic JavaScript (applied at runtime)

Example: Accent Color
┌──────────────────────────────┐
│ CSS Default: #000000         │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ Theme Editor Override        │
│ Merchant picks: #FF5733      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ Database Override            │
│ /app/settings updates: #2563EB
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ Applied to CSS var:          │
│ --ecd-accent: #2563EB        │
└──────────────────────────────┘
```

---

## 🎓 Quick Code Reference

### Add Item Programmatically
```javascript
// From any code calling ECD
ECD.addItem('gid://shopify/ProductVariant/12345', 1, {
  'Size': 'Large',
  'Color': 'Blue'
});
```

### Fetch Current Cart
```javascript
const cart = await ECD.refresh();
console.log(cart.total_price);
console.log(cart.item_count);
```

### Listen for Ready Event
```javascript
document.addEventListener('ecd:ready', (e) => {
  console.log('Cart drawer loaded!', e.detail.api);
});
```

### Update Settings Programmatically
```javascript
// In Remix action (app/routes/app.settings.jsx)
await prisma.cartDrawerSettings.update({
  where: { shop: session.shop },
  data: {
    drawerTitle: 'My Cart',
    accentColor: '#FF5733',
  }
});
```

---

## 📞 Quick Troubleshooting Tree

```
Issue: Drawer not showing
├─ Check: Is Liquid block in theme?
│  └─ No? → Add via Theme Editor → Apps → Cart Drawer
├─ Check: Does /cart.js endpoint work?
│  └─ No? → Shopify issue, contact support
└─ Check: Does App Proxy respond?
   └─ No? → Check logs

Issue: Settings not syncing
├─ Check: Is database updated?
│  └─ Run: select * from "CartDrawerSettings" where shop='...';
├─ Check: Does /apps/cart-drawer endpoint work?
│  └─ No? → Check app proxy in shopify.app.toml
└─ Check: Is JS fetching settings?
   └─ No? → Check browser console for errors

Issue: Performance slow
├─ Check: Storefront JS loaded?
│  └─ > 100KB gzipped? → Minify/optimize
├─ Check: API response time?
│  └─ > 500ms? → Optimize database query or add caching
└─ Check: Database query time?
   └─ > 100ms? → Add indexes or upgrade plan

Issue: App won't deploy
├─ Check: Build successful?
│  └─ Run: npm run build locally
├─ Check: Environment variables set?
│  └─ Run: heroku config or railway variables
└─ Check: Migrations ran?
   └─ Run: heroku run npm run setup
```

---

## 🎯 Success Checklist

Before each deployment:

- [ ] Code builds without errors (`npm run build`)
- [ ] Migrations are up to date (`npm run setup`)
- [ ] Environment variables set correctly
- [ ] Tested locally with `npm run dev`
- [ ] Tested on 2+ themes
- [ ] Tested on mobile
- [ ] No console errors in DevTools
- [ ] App icon and screenshots ready
- [ ] Privacy policy URL set
- [ ] Support email configured

---

## 📚 Documentation Map

| Need | File | Section |
|------|------|---------|
| Quick start | README.md | "Quick Start" |
| Deployment | DEPLOYMENT.md | Section 2+ |
| File details | FILES.md | Each file |
| API reference | shopify-public-app-guide.md | GraphQL, Webhooks |
| Customization | This file | "Customization Examples" |
| Architecture | This file | Top of document |

You have everything needed to build, deploy, and scale! 🚀
