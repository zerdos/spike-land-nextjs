import { Metadata } from "next";
import NYECountdownClient from "./_components/NYECountdownClient";

export const metadata: Metadata = {
  title: "EPIC NYE Countdown 2026",
  description:
    "The most epic countdown to 2026! Featuring deep space visuals, fireworks, confetti, and a massive midnight celebration.",
  keywords: ["NYE 2026", "New Year's Eve Countdown", "New Year 2026", "Epic Countdown"],
  openGraph: {
    title: "EPIC NYE Countdown 2026",
    description: "The most spectacular countdown to 2026. Join the celebration!",
    type: "website",
    url: "https://spike.land/most-epic-nye-counter-ever",
  },
  twitter: {
    card: "summary_large_image",
    title: "EPIC NYE Countdown 2026",
    description: "The most spectacular countdown to 2026. Join the celebration!",
  },
};

export default function Page() {
  return (
    <main
      id="nye-page"
      className="relative min-h-screen w-full overflow-hidden bg-[#050510]"
    >
      <NYECountdownClient />
    </main>
  );
}
