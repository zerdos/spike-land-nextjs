import type { MetadataRoute } from "next";

const BASE_URL = "https://spike.land";

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  return [
    // Public Pages
    {
      url: `${BASE_URL}/`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/apps`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/apps/pixel`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/apps/display`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/auth/signin`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },

    // Protected Pages (visible to search engines, auth required to use)
    {
      url: `${BASE_URL}/pixel`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/albums`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/my-apps`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/my-apps/new`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/profile`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/settings`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/referrals`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.6,
    },

    // Admin Pages
    {
      url: `${BASE_URL}/admin`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/admin/analytics`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/admin/tokens`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/admin/system`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/admin/vouchers`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/admin/users`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.4,
    },
  ];
}
