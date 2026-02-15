import type { Metadata } from "next";
import { SentryDashboardClient } from "./SentryDashboardClient";

export const metadata: Metadata = {
  title: "Sentry | Admin",
  description: "Monitor Sentry issues and error tracking",
};

export default function SentryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sentry</h1>
        <p className="text-neutral-400">
          Monitor Sentry issues and error tracking stats
        </p>
      </div>
      <SentryDashboardClient />
    </div>
  );
}
