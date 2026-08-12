import { Logo } from "@/components/brand/Logo";
import { SubscriptionBillingView } from "@/components/workspace/SubscriptionBillingView";
import { LockKeyhole } from "lucide-react";

export function BillingActivationGate({
  billingConfigured,
  canManage = true,
}: {
  billingConfigured: boolean;
  canManage?: boolean;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-[#f5f4ef]">
      <header className="flex min-h-17 items-center justify-between border-b border-black/8 bg-white px-4 md:px-8">
        <Logo />
        <span className="rounded-full bg-[#edf1ff] px-3 py-1.5 text-[10px] font-semibold text-[#355cff]">
          Final setup step
        </span>
      </header>
      {!canManage ? (
        <div className="grid flex-1 place-items-center px-5 py-12 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid size-12 place-items-center rounded-[8px] bg-[#17191d] text-[#d8ff70]">
              <LockKeyhole size={20} />
            </span>
            <h1 className="mt-6 text-3xl font-semibold tracking-[-.04em]">
              This workspace subscription has ended
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#74777f]">
              Ask a workspace owner or admin to reactivate ResolveX One. No
              workspace data has been deleted.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-black/8 bg-white px-4 py-5 text-center md:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ff5c35]">
              ResolveX One
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em] md:text-3xl">
              Activate your workspace to continue
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#74777f]">
              Choose your paid agent seats and authorise the subscription. Your
              seven-day trial starts when Paddle completes checkout.
            </p>
          </div>
          <SubscriptionBillingView
            billingConfigured={billingConfigured}
            activationGate
          />
        </div>
      )}
    </main>
  );
}
