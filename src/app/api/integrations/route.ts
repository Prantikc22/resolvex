import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const connectSchema = z.object({
  action: z.literal("connect"),
  name: z.string().trim().min(2).max(80),
  url: z.string().url().max(2000),
  events: z
    .array(
      z.enum([
        "message.created",
        "conversation.replied",
        "conversation.resolved",
      ]),
    )
    .min(1),
});
const testSchema = z.object({
  action: z.literal("test"),
  id: z.string().uuid(),
});
const inputSchema = z.discriminatedUnion("action", [connectSchema, testSchema]);
const deleteSchema = z.object({ id: z.string().uuid() });

function privateAddress(address: string) {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(
    address,
  );
}

async function validateWebhook(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && url.protocol === "http:")
  ) {
    throw new Error("Production webhooks must use HTTPS.");
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => privateAddress(address))
  )
    throw new Error("Private network webhook URLs are not supported.");
  return url.href;
}

function manageable(role: string | null) {
  return role === "owner" || role === "admin";
}

export async function GET() {
  const { supabase, organizationId } = await getCurrentOrganization();
  if (!organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("integrations")
    .select("id,provider,status,config,created_at,updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!manageable(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can manage integrations." },
        { status: 403 },
      );
    if (input.action === "connect") {
      const url = await validateWebhook(input.url);
      const { data, error } = await supabase
        .from("integrations")
        .insert({
          organization_id: organizationId,
          provider: `webhook:${crypto.randomUUID()}`,
          status: "connected",
          config: { name: input.name, url, events: input.events },
        })
        .select("id,provider,status,config,created_at,updated_at")
        .single();
      if (error) throw error;
      return NextResponse.json({ integration: data });
    }
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("id,config")
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .single();
    if (error) throw error;
    const url = await validateWebhook(String(integration.config?.url ?? ""));
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ResolveX-Webhooks/1.0",
      },
      body: JSON.stringify({
        event: "integration.test",
        created_at: new Date().toISOString(),
        data: { message: "ResolveX webhook connected successfully." },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok)
      throw new Error(`Webhook endpoint returned ${response.status}.`);
    return NextResponse.json({ tested: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Integration request failed.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const input = deleteSchema.parse(await request.json());
    const { supabase, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!manageable(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can manage integrations." },
        { status: 403 },
      );
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("id", input.id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not disconnect integration.",
      },
      { status: 400 },
    );
  }
}
