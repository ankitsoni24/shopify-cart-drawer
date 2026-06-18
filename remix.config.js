import path from "path";
import { defineConfig } from "@remix-run/dev";
import { flatRoutes } from "flat-routes";

export default defineConfig({
  routes: async (defineRoutes) => {
    return flatRoutes("routes", defineRoutes, {
      ignoredRouteFiles: ["**/.*", "**/*.test.{js,jsx,ts,tsx}"],
    });
  },
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/server/index.js",
  serverMainFields: ["module", "main"],
  serverConditions: ["node"],
  serverDependenciesToBundle: "all",
  browserNodeBuiltinsPolyfill: {
    modules: {
      buffer: true,
      fs: true,
      path: true,
      querystring: true,
      stream: true,
      string_decoder: true,
      util: true,
    },
  },
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
});
