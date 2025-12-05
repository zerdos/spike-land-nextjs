import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EnhancePageClient } from "./EnhancePageClient";

export default async function EnhancePage() {
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

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch user's images
  const images = await prisma.enhancedImage.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      enhancementJobs: {
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
