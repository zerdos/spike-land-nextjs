import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://7fb04b899f9ad3c3d0b9e606bf19e84a@o4510862377943040.ingest.de.sentry.io/4510862381613136",
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
});
