import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://datenightconcierge.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the public intake page belongs in the sitemap.
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
