import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "next/server": "next/dist/server/web/spec-extension/index.js",
    },
  },
});
