import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  TextField,
  Checkbox,
  Button,
  Banner,
  Divider,
  ColorPicker,
  hsbToHex,
  hexToRgb,
  rgbToHsb,
  InlineStack,
  Box,
  Badge,
  Tabs,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await prisma.cartDrawerSettings.findUnique({
    where: { shop: session.shop },
  });
  return json({ settings });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const data = {
    drawerTitle: formData.get("drawerTitle"),
    accentColor: formData.get("accentColor"),
    buttonTextColor: formData.get("buttonTextColor"),
    emptyCartMessage: formData.get("emptyCartMessage"),
    emptyCartButtonText: formData.get("emptyCartButtonText"),
    emptyCartButtonUrl: formData.get("emptyCartButtonUrl"),
    enableShippingBar: formData.get("enableShippingBar") === "true",
    freeShippingThreshold: parseInt(formData.get("freeShippingThreshold") || "50") * 100,
    shippingBarText: formData.get("shippingBarText"),
    shippingUnlockedText: formData.get("shippingUnlockedText"),
    enableUpsells: formData.get("enableUpsells") === "true",
    upsellTitle: formData.get("upsellTitle"),
    enableStickyAtc: formData.get("enableStickyAtc") === "true",
    stickyAtcText: formData.get("stickyAtcText"),
    enableDiscountField: formData.get("enableDiscountField") === "true",
    discountPlaceholder: formData.get("discountPlaceholder"),
    checkoutButtonText: formData.get("checkoutButtonText"),
    noteEnabled: formData.get("noteEnabled") === "true",
    noteLabel: formData.get("noteLabel"),
    enableCountdown: formData.get("enableCountdown") === "true",
    countdownMinutes: parseInt(formData.get("countdownMinutes") || "10"),
    countdownText: formData.get("countdownText"),
  };

  await prisma.cartDrawerSettings.upsert({
    where: { shop: session.shop },
    update: data,
    create: { shop: session.shop, ...data },
  });

  return json({ success: true });
};

function hexToHsb(hex) {
  const rgb = hexToRgb(hex);
  return rgbToHsb(rgb);
}

