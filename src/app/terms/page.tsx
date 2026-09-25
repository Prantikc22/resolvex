import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="4 August 2026">
      <h2>Using ResolveX</h2>
      <p>
        You may use ResolveX for lawful customer-support operations. You are
        responsible for account access, your workspace configuration, the
        legality and accuracy of submitted content, and the actions taken by
        your users and connected systems.
      </p>
      <h2>Accounts and authority</h2>
      <p>
        You must provide accurate information and have authority to accept these
        terms for the organisation that owns the workspace. Keep credentials
        secure and notify us promptly of suspected unauthorised access.
      </p>
      <h2>Subscriptions and usage</h2>
      <p>
        Paid subscriptions renew for the selected billing period until
        cancelled. Full-agent seats, voice usage, taxes, and any separately
        agreed enterprise services are charged as shown at checkout or in an
        order form. Completed AI resolutions above the included monthly
        allowance are usage-billed at the price displayed at checkout. Pricing
        details are published on the <a href="/pricing">Pricing page</a>.
      </p>
      <h2>Trials, cancellation, and refunds</h2>
      <p>
        Dodo Payments, our merchant of record, may securely authorise a payment
        method when a trial begins. Cancellation stops future renewal and access
        continues through the paid period unless the account is terminated for
        misuse. Refund eligibility and processing are described in our{" "}
        <a href="/refund-policy">Cancellation and refund policy</a>.
      </p>
      <h2>Customer data</h2>
      <p>
        You retain ownership of customer data and content. You grant ResolveX
        the limited rights required to host, process, secure, transmit, and back
        up that data to provide the service. You confirm that you have the
        permissions and lawful basis needed for the information you upload or
        connect.
      </p>
      <h2>AI features</h2>
      <p>
        AI output can be incomplete or incorrect and must be configured with
        appropriate confidence, approval, and handoff rules. You remain
        responsible for customer-facing decisions and for reviewing sensitive or
        high-impact uses.
      </p>
      <h2>Acceptable use</h2>
      <p>
        You must follow our <a href="/acceptable-use">Acceptable use policy</a>.
        We may restrict activity that threatens security, violates law,
        infringes rights, or materially harms the service or other customers.
      </p>
      <h2>Availability and changes</h2>
      <p>
        We work to provide a reliable service and communicate material changes.
        Preview and beta features may change or be withdrawn. Any enterprise
        service levels, data residency commitments, or custom obligations apply
        only when documented in an order form.
      </p>
      <h2>Liability</h2>
      <p>
        To the maximum extent permitted by law, ResolveX is provided without
        warranties beyond those expressly stated in an order form. Neither party
        is liable for indirect or consequential loss. Any negotiated liability
        terms in an enterprise order form take precedence.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these terms may be sent to{" "}
        <a href="mailto:legal@resolutexhq.com">legal@resolutexhq.com</a>.
      </p>
    </LegalPage>
  );
}
