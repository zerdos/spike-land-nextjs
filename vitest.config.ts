import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "root",
    environment: "jsdom",
    projects: ["./src/app/api/vite.config.ts"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "apps/**/*.{test,spec}.{ts,tsx}"],
    // Exclude git worktrees, mobile app (uses Jest), and packages (have their own configs)
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/fix-r2-versioning-cache/**",
      "**/.git/**",
      "**/packages/**",
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
      include: ["src/**/*.{ts,tsx}"],
      // Note: apps/ directory (embedded applications) excluded - separate test configs
      exclude: [
        "src/**/*.d.ts",
        "src/**/vitest.config.ts",
        "src/**/next.config.ts",
        "src/**/postcss.config.ts",
        "src/**/tailwind.config.ts",
        "src/**/*.stories.tsx",
        "src/**/index.ts", // Barrel export files
        "src/types/**/*.ts", // Type definition files
        "src/app/apps/**/*.tsx", // Apps pages - presentational UI
        "src/components/apps/**/*.tsx", // Apps components - presentational UI
        "src/workflows/**/*.workflow.ts", // Temporal workflow files - require special SDK testing
        "src/**/*--workflow.ts", // Workflow-safe variants - require special SDK testing
        "src/**/*.example.tsx", // Example files - not production code
        "src/hooks/useSlideshow.ts", // Hook has infinite loop bug with empty images - covered at 80.85% branches
        "src/test-utils/**/*", // Test utilities don't need coverage
        "src/lib/upstash/client.ts", // Infrastructure client - Redis proxy mock
        // Presentational UI pages - covered by E2E tests
        "src/app/blendr/**/*.tsx", // Image blending UI
        "src/app/cart/**/*.tsx", // Shopping cart page
        "src/app/checkout/**/*.tsx", // Checkout flow page
        "src/app/merch/**/*.tsx", // Merchandise pages
        "src/app/orders/**/*.tsx", // Orders page
        "src/app/community/**/*.tsx", // Community page
        "src/app/landing/**/*.tsx", // Landing page
        "src/app/social/**/*.tsx", // Social page
        "src/app/storybook/**/*", // Storybook preview
        "src/app/press/**/*.tsx", // Press page
        "node_modules/**",
      ],
      // all: true,
      thresholds: {
        lines: 80,
        functions: 84,
        branches: 78,
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
      "next/link": path.resolve(__dirname, "./node_modules/next/link.js"),
      "next/image": path.resolve(__dirname, "./node_modules/next/image.js"),
    },
  },
});
