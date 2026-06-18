# 💳 Adding Paid Plans to Cart Drawer App

Complete guide to add Bronze, Silver, Gold, and Platinum paid plans with recurring billing.

---

## 📋 Plan Tiers Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          PRICING PLANS                          │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│ BRONZE       │ SILVER       │ GOLD         │ PLATINUM         │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│ $9.99/month  │ $19.99/month │ $49.99/month │ $99.99/month    │
│ Free trial   │ Free trial   │ Free trial   │ Free trial       │
│ 7 days       │ 7 days       │ 14 days      │ 30 days          │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│ Features:    │ Everything   │ Everything   │ Everything +     │
│              │ in Bronze +  │ in Silver +  │                  │
│ • Drawer     │              │              │ • Priority       │
│ • 1 color    │ • 5 colors   │ • Unlimited  │   support        │
│ • Basic text │ • Custom     │   colors     │ • API access     │
│ • 3 upsells  │   messages   │ • 10 upsells │ • Custom         │
│              │ • 6 upsells  │              │   integrations   │
│              │ • Analytics  │              │ • Dedicated      │
│              │              │              │   account mgr    │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

---

## 1️⃣ Update Database Schema

**File:** `prisma/schema.prisma`

```prisma
model CartDrawerSettings {
  id                     String   @id @default(cuid())
  shop                   String   @unique
  
  // BILLING INFO
  subscriptionPlan       String   @default("free")    // free, bronze, silver, gold, platinum
  subscriptionId         String?                      // Shopify subscription ID
  subscriptionStatus     String   @default("active")  // active, pending, paused, cancelled
  subscriptionStartDate  DateTime?
  subscriptionNextBill   DateTime?
  trialEnds              DateTime?
  
  // Feature toggles (based on plan)
  colorCustomizationAllowed    Boolean  @default(true)  // Bronze: 1, Silver: 5, Gold: unlimited
  maxCustomColors              Int      @default(1)     // Bronze: 1, Silver: 5, Gold: unlimited
  maxUpsellProducts            Int      @default(3)     // Bronze: 3, Silver: 6, Gold: 10
  enableAdvancedAnalytics      Boolean  @default(false) // Gold+
  enableApiAccess              Boolean  @default(false) // Platinum
  enablePrioritySupport        Boolean  @default(false) // Platinum
  
  // ... rest of existing fields
  drawerTitle            String   @default("Your Cart")
  accentColor            String   @default("#000000")
  // ... other settings
  
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}

model BillingRecord {
  id                String    @id @default(cuid())
  shop              String    @unique
  
  // Subscription details
  subscriptionId    String    @unique
  plan              String    // bronze, silver, gold, platinum
  status            String    // active, pending, paused, cancelled, expired
  
  // Pricing
  amount            Float     // in dollars
  currency          String    @default("USD")
  billingCycle      String    @default("EVERY_30_DAYS")  // EVERY_30_DAYS, ANNUAL
  
  // Dates
  startDate         DateTime
  renewalDate       DateTime
  cancelledDate     DateTime?
  
  // Trial
  trialDays         Int
  trialStartDate    DateTime?
  trialEnded        DateTime?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

Run migration:
```bash
npm run setup
# or
npx prisma migrate dev --name add_billing
```

---

## 2️⃣ Define Plans Configuration

**File:** `app/billing.server.js` (new file)

```javascript
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    currency: "USD",
    billingCycle: null,
    trialDays: 0,
    features: {
      maxColors: 1,
      maxUpsells: 3,
      analytics: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  bronze: {
    name: "Bronze",
    price: 9.99,
    currency: "USD",
    billingCycle: "EVERY_30_DAYS",
    trialDays: 7,
    recurringDetails: {
      interval: "EVERY_30_DAYS",
      intervalCount: 1,
    },
    features: {
      maxColors: 1,
      maxUpsells: 3,
      analytics: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  silver: {
    name: "Silver",
    price: 19.99,
    currency: "USD",
    billingCycle: "EVERY_30_DAYS",
    trialDays: 7,
    recurringDetails: {
      interval: "EVERY_30_DAYS",
      intervalCount: 1,
    },
    features: {
      maxColors: 5,
      maxUpsells: 6,
      analytics: true,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  gold: {
    name: "Gold",
    price: 49.99,
    currency: "USD",
    billingCycle: "EVERY_30_DAYS",
    trialDays: 14,
    recurringDetails: {
      interval: "EVERY_30_DAYS",
      intervalCount: 1,
    },
    features: {
      maxColors: 999, // unlimited
      maxUpsells: 10,
      analytics: true,
      apiAccess: true,
      prioritySupport: false,
    },
  },
  platinum: {
    name: "Platinum",
    price: 99.99,
    currency: "USD",
    billingCycle: "EVERY_30_DAYS",
    trialDays: 30,
    recurringDetails: {
      interval: "EVERY_30_DAYS",
      intervalCount: 1,
    },
    features: {
      maxColors: 999, // unlimited
      maxUpsells: 10,
      analytics: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

export function getPlanFeatures(planName) {
  const plan = PLANS[planName] || PLANS.free;
  return plan.features;
}

export function isPlanFeatureAvailable(planName, feature) {
  const features = getPlanFeatures(planName);
  return features[feature] === true || features[feature] > 0;
}
```

---

## 3️⃣ Add Plans Page to Admin

**File:** `app/routes/app.billing.jsx` (new file)

```jsx
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, InlineGrid, Text, Button,
  Banner, Divider, Badge, Box, InlineStack,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { PLANS } from "../billing.server";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  
  // Check current subscription
  const settings = await prisma.cartDrawerSettings.findUnique({
    where: { shop: session.shop },
  });

  const billingCheck = await billing.check({
    plans: ["Bronze", "Silver", "Gold", "Platinum"],
    isTest: process.env.NODE_ENV !== "production",
  });

  return json({
    currentPlan: settings?.subscriptionPlan || "free",
    activeSubscription: billingCheck.appSubscriptions?.[0] || null,
    hasActivePayment: billingCheck.hasActivePayment,
    plans: PLANS,
    shop: session.shop,
  });
};

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planName = formData.get("plan");
  const plan = PLANS[planName];

  if (!plan || plan.price === 0) {
    return json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    // Request subscription
    const response = await billing.request({
      plan: plan.name,
      isTest: process.env.NODE_ENV !== "production",
      returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing?plan=${planName}`,
    });

    return json({ confirmationUrl: response.confirmationUrl });
  } catch (err) {
    console.error("Billing error:", err);
    return json({ error: err.message }, { status: 500 });
  }
};

function PlanCard({ plan, planKey, currentPlan, onSelect, hasPayment }) {
  const isCurrentPlan = currentPlan === planKey;
  const isFree = plan.price === 0;
  
  return (
    <Card>
      <BlockStack gap="300">
        <div style={{ textAlign: "center" }}>
          <Text variant="headingLg" as="h3">{plan.name}</Text>
          {isCurrentPlan && <Badge tone="success">Current Plan</Badge>}
        </div>
        
        <Divider />
        
        {isFree ? (
          <Text variant="headingMd" as="p" alignment="center">Free</Text>
        ) : (
          <div style={{ textAlign: "center" }}>
            <Text variant="headingMd" as="p">
              ${plan.price.toFixed(2)}/month
            </Text>
            <Text variant="bodySm" tone="subdued">
              {plan.trialDays} day free trial
            </Text>
          </div>
        )}
        
        <Divider />
        
        <BlockStack gap="200">
          {Object.entries(plan.features).map(([key, value]) => (
            <InlineStack key={key} align="space-between">
              <Text variant="bodySm">{formatFeatureName(key)}</Text>
              <Badge tone={value ? "success" : "subdued"}>
                {formatFeatureValue(key, value)}
              </Badge>
            </InlineStack>
          ))}
        </BlockStack>
        
        <Divider />
        
        {isFree ? (
          <Button variant="primary" disabled={isCurrentPlan} fullWidth>
            {isCurrentPlan ? "Current Plan" : "Downgrade to Free"}
          </Button>
        ) : (
          <form method="post" style={{ width: "100%" }}>
            <input type="hidden" name="plan" value={planKey} />
            <Button
              variant={isCurrentPlan ? "secondary" : "primary"}
              submit
              disabled={isCurrentPlan}
              fullWidth
            >
              {isCurrentPlan ? "Current Plan" : `Choose ${plan.name}`}
            </Button>
          </form>
        )}
      </BlockStack>
    </Card>
  );
}

function formatFeatureName(key) {
  const names = {
    maxColors: "Custom Colors",
    maxUpsells: "Upsell Products",
    analytics: "Advanced Analytics",
    apiAccess: "API Access",
    prioritySupport: "Priority Support",
  };
  return names[key] || key;
}

function formatFeatureValue(key, value) {
  if (typeof value === "boolean") return value ? "✓" : "✗";
  if (key === "maxColors" && value === 999) return "Unlimited";
  if (key === "maxUpsells" && value === 999) return "Unlimited";
  return value;
}

export default function Billing() {
  const { currentPlan, activeSubscription, hasActivePayment, plans, shop } = useLoaderData();
  const fetcher = useFetcher();

  return (
    <Page title="Billing & Plans" backAction={{ url: "/app" }}>
      <Layout>
        {fetcher.data?.confirmationUrl && (
          <Layout.Section>
            <Banner tone="info">
              <p>Redirecting to complete your subscription...</p>
            </Banner>
          </Layout.Section>
        )}

        {activeSubscription && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Current Subscription</Text>
                <Divider />
                <InlineGrid columns={2} gap="300">
                  <div>
                    <Text tone="subdued" variant="bodySm">Plan</Text>
                    <Text variant="bodyMd" fontWeight="bold">
                      {activeSubscription.lineItems[0]?.plan?.name}
                    </Text>
                  </div>
                  <div>
                    <Text tone="subdued" variant="bodySm">Status</Text>
                    <Badge tone="success">Active</Badge>
                  </div>
                  <div>
                    <Text tone="subdued" variant="bodySm">Next Billing Date</Text>
                    <Text variant="bodyMd">
                      {new Date(activeSubscription.lineItems[0]?.billingCycle?.activatedOn).toLocaleDateString()}
                    </Text>
                  </div>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Text variant="headingLg">Choose Your Plan</Text>
          <Text tone="subdued" as="p">
            Upgrade anytime. Cancel anytime. No long-term contracts.
          </Text>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="300">
            {Object.entries(plans).map(([key, plan]) => (
              <PlanCard
                key={key}
                plan={plan}
                planKey={key}
                currentPlan={currentPlan}
                hasPayment={hasActivePayment}
              />
            ))}
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Frequently Asked Questions</Text>
              <Divider />
              
              <div>
                <Text variant="bodyMd" fontWeight="bold">When will I be charged?</Text>
                <Text variant="bodySm" tone="subdued">
                  After your free trial ends. You can cancel anytime before that.
                </Text>
              </div>

              <div>
                <Text variant="bodyMd" fontWeight="bold">Can I change plans?</Text>
                <Text variant="bodySm" tone="subdued">
                  Yes! Upgrade or downgrade anytime. Changes take effect immediately.
                </Text>
              </div>

              <div>
                <Text variant="bodyMd" fontWeight="bold">Can I cancel?</Text>
                <Text variant="bodySm" tone="subdued">
                  Yes! Cancel anytime. You'll retain access until your billing cycle ends.
                </Text>
              </div>

              <div>
                <Text variant="bodyMd" fontWeight="bold">Do you offer annual billing?</Text>
                <Text variant="bodySm" tone="subdued">
                  Contact support@example.com for annual pricing and custom enterprise plans.
                </Text>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

---

## 4️⃣ Feature Gating

**File:** `app/routes/app.settings.jsx` (modify existing)

Add this at the top of the component to check subscription:

```jsx
import { prisma, authenticate } from "../shopify.server";
import { getPlanFeatures } from "../billing.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await prisma.cartDrawerSettings.findUnique({
    where: { shop: session.shop },
  });

  const features = getPlanFeatures(settings?.subscriptionPlan || "free");

  return json({ 
    settings,
    features,
    isGoldPlus: ["gold", "platinum"].includes(settings?.subscriptionPlan),
    isPlatinum: settings?.subscriptionPlan === "platinum",
  });
};

export default function Settings() {
  const { settings, features, isGoldPlus, isPlatinum } = useLoaderData();

  return (
    <Page title="Settings">
      <Layout>
        {/* Show upsell banner if on free plan */}
        {!isGoldPlus && (
          <Layout.Section>
            <Banner tone="info" action={{ content: "Upgrade", url: "/app/billing" }}>
              <p>Advanced Analytics is available on Gold plan and higher.</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Disable color customization if limited */}
        <TextField
          label="Accent Color"
          disabled={features.maxColors < 5}
          help={features.maxColors === 1 ? "Upgrade to Silver for more colors" : undefined}
        />
      </Layout>
    </Page>
  );
}
```

---

## 5️⃣ Billing Webhook Handler

**File:** `app/routes/webhooks.jsx` (add to action)

```javascript
import { authenticate, prisma } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_SUBSCRIPTION_UPDATE": {
      const { id, test, lineItems, status, returnUrl } = payload;
      
      const plan = lineItems[0]?.plan?.name?.toLowerCase() || "free";
      
      await prisma.cartDrawerSettings.update({
        where: { shop },
        data: {
          subscriptionPlan: plan,
          subscriptionId: id,
          subscriptionStatus: status,
          subscriptionNextBill: lineItems[0]?.billingCycle?.nextBillingDate
            ? new Date(lineItems[0].billingCycle.nextBillingDate)
            : null,
        },
      });

      console.log(`Updated subscription for ${shop}: ${plan} (${status})`);
      break;
    }

    case "APP_SUBSCRIPTION_CANCELLED": {
      const { id } = payload;
      
      await prisma.cartDrawerSettings.update({
        where: { shop },
        data: {
          subscriptionPlan: "free",
          subscriptionStatus: "cancelled",
        },
      });

      console.log(`Cancelled subscription for ${shop}`);
      break;
    }

    // ... existing cases (APP_UNINSTALLED, GDPR, etc.)
  }

  return new Response(null, { status: 200 });
};
```

---

## 6️⃣ Register Billing Webhooks

**File:** `shopify.app.toml` (add these)

```toml
[[webhooks.subscriptions]]
topics = ["app_subscriptions/update"]
uri = "/webhooks"

[[webhooks.subscriptions]]
topics = ["app_subscriptions/cancel"]
uri = "/webhooks"
```

---

## 7️⃣ Update Navigation

**File:** `app/routes/app.jsx`

```jsx
<NavMenu>
  <Link to="/app" rel="home">Dashboard</Link>
  <Link to="/app/billing">💳 Billing & Plans</Link>
  <Link to="/app/settings">Settings</Link>
  <Link to="/app/upsells">Upsells</Link>
  <Link to="/app/analytics">Analytics</Link>
</NavMenu>
```

---

## 8️⃣ Feature Restrictions in Storefront

**File:** `extensions/cart-drawer/assets/cart-drawer.js`

Add this after Render object:

```javascript
const PlanRestrictions = {
  free: {
    maxUpsells: 3,
    analyticsEnabled: false,
  },
  bronze: {
    maxUpsells: 3,
    analyticsEnabled: false,
  },
  silver: {
    maxUpsells: 6,
    analyticsEnabled: true,
  },
  gold: {
    maxUpsells: 10,
    analyticsEnabled: true,
  },
  platinum: {
    maxUpsells: 10,
    analyticsEnabled: true,
  },
};

// In renderUpsells():
async renderUpsells(cart) {
  if (!SETTINGS.enableUpsells) return;
  
  const plan = SETTINGS.subscriptionPlan || "free";
  const restrictions = PlanRestrictions[plan];
  
  // ... existing code, but limit to:
  filtered.slice(0, restrictions.maxUpsells)
}
```

---

## 9️⃣ Update Dashboard to Show Plan

**File:** `app/routes/app._index.jsx`

```jsx
import { prisma, authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await prisma.cartDrawerSettings.findUnique({
    where: { shop: session.shop },
  });

  return json({
    currentPlan: settings?.subscriptionPlan || "free",
    subscriptionStatus: settings?.subscriptionStatus,
    // ... other data
  });
};

export default function Dashboard() {
  const { currentPlan, subscriptionStatus } = useLoaderData();

  const planColors = {
    free: "subdued",
    bronze: "#9B6D42",
    silver: "#C0C0C0",
    gold: "#FFD700",
    platinum: "#E5E4E2",
  };

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={2} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text tone="subdued">Current Plan</Text>
                <div style={{ 
                  display: "flex", 
                  gap: "10px", 
                  alignItems: "center" 
                }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: planColors[currentPlan],
                  }} />
                  <Text variant="headingMd" fontWeight="bold">
                    {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                  </Text>
                </div>
                <Button url="/app/billing" variant="primary">
                  {currentPlan === "free" ? "Upgrade" : "Manage"}
                </Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text tone="subdued">Status</Text>
                <Badge tone={subscriptionStatus === "active" ? "success" : "warning"}>
                  {subscriptionStatus || "Inactive"}
                </Badge>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>
        
        {/* ... rest of dashboard */}
      </Layout>
    </Page>
  );
}
```

---

## 🔟 Protect Routes Behind Paywall

**File:** `app/routes/app.analytics.jsx` (example)

```jsx
import { redirect } from "@remix-run/node";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await prisma.cartDrawerSettings.findUnique({
    where: { shop: session.shop },
  });

  // Only Gold+ can access analytics
  if (!["gold", "platinum"].includes(settings?.subscriptionPlan || "free")) {
    return redirect("/app/billing");
  }

  // ... load analytics data
  return json({ /* analytics */ });
};
```

---

## 💻 Setup Billing in Shopify Dashboard

1. Go to **Shopify Partner Dashboard**
2. Select your app
3. Go to **Configuration**
4. In **Admin API access scopes**, add:
   ```
   write_orders
   read_billing
   write_billing
   ```
5. Save scopes
6. Redeploy app

---

## 📊 Database Migrations

Run this after updating schema.prisma:

```bash
npx prisma migrate dev --name add_billing_support
```

---

## 🎯 Feature Checklist by Plan

```
                  FREE    BRONZE   SILVER   GOLD     PLATINUM
Drawer            ✓       ✓        ✓        ✓        ✓
Shipping Bar      ✓       ✓        ✓        ✓        ✓
Discount Codes    ✓       ✓        ✓        ✓        ✓
Order Notes       ✓       ✓        ✓        ✓        ✓
Colors            1       1        5        ∞        ∞
Upsells           3       3        6        10       10
Analytics        ✗        ✗        ✓        ✓        ✓
API Access       ✗        ✗        ✗        ✓        ✓
Priority Support ✗        ✗        ✗        ✗        ✓
Trial Days        0       7        7        14       30
Price            FREE   $9.99   $19.99  $49.99   $99.99
```

---

## 📧 Example Billing Emails (Optional)

Add billing notification emails when:
- Trial starting
- Trial ending (3 days before)
- Subscription activated
- Subscription renewed
- Subscription cancelled

Use Shopify's email API or Sendgrid/Mailgun.

---

## 🚀 Deployment Checklist

- [ ] Update prisma/schema.prisma
- [ ] Run migrations: `npm run setup`
- [ ] Create `app/billing.server.js`
- [ ] Create `app/routes/app.billing.jsx`
- [ ] Update `app/shopify.server.js` for billing webhooks
- [ ] Update `shopify.app.toml` with billing scope
- [ ] Add webhook subscriptions for billing events
- [ ] Test on test store with test credit card
- [ ] Deploy to production
- [ ] Monitor webhook logs

---

## 💳 Testing Billing

### Test Cards (Use in Partner Dashboard)
```
Visa:           4111 1111 1111 1111
Mastercard:     5555 5555 5555 4444
American Exp:   3782 822463 10005
```

Any future date for expiry, any 3-digit CVC.

### Test Subscription Flow
1. Install app on test store
2. Go to `/app/billing`
3. Click "Choose Bronze"
4. Complete payment with test card
5. Check if subscription is active

---

## 📞 Billing Errors to Handle

```javascript
// Handle common billing errors
try {
  await billing.request({ plan: "Bronze", ... });
} catch (err) {
  if (err.message.includes("SHOP_BILLING_CONFLICT")) {
    // Shop already has active subscription
    return redirect("/app/billing");
  }
  if (err.message.includes("SHOP_NOT_ELIGIBLE")) {
    // Shop not eligible for billing
    return json({ error: "Your store is not eligible for paid plans" });
  }
  // Unknown error
  return json({ error: "Billing error. Please try again." });
}
```

---

## ✨ Revenue Potential

With these plans:
```
100 merchants
├─ 10% on Platinum      = 10 × $99.99  = $1,000/mo
├─ 15% on Gold          = 15 × $49.99  = $750/mo
├─ 30% on Silver        = 30 × $19.99  = $600/mo
├─ 30% on Bronze        = 30 × $9.99   = $300/mo
└─ 15% free             = 15 × $0      = $0/mo
                          Total         = $2,650/month
```

**Scales to:**
- 1,000 merchants = $26,500/month
- 10,000 merchants = $265,000/month

---

## 🎓 Next Steps

1. Update database schema ✓
2. Create billing.server.js ✓
3. Create billing page ✓
4. Add feature restrictions ✓
5. Test on test store ✓
6. Deploy to production ✓
7. Monitor subscription webhooks ✓
8. Market paid plans ✓

You're ready to add paid plans! 💰
