# Shopify Public App — Complete Developer Guide

---

## Table of Contents

1. [OAuth + Session Handling](#1-oauth--session-handling)
2. [Building the Admin UI with Polaris](#2-building-the-admin-ui-with-polaris)
3. [GraphQL Queries & Mutations](#3-graphql-queries--mutations)
4. [Webhooks Setup](#4-webhooks-setup)
5. [Billing & Subscriptions](#5-billing--subscriptions)
6. [Checkout Extensions](#6-checkout-extensions)

---

## 1. OAuth + Session Handling

### How Shopify OAuth Works (Public Apps)

Shopify uses OAuth 2.0. When a merchant installs your app:
1. Shopify redirects to your `/auth` route with a `shop` param
2. Your app redirects to Shopify's OAuth consent page
3. Shopify redirects back with a `code`
4. You exchange the code for a permanent access token
5. Token is stored in your DB for future API calls

### Setup with `@shopify/shopify-app-remix`

```bash
npm install @shopify/shopify-app-remix @shopify/polaris
```

**`app/shopify.server.js`** — core config:

```js
import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      // Register webhooks after auth
      shopify.registerWebhooks({ session });
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true, // Token Exchange (recommended)
  },
});

export default shopify;
export const apiVersion = LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
```

### Prisma Session Schema

```prisma
// prisma/schema.prisma
model Session {
  id          String    @id
  shop        String
  state       String
  isOnline    Boolean   @default(false)
  scope       String?
  expires     DateTime?
  accessToken String
  userId      BigInt?
  firstName   String?
  lastName    String?
  email       String?
  accountOwner Boolean  @default(false)
  locale      String?
  collaborator Boolean? @default(false)
  emailVerified Boolean? @default(false)
}
```

### Auth Routes (Remix)

**`app/routes/auth.$.jsx`** — handles the OAuth callback:

```js
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
```

**`app/routes/auth.login/route.jsx`** — login page:

```js
import { login } from "../../shopify.server";

export const loader = async ({ request }) => {
  const errors = login(request);
  return { errors };
};
```

### Using Auth in Loaders/Actions

```js
// In any loader or action
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // `admin` = GraphQL client
  // `session` = { shop, accessToken, scope, ... }

  const response = await admin.graphql(`{ shop { name } }`);
  const data = await response.json();

  return { shopName: data.data.shop.name };
};
```

### Token Exchange (Recommended for Embedded Apps)

Token Exchange avoids redirect-based OAuth for embedded apps. Enable it in `shopify.server.js`:

```js
future: {
  unstable_newEmbeddedAuthStrategy: true,
}
```

This uses the session token from App Bridge instead of traditional OAuth redirects, creating a seamless embedded experience.

### Environment Variables

```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-tunnel.trycloudflare.com
SCOPES=read_products,write_orders
DATABASE_URL=postgresql://...
```

---

## 2. Building the Admin UI with Polaris

### Setup

Polaris is auto-included in the Remix scaffold. For manual setup:

```bash
npm install @shopify/polaris @shopify/app-bridge-react
```

**`app/root.jsx`** — wrap app with providers:

```jsx
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <Outlet />
    </AppProvider>
  );
}
```

### Embedded App Frame

```jsx
// app/routes/app.jsx — wrapper for embedded pages
import { NavMenu } from "@shopify/app-bridge-react";
import { Outlet } from "@remix-run/react";

export default function AppLayout() {
  return (
    <>
      <NavMenu>
        <a href="/app" rel="home">Dashboard</a>
        <a href="/app/products">Products</a>
        <a href="/app/settings">Settings</a>
      </NavMenu>
      <Outlet />
    </>
  );
}
```

### Common UI Patterns

#### Page with Data Table

```jsx
import {
  Page, Card, DataTable, Button, Badge, EmptyState
} from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query { products(first: 10) { nodes { id title status } } }
  `);
  const { data } = await response.json();
  return { products: data.products.nodes };
};

export default function ProductsPage() {
  const { products } = useLoaderData();

  const rows = products.map(p => [
    p.title,
    <Badge tone={p.status === "ACTIVE" ? "success" : "warning"}>
      {p.status}
    </Badge>,
    <Button url={`/app/products/${p.id}`}>Edit</Button>
  ]);

  return (
    <Page
      title="Products"
      primaryAction={{ content: "Add product", url: "/app/products/new" }}
    >
      <Card>
        {products.length === 0 ? (
          <EmptyState
            heading="No products yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Add your first product to get started.</p>
          </EmptyState>
        ) : (
          <DataTable
            columnContentTypes={["text", "text", "text"]}
            headings={["Title", "Status", "Action"]}
            rows={rows}
          />
        )}
      </Card>
    </Page>
  );
}
```

#### Form with Validation

```jsx
import { Page, Card, FormLayout, TextField, Select, Button, Banner } from "@shopify/polaris";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const title = formData.get("title");

  if (!title) return { error: "Title is required" };

  // Do something with admin API
  return { success: true };
};

export default function NewProductPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const [title, setTitle] = useState("");

  const isSubmitting = navigation.state === "submitting";

  return (
    <Page title="New Product" backAction={{ url: "/app/products" }}>
      <Card>
        {actionData?.error && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}
        <Form method="post">
          <FormLayout>
            <TextField
              label="Title"
              name="title"
              value={title}
              onChange={setTitle}
              autoComplete="off"
            />
            <Button submit loading={isSubmitting} variant="primary">
              Save Product
            </Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
```

#### Modal + Toast

```jsx
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";

export default function MyPage() {
  const shopify = useAppBridge();
  const [active, setActive] = useState(false);

  const handleConfirm = useCallback(async () => {
    setActive(false);
    shopify.toast.show("Action completed!", { duration: 3000 });
  }, [shopify]);

  return (
    <>
      <Button onClick={() => setActive(true)}>Open Modal</Button>

      {active && (
        <Modal id="confirm-modal">
          <p style={{ padding: "1rem" }}>Are you sure?</p>
          <TitleBar title="Confirm Action">
            <button onClick={() => setActive(false)}>Cancel</button>
            <button variant="primary" onClick={handleConfirm}>Confirm</button>
          </TitleBar>
        </Modal>
      )}
    </>
  );
}
```

---

## 3. GraphQL Queries & Mutations

### Making Requests

The `admin.graphql()` client is available after `authenticate.admin(request)`:

```js
const { admin } = await authenticate.admin(request);

// Simple query
const response = await admin.graphql(`
  query {
    shop {
      name
      email
      currencyCode
    }
  }
`);
const { data, errors } = await response.json();
```

### Queries with Variables

```js
const response = await admin.graphql(
  `#graphql
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      title
      descriptionHtml
      status
      variants(first: 10) {
        nodes {
          id
          title
          price
          inventoryQuantity
        }
      }
      images(first: 5) {
        nodes {
          id
          url
          altText
        }
      }
    }
  }`,
  {
    variables: { id: "gid://shopify/Product/123456789" }
  }
);

const { data } = await response.json();
const product = data.product;
```

### Pagination with cursors

```js
// Cursor-based pagination (Shopify's standard)
const response = await admin.graphql(
  `#graphql
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        status
      }
    }
  }`,
  { variables: { first: 10, after: null } }
);

const { data } = await response.json();
const { nodes, pageInfo } = data.products;

// Pass pageInfo.endCursor as `after` for next page
```

### Mutations

```js
// Create a product
const response = await admin.graphql(
  `#graphql
  mutation CreateProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }`,
  {
    variables: {
      input: {
        title: "New Product",
        status: "DRAFT",
        variants: [{ price: "29.99" }]
      }
    }
  }
);

const { data } = await response.json();
const { product, userErrors } = data.productCreate;

if (userErrors.length > 0) {
  // Handle validation errors from Shopify
  throw new Error(userErrors[0].message);
}
```

### Useful Queries Reference

```graphql
# Orders with line items
query GetOrders($first: Int!) {
  orders(first: $first, sortKey: CREATED_AT, reverse: true) {
    nodes {
      id
      name
      email
      totalPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 5) {
        nodes {
          title
          quantity
          variant { price }
        }
      }
    }
  }
}

# Customers
query GetCustomers($query: String) {
  customers(first: 10, query: $query) {
    nodes {
      id
      displayName
      email
      numberOfOrders
      totalSpentV2 { amount currencyCode }
    }
  }
}

# Metafields
query GetMetafields($ownerId: ID!) {
  product(id: $ownerId) {
    metafields(first: 10, namespace: "my_app") {
      nodes {
        id
        key
        value
        type
      }
    }
  }
}
```

### Bulk Operations (for large datasets)

```js
// Start a bulk query
const bulkResponse = await admin.graphql(`
  mutation {
    bulkOperationRunQuery(
      query: """
        { products { edges { node { id title } } } }
      """
    ) {
      bulkOperation { id status }
      userErrors { field message }
    }
  }
`);

// Poll until complete, then download the JSONL result URL
// Shopify sends a webhook (BULK_OPERATIONS_FINISH) when done
```

---

## 4. Webhooks Setup

### Register Webhooks in TOML

The simplest approach — declare in `shopify.app.toml`:

```toml
[[webhooks.subscriptions]]
topics = ["orders/create"]
uri = "/webhooks"

[[webhooks.subscriptions]]
topics = ["products/update"]
uri = "/webhooks"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
uri = "/webhooks"

# GDPR required webhooks
[[webhooks.subscriptions]]
topics = ["customers/data_request"]
uri = "/webhooks"

[[webhooks.subscriptions]]
topics = ["customers/redact"]
uri = "/webhooks"

[[webhooks.subscriptions]]
topics = ["shop/redact"]
uri = "/webhooks"
```

### Webhook Handler Route

```js
// app/routes/webhooks.jsx
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, session, payload, admin } =
    await authenticate.webhook(request);

  // authenticate.webhook() verifies HMAC signature automatically

  switch (topic) {
    case "ORDERS_CREATE":
      await handleOrderCreate(payload, shop);
      break;

    case "PRODUCTS_UPDATE":
      await handleProductUpdate(payload, shop);
      break;

    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      break;

    // GDPR webhooks (required for App Store)
    case "CUSTOMERS_DATA_REQUEST":
      // Log the request — you have 30 days to respond
      console.log("Customer data request for shop:", shop, payload);
      break;

    case "CUSTOMERS_REDACT":
      // Delete customer data from your DB
      await db.customerData.deleteMany({
        where: { shop, customerId: payload.customer.id }
      });
      break;

    case "SHOP_REDACT":
      // Delete all shop data (48hrs after uninstall)
      await db.shopData.deleteMany({ where: { shop } });
      break;

    default:
      console.log("Unhandled webhook topic:", topic);
  }

  return new Response(null, { status: 200 });
};

async function handleOrderCreate(payload, shop) {
  // payload is the full order object
  console.log(`New order ${payload.name} for ${shop}`);
  await db.order.create({
    data: {
      shopifyId: payload.id.toString(),
      shop,
      total: payload.total_price,
    }
  });
}
```

### Register Webhooks Programmatically

```js
// In afterAuth hook or a setup route
import { shopify } from "../shopify.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const response = await shopify.registerWebhooks({ session });
  console.log("Webhook registration:", response);

  return json({ success: true });
};
```

### Event Bridge / PubSub (for high volume)

For high-volume webhooks, use EventBridge or Google PubSub instead of HTTP:

```toml
[[webhooks.subscriptions]]
topics = ["orders/create"]
uri = "arn:aws:events:us-east-1:123456789:event-bus/shopify"
filter = "online_store_producer"
```

---

## 5. Billing & Subscriptions

### Types of Billing

| Type | Use case |
|---|---|
| `appSubscription` | Recurring monthly/annual plan |
| `oneTimePurchase` | Single charge |
| `usageCharge` | Metered billing (pay per use) |

### Recurring Subscription

```js
// app/routes/app.billing.jsx
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { redirect } from "@remix-run/node";

