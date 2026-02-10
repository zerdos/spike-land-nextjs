import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://7fb04b899f9ad3c3d0b9e606bf19e84a@o4510862377943040.ingest.de.sentry.io/4510862381613136",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // Adjust this value in production for cost/performance balance.
  tracesSampleRate: 1.0,
});
