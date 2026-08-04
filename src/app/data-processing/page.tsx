import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Data processing" };

export default function DataProcessingPage() {
  return (
    <LegalPage title="Data processing overview" updated="4 August 2026">
      <h2>Roles</h2>
      <p>
        For customer conversations, contacts, knowledge, and connected workspace
        data, the customer normally acts as controller or business and ResolveX
        acts as processor or service provider. ResolveX acts as controller for
        account administration, security, billing, and its own business records.
      </p>
      <h2>Processing instructions</h2>
      <p>
        We process workspace data to provide the configured inbox, messaging,
        AI, knowledge, reporting, workflow, and voice features, and to maintain
        security and reliability.
      </p>
      <h2>Confidentiality and security</h2>
      <p>
        Access is limited to authorised personnel and service providers with a
        need to perform contracted duties. We use logical tenant controls,
        restricted credentials, encryption in transit, logging, and operational
        safeguards appropriate to the service.
      </p>
      <h2>Subprocessors</h2>
      <p>
        ResolveX relies on infrastructure, authentication, AI, email,
        communications, monitoring, and payment providers. A current enterprise
        subprocessor list and notification terms can be included in an executed
        data processing agreement.
      </p>
      <h2>Requests and deletion</h2>
      <p>
        We assist workspace owners with supported export, correction, deletion,
        and data-subject workflows. Contractual and legal records may be
        retained where required.
      </p>
      <h2>Execute a DPA</h2>
      <p>
        This page is a plain-language overview, not a signed data processing
        agreement. Customers that require an executed DPA, regional terms, or
        enterprise security schedules can contact{" "}
        <a href="mailto:privacy@resolutexhq.com">privacy@resolutexhq.com</a>.
      </p>
    </LegalPage>
  );
}
