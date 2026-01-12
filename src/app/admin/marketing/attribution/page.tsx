import { AttributionTab } from "@/components/admin/marketing/tabs/AttributionTab";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attribution Dashboard | Marketing | Spike Land",
  description: "Analyze attribution models and channel performance",
};

export default function AttributionPage() {
  return (
    <div className="space-y-6">
      <AttributionTab />
    </div>
  );
}
