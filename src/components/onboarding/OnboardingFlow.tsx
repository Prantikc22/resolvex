"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const steps = ["Workspace", "First inbox", "Arlo boundaries"];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [workspace, setWorkspace] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"email" | "chat">("email");
  const [threshold, setThreshold] = useState(88);
  const [actions, setActions] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/signup");
      else if (!email) setEmail(data.user.email ?? "");
    });
  }, [email, router]);

  async function finish() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");
      const slugBase =
        workspace
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "workspace";
      const { data: organization, error } = await supabase
        .from("organizations")
        .insert({
          name: workspace,
          slug: `${slugBase}-${Date.now().toString(36)}`,
          owner_id: user.id,
          support_email: email,
          settings: { ai_threshold: threshold, ai_actions_enabled: actions },
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("inboxes").insert({
        organization_id: organization.id,
        name: channel === "email" ? "Support" : "Website chat",
        channel,
        address: channel === "email" ? email : null,
      });
      await fetch("/api/onboarding/welcome", { method: "POST" }).catch(
        () => null,
      );
      toast.success("Your workspace is ready.");
      router.push("/app");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the workspace.",
      );
    } finally {
      setLoading(false);
    }
  }

  const canContinue =
    step === 0
      ? workspace.trim().length > 1
      : step === 1
        ? channel === "chat" || email.includes("@")
        : true;

  return (
    <main className="page-grid min-h-screen bg-[#f5f6f8] p-3 md:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1320px] flex-col overflow-hidden rounded-[8px] border border-black/10 bg-white shadow-[0_28px_80px_rgba(30,40,70,.10)] md:min-h-[calc(100vh-2.5rem)]">
        <header className="flex h-17 items-center justify-between border-b border-black/8 px-4 md:px-7">
          <Logo />
          <span className="text-xs text-[#858b95]">
            Setup takes about 3 minutes
          </span>
        </header>
        <div className="grid flex-1 lg:grid-cols-[300px_1fr]">
          <aside className="border-b border-black/8 bg-[#10141d] p-5 text-white lg:border-b-0 lg:border-r lg:border-white/8 lg:p-7">
            <div className="text-xs font-semibold uppercase tracking-[.12em] text-white/35">
              Workspace setup
            </div>
            <div className="mt-6 flex gap-2 lg:block lg:space-y-2">
              {steps.map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "flex flex-1 items-center gap-3 rounded-[6px] p-2.5 text-xs lg:flex-none",
                    step === index
                      ? "bg-white text-[#101114]"
                      : index < step
                        ? "text-white"
                        : "text-white/35",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-[9px]",
                      step === index
                        ? "border-black/10 bg-[#c8ff73]"
                        : index < step
                          ? "border-[#c8ff73]/30 bg-[#c8ff73]/10 text-[#c8ff73]"
                          : "border-white/10",
                    )}
                  >
                    {index < step ? <Check size={12} /> : index + 1}
                  </span>
                  <span className="hidden sm:block">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 hidden rounded-[7px] border border-white/8 bg-white/[.035] p-4 lg:block">
              <Sparkles size={16} className="text-[#c8ff73]" />
              <p className="mt-4 text-xs leading-relaxed text-white/45">
                You can change every decision later. ResolveX starts
                conservative and earns more automation as your knowledge
                improves.
              </p>
            </div>
          </aside>
          <section className="flex items-center justify-center p-5 md:p-10">
            <div className="w-full max-w-2xl">
              <div className="mb-9 h-1 overflow-hidden rounded-full bg-[#ebedf0]">
                <motion.div
                  animate={{ width: `${((step + 1) / 3) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-[#355cff]"
                />
              </div>
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="workspace"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                  >
                    <span className="grid size-11 place-items-center rounded-[7px] bg-[#edf1ff] text-[#355cff]">
                      <Inbox size={20} />
                    </span>
                    <h1 className="mt-7 text-4xl font-semibold tracking-[-.045em]">
                      Name the place where support happens.
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#707782]">
                      Most teams use their company or product name. Customers
                      will see this identity in chat and the help center.
                    </p>
                    <label className="mt-9 block">
                      <span className="mb-2 block text-xs font-semibold">
                        Workspace name
                      </span>
                      <input
                        autoFocus
                        value={workspace}
                        onChange={(e) => setWorkspace(e.target.value)}
                        placeholder="Acme Support"
                        className="h-13 w-full rounded-[6px] border border-black/12 px-4 outline-none transition focus:border-[#355cff] focus:ring-4 focus:ring-[#355cff]/10"
                      />
                    </label>
                  </motion.div>
                )}
                {step === 1 && (
                  <motion.div
                    key="inbox"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                  >
                    <span className="grid size-11 place-items-center rounded-[7px] bg-[#eafbd2] text-[#4b891f]">
                      <MessageCircle size={20} />
                    </span>
                    <h1 className="mt-7 text-4xl font-semibold tracking-[-.045em]">
                      Start with one real channel.
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#707782]">
                      Choose the first place customers already contact you.
                      Additional channels can be added from the workspace.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          id: "email",
                          icon: Mail,
                          title: "Shared email",
                          copy: "Forward an existing support inbox.",
                        },
                        {
                          id: "chat",
                          icon: MessageCircle,
                          title: "Website chat",
                          copy: "Install the lightweight chat widget.",
                        },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() =>
                              setChannel(option.id as "email" | "chat")
                            }
                            className={cn(
                              "rounded-[7px] border p-5 text-left transition",
                              channel === option.id
                                ? "border-[#355cff] bg-[#edf1ff]"
                                : "border-black/10 hover:border-black/25",
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <Icon size={19} />
                              {channel === option.id && (
                                <CheckCircle2
                                  size={17}
                                  className="text-[#355cff]"
                                />
                              )}
                            </div>
                            <div className="mt-7 text-sm font-semibold">
                              {option.title}
                            </div>
                            <div className="mt-2 text-xs text-[#747a85]">
                              {option.copy}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {channel === "email" && (
                      <label className="mt-5 block">
                        <span className="mb-2 block text-xs font-semibold">
                          Support email
                        </span>
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          type="email"
                          className="h-12 w-full rounded-[6px] border border-black/12 px-4 outline-none focus:border-[#355cff]"
                        />
                      </label>
                    )}
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                  >
                    <span className="grid size-11 place-items-center rounded-[7px] bg-[#101114] text-[#c8ff73]">
                      <Bot size={20} />
                    </span>
                    <h1 className="mt-7 text-4xl font-semibold tracking-[-.045em]">
                      Decide how cautious Arlo should be.
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#707782]">
                      Arlo only answers from approved knowledge.
                      Lower-confidence conversations always move to a person.
                    </p>
                    <div className="mt-8 rounded-[7px] border border-black/10 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">
                            Minimum answer confidence
                          </div>
                          <div className="mt-1 text-xs text-[#858b95]">
                            Recommended for a new workspace: 88%
                          </div>
                        </div>
                        <span className="font-mono text-2xl text-[#355cff]">
                          {threshold}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="98"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="mt-7 w-full accent-[#355cff]"
                      />
                    </div>
                    <button
                      onClick={() => setActions((value) => !value)}
                      className="mt-3 flex w-full items-center justify-between rounded-[7px] border border-black/10 p-5 text-left"
                    >
                      <div>
                        <div className="text-sm font-semibold">
                          Prepare safe actions
                        </div>
                        <div className="mt-1 text-xs text-[#858b95]">
                          Arlo can prepare reversible actions for a human or
                          customer to approve.
                        </div>
                      </div>
                      <span
                        className={cn(
                          "flex h-6 w-10 items-center rounded-full p-1 transition",
                          actions
                            ? "justify-end bg-[#355cff]"
                            : "justify-start bg-[#d8dbe0]",
                        )}
                      >
                        <span className="size-4 rounded-full bg-white" />
                      </span>
                    </button>
                    <div className="mt-3 flex gap-3 rounded-[7px] bg-[#f3f4f6] p-4 text-xs leading-relaxed text-[#606772]">
                      <ShieldCheck
                        size={17}
                        className="shrink-0 text-[#4b891f]"
                      />
                      Refunds, account deletion, and other sensitive actions
                      stay human-only by default.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-10 flex items-center justify-between">
                <button
                  disabled={step === 0}
                  onClick={() => setStep((value) => value - 1)}
                  className="flex h-11 items-center gap-2 rounded-[6px] px-3 text-xs font-semibold text-[#747a85] disabled:opacity-0"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                {step < 2 ? (
                  <button
                    disabled={!canContinue}
                    onClick={() => setStep((value) => value + 1)}
                    className="flex h-11 items-center gap-2 rounded-[6px] bg-[#101114] px-5 text-xs font-semibold text-white disabled:opacity-35"
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    disabled={loading}
                    className="flex h-11 items-center gap-2 rounded-[6px] bg-[#101114] px-5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={14} />
                        Open workspace
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
