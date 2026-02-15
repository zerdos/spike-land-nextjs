import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://7fb04b899f9ad3c3d0b9e606bf19e84a@o4510862377943040.ingest.de.sentry.io/4510862381613136",
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),

  beforeSend(event) {
    // Filter out Node.js HTTP server abort errors (client disconnects during SSR).
    // These are expected during CI/E2E navigation and normal browser behaviour.
    const message = event.exception?.values?.[0]?.value || "";
    if (/aborted/i.test(message)) {
      const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
      const isHttpServerAbort = frames.some((f) =>
        f.module?.includes("_http_server") || f.filename?.includes("_http_server")
      );
      if (isHttpServerAbort) return null;
    }
    return event;
  },
});
