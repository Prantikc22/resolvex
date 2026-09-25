import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ token: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email)
    return NextResponse.json(
      { error: "Sign in with the invited email first." },
      { status: 401 },
    );
  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("invitations")
    .select("id,organization_id,email,role,expires_at,accepted_at")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (
    !invitation ||
    invitation.accepted_at ||
    new Date(invitation.expires_at) <= new Date()
  )
    return NextResponse.json(
      { error: "This invitation is invalid or expired." },
      { status: 410 },
    );
  if (invitation.email.toLowerCase() !== user.email.toLowerCase())
    return NextResponse.json(
      { error: `Sign in as ${invitation.email} to accept this invitation.` },
      { status: 403 },
    );
  if (invitation.role !== "viewer") {
    const [
      { data: subscription },
      { count: paidMembers },
      { count: paidInvites },
    ] = await Promise.all([
      admin
        .from("subscriptions")
        .select("status,metadata")
        .eq("organization_id", invitation.organization_id)
        .maybeSingle(),
      admin
        .from("memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", invitation.organization_id)
        .in("role", ["owner", "admin", "agent"]),
      admin
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", invitation.organization_id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .in("role", ["admin", "agent"]),
    ]);
    const requiredSeats = Math.max(1, (paidMembers ?? 0) + (paidInvites ?? 0));
    const purchasedSeats = Number(subscription?.metadata?.agents ?? 0);
    if (
      !new Set(["active", "authenticated", "trialing"]).has(
        subscription?.status ?? "",
      ) ||
      purchasedSeats < requiredSeats
    ) {
      return NextResponse.json(
        {
          error:
            "This paid seat is not active yet. Ask the workspace owner to complete the seat payment, then try again.",
        },
        { status: 402 },
      );
    }
  }
  const { error } = await admin.from("memberships").upsert(
    {
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
    },
    { onConflict: "organization_id,user_id" },
  );
  if (error)
    return NextResponse.json(
      { error: "Could not add you to the workspace." },
      { status: 500 },
    );
  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);
  return NextResponse.json({ accepted: true });
}
