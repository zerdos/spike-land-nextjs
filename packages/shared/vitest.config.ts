import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "shared",
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/constants/**/*.ts",
        "src/validations/**/*.ts",
        "src/utils/**/*.ts",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/index.ts", // Root barrel export only
        "src/types/**/*.ts", // Type definitions (no runtime code)
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
