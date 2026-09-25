import { createAdminClient } from "@/lib/supabase/admin";

const PLATFORM_HOSTS = new Set([
  "getresolvex.com",
  "www.getresolvex.com",
  "resolvex-azure.vercel.app",
  "localhost",
  "127.0.0.1",
  "::1",
]);

export type HelpCenterDomainStatus =
  | "unconfigured"
  | "pending"
  | "verified"
  | "error";

export type HelpCenterDomainVerification = {
  type?: "TXT";
  name?: string;
  value?: string;
  target?: string;
  vercel?: Record<string, unknown>;
};

export function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "").split(":")[0];
}

export function normalizeCustomDomain(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const withProtocol = raw.includes("://") ? raw : "https://" + raw;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid domain, for example help.example.com.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
    throw new Error("Enter a hostname, not a URL scheme.");
  if (parsed.pathname !== "/" || parsed.search || parsed.hash)
    throw new Error("Enter the hostname only, without a path.");
  const hostname = normalizeHost(parsed.hostname);
  if (
    !hostname ||
    PLATFORM_HOSTS.has(hostname) ||
    hostname.endsWith(".vercel.app") ||
    /^[0-9.]+$/.test(hostname) ||
    hostname.includes("..") ||
    hostname.length > 253
  ) {
    throw new Error("That hostname cannot be used for a help center.");
  }
  if (!hostname.includes("."))
    throw new Error("Use a real domain such as help.example.com.");
  return hostname;
}

export function helpCenterDomainTarget() {
  return normalizeHost(
    process.env.HELP_CENTER_DOMAIN_TARGET ?? "cname.vercel-dns-0.com",
  );
}

export function helpCenterVerificationName(domain: string) {
  return "_resolvex-verification." + domain;
}

export async function getPublishedHelpCenterForHost(host: string) {
  const hostname = normalizeHost(host);
  if (!hostname || PLATFORM_HOSTS.has(hostname)) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("help_centers")
      .select("name,slug,accent,is_published,organization_id,custom_domain")
      .eq("custom_domain", hostname)
      .eq("custom_domain_status", "verified")
      .eq("is_published", true)
      .maybeSingle();
    return data;
  } catch {
    // The marketing site continues to render before the optional migration
    // reaches an environment.
    return null;
  }
}
