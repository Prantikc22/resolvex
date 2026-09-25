import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";
import { competitors } from "@/lib/competitors";
import { helpArticles } from "@/lib/help-content";

const siteUrl = "https://www.getresolvex.com";
const lastModified = new Date("2026-09-25");

export default function sitemap(): MetadataRoute.Sitemap {
  const coreRoutes: Array<
    [string, MetadataRoute.Sitemap[number]["changeFrequency"], number]
  > = [
    ["", "weekly", 1],
    ["/pricing", "monthly", 0.9],
    ["/use-cases", "monthly", 0.85],
    ["/resources", "weekly", 0.8],
    ["/blog", "weekly", 0.9],
    ["/help", "weekly", 0.8],
    ["/demo", "monthly", 0.75],
    ["/install", "monthly", 0.7],
    ["/faq", "monthly", 0.7],
    ["/about", "monthly", 0.6],
    ["/company", "monthly", 0.6],
    ["/contact", "monthly", 0.6],
    ["/security", "monthly", 0.65],
    ["/status", "weekly", 0.5],
    ["/compare", "monthly", 0.8],
    ...competitors.map(
      (item) =>
        [`/compare/${item.slug}`, "monthly", item.popular ? 0.8 : 0.7] as [
          string,
          MetadataRoute.Sitemap[number]["changeFrequency"],
          number,
        ],
    ),
    ["/terms", "yearly", 0.3],
    ["/privacy", "yearly", 0.3],
    ["/cookie-policy", "yearly", 0.3],
    ["/acceptable-use", "yearly", 0.3],
    ["/data-processing", "yearly", 0.3],
    ["/refund-policy", "yearly", 0.3],
    ["/shipping-policy", "yearly", 0.3],
    ["/shipping-delivery", "yearly", 0.3],
  ];

  const corePages: MetadataRoute.Sitemap = coreRoutes.map(
    ([path, changeFrequency, priority]) => ({
      url: `${siteUrl}${path}`,
      lastModified,
      changeFrequency,
      priority,
    }),
  );

  const articlePages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  const helpPages: MetadataRoute.Sitemap = helpArticles.map((article) => ({
    url: `${siteUrl}/help/${article.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  return [...corePages, ...articlePages, ...helpPages];
}
