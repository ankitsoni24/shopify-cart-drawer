# Cart Drawer App — Complete File Structure & Documentation

## Project Overview

```
cart-drawer-app/
├── Admin Layer (Remix + React + Polaris)
│   └── app/routes/*.jsx — Admin dashboard, settings, upsell picker
├── Storefront Layer (Theme App Extension)
│   └── extensions/cart-drawer/
│       ├── cart-drawer.liquid — HTML injected into theme
│       ├── cart-drawer.js — Vanilla JS (30KB, zero dependencies)
│       └── cart-drawer.css — Fully scoped styles
├── Backend (Node + Express via Remix)
│   ├── webhooks — GDPR handlers
│   ├── proxy — App proxy for settings/upsells API
│   └── shopify.server.js — OAuth config
└── Database
    └── Prisma — Sessions + CartDrawerSettings
```

---

## Root Files

### `package.json`
**Purpose:** NPM dependencies and scripts  
**Key Scripts:**
- `npm run dev` — Start local dev with tunnel
- `npm run build` — Build for production
- `npm start` — Run production build
- `npm run setup` — Setup Prisma migrations

### `vite.config.js`
**Purpose:** Vite bundler configuration for Remix  
**Key Settings:**
- Middleware mode for local dev
- Path resolution

### `remix.config.js`
**Purpose:** Remix framework configuration  
**Key Settings:**
- Route definitions (flat-routes)
- Asset output paths
- Server build configuration

### `shopify.app.toml`
**Purpose:** Shopify app manifest  
**Configures:**
- API scopes required
- Webhook subscriptions
- App proxy URL
- OAuth redirect URLs

### `.env.example`
**Purpose:** Template for environment variables  
**Key Variables:**
- `SHOPIFY_API_KEY` — From Partner Dashboard
- `SHOPIFY_API_SECRET` — From Partner Dashboard
- `SHOPIFY_APP_URL` — Your app's public URL
- `DATABASE_URL` — PostgreSQL connection string

### `.gitignore`
**Purpose:** Prevent committing sensitive files

### `README.md`
**Purpose:** Project overview and quick start guide

### `DEPLOYMENT.md`
**Purpose:** Complete deployment and production guide

---

## App Layer (`app/`)

### Root Layout: `app/root.jsx`
**Purpose:** HTML shell, loads Polaris CSS  
**Renders:** `<Outlet />` for nested routes

### Admin Layout: `app/routes/app.jsx`
**Purpose:** Embedded app wrapper with navigation  
**Shows:** NavMenu with Dashboard, Settings, Upsells, Analytics links  
**Loads Polaris AppProvider** for consistent styling

### Dashboard: `app/routes/app._index.jsx`
**Purpose:** Main dashboard showing current configuration  
**Displays:**
- Welcome banner with status
- Stats grid (4 features: shipping bar, upsells, sticky ATC, discount)
- Quick setup buttons
- Current configuration card

### Settings: `app/routes/app.settings.jsx`
**Purpose:** Merchant configuration dashboard  
**5 Tabs:**
1. **General** — drawer title, accent color, empty state
2. **Shipping Bar** — free shipping threshold, progress text
3. **Upsells** — enable toggle, section title
4. **Checkout** — checkout button text, discount, notes
5. **Advanced** — sticky ATC, countdown timer

**Tech:**
- Uses Remix `Form` for server-side mutations
- Polaris `Tabs` for section navigation
- `ColorPicker` for accent color selection
- Updates database via Prisma

### Upsells: `app/routes/app.upsells.jsx`
**Purpose:** Pick up to 6 products to show as upsells  
**Features:**
- Shopify resource picker (`shopify.resourcePicker`)
- Product cards with image, title, price, remove button
- Shows 6/6 selected count
- Saves to database as JSON array of product IDs

### Analytics: `app/routes/app.analytics.jsx`
**Purpose:** Placeholder for future analytics  
**Future Metrics:**
- Total carts opened
- Conversion rates
- Average cart value
- Upsells added

### Auth Callback: `app/routes/auth.$.jsx`
**Purpose:** OAuth callback handler  
**Does:** Validates Shopify auth request (handled by `authenticate.admin()`)

