import { defineConfig } from "vite";
import { remix } from "@remix-run/dev";
import { getReloadAddressNotice } from "@shopify/shopify-app-remix/build/virtual-routes";

const shopifyRemixConfig = remix({
  ignoredRouteFiles: ["**/.*"],
});

export default defineConfig({
  plugins: [shopifyRemixConfig],
  server: {
    middlewareMode: true,
  },
  define: {
    ENV: JSON.stringify(process.env),
  },
});
