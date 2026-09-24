import { NextResponse } from "next/server";
import { z } from "zod";
import {
  composioCatalog,
  createComposioConnection,
  disconnectComposioAccount,
  listComposioConnections,
  listComposioTools,
  type ComposioToolkit,
} from "@/lib/providers/composio";
import { publicAppUrl } from "@/lib/app-url";
import { getCurrentOrganization } from "@/lib/supabase/current-org";

const toolkitSlugs = composioCatalog.map((item) => item.slug) as [
  ComposioToolkit,
  ...ComposioToolkit[],
];
const connectSchema = z.object({ toolkit: z.enum(toolkitSlugs) });
const disconnectSchema = z.object({
  toolkit: z.enum(toolkitSlugs),
  accountId: z.string().min(3).max(200),
  confirmation: z.literal("DISCONNECT"),
});

function manageable(role: string | null) {
  return role === "owner" || role === "admin";
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizedAccount(value: unknown) {
  const item = record(value);
  const toolkit = record(item.toolkit);
  const authConfig = record(item.authConfig ?? item.auth_config);
  return {
    id: String(item.id ?? item.nanoid ?? ""),
    status: String(item.status ?? "UNKNOWN").toLowerCase(),
    toolkit: String(
      toolkit.slug ?? item.toolkitSlug ?? item.toolkit_slug ?? "",
    ),
    authMode: String(authConfig.mode ?? authConfig.authScheme ?? "managed"),
  };
}

export async function GET(request: Request) {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  const { data: stored } = await supabase
    .from("integrations")
    .select("id,provider,status,config,created_at,updated_at")
    .eq("organization_id", organizationId)
    .like("provider", "composio:%");
  const requestedToolkit = new URL(request.url).searchParams.get("toolkit");
  if (requestedToolkit) {
    const parsedToolkit = z.enum(toolkitSlugs).safeParse(requestedToolkit);
    if (!parsedToolkit.success)
      return NextResponse.json({ error: "Unknown toolkit." }, { status: 400 });
    const connected = (stored ?? []).some(
      (item) =>
        item.provider === `composio:${parsedToolkit.data}` &&
        item.status === "connected",
    );
    if (!connected)
      return NextResponse.json(
        { error: "Connect this application before browsing its actions." },
        { status: 409 },
      );
    try {
      const search = new URL(request.url).searchParams.get("search")?.trim();
      return NextResponse.json({
        tools: await listComposioTools({
          toolkit: parsedToolkit.data,
          search: search || undefined,
        }),
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Could not load actions.",
        },
        { status: 502 },
      );
    }
  }
  if (!process.env.COMPOSIO_API_KEY) {
    return NextResponse.json({
      configured: false,
      catalog: composioCatalog,
      connections: [],
      pending: stored ?? [],
    });
  }
  try {
    const accounts = (await listComposioConnections(organizationId)).map(
      normalizedAccount,
    );
    for (const account of accounts) {
      if (!account.toolkit || !account.id) continue;
      await supabase.from("integrations").upsert(
        {
          organization_id: organizationId,
          provider: `composio:${account.toolkit}`,
          status: account.status === "active" ? "connected" : account.status,
          config: {
            account_id: account.id,
            toolkit: account.toolkit,
            auth_mode: account.authMode,
          },
        },
        { onConflict: "organization_id,provider" },
      );
    }
    const { data: employees } = await supabase
      .from("ai_employees")
      .select("id,name,status,connected_toolkits")
      .eq("organization_id", organizationId)
      .in("status", ["active", "testing"])
      .order("created_at", { ascending: false });
    return NextResponse.json({
      configured: true,
      catalog: composioCatalog,
      connections: accounts,
      pending: stored ?? [],
      employees: employees ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        catalog: composioCatalog,
        connections: [],
        pending: stored ?? [],
        error:
          error instanceof Error ? error.message : "Could not load Composio.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = connectSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!manageable(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can connect applications." },
        { status: 403 },
      );
    const origin = publicAppUrl(request);
    const callbackUrl = `${origin.replace(/\/$/, "")}/app?view=integrations&connected=${encodeURIComponent(input.toolkit)}`;
    const connection = await createComposioConnection({
      organizationId,
      toolkit: input.toolkit,
      callbackUrl,
    });
    const { data, error } = await supabase
      .from("integrations")
      .upsert(
        {
          organization_id: organizationId,
          provider: `composio:${input.toolkit}`,
          status: "pending",
          config: {
            toolkit: input.toolkit,
            session_id: connection.sessionId,
            connection_request_id: connection.requestId,
          },
        },
        { onConflict: "organization_id,provider" },
      )
      .select("id,provider,status,config")
      .single();
    if (error) throw error;
    await supabase.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: "integration.authorization_started",
      entity_type: "integration",
      entity_id: data.id,
      metadata: { toolkit: input.toolkit },
    });
    return NextResponse.json({
      integration: data,
      redirectUrl: connection.redirectUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const input = disconnectSchema.parse(await request.json());
    const { supabase, user, organizationId, membershipRole } =
      await getCurrentOrganization();
    if (!user || !organizationId)
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 401 },
      );
    if (!manageable(membershipRole))
      return NextResponse.json(
        { error: "Only owners and admins can disconnect applications." },
        { status: 403 },
      );
    const { data: integration } = await supabase
      .from("integrations")
      .select("id,provider,config")
      .eq("organization_id", organizationId)
      .eq("provider", `composio:${input.toolkit}`)
      .maybeSingle();
    const storedAccountId = String(integration?.config?.account_id ?? "");
    if (storedAccountId && storedAccountId !== input.accountId)
      return NextResponse.json(
        { error: "Connected account mismatch." },
        { status: 409 },
      );
    await disconnectComposioAccount(input.accountId);
    await supabase
      .from("integrations")
      .delete()
      .eq("organization_id", organizationId)
      .eq("provider", `composio:${input.toolkit}`);
    await supabase.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: "integration.disconnected",
      entity_type: "integration",
      entity_id: integration?.id ?? input.accountId,
      metadata: { toolkit: input.toolkit },
    });
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Disconnect failed." },
      { status: 400 },
    );
  }
}
