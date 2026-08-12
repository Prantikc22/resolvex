"use client";

import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { pricing } from "@/lib/pricing";
import { SubscriptionBillingView } from "@/components/workspace/SubscriptionBillingView";

type Member = { user_id: string; role: string; name: string; email: string };
type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
};
type TeamData = {
  members: Member[];
  invitations: Invitation[];
  paidSeats: number;
  subscriptionSeats: number;
  subscriptionStatus: string | null;
  error?: string;
};

type TeamMutationResponse = {
  error?: string;
  warning?: string;
  code?: string;
  requiredSeats?: number;
};

export function TeamManagementView({
  billingConfigured,
}: {
  billingConfigured: boolean;
}) {
  const [tab, setTab] = useState<"people" | "billing">("people");
  const [data, setData] = useState<TeamData | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/team", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load team.");
    setData(result);
  }, []);
  useEffect(() => {
    queueMicrotask(
      () => void load().catch((error) => toast.error(error.message)),
    );
  }, [load]);
  async function invite() {
    setBusy(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const result = (await response.json()) as TeamMutationResponse;
      if (!response.ok) {
        if (result.code === "PAID_SEAT_REQUIRED") setTab("billing");
        throw new Error(result.error ?? "Could not send invitation.");
      }
      setEmail("");
      await load();
      if (result.warning) toast.warning(result.warning);
      else toast.success("Invitation sent using a purchased paid seat.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not invite teammate.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function changeRole(userId: string, nextRole: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      const result = (await response.json()) as TeamMutationResponse;
      if (!response.ok) {
        if (result.code === "PAID_SEAT_REQUIRED") setTab("billing");
        throw new Error(result.error);
      }
      await load();
      toast.success("Role updated within the purchased seat capacity.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not change role.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(query: string) {
    if (!confirm("Remove this teammate or invitation?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/team?${query}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
      toast.success("Removed. Any seat decrease is scheduled safely.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove.");
    } finally {
      setBusy(false);
    }
  }
  if (tab === "billing")
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b bg-white px-7 pt-4">
          <button
            onClick={() => setTab("people")}
            className="mr-5 border-b-2 border-transparent pb-3 text-xs font-semibold text-[#777]"
          >
            People
          </button>
          <button className="border-b-2 border-[#ff5c35] pb-3 text-xs font-semibold">
            Billing
          </button>
        </div>
        <SubscriptionBillingView billingConfigured={billingConfigured} />
      </div>
    );
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f4ef] p-4 text-[#17191d] md:p-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
              Team
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-.04em]">
              People and paid seats
            </h2>
            <p className="mt-2 text-sm text-[#74777f]">
              Owners, admins, and agents are ${pricing.agent}/month. Viewers are
              free. Purchase capacity before inviting a paid teammate.
            </p>
          </div>
          <div className="rounded-lg bg-[#17191d] px-5 py-3 text-white">
            <span className="text-2xl font-semibold">
              {data?.paidSeats ?? "—"}
            </span>
            <span className="ml-2 text-xs text-white/50">paid seats</span>
          </div>
        </div>
        <div className="mt-5 border-b">
          <button className="mr-5 border-b-2 border-[#ff5c35] pb-3 text-xs font-semibold">
            People
          </button>
          <button
            onClick={() => setTab("billing")}
            className="border-b-2 border-transparent pb-3 text-xs font-semibold text-[#777]"
          >
            Billing
          </button>
        </div>
        <section className="mt-6 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-sm font-semibold">Invite a teammate</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-[#7b7f87]">
            Paid invitations use an already-purchased seat. If none is
            available, we will take you to Billing first.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
              className="h-11 rounded-md border border-black/10 px-3 text-sm"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-11 rounded-md border border-black/10 px-3 text-sm"
            >
              <option value="agent">Agent · paid</option>
              <option value="admin">Admin · paid</option>
              <option value="viewer">Viewer · free</option>
            </select>
            <button
              disabled={busy || !email}
              onClick={invite}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#17191d] px-5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              Invite
            </button>
          </div>
        </section>
        <section className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-white">
          {!data ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              {data.members.map((member) => (
                <div
                  key={member.user_id}
                  className="grid grid-cols-[1fr_130px_40px] items-center gap-3 border-b border-black/7 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-[#eafbd2]">
                      <Users size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {member.name}
                      </p>
                      <p className="truncate text-[10px] text-[#858b95]">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  {member.role === "owner" ? (
                    <span className="text-xs font-semibold">Owner</span>
                  ) : (
                    <select
                      disabled={busy}
                      value={member.role}
                      onChange={(event) =>
                        void changeRole(member.user_id, event.target.value)
                      }
                      className="h-9 rounded-md border border-black/10 px-2 text-xs"
                    >
                      <option value="admin">Admin · paid</option>
                      <option value="agent">Agent · paid</option>
                      <option value="viewer">Viewer · free</option>
                    </select>
                  )}
                  <button
                    disabled={member.role === "owner" || busy}
                    onClick={() => void remove(`userId=${member.user_id}`)}
                    className="grid size-9 place-items-center text-[#999] disabled:opacity-20"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {data.invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="grid grid-cols-[1fr_130px_40px] items-center gap-3 border-b border-black/7 bg-[#fffdf6] px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{invite.email}</p>
                    <p className="text-[10px] text-[#9a7a2e]">
                      Invitation pending
                    </p>
                  </div>
                  <span className="text-xs capitalize">{invite.role}</span>
                  <button
                    disabled={busy}
                    onClick={() => void remove(`invitationId=${invite.id}`)}
                    className="grid size-9 place-items-center text-[#999]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
