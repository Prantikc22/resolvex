"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/team/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not accept the invitation.");
      setBusy(false);
      return;
    }
    router.replace("/app");
    router.refresh();
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f2ed] p-5 text-[#111318]">
      <section className="w-full max-w-md rounded-xl border border-black/10 bg-white p-8 shadow-xl shadow-black/5">
        <Logo href="/" />
        <p className="mt-10 text-[10px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
          Workspace invitation
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
          Join your support team.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#727680]">
          Sign in with the email address that received this invitation, then
          accept it here.
        </p>
        {error && (
          <p className="mt-4 rounded-md bg-[#fff0ec] p-3 text-xs text-[#9b321d]">
            {error}
          </p>
        )}
        <button
          onClick={accept}
          disabled={busy}
          className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#111318] text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}Accept
          invitation
        </button>
        <Link
          href={`/login`}
          className="mt-4 block text-center text-xs font-semibold text-[#355cff]"
        >
          Sign in first
        </Link>
      </section>
    </main>
  );
}
