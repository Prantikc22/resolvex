import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

export const maxDuration = 60;

const schema = z.object({ url: z.string().url().max(2000) });
const MAX_PAGES = 100;
const DEADLINE_MS = 48_000;

type CrawledPage = { url: string; title: string; content: string };

function privateAddress(address: string) {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(
    address,
  );
}

async function safeRoot(input: string) {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only public HTTP and HTTPS URLs are supported.");
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => privateAddress(address))
  ) {
    throw new Error("Private network URLs are not supported.");
  }
  url.hash = "";
  return url;
}

function canonical(input: string, origin: string) {
  try {
    const url = new URL(input);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    return url.href.replace(/\/$/, "") || origin;
  } catch {
    return null;
  }
}

async function fetchText(url: string, origin: string) {
  let current = url;
  for (let redirects = 0; redirects < 4; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "ResolveX-KnowledgeBot/1.0 (+https://www.getresolvex.com)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Website returned ${response.status}.`);
      const next = canonical(new URL(location, current).href, origin);
      if (!next)
        throw new Error("A website redirect left the approved domain.");
      current = next;
      continue;
    }
    if (!response.ok) throw new Error(`Website returned ${response.status}.`);
    return {
      text: await response.text(),
      contentType: response.headers.get("content-type") ?? "",
    };
  }
  throw new Error("The website redirected too many times.");
}

function xmlLocations(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1].replaceAll("&amp;", "&").trim(),
  );
}

async function sitemapCandidates(root: URL) {
  const candidates = new Set<string>();
  const sitemapQueue = new Set<string>([`${root.origin}/sitemap.xml`]);
  try {
    const robots = await fetchText(`${root.origin}/robots.txt`, root.origin);
    for (const match of robots.text.matchAll(/^sitemap:\s*(.+)$/gim)) {
      const sitemap = canonical(match[1].trim(), root.origin);
      if (sitemap) sitemapQueue.add(sitemap);
    }
  } catch {
    // sitemap.xml remains the standards-based fallback.
  }
  for (const sitemap of [...sitemapQueue].slice(0, 5)) {
    try {
      const { text } = await fetchText(sitemap, root.origin);
      for (const location of xmlLocations(text)) {
        const normalized = canonical(location, root.origin);
        if (!normalized) continue;
        if (/\.xml($|\?)/i.test(normalized) && sitemapQueue.size < 10) {
          sitemapQueue.add(normalized);
        } else {
          candidates.add(normalized);
        }
        if (candidates.size >= MAX_PAGES) break;
      }
    } catch {
      // A missing sitemap should not block link-based discovery.
    }
  }
  return [...candidates];
}

function pageFromHtml(url: string, html: string) {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,nav,footer,header,form").remove();
  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    new URL(url).pathname.split("/").filter(Boolean).at(-1) ||
    new URL(url).hostname;
  const content = $("main,article,body")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60_000);
  const links = new Set<string>();
  $("a[href]").each((_, element) => {
    try {
      links.add(new URL($(element).attr("href")!, url).href);
    } catch {
      // Ignore malformed links.
    }
  });
  return { title, content, links: [...links] };
}

function articleSlug(page: CrawledPage, sourceId: string) {
  const path = new URL(page.url).pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hash = createHash("sha1").update(page.url).digest("hex").slice(0, 8);
  return `${path || "home"}-${hash}-${sourceId.slice(0, 6)}`;
}

export async function POST(request: Request) {
  try {
    const { url: input } = schema.parse(await request.json());
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Create a workspace first." },
        { status: 401 },
      );
    }
    if (!new Set(["owner", "admin"]).has(membershipRole ?? ""))
      return NextResponse.json(
        { error: "Only workspace managers can add knowledge sources." },
        { status: 403 },
      );
    const root = await safeRoot(input);

    const startedAt = Date.now();
    const queued = new Set<string>([
      canonical(root.href, root.origin) ?? root.origin,
      ...(await sitemapCandidates(root)),
    ]);
    const visited = new Set<string>();
    const pages: CrawledPage[] = [];

    while (
      queued.size &&
      pages.length < MAX_PAGES &&
      Date.now() - startedAt < DEADLINE_MS
    ) {
      const batch = [...queued].slice(0, 6);
      batch.forEach((item) => queued.delete(item));
      const results = await Promise.allSettled(
        batch.map(async (pageUrl) => {
          visited.add(pageUrl);
          const { text, contentType } = await fetchText(pageUrl, root.origin);
          if (!contentType.includes("html") && !contentType.includes("text")) {
            return null;
          }
          return { pageUrl, ...pageFromHtml(pageUrl, text) };
        }),
      );
      for (const result of results) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const { pageUrl, title, content, links } = result.value;
        if (content.length >= 80) pages.push({ url: pageUrl, title, content });
        for (const link of links) {
          const normalized = canonical(link, root.origin);
          if (
            normalized &&
            !visited.has(normalized) &&
            queued.size + pages.length < MAX_PAGES * 2
          ) {
            queued.add(normalized);
          }
        }
      }
    }

    if (!pages.length) throw new Error("No readable pages were found.");
    const totalContent = pages
      .map((page) => `${page.title}\n${page.url}\n${page.content}`)
      .join("\n\n---\n\n")
      .slice(0, 500_000);
    const { data: source, error: sourceError } = await supabase
      .from("knowledge_sources")
      .insert({
        organization_id: organizationId,
        kind: "website",
        name: pages[0].title || root.hostname,
        source_url: root.href,
        status: "draft",
        content: totalContent,
        page_count: pages.length,
        byte_size: Buffer.byteLength(totalContent),
        last_synced_at: new Date().toISOString(),
        metadata: {
          crawled_urls: pages.map((page) => page.url),
          crawl_limit: MAX_PAGES,
        },
      })
      .select("id,name,status,page_count,source_url,last_synced_at")
      .single();
    if (sourceError) throw sourceError;

    const { error: articleError } = await supabase
      .from("knowledge_articles")
      .insert(
        pages.map((page) => ({
          organization_id: organizationId,
          source_id: source.id,
          title: page.title.slice(0, 240),
          slug: articleSlug(page, source.id),
          body: page.content,
          source_url: page.url,
          status: "draft",
        })),
      );
    if (articleError) {
      await supabase.from("knowledge_sources").delete().eq("id", source.id);
      throw articleError;
    }

    return NextResponse.json({ source, discovered: pages.length });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not import website.",
      },
      { status: 400 },
    );
  }
}
