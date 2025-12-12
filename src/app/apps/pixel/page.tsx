import { auth } from "@/auth";
import { BeforeAfterGallery } from "@/components/landing/BeforeAfterGallery";
import { CTASection } from "@/components/landing/CTASection";
import { FAQ } from "@/components/landing/FAQ";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { HeroSectionWithData } from "@/components/landing/HeroSectionWithData";
import { PixelHeader } from "@/components/landing/PixelHeader";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { EnhancePageClient } from "./EnhancePageClient";

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

export default async function PixelPage() {
  // Check for E2E bypass (middleware already validated the header)
  const headersList = await headers();
  const e2eBypassHeader = headersList.get("x-e2e-auth-bypass");
  const isE2EBypass = e2eBypassHeader && process.env.E2E_BYPASS_SECRET &&
    e2eBypassHeader === process.env.E2E_BYPASS_SECRET &&
    process.env.NODE_ENV !== "production";

  let session;
  try {
    session = await auth();
  } catch {
    // Auth may fail with invalid JWT in E2E tests
    session = null;
  }

  // For E2E bypass, allow access with empty images
  if (isE2EBypass && !session) {
    return <EnhancePageClient images={[]} />;
  }

  // For non-authenticated users, show the landing page
  if (!session) {
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

  // For authenticated users, fetch their images and show the app
  const images = await prisma.enhancedImage.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      enhancementJobs: {
        where: {
          status: { not: "CANCELLED" },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <EnhancePageClient images={images} />;
}
