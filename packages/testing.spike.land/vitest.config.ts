import path from "path";
import { defineConfig } from "vitest/config";

// Note: @cloudflare/vitest-pool-workers does not support Vitest 4.x
// Using standard Vitest configuration until Cloudflare releases compatible version
// See: https://github.com/cloudflare/workers-sdk/issues/11064
export default defineConfig({
  test: {
    name: "testing.spike.land",
    reporters: ["hanging-process", "dot"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    environment: "node",
  },

  resolve: {
    alias: {
      replicate: path.resolve(__dirname, "__mocks__/replicate.js"),
      "snakecase-keys": path.resolve(__dirname, "__mocks__/snakecase-keys.js"),
      cookie: path.resolve(__dirname, "__mocks__/cookie.js"),
    },
  },
});
