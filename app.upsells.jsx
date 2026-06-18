import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, InlineStack, Text, Button,
  Banner, Divider, Thumbnail, Badge, EmptyState, InlineGrid,
  Box, Icon,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const settings = await prisma.cartDrawerSettings.findUnique({
    where: { shop: session.shop },
  });

  const productIds = JSON.parse(settings?.upsellProductIds || "[]");
  let products = [];

  if (productIds.length > 0) {
    const res = await admin.graphql(
      `#graphql
      query GetProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            status
            featuredImage { url altText }
            variants(first: 1) { nodes { id price } }
          }
        }
      }`,
      { variables: { ids: productIds } }
    );
    const { data } = await res.json();
    products = (data.nodes || []).filter(Boolean);
  }

  return json({ products, productIds });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const settings = await prisma.cartDrawerSettings.findUnique({
    where: { shop: session.shop },
  });
  const currentIds = JSON.parse(settings?.upsellProductIds || "[]");

  if (intent === "add") {
    const newIds = JSON.parse(formData.get("productIds") || "[]");
    const merged = [...new Set([...currentIds, ...newIds])].slice(0, 6);
    await prisma.cartDrawerSettings.update({
      where: { shop: session.shop },
      data: { upsellProductIds: JSON.stringify(merged) },
    });
  }

  if (intent === "remove") {
    const removeId = formData.get("productId");
    const filtered = currentIds.filter((id) => id !== removeId);
    await prisma.cartDrawerSettings.update({
      where: { shop: session.shop },
      data: { upsellProductIds: JSON.stringify(filtered) },
    });
  }

  if (intent === "reorder") {
    const reordered = JSON.parse(formData.get("productIds") || "[]");
    await prisma.cartDrawerSettings.update({
      where: { shop: session.shop },
      data: { upsellProductIds: JSON.stringify(reordered) },
    });
  }

  return json({ success: true });
};

export default function Upsells() {
  const { products } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const isLoading = navigation.state === "submitting";

  const handlePickProducts = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      filter: { variants: false, draft: false, archived: false },
    });

    if (selected?.selection?.length) {
      const ids = selected.selection.map((p) => p.id);
      const formData = new FormData();
      formData.append("intent", "add");
      formData.append("productIds", JSON.stringify(ids));
      submit(formData, { method: "post" });
    }
  }, [shopify, submit]);

  const handleRemove = useCallback((productId) => {
    const formData = new FormData();
    formData.append("intent", "remove");
    formData.append("productId", productId);
    submit(formData, { method: "post" });
  }, [submit]);

  return (
    <Page
      title="Upsell Products"
      subtitle="Choose up to 6 products shown in the cart drawer. Products already in cart are hidden automatically."
      primaryAction={{
        content: "Pick products",
        onAction: handlePickProducts,
        loading: isLoading,
      }}
      backAction={{ url: "/app" }}
    >
      <Layout>
        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success" title="Upsell products updated!" />
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd">Selected Products</Text>
                <Badge>{products.length}/6 selected</Badge>
              </InlineStack>
              <Divider />

              {products.length === 0 ? (
                <EmptyState
                  heading="No upsell products selected"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{ content: "Pick products", onAction: handlePickProducts }}
                >
                  <p>Choose products to show as upsells in the cart drawer.</p>
                </EmptyState>
              ) : (
                <BlockStack gap="300">
                  {products.map((product, index) => (
                    <Box
                      key={product.id}
                      padding="300"
                      borderWidth="025"
                      borderColor="border"
                      borderRadius="200"
                      background="bg-surface"
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="400" blockAlign="center">
                          <Text tone="subdued" variant="bodySm">#{index + 1}</Text>
                          <Thumbnail
                            source={product.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_small.png"}
                            alt={product.featuredImage?.altText || product.title}
                            size="small"
                          />
                          <BlockStack gap="050">
                            <Text variant="bodyMd" fontWeight="medium">{product.title}</Text>
                            <InlineStack gap="200">
                              <Text variant="bodySm" tone="subdued">
                                ${parseFloat(product.variants?.nodes?.[0]?.price || 0).toFixed(2)}
                              </Text>
                              <Badge
                                tone={product.status === "ACTIVE" ? "success" : "warning"}
                                size="small"
                              >
                                {product.status}
                              </Badge>
                            </InlineStack>
                          </BlockStack>
                        </InlineStack>
                        <Button
                          icon={DeleteIcon}
                          tone="critical"
                          variant="plain"
                          onClick={() => handleRemove(product.id)}
                          accessibilityLabel={`Remove ${product.title}`}
                        />
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">How upsells work</Text>
              <Divider />
              <BlockStack gap="200">
                {[
                  { num: "1", text: "Select up to 6 products to promote" },
                  { num: "2", text: "Products already in the cart are automatically hidden" },
                  { num: "3", text: "Customers can add them with one tap" },
                  { num: "4", text: "Cart updates instantly without page reload" },
                ].map((item) => (
                  <InlineStack key={item.num} gap="300" blockAlign="start">
                    <Box
                      background="bg-fill-brand"
                      borderRadius="full"
                      minWidth="24px"
                      minHeight="24px"
                    >
                      <Text variant="bodySm" alignment="center" fontWeight="bold" tone="text-inverse">
                        {item.num}
                      </Text>
                    </Box>
                    <Text variant="bodyMd">{item.text}</Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