export const PLANS = {
  BASIC: {
    name: "Basic",
    amount: 9.99,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
  },
  PRO: {
    name: "Pro",
    amount: 29.99,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
  },
};

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  // Check current billing status
  const billingCheck = await billing.check({
    plans: [PLANS.BASIC.name, PLANS.PRO.name],
    isTest: process.env.NODE_ENV !== "production",
  });

  return {
    hasSubscription: billingCheck.hasActivePayment,
    activeSubscription: billingCheck.appSubscriptions?.[0] || null,
  };
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan"); // "BASIC" or "PRO"

  const selectedPlan = PLANS[plan];

  // Redirect to Shopify billing confirmation page
  await billing.require({
    plans: [selectedPlan.name],
    isTest: process.env.NODE_ENV !== "production",
    onFailure: async () => {
      // Called when merchant doesn't have the plan — request it
      return billing.request({
        plan: selectedPlan.name,
        isTest: process.env.NODE_ENV !== "production",
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/confirm`,
      });
    },
  });

  return redirect("/app");
};
```

**Define plans in `shopify.server.js`:**

```js
const shopify = shopifyApp({
  // ...other config
  billing: {
    "Basic": {
      amount: 9.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      trialDays: 7,
    },
    "Pro": {
      amount: 29.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      trialDays: 7,
    },
  },
});
```

### Protect Routes Behind Billing

```js
// Middleware pattern — redirect to billing if not subscribed
export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  await billing.require({
    plans: ["Basic", "Pro"],
    isTest: true,
    onFailure: () => redirect("/app/billing"),
  });

  // User has an active plan — proceed
  return { data: "premium content" };
};
```

### Usage-Based Billing

```js
// Report usage charges
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Find the active usage subscription ID
  const subsResponse = await admin.graphql(`
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          lineItems {
            id
            plan { pricingDetails { ... on AppUsagePricing { terms } } }
          }
        }
      }
    }
  `);

  // Create a usage charge
  await admin.graphql(
    `#graphql
    mutation CreateUsageCharge($subscriptionLineItemId: ID!, $description: String!, $price: MoneyInput!) {
      appUsageRecordCreate(
        subscriptionLineItemId: $subscriptionLineItemId
        description: $description
        price: $price
      ) {
        appUsageRecord { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/123",
        description: "API call charge",
        price: { amount: 0.05, currencyCode: "USD" }
      }
    }
  );
};
```

### Cancel Subscription

```js
const response = await admin.graphql(
  `#graphql
  mutation CancelSubscription($id: ID!) {
    appSubscriptionCancel(id: $id) {
      appSubscription { id status }
      userErrors { field message }
    }
  }`,
  { variables: { id: "gid://shopify/AppSubscription/123" } }
);
```

---

## 6. Checkout Extensions

### Overview

Checkout Extensions let your app add UI to Shopify's checkout without redirecting customers away. They run in a sandboxed environment with React-like components.

```bash
# Create a checkout extension
shopify app generate extension
# Choose: Checkout UI Extension
```

### File Structure

```
extensions/
└── my-checkout-extension/
    ├── shopify.extension.toml
    └── src/
        └── Checkout.jsx
```

**`shopify.extension.toml`:**

```toml
api_version = "2024-10"
name = "My Checkout Extension"

[[extensions]]
type = "ui_extension"
name = "Order Warranty Upsell"
handle = "order-warranty"

  [[extensions.targeting]]
  module = "./src/Checkout.jsx"
  target = "purchase.checkout.block.render"
```

### Extension Component

```jsx
// extensions/my-checkout-extension/src/Checkout.jsx
import {
  reactExtension,
  useCartLines,
  useApplyCartLinesChange,
  useSettings,
  BlockStack,
  InlineLayout,
  Image,
  Text,
  Button,
  Banner,
  useExtensionCapability,
  useBuyerJourneyIntercept,
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";

export default reactExtension(
  "purchase.checkout.block.render",
  () => <WarrantyUpsell />
);

function WarrantyUpsell() {
  const cartLines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Extension settings (configured in Partner Dashboard)
  const { warrantyVariantId, warrantyPrice } = useSettings();

  const handleAddWarranty = async () => {
    setLoading(true);

    const result = await applyCartLinesChange({
      type: "addCartLine",
      merchandiseId: warrantyVariantId,
      quantity: 1,
    });

    if (result.type === "success") {
      setAdded(true);
    }

    setLoading(false);
  };

  if (added) {
    return (
      <Banner status="success">
        <Text>Warranty added to your order!</Text>
      </Banner>
    );
  }

  return (
    <BlockStack spacing="base">
      <Text size="medium" emphasis="bold">
        Protect Your Purchase
      </Text>
      <InlineLayout columns={["fill", "auto"]}>
        <Text>
          Add a 2-year warranty for {warrantyPrice}
        </Text>
        <Button
          kind="secondary"
          loading={loading}
          onPress={handleAddWarranty}
        >
          Add Warranty
        </Button>
      </InlineLayout>
    </BlockStack>
  );
}
```

### Intercept Buyer Journey (Validation)

```jsx
import { useBuyerJourneyIntercept } from "@shopify/ui-extensions-react/checkout";

function AgeVerification() {
  const [verified, setVerified] = useState(false);

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && !verified) {
      return {
        behavior: "block",
        reason: "Age verification required",
        errors: [
          {
            message: "Please confirm you are 18 or older.",
            target: "$.cart",
          },
        ],
      };
    }
    return { behavior: "allow" };
  });

  return (
    <BlockStack>
      <Checkbox
        id="age-verify"
        onChange={(checked) => setVerified(checked)}
      >
        I confirm I am 18 or older
      </Checkbox>
    </BlockStack>
  );
}
```

### Fetch Data from Your App (Extension API)

```jsx
import { useAppMetafields, useExtensionApi } from "@shopify/ui-extensions-react/checkout";

