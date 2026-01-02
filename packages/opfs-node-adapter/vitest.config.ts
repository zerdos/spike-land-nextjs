import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "opfs-node-adapter",
    environment: "node",
    include: ["src/**/*.spec.ts"],
    globals: true,
  },
});
