import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"]
    || "https://f97442801551cc6253bd741d67af3559@o4510510978433024.ingest.de.sentry.io/4510510979481680",
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracePropagationTargets: [/^https:\/\/spike\.land\/api/],
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  replaysSessionSampleRate: parseFloat(
    process.env["NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE"] || "0.1",
  ),
  replaysOnErrorSampleRate: parseFloat(
    process.env["NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE"] || "1.0",
  ),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