function ProductBadge() {
  // Read metafields set by your app
  const metafields = useAppMetafields({
    type: "product",
    namespace: "my_app",
    key: "badge_text",
  });

  if (!metafields.length) return null;

  return (
    <Text>{metafields[0].metafield.value}</Text>
  );
}
```

### Extension Targets Reference

| Target | Location |
|---|---|
| `purchase.checkout.block.render` | Custom block anywhere in checkout |
| `purchase.checkout.cart-line-item.render-after` | After each cart line item |
| `purchase.checkout.contact.render-after` | After contact info section |
| `purchase.checkout.shipping-option-item.render-after` | After each shipping option |
| `purchase.checkout.payment-method-list.render-after` | After payment methods |
| `purchase.checkout.actions.render-before` | Before the Place Order button |
| `purchase.thank-you.block.render` | On the thank-you page |

### Deploy Extensions

```bash
shopify app deploy
```

---

## Quick Reference

### Key Packages

```json
{
  "@shopify/shopify-app-remix": "latest",
  "@shopify/polaris": "latest",
  "@shopify/app-bridge-react": "latest",
  "@shopify/shopify-app-session-storage-prisma": "latest",
  "@shopify/ui-extensions-react": "latest"
}
```

### Dev Commands

```bash
npm run dev                    # Start local dev with tunnel
shopify app generate extension # Add a new extension
shopify app deploy             # Deploy extensions to Shopify
shopify app config push        # Sync shopify.app.toml
shopify app config pull        # Pull config from Partner Dashboard
shopify app logs               # Stream app/extension logs
```

### GDPR Webhook Checklist (Required for App Store)

- [ ] `customers/data_request` — respond within 30 days
- [ ] `customers/redact` — delete customer PII
- [ ] `shop/redact` — delete all shop data (fires 48hrs post-uninstall)

### App Review Checklist

- [ ] GDPR webhooks implemented
- [ ] App works correctly across multiple installs
- [ ] Billing implemented (if paid features exist)
- [ ] Privacy policy URL set in Partner Dashboard
- [ ] Support URL / email set
- [ ] App passes Shopify's [requirements checklist](https://shopify.dev/docs/apps/launch/app-requirements-checklist)
- [ ] No use of deprecated APIs
- [ ] Proper error handling for all API calls
