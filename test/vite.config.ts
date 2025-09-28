import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { resolve } from "path";

export default defineConfig({
  plugins: [solid()],
  appType: "mpa",
  root: "src/client",
  publicDir: "../../public",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/client/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
      "@shared": resolve(__dirname, "./shared"),
    },
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  esbuild: {
    jsx: "preserve",
    jsxImportSource: "solid-js",
  },
});