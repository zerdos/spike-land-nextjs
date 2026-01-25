import type { Metadata } from "next";
import { AICalendarPageContent } from "./AICalendarPageContent";

export const metadata: Metadata = {
  title: "AI Calendar - Spike Land | Never Miss the Perfect Moment",
  description:
    "AI-powered content scheduling that finds the perfect time to post. Maximize engagement with smart scheduling based on your audience's behavior.",
  openGraph: {
    title: "AI Calendar - Spike Land | Never Miss the Perfect Moment",
    description:
      "AI-powered content scheduling that finds the perfect time to post based on your audience's behavior.",
    type: "website",
  },
};

export default function AICalendarPage() {
  return <AICalendarPageContent />;
}
