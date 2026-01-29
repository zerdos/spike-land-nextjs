import { JourneyTab } from "@/components/admin/marketing/tabs/JourneyTab";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Journey Analytics | Marketing Admin | spike.land",
  description:
    "Analyze cross-platform customer journeys and understand conversion paths.",
};

export default function JourneyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Journey</h1>
        <p className="text-muted-foreground">
          Understand how customers move across platforms before converting.
        </p>
      </div>

      <JourneyTab />
    </div>
  );
}
