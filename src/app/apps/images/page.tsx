import {
  BeforeAfterGallery,
  FAQ,
  FeatureShowcase,
  HeroSectionWithData,
  PixelHeader,
} from "@/components/landing";
import { CTASection } from "@/components/landing/CTASection";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel - AI Image Enhancement | Spike Land",
  description:
    "Enhance your photos in seconds with AI. Transform low-resolution images into stunning high-quality photos with Pixel's advanced AI enhancement technology.",
  openGraph: {
    title: "Pixel - AI Image Enhancement | Spike Land",
    description:
      "Enhance your photos in seconds with AI. Transform low-resolution images into stunning high-quality photos.",
    type: "website",
  },
};

export default async function PixelLandingPage() {
  return (
    <main className="min-h-screen bg-grid-pattern">
      <PixelHeader />
      <HeroSectionWithData />
      <BeforeAfterGallery />
      <FeatureShowcase />
      <FAQ />
      <CTASection />
    </main>
  );
}
