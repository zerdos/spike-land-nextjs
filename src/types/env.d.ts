/**
 * Environment variable type declarations
 *
 * This file extends the NodeJS.ProcessEnv interface to provide
 * type-safe access to environment variables used in this project.
 *
 * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Authentication
      AUTH_SECRET?: string;
      AUTH_DEBUG?: string;
      AUTH_APPLE_ID?: string;
      AUTH_APPLE_SECRET?: string;
      AUTH_FACEBOOK_ID?: string;
      AUTH_FACEBOOK_SECRET?: string;
      NEXTAUTH_URL?: string;

      // Database
      DATABASE_URL?: string;
      DATABASE_URL_E2E?: string;

      // Node.js
      NODE_ENV?: "development" | "production" | "test";
      DEBUG?: string;
      PORT?: string;
      CI?: string;

      // Vercel
      VERCEL?: string;
      VERCEL_ENV?: "development" | "preview" | "production";
      VERCEL_URL?: string;
      VERCEL_ACCESS_TOKEN?: string;
      VERCEL_PROJECT_ID?: string;
      VERCEL_TEAM_ID?: string;

      // Next.js
      NEXT_RUNTIME?: string;
      NEXT_PHASE?: string;
      SKIP_TS_BUILD_CHECK?: string;

      // Public env vars (client-side)
      NEXT_PUBLIC_APP_URL?: string;
      NEXT_PUBLIC_BASE_URL?: string;
      NEXT_PUBLIC_META_PIXEL_ID?: string;
      NEXT_PUBLIC_PEER_SERVER_HOST?: string;
      NEXT_PUBLIC_PEER_SERVER_PATH?: string;
      NEXT_PUBLIC_PEER_SERVER_PORT?: string;
      NEXT_PUBLIC_PEER_SERVER_SECURE?: string;
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;

      // Cloudflare R2
      CLOUDFLARE_ACCOUNT_ID?: string;
      CLOUDFLARE_R2_ACCESS_KEY_ID?: string;
      CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string;
      CLOUDFLARE_R2_BUCKET_NAME?: string;
      CLOUDFLARE_R2_ENDPOINT?: string;
      CLOUDFLARE_R2_PUBLIC_URL?: string;
      CLOUDFLARE_R2_AUDIO_BUCKET_NAME?: string;
      CLOUDFLARE_R2_AUDIO_PUBLIC_URL?: string;

      // AI Services
      GEMINI_API_KEY?: string;
      GEMINI_TIMEOUT_MS?: string;
      ANTHROPIC_API_KEY?: string;

      // Stripe
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_PRICE_TIER_BASIC?: string;
      STRIPE_PRICE_TIER_STANDARD?: string;
      STRIPE_PRICE_TIER_PREMIUM?: string;

      // Redis/KV
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;
      KV_REST_API_URL?: string;
      KV_REST_API_TOKEN?: string;

      // Email
      RESEND_API_KEY?: string;
      EMAIL_FROM?: string;

      // Discord
      DISCORD_BOT_TOKEN?: string;
      DISCORD_SERVER_ID?: string;
      DISCORD_ANNOUNCEMENT_CHANNEL_ID?: string;

      // Slack
      SLACK_WEBHOOK_URL?: string;

      // Twilio
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;

      // GitHub
      GITHUB_ID?: string;
      GITHUB_SECRET?: string;
      GITHUB_OWNER?: string;
      GITHUB_REPO?: string;
      GITHUB_PROJECT_NUMBER?: string;
      GH_PAT_TOKEN?: string;

      // Google
      GOOGLE_ID?: string;
      GOOGLE_SECRET?: string;
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      GOOGLE_ADS_CUSTOMER_ID?: string;
      GOOGLE_ADS_DEVELOPER_TOKEN?: string;
      GOOGLE_ADS_CALLBACK_URL?: string;

      // Facebook/Meta
      FACEBOOK_MARKETING_APP_ID?: string;
      FACEBOOK_MARKETING_APP_SECRET?: string;
      FACEBOOK_SOCIAL_APP_ID?: string;
      FACEBOOK_SOCIAL_APP_SECRET?: string;
      FACEBOOK_CALLBACK_URL?: string;
      FACEBOOK_SOCIAL_CALLBACK_URL?: string;
      FACEBOOK_GRAPH_API_VERSION?: string;

      // Instagram
      INSTAGRAM_CONTAINER_STATUS_MAX_ATTEMPTS?: string;
      INSTAGRAM_CONTAINER_STATUS_POLL_INTERVAL_MS?: string;

      // LinkedIn
      LINKEDIN_CLIENT_ID?: string;
      LINKEDIN_CLIENT_SECRET?: string;
      LINKEDIN_CALLBACK_URL?: string;

      // Twitter/X
      TWITTER_CLIENT_ID?: string;
      TWITTER_CLIENT_SECRET?: string;
      NITTER_INSTANCE_URL?: string;

      // YouTube
      YOUTUBE_CLIENT_ID?: string;
      YOUTUBE_CLIENT_SECRET?: string;
      YOUTUBE_CALLBACK_URL?: string;

      // Jules
      JULES_API_KEY?: string;

      // Prodigi
      PRODIGI_API_KEY?: string;
      PRODIGI_SANDBOX?: string;
      PRODIGI_WEBHOOK_SECRET?: string;

      // Spike Land
      SPIKE_LAND_API_KEY?: string;
      SPIKE_LAND_API_URL?: string;

      // Agent/MCP
      AGENT_API_KEY?: string;
      AGENT_REQUIRE_PERMISSIONS?: string;
      MCP_DOCKER_URL?: string;

      // Cron
      CRON_SECRET?: string;

      // Testing
      BASE_URL?: string;
      E2E_BYPASS_AUTH?: string;
      E2E_BYPASS_SECRET?: string;
      E2E_CACHE_DIR?: string;
      E2E_COVERAGE?: string;
      E2E_DATABASE_CONFIRMED?: string;
      HEADLESS?: string;
      TEST_CACHE_DIR?: string;
      VITEST_COVERAGE?: string;

      // Enhancement
      ENHANCEMENT_EXECUTION_MODE?: string;
      ENHANCEMENT_TIMEOUT_SECONDS?: string;
      ANALYSIS_TIMEOUT_MS?: string;

      // Security
      TOKEN_ENCRYPTION_KEY?: string;
      USER_ID_SALT?: string;
      BLOCKED_EMAIL_DOMAINS?: string;

      // Workflow
      WORKFLOW_RUNTIME?: string;
      STANDALONE?: string;
    }
  }
}

export {};
