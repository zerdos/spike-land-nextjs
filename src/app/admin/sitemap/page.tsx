/**
 * Sitemap Preview Admin Page
 *
 * Server component that displays iframe previews of all sitemap URLs.
 * Allows admins to visually verify all pages in the sitemap.
 */

import prisma from "@/lib/prisma";
import { SitemapPreviewClient } from "./SitemapPreviewClient";

const SITEMAP_URLS = [
  "https://spike.land/",
  "https://spike.land/pricing",
  "https://spike.land/apps",
  "https://spike.land/apps/images",
  "https://spike.land/apps/display",
  "https://spike.land/auth/signin",
  "https://spike.land/terms",
  "https://spike.land/privacy",
  "https://spike.land/cookies",
  "https://spike.land/pixel",
  "https://spike.land/albums",
  "https://spike.land/my-apps",
  "https://spike.land/my-apps/new",
  "https://spike.land/profile",
  "https://spike.land/settings",
  "https://spike.land/referrals",
  "https://spike.land/admin",
  "https://spike.land/admin/analytics",
  "https://spike.land/admin/tokens",
  "https://spike.land/admin/system",
  "https://spike.land/admin/vouchers",
  "https://spike.land/admin/users",
];

export default async function SitemapPreviewPage() {
  const trackedUrls = await prisma.trackedUrl.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const trackedUrlStrings = trackedUrls.map((t) => t.url);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sitemap Preview</h1>
      <p className="text-muted-foreground mb-8">
        Preview all pages in the sitemap with staggered iframe loading.
      </p>
      <SitemapPreviewClient
        sitemapUrls={SITEMAP_URLS}
        trackedUrls={trackedUrlStrings}
      />
    </div>
  );
}
