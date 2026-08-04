import { HelpCenter } from "@/components/help/HelpCenter";
import { ResourcePage } from "@/components/marketing/ResourcePage";

export default function HelpPage() {
  return (
    <ResourcePage
      eyebrow="ResolveX help center"
      title="Answers before a ticket exists."
      copy="Search practical setup guidance, billing rules, Arlo controls, and channel configuration. Every answer is public, specific, and available without opening a ticket."
    >
      <HelpCenter />
    </ResourcePage>
  );
}

