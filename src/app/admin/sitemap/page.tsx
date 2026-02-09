/**
 * Sitemap Preview Admin Page
 *
 * Server component that displays iframe previews of all sitemap URLs.
 * Allows admins to visually verify all pages in the sitemap.
 */

import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { SitemapPreviewClient } from "./SitemapPreviewClient";

// Relative paths from sitemap - will be prefixed with current origin
const SITEMAP_PATHS = [
  "/",
  "/pricing",
  "/apps",
  "/apps/pixel",
  "/apps/display",
  "/auth/signin",
  "/terms",
  "/privacy",
  "/cookies",
  "/my-apps",
  "/my-apps/new",
  "/profile",
  "/settings",
  "/referrals",
  "/admin",
  "/admin/analytics",
  "/admin/credits",
  "/admin/system",
  "/admin/vouchers",
  "/admin/users",
];

export default async function SitemapPreviewPage() {
  // Fetch ALL tracked paths from database (including hidden ones)
  let trackedPaths: { id: string; path: string; isActive: boolean; }[] = [];
  try {
    trackedPaths = await prisma.trackedUrl.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch tracked paths:", error);
    // Continue with empty tracked paths to allow sitemap preview to work even if DB is down
  }

  // Get the current origin from headers
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Application Monitor</h1>
      <p className="text-muted-foreground mb-8">
        Visual site monitor. Staggered loading active. Spot-check page rendering and JS errors.
      </p>
      <SitemapPreviewClient
        sitemapPaths={SITEMAP_PATHS}
        trackedPaths={trackedPaths.map((t) => ({
          id: t.id,
          path: t.path,
          isActive: t.isActive,
        }))}
        origin={origin}
      />
    </div>
  );
}
