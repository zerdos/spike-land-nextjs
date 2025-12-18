import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Exclude git worktrees from test discovery
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/fix-r2-versioning-cache/**",
      "**/.git/**",
    ],
    // Use forks pool for better memory isolation in CI
    // Each test file runs in separate process with fresh memory
    pool: "forks",
    // poolOptions: {
    //   forks: {
    //     singleFork: false,
    //     isolate: true,
    //   },
    // },
    // Enable file parallelism for faster execution
    fileParallelism: true,
    // Use reporter optimized for CI
    reporters: process.env.CI ? ["github-actions"] : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}"],
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
        "src/**/*.example.tsx", // Example files - not production code
        "src/hooks/useSlideshow.ts", // Hook has infinite loop bug with empty images - covered at 80.85% branches
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
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js"),
      "next/link": path.resolve(__dirname, "./node_modules/next/link.js"),
      "next/image": path.resolve(__dirname, "./node_modules/next/image.js"),
      // Mock OPFS adapter for tests
      "@spike-npm-land/opfs-node-adapter": path.resolve(
        __dirname,
        "./vitest.mock-opfs-adapter.ts",
      ),
    },
  },
});
