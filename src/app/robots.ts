import type { MetadataRoute } from "next";

const siteUrl = "https://www.getresolvex.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/app/",
        "/auth/",
        "/login",
        "/signup",
        "/onboarding",
        "/forgot-password",
        "/reset-password",
        "/widget/embed",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
