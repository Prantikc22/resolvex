import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const schema = z.object({ url: z.string().url().max(2000) });

function privateAddress(address: string) {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(address);
}

async function safeUrl(input: string) {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only public HTTP and HTTPS URLs are supported.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("Private network URLs are not supported.");
  return url;
}

export async function POST(request: Request) {
  try {
    const { url: input } = schema.parse(await request.json());
    const url = await safeUrl(input);
    const { supabase, organizationId } = await getCurrentOrganization();
    if (!organizationId) return NextResponse.json({ error: "Create a workspace first." }, { status: 401 });
    const response = await fetch(url, { headers: { "User-Agent": "ResolveX-KnowledgeBot/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Website returned ${response.status}.`);
    const html = await response.text();
    const $ = cheerio.load(html);
    $("script,style,noscript,svg,nav,footer").remove();
    const title = $("title").first().text().trim() || url.hostname;
    const content = $("main,article,body").first().text().replace(/\s+/g, " ").trim().slice(0, 150000);
    const links = new Set<string>();
    $("a[href]").each((_, element) => {
      try { const link = new URL($(element).attr("href")!, url); if (link.origin === url.origin) links.add(link.href.split("#")[0]); } catch {}
    });
    const { data, error } = await supabase.from("knowledge_sources").insert({ organization_id: organizationId, kind: "website", name: title, source_url: url.href, status: "ready", content, page_count: 1, byte_size: Buffer.byteLength(html), last_synced_at: new Date().toISOString(), metadata: { discovered_links: [...links].slice(0, 500) } }).select("id,name,status,page_count").single();
    if (error) throw error;
    return NextResponse.json({ source: data, discovered: Math.min(links.size, 500) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not import website." }, { status: 400 });
  }
}
