import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Cancellation and refund policy" };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Cancellation and refund policy" updated="4 August 2026">
      <h2>Free trial</h2>
      <p>
        The standard 7-day ResolveX trial does not require a payment card. You
        can evaluate the product before starting a paid subscription.
      </p>
      <h2>Cancellation</h2>
      <p>
        You may cancel a subscription at any time from billing settings or by
        contacting{" "}
        <a href="mailto:billing@resolutexhq.com">billing@resolutexhq.com</a>.
        Cancellation stops the next renewal. Paid access remains available until
        the end of the current billing period unless the account is suspended
        for unlawful or abusive activity.
      </p>
      <h2>Refund eligibility</h2>
      <p>
        Subscription and usage fees are generally non-refundable once the
        service has been made available. We will review refund requests for
        duplicate charges, incorrect plan provisioning, successful payment
        without account activation, or a material failure that prevents use of
        the purchased service and cannot be corrected promptly.
      </p>
      <h2>How to request a refund</h2>
      <p>
        Email billing@resolutexhq.com within seven calendar days of the relevant
        charge. Include the workspace name, account email, payment identifier,
        charge date, and reason for the request. Never send complete card or
        bank credentials.
      </p>
      <h2>Processing time</h2>
      <p>
        Approved refunds are initiated to the original payment method. Bank and
        payment-network processing can take approximately five to seven working
        days after initiation. Timing may vary by payment method and financial
        institution.
      </p>
      <h2>Usage and carrier charges</h2>
      <p>
        Connected voice minutes, carrier charges, taxes already remitted, custom
        migration work, and separately delivered professional services are not
        refundable except where charged in error.
      </p>
      <h2>Charge disputes</h2>
      <p>
        Please contact us before opening a payment dispute so we can investigate
        quickly. This policy does not limit rights that cannot be waived under
        applicable law.
      </p>
    </LegalPage>
  );
}