### Webhooks: `app/routes/webhooks.jsx`
**Purpose:** Handles Shopify webhooks  
**Webhooks Handled:**
- `APP_UNINSTALLED` — cleanup sessions
- `CUSTOMERS_DATA_REQUEST` — log GDPR request
- `CUSTOMERS_REDACT` — delete customer data
- `SHOP_REDACT` — delete all shop data 48h after uninstall

### App Proxy: `app/routes/proxy.jsx`
**Purpose:** Public API for storefront to fetch settings and upsells  
**Endpoints:**
- `GET /apps/cart-drawer?endpoint=settings` — Returns merchant's settings JSON
- `GET /apps/cart-drawer?endpoint=upsells` — Returns recommended products with pricing

**Auth:** Shopify proxy signature verification (automatic)

### Server Config: `app/shopify.server.js`
**Purpose:** Shopify OAuth and API initialization  
**Sets Up:**
- OAuth strategy (embedded)
- Prisma session storage
- Webhook subscriptions
- Access scopes

### Database: `app/db.server.js`
**Purpose:** Prisma client singleton for server-only code  
**Usage:** `import db from "../db.server"`

---

## Database Layer (`prisma/`)

### Schema: `prisma/schema.prisma`
**Models:**

#### `Session`
```prisma
id            String   @id          // Unique session token
shop          String               // Store domain (mystore.myshopify.com)
state         String               // OAuth state
isOnline      Boolean              // Online vs offline access
scope         String?              // Granted scopes
expires       DateTime?            // Token expiration
accessToken   String               // Shopify API access token
userId        BigInt?              // Admin user ID
firstName     String?
lastName      String?
email         String?
accountOwner  Boolean              // Is account owner
locale        String?              // User's locale
```

#### `CartDrawerSettings`
```prisma
id                     String   @unique
shop                   String   @unique    // Store domain
// Appearance
drawerTitle            String
accentColor            String              // Hex color
buttonTextColor        String
emptyCartMessage       String
emptyCartButtonText    String
emptyCartButtonUrl     String
// Shipping Bar
enableShippingBar      Boolean
freeShippingThreshold  Int                 // In cents
shippingBarText        String              // With {amount} placeholder
shippingUnlockedText   String
// Upsells
enableUpsells          Boolean
upsellTitle            String
upsellProductIds       String              // JSON array of product IDs
// Sticky ATC
enableStickyAtc        Boolean
stickyAtcText          String
// Discount & Notes
enableDiscountField    Boolean
discountPlaceholder    String
checkoutButtonText     String
noteEnabled            Boolean
noteLabel              String
// Countdown
enableCountdown        Boolean
countdownMinutes       Int
countdownText          String              // With {time} placeholder
// Timestamps
createdAt              DateTime
updatedAt              DateTime
```

### Migrations: `prisma/migrations/`
**Purpose:** Database schema version control  
**When to Run:**
```bash
npm run setup  # Runs all pending migrations
```

---

## Theme App Extension (`extensions/cart-drawer/`)

### Extension Config: `shopify.extension.toml`
**Declares:**
- Extension type: `theme`
- Name and handle
- Theme Editor settings (merchant-configurable):
  - `enabled` — toggle on/off
  - `drawer_title` — custom title
  - `free_shipping_threshold` — in dollars
  - `accent_color` — color picker
  - `checkout_button_text`
  - `enable_upsells`
  - `enable_sticky_atc`

### Liquid Block: `blocks/cart-drawer.liquid`
**Purpose:** Injected into Shopify theme (no code editing required)  
**Renders:**
- HTML structure (drawer, overlay, header, items, footer)
- Passes Liquid config to JS via `window.__ECD__`
- Schema for Theme Editor settings

