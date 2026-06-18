import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  Button,
  Banner,
  Badge,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const settings = await prisma.cartDrawerSettings.findUnique({ where: { shop } });

  // Fetch basic shop info
  const shopRes = await admin.graphql(`
    query {
      shop {
        name
        currencyCode
        primaryDomain { url }
      }
    }
  `);
  const { data } = await shopRes.json();

  return json({ settings, shopData: data.shop });
};

export default function Dashboard() {
  const { settings, shopData } = useLoaderData();

  const stats = [
    { label: "Free Shipping Bar", value: settings?.enableShippingBar ? "Active" : "Off", tone: settings?.enableShippingBar ? "success" : "subdued" },
    { label: "Upsell Products", value: settings?.enableUpsells ? "Active" : "Off", tone: settings?.enableUpsells ? "success" : "subdued" },
    { label: "Sticky ATC", value: settings?.enableStickyAtc ? "Active" : "Off", tone: settings?.enableStickyAtc ? "success" : "subdued" },
    { label: "Discount Field", value: settings?.enableDiscountField ? "Active" : "Off", tone: settings?.enableDiscountField ? "success" : "subdued" },
  ];

  return (
    <Page title={`Cart Drawer — ${shopData?.name}`}>
      <Layout>
        <Layout.Section>
          <Banner
            title="Cart Drawer is installed and active"
            tone="success"
            action={{ content: "View settings", url: "/app/settings" }}
            secondaryAction={{ content: "Preview store", url: shopData?.primaryDomain?.url, target: "_blank" }}
          >
            <p>Your cart drawer is live on <strong>{shopData?.primaryDomain?.url}</strong>. Configure it below.</p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={4} gap="400">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <BlockStack gap="200">
                  <Text variant="bodyMd" tone="subdued">{stat.label}</Text>
                  <Badge tone={stat.tone}>{stat.value}</Badge>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={2} gap="400">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Quick Setup</Text>
                <Divider />
                <BlockStack gap="300">
                  <Button url="/app/settings" variant="primary" fullWidth>
                    ⚙️ Customize Cart Drawer
                  </Button>
                  <Button url="/app/upsells" fullWidth>
                    🛍️ Configure Upsell Products
                  </Button>
                  <Button url="/app/settings#shipping" fullWidth>
                    🚚 Set Free Shipping Threshold
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Current Configuration</Text>
                <Divider />
                <BlockStack gap="200">
                  <InlineGrid columns={2}>
                    <Text tone="subdued">Drawer title</Text>
                    <Text>{settings?.drawerTitle}</Text>
                  </InlineGrid>
                  <InlineGrid columns={2}>
                    <Text tone="subdued">Free shipping at</Text>
                    <Text>${((settings?.freeShippingThreshold || 0) / 100).toFixed(2)}</Text>
                  </InlineGrid>
                  <InlineGrid columns={2}>
                    <Text tone="subdued">Accent color</Text>
                    <Box>
                      <span style={{
                        display: "inline-block",
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: settings?.accentColor,
                        border: "1px solid #e1e3e5",
                        verticalAlign: "middle",
                        marginRight: 6
                      }} />
                      <Text as="span">{settings?.accentColor}</Text>
                    </Box>
                  </InlineGrid>
                  <InlineGrid columns={2}>
                    <Text tone="subdued">Currency</Text>
                    <Text>{shopData?.currencyCode}</Text>
                  </InlineGrid>
                </BlockStack>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
