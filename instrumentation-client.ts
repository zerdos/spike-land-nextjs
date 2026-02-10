import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://7fb04b899f9ad3c3d0b9e606bf19e84a@o4510862377943040.ingest.de.sentry.io/4510862381613136",
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [/^https:\/\/spike\.land\/api/],
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
});
