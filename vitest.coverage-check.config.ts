import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: [
        "src/hooks/useTextToSpeech.ts",
        "src/components/blog/ReadAloudButton.tsx",
        "src/components/blog/ReadAloudArticle.tsx",
      ],
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
      "next-view-transitions": path.resolve(
        __dirname,
        "./vitest.mock-next-view-transitions.tsx",
      ),
    },
  },
});
