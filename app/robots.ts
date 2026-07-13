import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://datenightconcierge.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The concierge queue and APIs are private — keep them out of the index.
      disallow: ["/admin", "/login", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
