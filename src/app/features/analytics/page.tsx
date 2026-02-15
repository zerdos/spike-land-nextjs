import type { Metadata } from "next";
import { AnalyticsPageContent } from "./AnalyticsPageContent";

export const metadata: Metadata = {
  title: "Analytics - Spike Land | Insights That Drive Growth",
  description:
    "Deep performance insights across all platforms. Track growth, engagement, and ROI in one unified dashboard with AI-powered recommendations.",
  openGraph: {
    title: "Analytics - Spike Land | Insights That Drive Growth",
    description:
      "Track growth, engagement, and ROI across all your social platforms with AI-powered insights.",
    type: "website",
  },
};

export default function AnalyticsPage() {
  return <AnalyticsPageContent />;
}
