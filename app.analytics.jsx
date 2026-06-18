import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, Text, Banner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Future: Add analytics queries here
  // Example: count cart opens, track conversion rates, monitor upsell performance
  
  return json({
    shop: session.shop,
    analytics: {
      totalCartsOpened: 0,
      conversions: 0,
      averageCartValue: 0,
      upsellsAdded: 0,
    }
  });
};

export default function Analytics() {
  const { analytics } = useLoaderData();

  return (
    <Page title="Cart Drawer Analytics" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <p>
              Analytics tracking is coming soon! Track cart opens, conversion rates, 
              upsell performance, and more.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="400">
            {[
              { label: "Total Carts Opened", value: analytics.totalCartsOpened },
              { label: "Conversions", value: analytics.conversions },
              { label: "Avg Cart Value", value: `$${analytics.averageCartValue.toFixed(2)}` },
              { label: "Upsells Added", value: analytics.upsellsAdded },
            ].map(stat => (
              <Card key={stat.label}>
                <BlockStack gap="200">
                  <Text variant="bodyMd" tone="subdued">{stat.label}</Text>
                  <Text variant="headingMd">{stat.value}</Text>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
