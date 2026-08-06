import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import {
  PAID_ROLES,
  requiredPaidSeats,
  syncSubscriptionSeats,
} from "@/lib/billing/seats";
import { escapeEmailHtml, sendEmail } from "@/lib/email/resend";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "agent", "viewer"]),
});
const changeSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "agent", "viewer"]),
});
const canManage = (role: string | null) => role === "owner" || role === "admin";

function providerMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The team change could not be completed.";
}

export async function GET() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const [
    { data: memberships, error },
    { data: invites },
    { data: subscription },
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("user_id,role,created_at")
      .eq("organization_id", organizationId),
    supabase
      .from("invitations")
      .select("id,email,role,token,expires_at,created_at")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("subscriptions")
      .select("status,metadata")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);
  if (error)
    return NextResponse.json(
      { error: "Could not load the team." },
      { status: 500 },
    );
  const members = await Promise.all(
    (memberships ?? []).map(async (membership) => {
      const [{ data: profile }, authResult] = await Promise.all([
        admin
          .from("profiles")
          .select("full_name,avatar_url")
          .eq("id", membership.user_id)
          .maybeSingle(),
        admin.auth.admin.getUserById(membership.user_id),
      ]);
      return {
        ...membership,
        name:
          profile?.full_name ??
          authResult.data.user?.email?.split("@")[0] ??
          "Teammate",
        email: authResult.data.user?.email ?? "",
      };
    }),
  );
  return NextResponse.json({
    members,
    invitations: invites ?? [],
    paidSeats: await requiredPaidSeats(supabase, organizationId),
    subscriptionSeats: Number(subscription?.metadata?.agents ?? 1),
    subscriptionStatus: subscription?.status ?? null,
  });
}

export async function POST(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(membershipRole))
    return NextResponse.json(
      { error: "Only owners and admins can invite teammates." },
      { status: 403 },
    );
  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a valid email and role." },
      { status: 400 },
    );
  const email = parsed.data.email.toLowerCase();
  const { data: existingMembers } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", organizationId);
  const admin = createAdminClient();
  for (const member of existingMembers ?? []) {
    const { data } = await admin.auth.admin.getUserById(member.user_id);
    if (data.user?.email?.toLowerCase() === email)
      return NextResponse.json(
        { error: "That person is already a member." },
        { status: 409 },
      );
  }
  const { data: invitation, error } = await supabase
    .from("invitations")
    .upsert(
      {
        organization_id: organizationId,
        email,
        role: parsed.data.role,
        invited_by: user.id,
        accepted_at: null,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
      { onConflict: "organization_id,email" },
    )
    .select("id,token,email,role,expires_at")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Could not create the invitation." },
      { status: 500 },
    );
  const seats = await requiredPaidSeats(supabase, organizationId);
  try {
    if (PAID_ROLES.has(parsed.data.role))
      await syncSubscriptionSeats(supabase, organizationId, seats);
  } catch (seatError) {
    await supabase.from("invitations").delete().eq("id", invitation.id);
    return NextResponse.json(
      { error: providerMessage(seatError) },
      { status: 502 },
    );
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await sendEmail({
      to: email,
      subject: "You are invited to ResolveX",
      html: `<p>You have been invited to a ResolveX workspace as <strong>${escapeEmailHtml(parsed.data.role)}</strong>.</p><p><a href="${appUrl}/invite/${invitation.token}">Accept invitation</a></p>`,
      text: `You have been invited to ResolveX as ${parsed.data.role}. Accept: ${appUrl}/invite/${invitation.token}`,
      idempotencyKey: `resolvex-invite-${invitation.id}-${invitation.expires_at}`,
    });
    return NextResponse.json({ invitation, paidSeats: seats });
  } catch (emailError) {
    console.error("Team invitation email failed", emailError);
    return NextResponse.json(
      {
        invitation,
        paidSeats: seats,
        warning:
          "The seat and invitation were created, but the email could not be delivered. Retry after checking email delivery.",
      },
      { status: 202 },
    );
  }
}

export async function PATCH(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(membershipRole))
    return NextResponse.json(
      { error: "Only owners and admins can change roles." },
      { status: 403 },
    );
  const parsed = changeSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid role change." },
      { status: 400 },
    );
  const { data: previous } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", parsed.data.userId)
    .single();
  if (!previous || previous.role === "owner")
    return NextResponse.json(
      { error: "The workspace owner role cannot be changed." },
      { status: 409 },
    );
  const { error } = await supabase
    .from("memberships")
    .update({ role: parsed.data.role })
    .eq("organization_id", organizationId)
    .eq("user_id", parsed.data.userId);
  if (error)
    return NextResponse.json(
      { error: "Could not change the role." },
      { status: 500 },
    );
  try {
    const seats = await requiredPaidSeats(supabase, organizationId);
    await syncSubscriptionSeats(supabase, organizationId, seats);
    return NextResponse.json({ updated: true, paidSeats: seats });
  } catch (seatError) {
    await supabase
      .from("memberships")
      .update({ role: previous.role })
      .eq("organization_id", organizationId)
      .eq("user_id", parsed.data.userId);
    return NextResponse.json(
      { error: providerMessage(seatError) },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const { supabase, user, organizationId, membershipRole } =
    await getCurrentOrganization();
  if (!user || !organizationId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(membershipRole))
    return NextResponse.json(
      { error: "Only owners and admins can remove teammates." },
      { status: 403 },
    );
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");
  const userId = url.searchParams.get("userId");
  if (invitationId)
    await supabase
      .from("invitations")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", invitationId);
  else if (userId && userId !== user.id) {
    const { data: member } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();
    if (member?.role === "owner")
      return NextResponse.json(
        { error: "The workspace owner cannot be removed." },
        { status: 409 },
      );
    await supabase
      .from("memberships")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
  } else
    return NextResponse.json(
      { error: "Choose a teammate or invitation." },
      { status: 400 },
    );
  const seats = await requiredPaidSeats(supabase, organizationId);
  try {
    await syncSubscriptionSeats(supabase, organizationId, seats);
  } catch (error) {
    return NextResponse.json(
      { error: providerMessage(error) },
      { status: 502 },
    );
  }
  return NextResponse.json({ removed: true, paidSeats: seats });
}
