import type { Metadata } from "next";
import { CalendarPageContent } from "./CalendarPageContent";

export const metadata: Metadata = {
  title: "AI Calendar - Spike Land | Smart Scheduling. Perfect Timing.",
  description:
    "Stop guessing when to post. Our AI analyzes your audience and finds the perfect times automatically. Schedule once, reach everyone at their peak engagement times.",
  openGraph: {
    title: "AI Calendar - Spike Land | Smart Scheduling. Perfect Timing.",
    description: "Stop guessing when to post. Our AI finds the perfect times automatically.",
    type: "website",
  },
};

export default function CalendarPage() {
  return <CalendarPageContent />;
}
