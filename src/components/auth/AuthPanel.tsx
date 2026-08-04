"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo, Mark } from "@/components/brand/Logo";
import { brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";

export function AuthPanel({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "auth_callback") {
      toast.error("Google sign-in could not be completed. Please try again.");
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/app");
          router.refresh();
        } else {
          toast.success("Check your inbox to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/app");
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/app`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      setOauthLoading(false);
      toast.error(
        error instanceof Error ? error.message : "Google sign-in failed.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0c0f] text-white">
      <div className="grid min-h-screen lg:grid-cols-[.92fr_1.08fr]">
        <section className="relative flex min-h-screen flex-col border-white/10 px-5 py-5 sm:px-10 lg:border-r lg:px-14 xl:px-20">
          <div className="flex items-center justify-between">
            <Logo inverse />
            <Link
              href="/"
              className="text-xs font-medium text-white/45 transition hover:text-white"
            >
              Back to site
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto my-auto w-full max-w-[470px] py-16"
          >
            <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#d8ff70]">
              {mode === "signup" ? "Your support workspace" : "Welcome back"}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
              {mode === "signup"
                ? "Start resolving today."
                : "Pick up where you left off."}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/48">
              {mode === "signup"
                ? "Create a workspace, connect one channel, and let Arlo learn only from knowledge you approve."
                : "Sign in to your inbox, knowledge, automations, and support reports."}
            </p>

            <button
              type="button"
              disabled={oauthLoading || loading}
              onClick={signInWithGoogle}
              className="mt-9 flex h-12 w-full items-center justify-center gap-3 rounded-[6px] border border-white/16 bg-white text-sm font-semibold text-[#16171a] transition hover:bg-[#f0f1f3] disabled:opacity-55"
            >
              {oauthLoading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Image src="/google-g.svg" width={18} height={18} alt="" />
              )}
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[.12em] text-white/28">
              <span className="h-px flex-1 bg-white/10" />
              or use work email
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <AuthField label="Your name">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    className="auth-input"
                    placeholder="Avery Morgan"
                  />
                </AuthField>
              )}
              <AuthField label="Work email">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  autoComplete="email"
                  className="auth-input"
                  placeholder="you@company.com"
                />
              </AuthField>
              <AuthField
                label="Password"
                action={
                  mode === "login" ? (
                    <Link
                      href="/forgot-password"
                      className="text-white/42 transition hover:text-white"
                    >
                      Forgot password?
                    </Link>
                  ) : undefined
                }
              >
                <span className="relative block">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    className="auth-input pr-12"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-1 top-1 grid size-10 place-items-center text-white/38 transition hover:text-white"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </AuthField>
              <button
                disabled={loading || oauthLoading}
                className="button-bright flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#ff5c35] text-sm font-semibold text-white disabled:opacity-55"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {mode === "signup" ? "Create workspace" : "Sign in"}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/42">
              {mode === "signup"
                ? "Already have a workspace?"
                : "New to ResolveX?"}{" "}
              <Link
                href={mode === "signup" ? "/login" : "/signup"}
                className="font-semibold text-white hover:underline"
              >
                {mode === "signup" ? "Sign in" : "Start free"}
              </Link>
            </p>
            <p className="mt-6 text-center text-[10px] leading-relaxed text-white/25">
              By continuing, you agree to the{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </motion.div>
        </section>

        <AuthPreview />
      </div>
    </main>
  );
}

function AuthField({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-xs font-semibold text-white/65">
        {label}
        {action}
      </span>
      {children}
    </label>
  );
}

function AuthPreview() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-[#15171c] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.14em] text-white/34">
        <span>Meet {brand.agentName}</span>
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#c8ff73]" /> Ready
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[650px]"
      >
        <h2 className="max-w-xl text-5xl font-semibold leading-[.96] tracking-[-.05em] xl:text-6xl">
          The first reply is already taking shape.
        </h2>
        <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/43">
          Arlo reads the approved answer, checks confidence, and gives your team
          a clean handoff when judgement is needed.
        </p>

        <div className="mt-10 overflow-hidden rounded-[8px] border border-white/12 bg-[#0d0f13] shadow-[0_32px_90px_rgba(0,0,0,.34)]">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <Mark className="size-9" />
              <div>
                <div className="text-sm font-semibold">Arlo</div>
                <div className="text-[10px] text-white/35">
                  AI resolution agent
                </div>
              </div>
            </div>
            <span className="rounded-[4px] border border-[#c8ff73]/20 bg-[#c8ff73]/8 px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-[#c8ff73]">
              Grounded
            </span>
          </div>
          <div className="space-y-4 p-5">
            <div className="ml-auto max-w-[78%] rounded-[7px] bg-white px-4 py-3 text-sm leading-relaxed text-[#17181b]">
              Can I move my billing date without cancelling the plan?
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="max-w-[88%] rounded-[7px] border border-white/10 bg-white/[.055] px-4 py-3 text-sm leading-relaxed text-white/72"
            >
              Yes. An owner can change the billing date from Billing settings.
              The next invoice is prorated before you confirm.
              <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3 text-[10px] text-[#c8ff73]">
                <CheckCircle2 size={13} /> Billing guide · approved today
              </div>
            </motion.div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {["92% confidence", "6 sec response", "No human needed"].map(
                (item) => (
                  <div
                    key={item}
                    className="border-l border-white/12 px-3 py-2 text-[10px] text-white/38"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between border-t border-white/8 pt-5 text-[10px] text-white/28">
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} /> Tenant-isolated knowledge
        </span>
        <span className="flex items-center gap-2">
          <LockKeyhole size={14} /> Human approval controls
        </span>
      </div>
    </section>
  );
}
