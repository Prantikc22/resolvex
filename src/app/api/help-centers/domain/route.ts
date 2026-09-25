import { resolve4, resolveCname, resolveTxt } from "node:dns/promises";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  helpCenterDomainTarget,
  helpCenterVerificationName,
  normalizeCustomDomain,
  normalizeHost,
  type HelpCenterDomainVerification,
} from "@/lib/help-center/domain";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const connectSchema = z.object({ domain: z.string().min(3).max(255) });
const actionSchema = z.object({ action: z.enum(["verify"]).default("verify") });

function managerError(role: string | null) {
  return !new Set(["owner", "admin"]).has(role ?? "")
    ? NextResponse.json(
        { error: "Only workspace managers can manage a help-center domain." },
        { status: 403 },
      )
    : null;
}

function vercelConfig() {
  const token = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
  const project =
    process.env.VERCEL_PROJECT_ID ?? process.env.VERCEL_PROJECT_NAME;
  const team = process.env.VERCEL_TEAM_ID;
  return token && project ? { token, project, team } : null;
}

async function vercelRequest(
  path: string,
  init: RequestInit,
  config: NonNullable<ReturnType<typeof vercelConfig>>,
) {
  const url = new URL("https://api.vercel.com" + path);
  if (config.team) url.searchParams.set("teamId", config.team);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: "Bearer " + config.token,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function registerWithVercel(domain: string) {
  const config = vercelConfig();
  if (!config) return { configured: false as const };
  const path =
    "/v10/projects/" + encodeURIComponent(config.project) + "/domains";
  const result = await vercelRequest(
    path,
    { method: "POST", body: JSON.stringify({ name: domain }) },
    config,
  );
  // A repeated connect is safe. Vercel can report an already-attached domain
  // as either 400 or 409 depending on whether it is already on this project
  // or assigned elsewhere.
  if (!result.response.ok && result.response.status === 400) {
    const existing = await vercelRequest(
      "/v9/projects/" +
        encodeURIComponent(config.project) +
        "/domains/" +
        encodeURIComponent(domain),
      { method: "GET" },
      config,
    );
    if (existing.response.ok) {
      return {
        configured: true as const,
        verification: existing.body?.verification,
        verified: existing.body?.verified === true,
      };
    }
  }
  if (!result.response.ok) {
    const message =
      result.body?.error?.message ?? "Vercel could not register this domain.";
    throw new Error(message);
  }
  return {
    configured: true as const,
    verification: result.body?.verification,
    verified: result.body?.verified === true,
  };
}

async function verifyWithVercel(domain: string) {
  const config = vercelConfig();
  if (!config) {
    return {
      configured: false as const,
      verified: false,
      error:
        "Vercel domain registration is not configured. Ask the workspace administrator to set VERCEL_API_TOKEN, VERCEL_PROJECT_ID, and VERCEL_TEAM_ID.",
    };
  }
  const path =
    "/v9/projects/" +
    encodeURIComponent(config.project) +
    "/domains/" +
    encodeURIComponent(domain) +
    "/verify";
  const result = await vercelRequest(path, { method: "POST" }, config);
  return {
    configured: true as const,
    verified: result.response.ok && result.body?.verified !== false,
    error: result.body?.error?.message,
  };
}

async function removeFromVercel(domain: string) {
  const config = vercelConfig();
  if (!config) return;
  const path =
    "/v9/projects/" +
    encodeURIComponent(config.project) +
    "/domains/" +
    encodeURIComponent(domain);
  const result = await vercelRequest(path, { method: "DELETE" }, config);
  if (!result.response.ok && result.response.status !== 404) {
    throw new Error(
      result.body?.error?.message ?? "Vercel could not disconnect this domain.",
    );
  }
}

async function dnsState(
  domain: string,
  verification: HelpCenterDomainVerification,
) {
  let cname: string[] = [];
  let txt: string[] = [];
  let address: string[] = [];
  try {
    cname = (await resolveCname(domain)).map(normalizeHost);
  } catch {
    // Apex domains generally cannot expose a CNAME. Vercel verification is
    // authoritative for those domains when the API is configured.
  }
  try {
    txt = (await resolveTxt(verification.name ?? ""))
      .flat()
      .map((value) => value.trim());
  } catch {
    // DNS propagation is expected to be eventual.
  }
  try {
    address = await resolve4(domain);
  } catch {
    // Ignore while the record is propagating.
  }
  const cnameMatches = cname.includes(normalizeHost(verification.target ?? ""));
  const txtMatches = verification.value
    ? txt.includes(verification.value)
    : false;
  const expectedIp = process.env.HELP_CENTER_DOMAIN_IP;
  const addressMatches = Boolean(expectedIp && address.includes(expectedIp));
  return { cnameMatches, txtMatches, addressMatches, cname, txt, address };
}

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("help_centers")
    .select(
      "custom_domain,custom_domain_status,custom_domain_target,custom_domain_verification,custom_domain_verified_at",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ domain: data });
}

