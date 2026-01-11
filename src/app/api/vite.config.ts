import path from "path";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "next/server": path.resolve(__dirname, "../../../node_modules/next/server.js"),
      "@": path.resolve(__dirname, "../../../src"),
      "@/components": path.resolve(__dirname, "../../../src/components"),
      "@/ui": path.resolve(__dirname, "../../../src/components/ui"),
      "@/lib": path.resolve(__dirname, "../../../src/lib"),
      "@/utils": path.resolve(__dirname, "../../../src/lib/utils"),
      "@/hooks": path.resolve(__dirname, "../../../src/hooks"),
      "@apps": path.resolve(__dirname, "../../../apps"),
    },
  },
  test: {
    globals: true,
    env: {
      DATABASE_URL: "postgresql://mock:5432/mock",
    },
  },
  ssr: {
    noExternal: ["next-auth"],
  },
});