export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  const [selectedTab, setSelectedTab] = useState(0);

  // Form state
  const [drawerTitle, setDrawerTitle] = useState(settings?.drawerTitle || "Your Cart");
  const [accentColor, setAccentColor] = useState(settings?.accentColor || "#000000");
  const [buttonTextColor, setButtonTextColor] = useState(settings?.buttonTextColor || "#ffffff");
  const [accentHsb, setAccentHsb] = useState(hexToHsb(settings?.accentColor || "#000000"));
  const [emptyCartMessage, setEmptyCartMessage] = useState(settings?.emptyCartMessage || "Your cart is empty");
  const [emptyCartButtonText, setEmptyCartButtonText] = useState(settings?.emptyCartButtonText || "Continue Shopping");
  const [emptyCartButtonUrl, setEmptyCartButtonUrl] = useState(settings?.emptyCartButtonUrl || "/");

  const [enableShippingBar, setEnableShippingBar] = useState(settings?.enableShippingBar ?? true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    String((settings?.freeShippingThreshold || 5000) / 100)
  );
  const [shippingBarText, setShippingBarText] = useState(
    settings?.shippingBarText || "Spend {amount} more for FREE shipping!"
  );
  const [shippingUnlockedText, setShippingUnlockedText] = useState(
    settings?.shippingUnlockedText || "🎉 You've unlocked FREE shipping!"
  );

  const [enableUpsells, setEnableUpsells] = useState(settings?.enableUpsells ?? true);
  const [upsellTitle, setUpsellTitle] = useState(settings?.upsellTitle || "You might also like");
  const [enableStickyAtc, setEnableStickyAtc] = useState(settings?.enableStickyAtc ?? true);
  const [stickyAtcText, setStickyAtcText] = useState(settings?.stickyAtcText || "Add to Cart");
  const [enableDiscountField, setEnableDiscountField] = useState(settings?.enableDiscountField ?? true);
  const [discountPlaceholder, setDiscountPlaceholder] = useState(settings?.discountPlaceholder || "Discount code");
  const [checkoutButtonText, setCheckoutButtonText] = useState(settings?.checkoutButtonText || "Checkout");
  const [noteEnabled, setNoteEnabled] = useState(settings?.noteEnabled ?? false);
  const [noteLabel, setNoteLabel] = useState(settings?.noteLabel || "Order note");
  const [enableCountdown, setEnableCountdown] = useState(settings?.enableCountdown ?? false);
  const [countdownMinutes, setCountdownMinutes] = useState(String(settings?.countdownMinutes || 10));
  const [countdownText, setCountdownText] = useState(settings?.countdownText || "⏰ Hurry! Cart reserved for {time}");

  const handleAccentColorChange = useCallback((color) => {
    setAccentHsb(color);
    setAccentColor(hsbToHex(color));
  }, []);

  const tabs = [
    { id: "general", content: "General" },
    { id: "shipping", content: "Shipping Bar" },
    { id: "upsells-tab", content: "Upsells" },
    { id: "checkout", content: "Checkout" },
    { id: "advanced", content: "Advanced" },
  ];

  return (
    <Page
      title="Cart Drawer Settings"
      primaryAction={
        <Button variant="primary" loading={isSaving} submit form="settings-form">
          {isSaving ? "Saving..." : "Save settings"}
        </Button>
      }
      secondaryActions={[{ content: "View dashboard", url: "/app" }]}
    >
      <Form method="post" id="settings-form">
        {/* Hidden fields for boolean toggles */}
        <input type="hidden" name="enableShippingBar" value={String(enableShippingBar)} />
        <input type="hidden" name="enableUpsells" value={String(enableUpsells)} />
        <input type="hidden" name="enableStickyAtc" value={String(enableStickyAtc)} />
        <input type="hidden" name="enableDiscountField" value={String(enableDiscountField)} />
        <input type="hidden" name="noteEnabled" value={String(noteEnabled)} />
        <input type="hidden" name="enableCountdown" value={String(enableCountdown)} />
        <input type="hidden" name="accentColor" value={accentColor} />

        <Layout>
          {actionData?.success && (
            <Layout.Section>
              <Banner tone="success" title="Settings saved successfully!" />
            </Layout.Section>
          )}

          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              {/* GENERAL TAB */}
              {selectedTab === 0 && (
                <BlockStack gap="500">
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd">Drawer Appearance</Text>
                      <Divider />
                      <TextField
                        label="Drawer title"
                        name="drawerTitle"
                        value={drawerTitle}
                        onChange={setDrawerTitle}
                        helpText="Shown at the top of the cart drawer."
                        autoComplete="off"
                      />
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="label">Accent color</Text>
                        <InlineStack gap="400" align="start">
                          <ColorPicker onChange={handleAccentColorChange} color={accentHsb} />
                          <BlockStack gap="200">
                            <Box
                              background="bg-surface-secondary"
                              borderRadius="200"
                              padding="400"
                              minWidth="120px"
                            >
                              <BlockStack gap="100" align="center">
                                <div style={{
                                  width: 48, height: 48,
                                  borderRadius: 8,
                                  background: accentColor,
                                  border: "1px solid #e1e3e5"
                                }} />
                                <Text variant="bodyMd">{accentColor}</Text>
                              </BlockStack>
                            </Box>
                            <Text variant="bodySm" tone="subdued">
                              Used for buttons, progress bar, and highlights
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </BlockStack>
                      <TextField
                        label="Button text color"
                        name="buttonTextColor"
                        value={buttonTextColor}
                        onChange={setButtonTextColor}
                        helpText="Text color on checkout and action buttons. Use #ffffff for white."
                        autoComplete="off"
                      />
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd">Empty Cart State</Text>
                      <Divider />
                      <TextField
                        label="Empty cart message"
                        name="emptyCartMessage"
                        value={emptyCartMessage}
                        onChange={setEmptyCartMessage}
                        autoComplete="off"
                      />
                      <InlineGrid columns={2} gap="400">
                        <TextField
                          label="Button text"
                          name="emptyCartButtonText"
                          value={emptyCartButtonText}
                          onChange={setEmptyCartButtonText}
                          autoComplete="off"
                        />
                        <TextField
                          label="Button URL"
                          name="emptyCartButtonUrl"
                          value={emptyCartButtonUrl}
                          onChange={setEmptyCartButtonUrl}
                          autoComplete="off"
                        />
                      </InlineGrid>
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}

              {/* SHIPPING BAR TAB */}
              {selectedTab === 1 && (
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text variant="headingMd">Free Shipping Progress Bar</Text>
                      <Badge tone={enableShippingBar ? "success" : "subdued"}>
                        {enableShippingBar ? "Active" : "Disabled"}
                      </Badge>
                    </InlineStack>
                    <Divider />
                    <Checkbox
                      label="Enable free shipping bar"
                      checked={enableShippingBar}
                      onChange={setEnableShippingBar}
                    />
                    {enableShippingBar && (
                      <>
                        <TextField
                          label="Free shipping threshold ($)"
                          name="freeShippingThreshold"
                          type="number"
                          value={freeShippingThreshold}
                          onChange={setFreeShippingThreshold}
                          prefix="$"
                          helpText="Customers who spend this amount get free shipping."
                          autoComplete="off"
                        />
                        <TextField
                          label="Progress bar text"
                          name="shippingBarText"
                          value={shippingBarText}
                          onChange={setShippingBarText}
                          helpText="Use {amount} as placeholder for the remaining amount."
                          autoComplete="off"
                        />
                        <TextField
                          label="Unlocked text"
                          name="shippingUnlockedText"
                          value={shippingUnlockedText}
                          onChange={setShippingUnlockedText}
                          helpText="Shown when free shipping threshold is reached."
                          autoComplete="off"
                        />
                        <Card background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <Text variant="bodyMd" tone="subdued">Preview</Text>
                            <div style={{ background: "#f1f1f1", borderRadius: 8, padding: "12px 16px" }}>
                              <p style={{ fontSize: 13, marginBottom: 8 }}>
                                {shippingBarText.replace("{amount}", "$15.00")}
                              </p>
                              <div style={{ background: "#e0e0e0", borderRadius: 999, height: 6 }}>
                                <div style={{ background: accentColor, width: "70%", height: "100%", borderRadius: 999 }} />
                              </div>
                            </div>
                          </BlockStack>
                        </Card>
                      </>
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* UPSELLS TAB */}
              {selectedTab === 2 && (
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text variant="headingMd">Upsell Products</Text>
                      <Badge tone={enableUpsells ? "success" : "subdued"}>
                        {enableUpsells ? "Active" : "Disabled"}
                      </Badge>
                    </InlineStack>
                    <Divider />
                    <Checkbox
                      label="Enable upsell products in cart"
                      checked={enableUpsells}
                      onChange={setEnableUpsells}
                    />
                    {enableUpsells && (
                      <>
                        <TextField
                          label="Section title"
                          name="upsellTitle"
                          value={upsellTitle}
                          onChange={setUpsellTitle}
                          autoComplete="off"
                        />
                        <Banner tone="info">
                          Configure upsell products on the <a href="/app/upsells">Upsells page</a>. You can set specific products or let the app auto-recommend based on cart contents.
                        </Banner>
                      </>
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* CHECKOUT TAB */}
              {selectedTab === 3 && (
                <BlockStack gap="500">
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd">Checkout Button</Text>
                      <Divider />
                      <TextField
                        label="Checkout button text"
                        name="checkoutButtonText"
                        value={checkoutButtonText}
                        onChange={setCheckoutButtonText}
                        autoComplete="off"
                      />
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd">Discount Code</Text>
                      <Divider />
                      <Checkbox
                        label="Enable discount code field"
                        checked={enableDiscountField}
                        onChange={setEnableDiscountField}
                      />
                      {enableDiscountField && (
                        <TextField
                          label="Placeholder text"
                          name="discountPlaceholder"
                          value={discountPlaceholder}
                          onChange={setDiscountPlaceholder}
                          autoComplete="off"
                        />
                      )}
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd">Order Note</Text>
                      <Divider />
                      <Checkbox
                        label="Enable order note field"
                        checked={noteEnabled}
                        onChange={setNoteEnabled}
                      />
                      {noteEnabled && (
                        <TextField
                          label="Note field label"
                          name="noteLabel"
                          value={noteLabel}
                          onChange={setNoteLabel}
                          autoComplete="off"
                        />
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}

              {/* ADVANCED TAB */}
              {selectedTab === 4 && (
                <BlockStack gap="500">
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd">Sticky Add to Cart</Text>
                      <Divider />
                      <Checkbox
                        label="Enable sticky add to cart bar on product pages"
                        checked={enableStickyAtc}
                        onChange={setEnableStickyAtc}
                      />
                      {enableStickyAtc && (
                        <TextField
                          label="Button text"
                          name="stickyAtcText"
                          value={stickyAtcText}
                          onChange={setStickyAtcText}
                          autoComplete="off"
                        />
                      )}
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd">Urgency Countdown Timer</Text>
                      <Divider />
                      <Checkbox
                        label="Enable cart countdown timer"
                        checked={enableCountdown}
                        onChange={setEnableCountdown}
                      />
                      {enableCountdown && (
                        <>
                          <TextField
                            label="Timer duration (minutes)"
                            name="countdownMinutes"
                            type="number"
                            value={countdownMinutes}
                            onChange={setCountdownMinutes}
                            autoComplete="off"
                          />
                          <TextField
                            label="Countdown text"
                            name="countdownText"
                            value={countdownText}
                            onChange={setCountdownText}
                            helpText="Use {time} as placeholder for the remaining time."
                            autoComplete="off"
                          />
                        </>
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}
            </Tabs>
          </Layout.Section>
        </Layout>
      </Form>
    </Page>
  );
}
