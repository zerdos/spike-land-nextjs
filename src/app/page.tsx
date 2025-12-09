import {
  BeforeAfterGallery,
  FAQ,
  FeatureShowcase,
  HeroSection,
  PixelHeader,
} from "@/components/landing";
import { CTASection } from "@/components/landing/CTASection";

export default async function Home() {
  return (
    <div className="min-h-screen bg-grid-pattern">
      {/* Fixed Header */}
      <PixelHeader />

      {/* Hero Section with new design */}
      <HeroSection />

      {/* Before/After Gallery - More examples */}
      <BeforeAfterGallery />

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* FAQ Section */}
      <FAQ />

      {/* Final CTA Section */}
      <CTASection />
    </div>
  );
}
