"use client";

import { Bot, CheckCircle2, Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const workspaceKey = "24cd3b54-c64b-4d7c-b96e-3fd74da3d20e";
const snippet = `<script src="https://www.getresolvex.com/resolvex-widget.js" data-workspace="${workspaceKey}" async></script>`;

export function ChatbotTestBench() {
  const [run, setRun] = useState(0);

  useEffect(() => {
    document.getElementById("resolvex-launcher")?.remove();
    document.getElementById("resolvex-frame")?.remove();
    const script = document.createElement("script");
    script.id = "resolvex-production-widget";
    script.src = "https://www.getresolvex.com/resolvex-widget.js";
    script.dataset.workspace = workspaceKey;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
      document.getElementById("resolvex-launcher")?.remove();
      document.getElementById("resolvex-frame")?.remove();
    };
  }, [run]);

  return (
    <main className="min-h-screen bg-[#e9edf2] px-4 py-6 text-[#15171b] md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[22px] border border-black/8 bg-white p-6 shadow-sm md:p-10">
          <div className="flex size-12 items-center justify-center rounded-[14px] bg-[#15171b] text-[#d8ff70]">
            <Bot size={21} />
          </div>
          <p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[#6f7580]">
            Local development utility
          </p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-[-.045em] md:text-5xl">
            Chatbot test bench
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#666c76]">
            This page loads the real production widget script for the QAShift
            workspace. Open the launcher in the bottom-right corner and every
            message will use QAShift&apos;s approved knowledge and appear in its
            ResolveX Inbox.
          </p>

          <div className="mt-8 rounded-[12px] bg-[#101114] p-5 text-[#d8ff70]">
            <code className="block break-all text-sm leading-6">{snippet}</code>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(snippet);
                toast.success("QAShift widget snippet copied");
              }}
              className="flex h-11 items-center gap-2 rounded-[7px] bg-[#355cff] px-4 text-sm font-semibold text-white"
            >
              <Copy size={15} /> Copy exact script
            </button>
            <button
              onClick={() => setRun((value) => value + 1)}
              className="flex h-11 items-center gap-2 rounded-[7px] border border-black/10 px-4 text-sm font-semibold"
            >
              <RefreshCw size={15} /> Reload widget
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-black/8 bg-[#f5f6f7] p-5">
              <ShieldCheck className="text-[#497d27]" size={20} />
              <h2 className="mt-4 text-lg font-semibold">QAShift live data</h2>
              <p className="mt-2 text-sm leading-6 text-[#686e78]">
                The public key is fixed to QAShift. This is not the generic
                ResolveX product-demo chatbot.
              </p>
            </div>
            <div className="rounded-[12px] border border-black/8 bg-[#f5f6f7] p-5">
              <CheckCircle2 className="text-[#355cff]" size={20} />
              <h2 className="mt-4 text-lg font-semibold">Suggested test</h2>
              <p className="mt-2 text-sm leading-6 text-[#686e78]">
                Ask about a QAShift feature, verify the cited answer, then open
                ResolveX Inbox and confirm the conversation was saved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
