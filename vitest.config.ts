import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  ssr: {
    noExternal: ["next-auth"],
  },
  test: {
    name: "root",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL: "postgresql://mock:5432/mock",
    },
    include: [
      "src/lib/mcp/**/*.{test,spec}.{ts,tsx}",
      "src/lib/agents/**/*.{test,spec}.{ts,tsx}",
      "src/lib/chat/**/*.{test,spec}.{ts,tsx}",
      "src/lib/apps/**/*.{test,spec}.{ts,tsx}",
      "src/lib/format/**/*.{test,spec}.{ts,tsx}",
      "src/lib/tracking/**/*.{test,spec}.{ts,tsx}",
      "src/lib/ab-test/**/*.{test,spec}.{ts,tsx}",
      "src/lib/bazdmeg/**/*.{test,spec}.{ts,tsx}",
      "src/app/store/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
    ],
    // Use forks pool for better memory isolation in CI
    // Each test file runs in separate process with fresh memory
    pool: "forks",
    // Enable file parallelism for faster execution
    fileParallelism: true,
    // Use reporter optimized for CI
    // When VITEST_COVERAGE is set, also use the coverage mapper for intelligent caching
    reporters: process.env.CI
      ? [
        "github-actions",
        ...(process.env.VITEST_COVERAGE
          ? ["./scripts/vitest-coverage-mapper-reporter.ts"]
          : []),
      ]
      : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      // Coverage: MCP business logic + agent capability system
      include: [
        "src/lib/mcp/**/*.ts",
        "src/lib/agents/**/*.ts",
        "src/lib/apps/**/*.ts",
        "src/lib/format/**/*.ts",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/lib/mcp/server/__test-utils__/**",
        "node_modules/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/ui": path.resolve(__dirname, "./src/components/ui"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/utils": path.resolve(__dirname, "./src/lib/utils"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@apps": path.resolve(__dirname, "./apps"),
      "@vercel/kv": path.resolve(__dirname, "./vitest.mock-vercel-kv.ts"),
      // Mock next-view-transitions to avoid ESM import issues
      "next-view-transitions": path.resolve(
        __dirname,
        "./vitest.mock-next-view-transitions.tsx",
      ),
      // Fix ESM module resolution for next-auth imports
      // Using require.resolve for Yarn PnP compatibility
      "next/link": require.resolve("next/link"),
      "next/image": require.resolve("next/image"),
      "@/auth": path.resolve(__dirname, "./src/auth.ts"),
      "next/server": require.resolve("next/server"),
      // Map @prisma/client to the generated Prisma client location
      "@prisma/client": path.resolve(__dirname, "./src/generated/prisma"),
    },
  },
});
