"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/client";

export function RecoveryPanel({ mode }: { mode: "request" | "reset" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "request") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated. You can continue to your workspace.");
        router.push("/app");
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not complete the request.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0b0c0f] px-5 py-5 text-white sm:px-10">
      <div className="flex items-center justify-between">
        <Logo inverse />
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs text-white/45 transition hover:text-white"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
      <div className="mx-auto my-auto w-full max-w-md py-16">
        {sent ? (
          <div className="rounded-[8px] border border-white/12 bg-white/[.035] p-7">
            <CheckCircle2 className="text-[#c8ff73]" />
            <h1 className="mt-7 text-4xl font-semibold tracking-[-.045em]">
              Check your inbox.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/48">
              If an account exists for {email}, Supabase has sent a secure
              password reset link.
            </p>
          </div>
        ) : (
          <>
            <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#d8ff70]">
              Account recovery
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em]">
              {mode === "request"
                ? "Reset your password."
                : "Choose a new password."}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/48">
              {mode === "request"
                ? "We will send a time-limited recovery link to your account email."
                : "Use at least eight characters and avoid a password you use elsewhere."}
            </p>
            <form onSubmit={submit} className="mt-9 space-y-4">
              {mode === "request" ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-white/65">
                    Work email
                  </span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="auth-input"
                    placeholder="you@company.com"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-white/65">
                    New password
                  </span>
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="auth-input"
                    placeholder="At least 8 characters"
                  />
                </label>
              )}
              <button
                disabled={loading}
                className="button-bright flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] text-sm font-semibold disabled:opacity-55"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {mode === "request"
                      ? "Send recovery link"
                      : "Update password"}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
