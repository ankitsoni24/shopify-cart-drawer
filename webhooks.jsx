import { authenticate, prisma } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  console.log(`Received webhook: ${topic} for ${shop}`);

  switch (topic) {
    case "APP_UNINSTALLED":
      // Clean up sessions
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
      }
      // Optionally keep settings for re-installs (don't delete CartDrawerSettings)
      break;

    // GDPR — Required for App Store submission
    case "CUSTOMERS_DATA_REQUEST":
      // Log the request; you have 30 days to send data to the customer
      console.log(`[GDPR] Customer data request for shop: ${shop}`, payload);
      // In production: email the data to payload.customer.email
      break;

    case "CUSTOMERS_REDACT":
      // Delete any PII you store for this customer
      console.log(`[GDPR] Customer redact for shop: ${shop}`, payload);
      // We don't store individual customer data, but log it
      break;

    case "SHOP_REDACT":
      // Fires 48 hours after uninstall — delete ALL shop data
      console.log(`[GDPR] Shop redact for: ${shop}`);
      await Promise.all([
        prisma.cartDrawerSettings.deleteMany({ where: { shop } }),
        prisma.session.deleteMany({ where: { shop } }),
      ]);
      break;

    default:
      console.warn(`Unhandled webhook topic: ${topic}`);
  }

  return new Response(null, { status: 200 });
};
