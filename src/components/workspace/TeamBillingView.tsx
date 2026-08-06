"use client";

import { Check, CreditCard, Plus, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { estimateResolveX, money, pricing } from "@/lib/pricing";

const initialMembers = [
  {
    name: "Prantik Mazumder",
    email: "prantik@acme.co",
    role: "Owner",
    paid: true,
  },
  { name: "Maya Chen", email: "maya@acme.co", role: "Agent", paid: true },
  { name: "Jon Bell", email: "jon@acme.co", role: "Agent", paid: true },
  { name: "Sara Ali", email: "sara@acme.co", role: "Agent", paid: true },
  {
    name: "Nikhil Rao",
    email: "nikhil@acme.co",
    role: "Collaborator",
    paid: false,
  },
  {
    name: "Aisha Malik",
    email: "aisha@acme.co",
    role: "Collaborator",
    paid: false,
  },
];

export function TeamBillingView() {
  const [members, setMembers] = useState(initialMembers);
  const agents = members.filter((member) => member.paid).length;
  const estimate = useMemo(() => estimateResolveX(agents, 260), [agents]);
  function inviteAgent() {
    const number = members.length + 1;
    setMembers((value) => [
      ...value,
      {
        name: `New agent ${number}`,
        email: `agent${number}@acme.co`,
        role: "Agent",
        paid: true,
      },
    ]);
    toast.success(
      `Agent seat added - next bill increases by ${money(pricing.agent)}`,
    );
  }
  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Team and billing
            </h2>
            <p className="mt-2 text-sm text-[#74777f]">
              People who reply to customers are paid agents. Viewers and
              internal collaborators are free.
            </p>
          </div>
          <button
            onClick={inviteAgent}
            className="flex h-11 items-center gap-2 rounded-[6px] bg-[#17191d] px-4 text-xs font-semibold text-white"
          >
            <Plus size={15} />
            Invite agent
          </button>
        </div>
        <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="overflow-hidden rounded-[8px] border border-black/10 bg-white">
            <div className="grid grid-cols-[1fr_110px_90px] border-b border-black/8 bg-[#fafafa] px-4 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-[#8a8d94]">
              <span>Teammate</span>
              <span>Role</span>
              <span>Billing</span>
            </div>
            {members.map((member) => (
              <div
                key={member.email}
                className="grid grid-cols-[1fr_110px_90px] items-center border-b border-black/7 px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-[#e9eaed] text-[10px] font-bold">
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">
                      {member.name}
                    </div>
                    <div className="mt-1 truncate text-[9px] text-[#8a8d94]">
                      {member.email}
                    </div>
                  </div>
                </div>
                <select
                  value={member.role}
                  onChange={(event) =>
                    setMembers((value) =>
                      value.map((entry) =>
                        entry.email === member.email
                          ? {
                              ...entry,
                              role: event.target.value,
                              paid: event.target.value !== "Collaborator",
                            }
                          : entry,
                      ),
                    )
                  }
                  className="h-8 rounded-[4px] border border-black/10 bg-white px-2 text-[10px]"
                >
                  <option>Owner</option>
                  <option>Admin</option>
                  <option>Agent</option>
                  <option>Collaborator</option>
                </select>
                <span
                  className={
                    member.paid
                      ? "text-[10px] font-semibold text-[#ff5c35]"
                      : "text-[10px] text-[#4f8129]"
                  }
                >
                  {member.paid ? `$${pricing.agent}/mo` : "Free"}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-[8px] bg-[#17191d] p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-[6px] bg-[#d8ff70] text-[#263800]">
                  <CreditCard size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold">ResolveX One</div>
                  <div className="mt-1 text-[10px] text-white/35">
                    Monthly - cancel anytime
                  </div>
                </div>
              </div>
              <div className="mt-7 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/42">{agents} paid agents</span>
                  <span>{money(estimate.seatCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/42">
                    50 AI resolutions included
                  </span>
                  <span>No overage</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-base font-semibold">
                  <span>Estimated total</span>
                  <span>{money(estimate.total)}</span>
                </div>
              </div>
              <button
                onClick={() =>
                  toast.info("Add Razorpay keys to activate checkout")
                }
                className="mt-6 h-11 w-full rounded-[5px] bg-white text-xs font-semibold text-[#17191d]"
              >
                Manage payment
              </button>
            </div>
            <div className="rounded-[8px] border border-black/10 bg-white p-5">
              <div className="flex gap-3">
                <ShieldCheck size={18} className="text-[#477d20]" />
                <div>
                  <h3 className="text-sm font-semibold">
                    Seat rules are explicit
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#74777f]">
                    Owners, admins, and agents who can contact customers are
                    paid. Collaborators can view, comment, and maintain
                    knowledge for free.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-[10px] text-[#5f636b]">
                {[
                  "Role changes update the next invoice",
                  "Collaborators never consume paid seats",
                  "Usage ledger stays exportable",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check size={12} className="text-[#477d20]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
