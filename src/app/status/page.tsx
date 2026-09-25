import { Activity, CheckCircle2 } from "lucide-react";
import { ResourcePage } from "@/components/marketing/ResourcePage";

export default function StatusPage() {
  const systems = [
    "Web application",
    "Messenger and widget",
    "Email delivery",
    "AI resolution service",
    "Voice coordination",
    "Knowledge sync",
  ];
  return (
    <ResourcePage
      eyebrow="System status"
      title="Everything customers touch, in one view."
      copy="This public status view is ready for operational monitoring integration before production launch."
    >
      <section className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[900px]">
          <div className="flex items-center justify-between rounded-[7px] bg-[#dff8bc] p-5 text-[#294d10]">
            <div>
              <div className="font-semibold">All systems operational</div>
              <div className="mt-1 text-xs opacity-70">No active incidents</div>
            </div>
            <Activity size={22} />
          </div>
          <div className="mt-6 overflow-hidden rounded-[7px] border border-black/10">
            {systems.map((system) => (
              <div
                key={system}
                className="flex items-center justify-between border-b border-black/8 px-5 py-4 last:border-0"
              >
                <span className="text-sm font-semibold">{system}</span>
                <span className="flex items-center gap-2 text-xs text-[#4d7d29]">
                  <CheckCircle2 size={14} />
                  Operational
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[#7a7d84]">
            Production uptime history will appear here once monitoring is
            connected. No historical metric is claimed before then.
          </p>
        </div>
      </section>
    </ResourcePage>
  );
}