**HTML Elements:**
- `#ecd-root` — Container
- `#ecd-drawer` — Main drawer panel
- `#ecd-overlay` — Dark overlay behind drawer
- `#ecd-header` — Title + close button
- `#ecd-shipping-bar` — Progress bar for free shipping
- `#ecd-countdown` — Urgency timer
- `#ecd-body` — Scrollable content area
- `#ecd-items` — Cart line items (rendered by JS)
- `#ecd-upsells` — Upsell carousel
- `#ecd-footer` — Discount input, subtotal, checkout button
- `#ecd-sticky-atc` — Sticky add-to-cart bar (product pages)

### Styles: `assets/cart-drawer.css`
**Features:**
- Fully namespaced (`.ecd-*` prefix)
- CSS variables for theming:
  - `--ecd-accent` — Button color
  - `--ecd-accent-text` — Button text color
  - `--ecd-width` — Drawer width (default 420px)
  - `--ecd-z` — Z-index
- Animations:
  - Drawer slide-in from right
  - Overlay fade
  - Item animations on add/remove
  - Sticky bar slide-up
- Responsive design (mobile: 100vw width)
- Reduced motion support (`@media (prefers-reduced-motion)`)

**Key Classes:**
```
.ecd-drawer            — Main drawer
.ecd-drawer--open      — Drawer open state
.ecd-overlay--active   — Overlay visible
.ecd-item              — Line item
.ecd-shipping-bar      — Free shipping progress
.ecd-upsells           — Upsell section
.ecd-checkout-btn      — Checkout button
.ecd-sticky-atc        — Sticky ATC bar
```

### JavaScript: `assets/cart-drawer.js`
**Size:** ~30KB minified, zero dependencies  
**Features:**
- Cart API abstraction (`Cart.fetch()`, `Cart.add()`, `Cart.change()`)
- Drawer open/close with animations
- Focus trap (accessibility)
- Form interception (add-to-cart)
- Quantity updates
- Discount code application
- Upsell fetching and rendering
- Order notes
- Sticky ATC bar on product pages
- Countdown timer
- Theme color sync

**Public API (window.ECD):**
```javascript
ECD.open()                         // Open drawer
ECD.close()                        // Close drawer
ECD.toggle()                       // Toggle drawer
ECD.refresh()                      // Reload cart
ECD.addItem(variantId, qty, props) // Add item + open drawer
```

**How It Works:**
1. Loads on page with Liquid-passed config
2. Fetches cart from `/cart.js`
3. Fetches remote settings from App Proxy
4. Intercepts all add-to-cart forms
5. Renders cart items dynamically
6. Listens for variant changes
7. Shows/hides sticky ATC bar based on scroll

---

## Key Workflows

### 1. Merchant Installation

```
Merchant clicks "Install app"
    ↓
Redirected to OAuth consent page
    ↓
Returns to Shopify with auth code
    ↓
App exchanges code for access token
    ↓
Token stored in database via Prisma
    ↓
Default CartDrawerSettings created
    ↓
Merchant sees embedded admin dashboard
```

### 2. Theme Installation

```
Merchant adds "Cart Drawer" block in Theme Editor
    ↓
Liquid block renders (with settings from Theme Editor)
    ↓
JavaScript loads from Shopify's CDN
    ↓
CSS loads and applies styles
    ↓
JS boots: fetches `/cart.js`, initializes event listeners
    ↓
JS calls App Proxy to load remote merchant settings
    ↓
Drawer ready to use
```

### 3. Customer Adds Item

```
Customer clicks "Add to Cart" on product
    ↓
JS intercepts form submission (capture phase)
    ↓
JS calls `/cart/add.js` (Shopify's native API)
    ↓
Cart updates on Shopify's backend
    ↓
JS fetches updated cart from `/cart.js`
    ↓
JS re-renders cart items, totals, shipping bar
    ↓
Drawer opens automatically
```

### 4. Merchant Customizes Settings

