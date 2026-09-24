"use client";

import { Bot, RefreshCw, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { WidgetPanel } from "@/components/widget/ResolveWidget";

type Mode = "product" | "workspace";

export function ChatbotTestBench() {
  const [mode, setMode] = useState<Mode>("product");
  const [workspaceKey, setWorkspaceKey] = useState("");
  const [activeWorkspaceKey, setActiveWorkspaceKey] = useState("");
  const [run, setRun] = useState(0);

  function applyWorkspace(event: FormEvent) {
    event.preventDefault();
    setActiveWorkspaceKey(workspaceKey.trim());
    setRun((value) => value + 1);
  }

  function reset() {
    setRun((value) => value + 1);
  }

  return (
    <main className="min-h-screen bg-[#e9edf2] px-4 py-6 text-[#15171b] md:px-8 md:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[22px] border border-black/8 bg-white p-6 shadow-sm md:p-9">
          <div className="flex size-12 items-center justify-center rounded-[14px] bg-[#15171b] text-[#d8ff70]">
            <Bot size={21} />
          </div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[.16em] text-[#6f7580]">
            Local development utility
          </p>
          <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-[-.045em] md:text-5xl">
            Chatbot test bench
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#666c76]">
            Exercise Arlo from a small standalone page before installing the
            messenger on another site. This route returns 404 in production.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                setMode("product");
                reset();
              }}
              className={`rounded-[12px] border p-4 text-left transition ${
                mode === "product"
                  ? "border-[#355cff] bg-[#edf1ff]"
                  : "border-black/10 hover:border-black/25"
              }`}
            >
              <b className="text-sm">Product demo</b>
              <span className="mt-2 block text-xs leading-5 text-[#6f7580]">
                Uses the approved ResolveX product guide and does not create an
                Inbox conversation.
              </span>
            </button>
            <button
              onClick={() => {
                setMode("workspace");
                reset();
              }}
              className={`rounded-[12px] border p-4 text-left transition ${
                mode === "workspace"
                  ? "border-[#355cff] bg-[#edf1ff]"
                  : "border-black/10 hover:border-black/25"
              }`}
            >
              <b className="text-sm">Workspace widget</b>
              <span className="mt-2 block text-xs leading-5 text-[#6f7580]">
                Uses a real public widget key and persists the conversation to
                that workspace Inbox.
              </span>
            </button>
          </div>

          {mode === "workspace" && (
            <form onSubmit={applyWorkspace} className="mt-6">
              <label className="text-xs font-semibold" htmlFor="workspace-key">
                Public widget key
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="workspace-key"
                  value={workspaceKey}
                  onChange={(event) => setWorkspaceKey(event.target.value)}
                  placeholder="Paste the workspace UUID"
                  className="h-11 min-w-0 flex-1 rounded-[7px] border border-black/10 px-3 text-sm outline-none focus:border-[#355cff]"
                />
                <button className="h-11 rounded-[7px] bg-[#355cff] px-5 text-xs font-semibold text-white">
                  Load widget
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 rounded-[12px] bg-[#f5f6f7] p-5">
            <div className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 shrink-0 text-[#497d27]"
                size={18}
              />
              <div>
                <b className="text-sm">Suggested checks</b>
                <ol className="mt-3 space-y-2 text-xs leading-5 text-[#686e78]">
                  <li>1. Ask a question covered by approved knowledge.</li>
                  <li>2. Ask an unsupported question and verify handoff.</li>
                  <li>3. Send several messages and confirm history remains.</li>
                  <li>4. In workspace mode, confirm the thread in Inbox.</li>
                  <li>5. Reply as a human and verify AI stays disabled.</li>
                </ol>
              </div>
            </div>
          </div>

          <button
            onClick={reset}
            className="mt-5 flex h-10 items-center gap-2 rounded-[7px] border border-black/10 px-4 text-xs font-semibold"
          >
            <RefreshCw size={14} /> Reset conversation
          </button>
        </section>

        <section className="flex min-h-[680px] items-center justify-center overflow-hidden rounded-[22px] bg-[#17191d] p-3 md:p-5">
          {mode === "workspace" && !activeWorkspaceKey ? (
            <div className="max-w-xs text-center text-white">
              <Bot className="mx-auto text-[#d8ff70]" size={30} />
              <h2 className="mt-5 text-xl font-semibold">
                Add a workspace key
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/50">
                Find it in Settings → Channels after enabling the website
                widget.
              </p>
            </div>
          ) : (
            <WidgetPanel
              key={`${mode}-${activeWorkspaceKey}-${run}`}
              workspaceKey={
                mode === "workspace" ? activeWorkspaceKey : undefined
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
