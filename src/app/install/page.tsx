"use client";

import { useState } from "react";
import { Check, Clipboard, Code2, Palette } from "lucide-react";
import { ResourcePage } from "@/components/marketing/ResourcePage";
import { WidgetPanel } from "@/components/widget/ResolveWidget";

const snippet = `<script src="https://your-resolvex-domain.com/resolvex-widget.js" data-workspace="YOUR_PUBLIC_WIDGET_KEY" async></script>`;

export default function InstallPage() {
  const [copied, setCopied] = useState(false);
  return (
    <ResourcePage
      eyebrow="Messenger install"
      title="One script. Your support desk, everywhere."
      copy="Add ResolveX to any website without rebuilding it. The public widget key identifies the workspace on the server; it never exposes a Supabase credential."
    >
      <section className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#ff5c35]">
              <Code2 size={15} />
              Install
            </div>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.045em]">
              Paste before the closing body tag.
            </h2>
            <div className="relative mt-7 rounded-[8px] bg-[#111214] p-5 text-[#d8ff70]">
              <code className="block overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed">
                {snippet}
              </code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(snippet);
                  setCopied(true);
                }}
                className="mt-5 flex h-10 items-center gap-2 rounded-[5px] bg-white px-3 text-xs font-semibold text-[#151619]"
              >
                {copied ? <Check size={14} /> : <Clipboard size={14} />}{" "}
                {copied ? "Copied" : "Copy snippet"}
              </button>
            </div>
            <div className="mt-7 space-y-4">
              {[
                [
                  "Identity",
                  "Upload your mark, support name, and welcome copy.",
                ],
                [
                  "Brand",
                  "Set the accent, launcher position, and light or dark header.",
                ],
                [
                  "Control",
                  "Choose AI confidence, handoff hours, and enabled channels.",
                ],
              ].map(([title, copy]) => (
                <div key={title} className="border-b border-black/10 pb-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <Palette size={15} />
                    {title}
                  </div>
                  <p className="mt-1 text-sm text-[#70737a]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[8px] bg-[#e8edf7] p-4 sm:p-8">
            <div className="mx-auto max-w-[440px] overflow-hidden rounded-[8px] border border-black/10 bg-white shadow-[0_30px_80px_rgba(25,35,55,.2)]">
              <WidgetPanel embedded />
            </div>
          </div>
        </div>
      </section>
    </ResourcePage>
  );
}