export async function POST(request: Request) {
  try {
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Create a workspace first." },
        { status: 401 },
      );
    const forbidden = managerError(membershipRole);
    if (forbidden) return forbidden;
    const body = await request.json();

    if (body?.action === "verify") {
      actionSchema.parse(body);
      const { data: center, error: readError } = await supabase
        .from("help_centers")
        .select(
          "custom_domain,custom_domain_status,custom_domain_target,custom_domain_verification",
        )
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (readError) throw readError;
      if (!center?.custom_domain)
        return NextResponse.json(
          { error: "Connect a domain first." },
          { status: 400 },
        );
      const verification = (center.custom_domain_verification ??
        {}) as HelpCenterDomainVerification;
      const dns = await dnsState(center.custom_domain, verification);
      const vercel = await verifyWithVercel(center.custom_domain);
      const dnsVerified =
        dns.txtMatches &&
        (dns.cnameMatches || dns.addressMatches || vercel.verified);
      const verified = dnsVerified && vercel.verified;
      const status = verified ? "verified" : "pending";
      const { data, error } = await supabase
        .from("help_centers")
        .update({
          custom_domain_status: status,
          custom_domain_verified_at: verified ? new Date().toISOString() : null,
        })
        .eq("organization_id", organizationId)
        .select(
          "custom_domain,custom_domain_status,custom_domain_target,custom_domain_verification,custom_domain_verified_at",
        )
        .single();
      if (error) throw error;
      return NextResponse.json({
        domain: data,
        verified,
        dns,
        vercel,
        error: verified
          ? undefined
          : (vercel.error ??
            "DNS is not ready yet. Add the records below and try Verify again."),
      });
    }

    const input = connectSchema.parse(body);
    const domain = normalizeCustomDomain(input.domain);
    if (!domain) throw new Error("Enter a domain first.");
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("help_centers")
      .select("organization_id")
      .eq("custom_domain", domain)
      .neq("organization_id", organizationId)
      .maybeSingle();
    if (existing)
      return NextResponse.json(
        { error: "That domain is already connected to another workspace." },
        { status: 409 },
      );

    const target = helpCenterDomainTarget();
    const verification: HelpCenterDomainVerification = {
      type: "TXT",
      name: helpCenterVerificationName(domain),
      value: "resolvex=" + randomUUID().replaceAll("-", ""),
      target,
    };
    const vercel = await registerWithVercel(domain);
    if (vercel.verification) verification.vercel = vercel.verification;
    const { data, error } = await supabase
      .from("help_centers")
      .update({
        custom_domain: domain,
        custom_domain_status: "pending",
        custom_domain_target: target,
        custom_domain_verification: verification,
        custom_domain_verified_at: null,
      })
      .eq("organization_id", organizationId)
      .select(
        "custom_domain,custom_domain_status,custom_domain_target,custom_domain_verification,custom_domain_verified_at",
      )
      .single();
    if (error) throw error;
    return NextResponse.json({
      domain: data,
      vercel,
      dns: {
        cname: { name: domain, value: target },
        txt: { name: verification.name, value: verification.value },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not connect domain.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const { supabase, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const forbidden = managerError(membershipRole);
  if (forbidden) return forbidden;
  const { data: center } = await supabase
    .from("help_centers")
    .select("custom_domain")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (center?.custom_domain) await removeFromVercel(center.custom_domain);
  const { error } = await supabase
    .from("help_centers")
    .update({
      custom_domain: null,
      custom_domain_status: "unconfigured",
      custom_domain_target: null,
      custom_domain_verification: {},
      custom_domain_verified_at: null,
    })
    .eq("organization_id", organizationId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
