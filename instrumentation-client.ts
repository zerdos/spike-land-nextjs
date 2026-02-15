import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"]
    || "https://7fb04b899f9ad3c3d0b9e606bf19e84a@o4510862377943040.ingest.de.sentry.io/4510862381613136",
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV || "development",
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
