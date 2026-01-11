import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../"),
      "@/auth": path.resolve(__dirname, "../../auth.ts"),
      "next/server": "next/dist/server/web/spec-extension/index.js",
    },
  },
});
