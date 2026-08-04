import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="4 August 2026">
      <h2>Information we collect</h2>
      <p>
        We process account details, workspace configuration, billing records,
        customer conversations, support contacts, uploaded knowledge, call
        metadata, and product usage events required to operate ResolveX.
        Payment credentials are handled by our payment provider and are not
        stored as complete card details by ResolveX.
      </p>
      <h2>How information is used</h2>
      <p>
        We use information to authenticate users, route and resolve
        conversations, operate knowledge and AI features, provide reports,
        process subscriptions, prevent abuse, maintain security, and respond to
        support requests. We do not sell customer conversations or use workspace
        content for advertising.
      </p>
      <h2>AI and subprocessors</h2>
      <p>
        When an administrator enables AI, relevant conversation and approved
        knowledge context may be sent to configured model providers to generate
        answers, summaries, classifications, or suggested actions. Workspace
        owners remain responsible for ensuring they have a lawful basis to
        process the data they submit.
      </p>
      <h2>Cookies and local storage</h2>
      <p>
        Necessary storage supports authentication, security, billing state, and
        consent preferences. Optional analytics and preference storage are
        enabled only after consent. Details and controls are available in our{" "}
        <a href="/cookie-policy">Cookie policy</a>.
      </p>
      <h2>Retention, export, and deletion</h2>
      <p>
        Workspace administrators control available retention settings. Account
        owners may request export or deletion, subject to security,
        fraud-prevention, tax, contractual, and legal retention requirements.
        Backup copies may remain for a limited period before routine deletion.
      </p>
      <h2>Security</h2>
      <p>
        We use access controls, encryption in transit, tenant isolation, audit
        controls, and restricted service credentials. No internet service can
        guarantee absolute security. Security questions and responsible
        disclosures can be sent to security@resolutexhq.com.
      </p>
      <h2>International processing</h2>
      <p>
        ResolveX may process information through infrastructure and service
        providers in more than one country. Where required, we use contractual
        and organisational safeguards for cross-border processing.
      </p>
      <h2>Contact</h2>
      <p>
        Privacy requests may be sent to{" "}
        <a href="mailto:privacy@resolutexhq.com">privacy@resolutexhq.com</a>.
        General support is available at{" "}
        <a href="mailto:support@resolutexhq.com">support@resolutexhq.com</a>.
      </p>
    </LegalPage>
  );
}