```
Merchant changes accent color in /app/settings
    ↓
Form submits to server (Remix action)
    ↓
Server updates CartDrawerSettings in database
    ↓
Browser shows success message
    ↓
Next customer's cart drawer uses new color
    (Settings fetched via App Proxy on page load)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│              SHOPIFY ADMIN DASHBOARD                │
│  (Merchant configures app settings here)            │
│  ├─ Dashboard                                       │
│  ├─ Settings (colors, text, thresholds)           │
│  ├─ Upsell Product Picker                         │
│  └─ Analytics (placeholder)                        │
└────────────────────┬────────────────────────────────┘
                     │ Updates
                     ↓
              ┌────────────────┐
              │  Prisma ORM    │
              │  PostgreSQL    │
              └────────────────┘
                     ▲
                     │ Reads
                     │
┌────────────────────┴────────────────────┐
│        REMIX SERVER (Node.js)           │
│                                         │
│  Routes:                                │
│  • /app/* — Admin dashboard             │
│  • /webhooks — Shopify webhooks        │
│  • /proxy — Settings + upsells API     │
│  • /auth/* — OAuth flow                 │
└────────────────────┬────────────────────┘
                     │
                     │ Serves settings JSON
                     ↓
        ┌────────────────────────────┐
        │   SHOPIFY CDN (storefront)  │
        │                            │
        │  Liquid Block:             │
        │  • HTML structure          │
        │  • Theme Editor settings   │
        │  • Config object           │
        │                            │
        │  JavaScript (30KB):        │
        │  • Cart API integration    │
        │  • Form interception       │
        │  • Rendering logic         │
        │                            │
        │  CSS:                      │
        │  • Drawer styles           │
        │  • Animations              │
        │  • Responsive design       │
        └────────────────────────────┘
                     │
                     │ Fetches cart, settings
                     ↓
        ┌────────────────────────────┐
        │  CUSTOMER'S BROWSER        │
        │                            │
        │  Sees:                     │
        │  • Cart drawer             │
        │  • Free shipping bar       │
        │  • Upsell carousel         │
        │  • Sticky ATC (products)   │
        └────────────────────────────┘
```

---

## File Sizes (Production)

| File | Size | Notes |
|------|------|-------|
| cart-drawer.js | 30KB | Minified, gzipped ~10KB |
| cart-drawer.css | 25KB | Minified, gzipped ~8KB |
| Admin JS bundle | 200KB+ | Includes Remix, React, Polaris (cached by browser) |
| HTML (Liquid) | <10KB | Minimal structure |

Total storefront impact: **~20KB gzipped** (negligible)

---

## Testing Checklist

- [ ] Drawer opens/closes on cart icon click
- [ ] Add to cart → drawer opens automatically
- [ ] Quantity +/- buttons work instantly
- [ ] Remove button works (item fades out)
- [ ] Free shipping bar fills correctly
- [ ] Free shipping message shows when unlocked
- [ ] Upsell products display (first 6)
- [ ] Upsell "Add to cart" works
- [ ] Discount code applies (with valid code)
- [ ] Checkout button redirects to `/checkout`
- [ ] Continue shopping closes drawer
- [ ] Escape key closes drawer
- [ ] Overlay click closes drawer
- [ ] Mobile: drawer is full width
- [ ] Mobile: touch interactions smooth
- [ ] Product page: sticky ATC bar appears when native button scrolls up
- [ ] Product page: sticky ATC bar disappears when scrolled back down
- [ ] Countdown timer: shows and counts down
- [ ] Order note: saves to cart attributes
- [ ] Theme customization: accent color applies to buttons
- [ ] Theme customization: text changes appear

---

## Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot find module '@shopify/polaris'" | Missing dependency | `npm install` |
| "DATABASE_URL not set" | Missing env var | `cp .env.example .env` + fill in |
| "Cart drawer not injecting" | Extension not deployed | `shopify app deploy` |
| "Settings not loading" | App proxy issue | Check `proxy.jsx` + Shopify app config |
| "ATC form not intercepting" | Theme uses custom form | Add `data-ecdIgnore` to form or adjust selector |
| "Discount code not working" | Invalid code | Verify in Shopify admin that code exists |

---

## Next Steps

1. **Run locally** — `npm run dev`
2. **Test dashboard** — customize settings
3. **Test storefront** — add items, open drawer
4. **Deploy** — follow `DEPLOYMENT.md`
5. **Submit to App Store** — follow submission checklist

You have everything needed to build, deploy, and scale a production Shopify app! 🚀
