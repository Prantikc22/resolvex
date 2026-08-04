import { NextResponse } from "next/server";
import { escapeEmailHtml, sendEmail } from "@/lib/email/resend";
import { getCurrentOrganization } from "@/lib/supabase/current-org";
import { createAdminClient } from "@/lib/supabase/admin";

function welcomeMarkup(name: string, workspace: string, appUrl: string) {
  const safeName = escapeEmailHtml(name);
  const safeWorkspace = escapeEmailHtml(workspace);
  const safeUrl = escapeEmailHtml(appUrl);
  return `<!doctype html>
<html><body style="margin:0;background:#f3f2ed;font-family:Arial,sans-serif;color:#111318">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #deded8;border-radius:10px;overflow:hidden">
      <tr><td style="height:7px;background:#ff5c35"></td></tr>
      <tr><td style="padding:34px 38px 12px">
        <div style="font-size:20px;font-weight:750">Resolve<span style="color:#355cff">X</span></div>
        <div style="margin-top:42px;color:#6d7179;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Workspace ready</div>
        <h1 style="margin:13px 0 0;font-size:38px;line-height:1.04;letter-spacing:-1.4px">Welcome, ${safeName}.<br>Your support desk is awake.</h1>
        <p style="margin:22px 0 0;color:#62666e;font-size:16px;line-height:1.65">${safeWorkspace} now has a shared inbox, an installable messenger, approved knowledge controls, and Arlo ready to answer only from sources you trust.</p>
      </td></tr>
      <tr><td style="padding:22px 38px 10px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111318;color:#fff;border-radius:8px">
          <tr><td style="padding:22px">
            <div style="font-size:12px;color:#d9ff72;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Your first 15 minutes</div>
            <div style="margin-top:16px;font-size:14px;line-height:2">01 &nbsp; Add one approved answer<br>02 &nbsp; Install the messenger<br>03 &nbsp; Send yourself a real question</div>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:22px 38px 42px">
        <a href="${safeUrl}/app" style="display:inline-block;background:#ff5c35;color:#fff;text-decoration:none;font-weight:700;padding:15px 22px;border-radius:6px">Open ${safeWorkspace} &rarr;</a>
        <p style="margin:25px 0 0;color:#92959b;font-size:12px;line-height:1.6">No sales call required. Reply to this email when you want a person.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function founderMarkup(email: string, workspace: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f4f1;color:#111318;padding:28px">
    <div style="max-width:560px;margin:auto;background:white;border:1px solid #ddd;padding:30px;border-radius:8px">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ff5c35;font-weight:700">New ResolveX workspace</div>
      <h1 style="font-size:30px;letter-spacing:-1px">${escapeEmailHtml(workspace)}</h1>
      <p style="font-size:16px;color:#62666e">${escapeEmailHtml(email)} completed onboarding and created a live workspace.</p>
    </div>
  </body></html>`;
}

export async function POST() {
  const { supabase, user, organizationId } = await getCurrentOrganization();
  if (!user || !user.email || !organizationId) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 401 },
    );
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { sent: false, configured: false },
      { status: 202 },
    );
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: organization }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name,welcome_email_sent_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single(),
  ]);

  if (profile?.welcome_email_sent_at) {
    return NextResponse.json({ sent: true, duplicate: true });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const workspace = organization?.name ?? "Your workspace";
  const name =
    profile?.full_name ??
    user.user_metadata?.full_name ??
    user.email.split("@")[0];
  const founderEmail =
    process.env.RESEND_NOTIFY_EMAIL ?? "prantik.chatterjee@resolutex.com";

  try {
    await Promise.all([
      sendEmail({
        to: user.email,
        subject: `${workspace} is ready on ResolveX`,
        html: welcomeMarkup(name, workspace, appUrl),
        text: `Welcome, ${name}. ${workspace} is ready on ResolveX. Add one approved answer, install the messenger, and send yourself a real question. Open ${appUrl}/app`,
        idempotencyKey: `resolvex-welcome-${user.id}`,
      }),
      sendEmail({
        to: founderEmail,
        subject: `New ResolveX workspace: ${workspace}`,
        html: founderMarkup(user.email, workspace),
        text: `${user.email} completed onboarding and created ${workspace}.`,
        idempotencyKey: `resolvex-founder-notice-${organizationId}`,
      }),
    ]);
    await admin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", user.id);
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Welcome email failed", error);
    return NextResponse.json(
      { error: "Email delivery is not ready." },
      { status: 502 },
    );
  }
}
