import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Delivery policy" };

export default function ShippingDeliveryPage() {
  return (
    <LegalPage title="Digital delivery policy" updated="4 August 2026">
      <h2>No physical shipping</h2>
      <p>
        ResolveX is a software-as-a-service product. We do not sell or ship
        physical goods, so shipping fees, courier tracking, and physical returns
        do not apply.
      </p>
      <h2>Account delivery</h2>
      <p>
        Trial workspace access is normally available immediately after
        successful signup and email verification. Paid features are activated
        after successful payment confirmation. Temporary delays can occur while
        a payment, identity check, or security review is completed.
      </p>
      <h2>Migration and setup services</h2>
      <p>
        Standard self-service setup is available in the product. Any assisted
        migration, custom integration, data import, dedicated environment, or
        enterprise onboarding follows the delivery schedule stated in the
        relevant order form or written scope.
      </p>
      <h2>Delivery problems</h2>
      <p>
        If payment succeeds but workspace access is not activated, contact{" "}
        <a href="mailto:support@resolutexhq.com">support@resolutexhq.com</a>{" "}
        with the account email and payment identifier. Do not send complete card
        or bank credentials.
      </p>
    </LegalPage>
  );
}
