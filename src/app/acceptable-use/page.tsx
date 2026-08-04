import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Acceptable use" };

export default function AcceptableUsePage() {
  return (
    <LegalPage title="Acceptable use policy" updated="4 August 2026">
      <h2>Use the service lawfully</h2>
      <p>
        Do not use ResolveX to violate law, infringe rights, deceive customers,
        distribute malware, facilitate harassment, or process data you are not
        authorised to use.
      </p>
      <h2>Protect people and systems</h2>
      <p>
        Do not probe, scan, overload, reverse engineer, bypass access controls,
        interfere with other tenants, or use automated activity that materially
        degrades the service. Responsible security research should be reported
        to security@resolutexhq.com.
      </p>
      <h2>Messaging and consent</h2>
      <p>
        You are responsible for obtaining required consent for email, chat,
        voice, recording, and other communications. Do not send spam, conduct
        unlawful surveillance, impersonate another person, or hide the origin of
        a message.
      </p>
      <h2>AI safeguards</h2>
      <p>
        Do not configure AI to make prohibited, discriminatory, dangerous, or
        high-impact decisions without appropriate human review. Maintain handoff
        and approval rules suitable for your use case.
      </p>
      <h2>Enforcement</h2>
      <p>
        We may investigate, limit, suspend, or terminate activity that creates
        material security, legal, or operational risk. Where practical, we will
        provide notice and an opportunity to correct the issue.
      </p>
    </LegalPage>
  );
}
