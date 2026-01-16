// Cloudflare Worker package: js.spike.land
// Inherits root ESLint configuration for monorepo consistency
//
// Note: @cloudflare/vitest-pool-workers does not support Vitest 4.x
// See vitest.config.ts for details and https://github.com/cloudflare/workers-sdk/issues/11064
export * from "../../eslint.config.mjs";
export { default } from "../../eslint.config.mjs";
