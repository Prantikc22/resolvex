import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Cookie policy" };

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie policy" updated="4 August 2026">
      <h2>How ResolveX uses storage</h2>
      <p>
        ResolveX uses cookies and browser storage to keep sessions secure,
        remember consent, preserve product preferences, and understand
        performance when analytics consent is given.
      </p>
      <h2>Necessary storage</h2>
      <p>
        Necessary items support authentication, security, fraud prevention,
        billing state, load balancing, and your cookie choice. They cannot be
        disabled through the consent panel because the requested service cannot
        operate reliably without them.
      </p>
      <h2>Analytics</h2>
      <p>
        Analytics storage may record page views, product interactions, device
        information, and performance events so we can understand usage and
        improve reliability. It is disabled until you consent.
      </p>
      <h2>Preferences</h2>
      <p>
        Preference storage remembers optional interface settings and
        communication choices. It is disabled until you consent.
      </p>
      <h2>Managing choices</h2>
      <p>
        Use “Cookie settings” in the footer to change optional categories. You
        can also remove stored data through your browser. Removing necessary
        storage may sign you out or reset security and product settings.
      </p>
      <h2>Third parties</h2>
      <p>
        Connected payment, authentication, infrastructure, and support providers
        may set necessary storage when you use their functionality. Their
        handling is governed by their own policies and our agreements with them.
      </p>
      <h2>Contact</h2>
      <p>
        Questions may be sent to{" "}
        <a href="mailto:privacy@resolutexhq.com">privacy@resolutexhq.com</a>.
      </p>
    </LegalPage>
  );
}
