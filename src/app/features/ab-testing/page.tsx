import type { Metadata } from "next";
import { ABTestingPageContent } from "./ABTestingPageContent";

export const metadata: Metadata = {
  title: "A/B Testing - Spike Land | Test Everything. Know What Works.",
  description:
    "Stop guessing what content performs best. Run scientific experiments on your social media posts with AI-powered A/B testing and let the data decide.",
  openGraph: {
    title: "A/B Testing - Spike Land | Test Everything. Know What Works.",
    description:
      "Run scientific experiments on your social media posts with AI-powered A/B testing. Find winning variations with statistical confidence.",
    type: "website",
  },
};

export default function ABTestingPage() {
  return <ABTestingPageContent />;
}
