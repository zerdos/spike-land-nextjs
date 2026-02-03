import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

  console.log("[PixelPage] E2E bypass check:", {
    isE2EBypass,
    hasHeader: !!e2eBypassHeader,
    hasSecret: !!process.env.E2E_BYPASS_SECRET,
    nodeEnv: process.env.NODE_ENV,
  });

  let session;
  try {
    session = await auth();
  } catch (error) {
    // Auth may fail with invalid JWT in E2E tests - continue as unauthenticated
    console.debug(
      "[PixelPage] Auth failed, continuing as unauthenticated:",
      error instanceof Error ? error.message : String(error),
    );
    session = null;
  }

  // For E2E bypass, allow access with empty images
  if (isE2EBypass && !session) {
    console.log("[PixelPage] E2E bypass active, showing app with empty images");
    return (
      <div className="min-h-screen bg-grid-pattern" data-testid="pixel-app">
        <div className="pt-16">
          <EnhancePageClient images={[]} />
        </div>
      </div>
    );
  }

  // For non-authenticated users, redirect to sign in
  if (!session?.user?.id) {
    console.log("[PixelPage] No session, redirecting to sign in");
    redirect("/auth/signin?callbackUrl=/apps/pixel");
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

  return (
    <div className="min-h-screen bg-grid-pattern">
      <div className="pt-16">
        <EnhancePageClient images={images} />
      </div>
    </div>
  );
}
