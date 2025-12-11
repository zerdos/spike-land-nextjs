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
  "/apps/images",
  "/apps/display",
  "/auth/signin",
  "/terms",
  "/privacy",
  "/cookies",
  "/pixel",
  "/albums",
  "/my-apps",
  "/my-apps/new",
  "/profile",
  "/settings",
  "/referrals",
  "/admin",
  "/admin/analytics",
  "/admin/tokens",
  "/admin/system",
  "/admin/vouchers",
  "/admin/users",
];

export default async function SitemapPreviewPage() {
  // Fetch tracked paths from database
  const trackedPaths = await prisma.trackedUrl.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // Get the current origin from headers
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sitemap Preview</h1>
      <p className="text-muted-foreground mb-8">
        Preview all pages in the sitemap with staggered iframe loading.
      </p>
      <SitemapPreviewClient
        sitemapPaths={SITEMAP_PATHS}
        trackedPaths={trackedPaths.map((t) => ({ id: t.id, path: t.path }))}
        origin={origin}
      />
    </div>
  );
}
