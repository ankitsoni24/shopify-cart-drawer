import { json } from "@remix-run/node";
import { authenticate, prisma } from "../shopify.server";

// App Proxy route — Shopify forwards /apps/cart-drawer/* to this handler
// The shop is authenticated via the proxy signature
export const loader = async ({ request }) => {
  const { storefront } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");
  const shop = url.searchParams.get("shop");

  // Add CORS headers so storefront JS can call this
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };

  try {
    // GET /apps/cart-drawer?endpoint=settings
    if (endpoint === "settings") {
      const settings = await prisma.cartDrawerSettings.findUnique({
        where: { shop },
      });

      if (!settings) {
        return json({ error: "Settings not found" }, { status: 404, headers });
      }

      // Only return what the storefront needs (don't expose DB internals)
      return json(
        {
          drawerTitle: settings.drawerTitle,
          accentColor: settings.accentColor,
          buttonTextColor: settings.buttonTextColor,
          emptyCartMessage: settings.emptyCartMessage,
          emptyCartButtonText: settings.emptyCartButtonText,
          emptyCartButtonUrl: settings.emptyCartButtonUrl,
          enableShippingBar: settings.enableShippingBar,
          freeShippingThreshold: settings.freeShippingThreshold,
          shippingBarText: settings.shippingBarText,
          shippingUnlockedText: settings.shippingUnlockedText,
          enableUpsells: settings.enableUpsells,
          upsellTitle: settings.upsellTitle,
          upsellProductIds: JSON.parse(settings.upsellProductIds || "[]"),
          enableDiscountField: settings.enableDiscountField,
          discountPlaceholder: settings.discountPlaceholder,
          checkoutButtonText: settings.checkoutButtonText,
          noteEnabled: settings.noteEnabled,
          noteLabel: settings.noteLabel,
          enableCountdown: settings.enableCountdown,
          countdownMinutes: settings.countdownMinutes,
          countdownText: settings.countdownText,
        },
        { headers }
      );
    }

    // GET /apps/cart-drawer?endpoint=upsells&product_ids=123,456
    if (endpoint === "upsells") {
      const settings = await prisma.cartDrawerSettings.findUnique({
        where: { shop },
      });

      const productIds = JSON.parse(settings?.upsellProductIds || "[]");

      if (!productIds.length) {
        return json({ products: [] }, { headers });
      }

      // Use storefront API to fetch product data
      const res = await storefront.graphql(
        `#graphql
        query GetUpsellProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              handle
              featuredImage {
                url(transform: { maxWidth: 200, maxHeight: 200 })
                altText
              }
              variants(first: 1) {
                nodes {
                  id
                  title
                  price { amount currencyCode }
                  compareAtPrice { amount currencyCode }
                  availableForSale
                }
              }
            }
          }
        }`,
        { variables: { ids: productIds } }
      );

      const { data } = await res.json();
      const products = (data?.nodes || [])
        .filter(Boolean)
        .filter((p) => p.variants?.nodes?.[0]?.availableForSale)
        .map((p) => ({
          id: p.id,
          numericId: p.id.replace("gid://shopify/Product/", ""),
          title: p.title,
          handle: p.handle,
          image: p.featuredImage?.url || "",
          imageAlt: p.featuredImage?.altText || p.title,
          variantId: p.variants.nodes[0].id,
          numericVariantId: p.variants.nodes[0].id.replace("gid://shopify/ProductVariant/", ""),
          price: parseFloat(p.variants.nodes[0].price.amount),
          compareAtPrice: p.variants.nodes[0].compareAtPrice
            ? parseFloat(p.variants.nodes[0].compareAtPrice.amount)
            : null,
          currency: p.variants.nodes[0].price.currencyCode,
        }));

      return json({ products }, { headers });
    }

    return json({ error: "Unknown endpoint" }, { status: 400, headers });
  } catch (err) {
    console.error("Proxy error:", err);
    return json({ error: "Internal error" }, { status: 500, headers });
  }
};
