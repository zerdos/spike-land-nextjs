import type { Metadata } from "next";
import { BrandBrainPageContent } from "./BrandBrainPageContent";

export const metadata: Metadata = {
  title: "Brand Brain - Spike Land | AI That Speaks Your Brand",
  description:
    "Train AI to understand your brand voice. Maintain consistent tone, style, and messaging across all your social channels with Brand Brain.",
  openGraph: {
    title: "Brand Brain - Spike Land | AI That Speaks Your Brand",
    description:
      "Train AI to understand your brand voice. Maintain consistent tone and messaging across all social channels.",
    type: "website",
  },
};

export default function BrandBrainPage() {
  return <BrandBrainPageContent />;
}
