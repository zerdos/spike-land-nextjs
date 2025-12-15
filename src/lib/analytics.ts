import { track } from "@vercel/analytics";

export type AnalyticsEvent =
  // Wizard events
  | "wizard_started"
  | "wizard_step_completed"
  | "wizard_abandoned"
  | "wizard_completed"
  // Authentication events
  | "login_started"
  | "login_completed"
  | "logout"
  // App management events
  | "app_viewed"
  | "app_created"
  | "app_edited"
  | "app_deleted"
  | "app_forked"
  // Error events
  | "error_occurred"
  | "validation_failed";

export interface AnalyticsEventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsEventProperties,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const consent = localStorage.getItem("cookie-consent");
  if (consent !== "accepted") {
    return;
  }

  // Filter out undefined values to match Vercel Analytics type requirements
  const cleanProperties = properties
    ? Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined),
    )
    : undefined;

  track(
    event,
    cleanProperties as
      | Record<string, string | number | boolean | null>
      | undefined,
  );
}

export const analytics = {
  wizard: {
    started: (properties?: AnalyticsEventProperties) => trackEvent("wizard_started", properties),
    stepCompleted: (step: number, properties?: AnalyticsEventProperties) =>
      trackEvent("wizard_step_completed", { step, ...properties }),
    abandoned: (step: number, properties?: AnalyticsEventProperties) =>
      trackEvent("wizard_abandoned", { step, ...properties }),
    completed: (properties?: AnalyticsEventProperties) =>
      trackEvent("wizard_completed", properties),
  },
  auth: {
    loginStarted: (provider?: string) => trackEvent("login_started", { provider }),
    loginCompleted: (provider?: string) => trackEvent("login_completed", { provider }),
    logout: () => trackEvent("logout"),
  },
  app: {
    viewed: (appId: string) => trackEvent("app_viewed", { appId }),
    created: (appId: string) => trackEvent("app_created", { appId }),
    edited: (appId: string) => trackEvent("app_edited", { appId }),
    deleted: (appId: string) => trackEvent("app_deleted", { appId }),
    forked: (originalAppId: string, newAppId: string) =>
      trackEvent("app_forked", { originalAppId, newAppId }),
  },
  error: {
    occurred: (error: string, context?: string) => trackEvent("error_occurred", { error, context }),
    validationFailed: (field: string, reason?: string) =>
      trackEvent("validation_failed", { field, reason }),
  },
};
