import { defineConfig } from "vitest/config";

// Note: @cloudflare/vitest-pool-workers does not support Vitest 4.x
// Using standard Vitest configuration until Cloudflare releases compatible version
// See: https://github.com/cloudflare/workers-sdk/issues/11064
export default defineConfig({
  test: {
    name: "js.spike.land",
    reporters: ["dot"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    environment: "node",
  },
});
