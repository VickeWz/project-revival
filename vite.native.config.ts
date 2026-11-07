// Builds the self-contained iPhone/Android app bundle (no web address needed).
// Run: npm run build:native  → output in native-dist/, used by Capacitor.
// Separate from vite.config.ts, which builds the published web app.
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const src = path.resolve(__dirname, "src");
const nativeTree = path.resolve(src, "native/routeTree.gen.js");

// Swap web-only modules for bundled-app versions.
function nativeSwaps(): Plugin {
  const swaps: Record<string, string> = {
    [path.resolve(src, "lib/link-child.functions")]: path.resolve(src, "native/link-child.ts"),
    [path.resolve(src, "lib/activity-summary.functions")]: path.resolve(src, "native/activity-summary.ts"),
    "@tanstack/react-start": path.resolve(src, "native/react-start-shim.ts"),
  };
  return {
    name: "gamerun-native-swaps",
    enforce: "pre",
    resolveId(id, importer) {
      const key = id.replace(/\.ts$/, "");
      if (swaps[key]) return swaps[key];
      if (id === "./routeTree.gen" && importer?.split("?")[0].endsWith(path.join("src", "router.tsx"))) return nativeTree;
      return null;
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname, "native"),
  publicDir: path.resolve(__dirname, "public"),
  envDir: __dirname,
  base: "./",
  resolve: { alias: { "@": src } },
  plugins: [
    nativeSwaps(),
    tanstackRouter({
      target: "react",
      routesDirectory: path.resolve(src, "routes"),
      generatedRouteTree: nativeTree,
      routeFileIgnorePattern: "^api",
      disableTypes: true,
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  build: { outDir: path.resolve(__dirname, "native-dist"), emptyOutDir: true },
});
