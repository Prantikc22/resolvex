import { NextResponse } from "next/server";
import { publicAppUrl } from "@/lib/app-url";
import { verifyPlivoV3Signature } from "@/lib/providers/plivo";

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => {
    const values: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return values[character];
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = Object.fromEntries(
    [...form.entries()].map(([key, value]) => [key, String(value)]),
  );
  const requestUrl = new URL(request.url);
  const signatureUrl = `${publicAppUrl()}${requestUrl.pathname}${requestUrl.search}`;
  const valid = verifyPlivoV3Signature({
    url: signatureUrl,
    params,
    signature: request.headers.get("x-plivo-signature-v3"),
    nonce: request.headers.get("x-plivo-signature-v3-nonce"),
  });
  if (!valid)
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  const destination = params.To ?? "";
  if (!destination)
    return NextResponse.json(
      { error: "Missing destination." },
      { status: 400 },
    );
  const called = destination.startsWith("+") ? destination : `+${destination}`;
  const sipUri = `sip:${called}@sip.rtc.elevenlabs.io:5060`;
  const callback = `${publicAppUrl()}/api/voice/webhooks/plivo/status${requestUrl.search}`;
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callbackUrl="${xmlEscape(callback)}" callbackMethod="POST"><User>${xmlEscape(sipUri)}</User></Dial></Response>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
