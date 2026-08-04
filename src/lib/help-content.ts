export type HelpArticle = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  readTime: string;
  keywords: string[];
  sections: Array<{ heading: string; paragraphs: string[]; steps?: string[] }>;
};

export type HelpCategory = {
  slug: string;
  title: string;
  description: string;
};

export const helpCategories: HelpCategory[] = [
  { slug: "getting-started", title: "Getting started", description: "Create a workspace, install the messenger, and bring your team in." },
  { slug: "ai-resolutions", title: "Arlo AI resolutions", description: "Ground answers, control confidence, and review automated decisions." },
  { slug: "plans-billing", title: "Plans and billing", description: "Understand agents, collaborators, AI resolutions, and voice usage." },
  { slug: "account-security", title: "Account and security", description: "Manage access, retention, exports, SSO, and audit history." },
  { slug: "channels-routing", title: "Channels and routing", description: "Connect chat, email, voice, forms, queues, and automations." },
];

export const helpArticles: HelpArticle[] = [
  {
    slug: "create-your-first-workspace",
    category: "getting-started",
    title: "Create your first ResolveX workspace",
    summary: "Set the workspace name, support address, timezone, and first inbox without waiting for an implementation call.",
    readTime: "4 min",
    keywords: ["workspace", "setup", "inbox", "timezone"],
    sections: [
      { heading: "Before you begin", paragraphs: ["Use a work email you can access. The first account becomes the workspace owner and can invite agents or transfer ownership later."] },
      { heading: "Create the workspace", paragraphs: ["After sign-up, ResolveX asks for the few details needed to route the first conversation correctly."], steps: ["Name the workspace and choose its timezone.", "Create the first inbox and set a visible support name.", "Choose whether Arlo drafts answers or may resolve high-confidence questions.", "Open the workspace and send a test message."] },
      { heading: "What happens next", paragraphs: ["The workspace starts empty. Demo conversations never appear in a real account. Connect a channel or install the messenger to receive the first customer message."] },
    ],
  },
  {
    slug: "install-website-messenger",
    category: "getting-started",
    title: "Install the website messenger",
    summary: "Add the ResolveX widget to a website in under a minute and verify that new conversations reach the right inbox.",
    readTime: "5 min",
    keywords: ["widget", "messenger", "javascript", "website", "install"],
    sections: [
      { heading: "Copy the workspace key", paragraphs: ["Open Settings, then Messenger. ResolveX issues a public workspace key that identifies where conversations belong. It does not expose administrator access."] },
      { heading: "Add the script", paragraphs: ["Paste the generated script before the closing body tag or install it through your tag manager."], steps: ["Publish the script on a test page.", "Open the messenger and send a question.", "Confirm the conversation appears in the ResolveX inbox.", "Adjust the greeting, accent colour, position, and allowed domains."] },
      { heading: "Production safety", paragraphs: ["Restrict the messenger to your production domains and rotate its key if it is copied into an unauthorised site."] },
    ],
  },
  {
    slug: "invite-agents-and-collaborators",
    category: "getting-started",
    title: "Invite agents and free collaborators",
    summary: "Give responders full inbox access while letting specialists collaborate without consuming an agent seat.",
    readTime: "3 min",
    keywords: ["agents", "team", "invite", "collaborators", "seats"],
    sections: [
      { heading: "Choose the right role", paragraphs: ["Agents can own and reply to conversations. Collaborators can be mentioned and add internal notes but cannot independently work the queue."] },
      { heading: "Send invitations", paragraphs: ["Open Team settings, choose a role, and invite teammates by work email."], steps: ["Invite support operators as agents.", "Invite engineering, finance, or product specialists as collaborators.", "Assign inbox access only where it is needed."] },
    ],
  },
  {
    slug: "train-arlo-approved-knowledge",
    category: "ai-resolutions",
    title: "Train Arlo on approved knowledge",
    summary: "Import a website or PDF, review the source, and keep unsupported answers out of customer conversations.",
    readTime: "6 min",
    keywords: ["arlo", "knowledge", "pdf", "website", "training", "sources"],
    sections: [
      { heading: "Import a source", paragraphs: ["ResolveX can read public website pages and supported PDF documents. Imported content remains isolated to the workspace that added it."] },
      { heading: "Approve before use", paragraphs: ["Arlo answers factual questions only from approved sources."], steps: ["Open Knowledge and add a website URL or PDF.", "Review the extracted title and content.", "Approve the source for customer answers.", "Ask a test question and inspect the cited source."] },
      { heading: "Keep knowledge current", paragraphs: ["Re-import changed policies and archive obsolete sources. Conflicting policies should be resolved before both are approved."] },
    ],
  },
  {
    slug: "set-confidence-and-handoff-rules",
    category: "ai-resolutions",
    title: "Set confidence and human-handoff rules",
    summary: "Decide when Arlo resolves, when it drafts, and when a person must take over.",
    readTime: "5 min",
    keywords: ["confidence", "handoff", "approval", "risk", "automation"],
    sections: [
      { heading: "Start cautiously", paragraphs: ["Use draft-only mode while the knowledge base is new. Agents can review answers and reveal missing or ambiguous guidance."] },
      { heading: "Define the boundary", paragraphs: ["High-confidence informational questions can be resolved automatically. Refunds, account changes, legal threats, and sensitive requests should route to a person."], steps: ["Set a minimum resolution confidence.", "List topics that always require a human.", "Require approval before actions that change customer data.", "Review sampled AI conversations each week."] },
    ],
  },
  {
    slug: "review-ai-decisions-and-citations",
    category: "ai-resolutions",
    title: "Review AI decisions and citations",
    summary: "Inspect the source, confidence, attempted steps, and handoff reason behind every Arlo response.",
    readTime: "4 min",
    keywords: ["audit", "citations", "quality", "review", "ai"],
    sections: [
      { heading: "Open the resolution trail", paragraphs: ["Each AI-assisted conversation records the source used, confidence score, action status, and whether a human approved the outcome."] },
      { heading: "Improve the system", paragraphs: ["Mark incorrect or incomplete answers, then update the underlying source rather than teaching Arlo an isolated correction."] },
    ],
  },
  {
    slug: "understand-monthly-bill",
    category: "plans-billing",
    title: "Understand your monthly bill",
    summary: "See how paid agents, AI resolutions, and connected voice minutes become the final invoice.",
    readTime: "4 min",
    keywords: ["bill", "invoice", "pricing", "agents", "resolutions", "voice"],
    sections: [
      { heading: "The three billable units", paragraphs: ["ResolveX charges for full agent seats, completed AI resolutions, and connected voice minutes. Collaborators do not consume paid seats."] },
      { heading: "Preview usage", paragraphs: ["Billing shows current seat count and metered usage before the invoice closes. The public calculator can estimate a planned workspace before sign-up."] },
    ],
  },
  {
    slug: "add-remove-agent-seats",
    category: "plans-billing",
    title: "Add or remove agent seats",
    summary: "Control paid support seats without removing the specialists who collaborate on difficult conversations.",
    readTime: "3 min",
    keywords: ["seat", "agent", "billing", "collaborator", "team"],
    sections: [
      { heading: "Adding an agent", paragraphs: ["Promoting a collaborator to agent grants queue ownership and customer-reply access. Confirm the price change before the role is updated."] },
      { heading: "Removing an agent", paragraphs: ["Reassign open conversations first. Downgraded users can remain as collaborators and retain access to internal mentions permitted by their inbox role."] },
    ],
  },
  {
    slug: "ai-resolution-charges",
    category: "plans-billing",
    title: "When an AI resolution is charged",
    summary: "A resolution is counted only when Arlo completes the customer’s request without a human taking over.",
    readTime: "3 min",
    keywords: ["ai resolution", "charge", "metering", "handoff", "refund"],
    sections: [
      { heading: "What counts", paragraphs: ["A charged resolution requires a customer question, an Arlo answer grounded in approved knowledge, and a completed outcome without agent intervention."] },
      { heading: "What does not count", paragraphs: ["Drafts, abandoned conversations, test messages, low-confidence handoffs, and conversations answered by an agent are not successful AI resolutions."] },
    ],
  },
  {
    slug: "roles-and-permissions",
    category: "account-security",
    title: "Roles and workspace permissions",
    summary: "Separate owner, administrator, agent, and collaborator access across the workspace.",
    readTime: "5 min",
    keywords: ["roles", "permissions", "rbac", "owner", "admin", "security"],
    sections: [
      { heading: "Use the least access needed", paragraphs: ["Owners control billing and workspace ownership. Administrators configure channels and teammates. Agents handle customers. Collaborators contribute internal context."] },
      { heading: "Review access", paragraphs: ["Remove dormant accounts, keep at least two trusted administrators, and review inbox assignments after team changes."] },
    ],
  },
  {
    slug: "export-conversation-data",
    category: "account-security",
    title: "Export conversation and audit data",
    summary: "Prepare customer records, message history, and administrative events for review or migration.",
    readTime: "4 min",
    keywords: ["export", "audit", "data", "migration", "compliance"],
    sections: [
      { heading: "Choose the export", paragraphs: ["Conversation exports contain message history and customer references. Audit exports focus on administrative actions and access changes."] },
      { heading: "Handle exports carefully", paragraphs: ["Exports may contain personal information. Store them in an approved location, limit access, and delete temporary copies after the purpose is complete."] },
    ],
  },
  {
    slug: "retention-and-deletion",
    category: "account-security",
    title: "Configure retention and deletion",
    summary: "Set how long conversations, attachments, and audit events remain available.",
    readTime: "5 min",
    keywords: ["retention", "deletion", "privacy", "attachments", "data"],
    sections: [
      { heading: "Choose a policy", paragraphs: ["Match retention to customer commitments, legal duties, and operational needs. Keeping everything forever increases risk and search noise."] },
      { heading: "Deletion requests", paragraphs: ["Verify the requester, identify linked records, preserve legally required data, and record the completed deletion in the audit trail."] },
    ],
  },
  {
    slug: "connect-support-email",
    category: "channels-routing",
    title: "Connect a support email address",
    summary: "Route incoming support mail into ResolveX while keeping replies on your company domain.",
    readTime: "5 min",
    keywords: ["email", "inbox", "forwarding", "domain", "channel"],
    sections: [
      { heading: "Connect the address", paragraphs: ["Choose the target inbox, verify the sending domain, and follow the forwarding instructions for your mail provider."] },
      { heading: "Test both directions", paragraphs: ["Send a message from an external address, reply from ResolveX, and confirm threading, sender name, and delivery authentication before announcing the channel."] },
    ],
  },
  {
    slug: "route-conversations-with-rules",
    category: "channels-routing",
    title: "Route conversations with rules",
    summary: "Assign new requests using channel, topic, customer, priority, and availability signals.",
    readTime: "6 min",
    keywords: ["routing", "rules", "assignment", "queue", "sla"],
    sections: [
      { heading: "Order matters", paragraphs: ["ResolveX evaluates specific rules before the default queue. Keep urgent and regulated workflows above broad keyword rules."] },
      { heading: "Build the first rules", paragraphs: ["Start with a small set that agents can understand."], steps: ["Route billing and account-access requests to their specialist queues.", "Prioritise high-value or vulnerable customers where appropriate.", "Send unmatched conversations to a monitored default inbox.", "Review unassigned and reassigned volume weekly."] },
    ],
  },
  {
    slug: "configure-slas-and-hours",
    category: "channels-routing",
    title: "Configure SLAs and support hours",
    summary: "Measure first response and resolution time against the hours your team actually covers.",
    readTime: "4 min",
    keywords: ["sla", "business hours", "response", "resolution", "timezone"],
    sections: [
      { heading: "Set operating hours", paragraphs: ["Choose the timezone and weekly schedule for each inbox. Add holidays so paused time is not reported as an agent failure."] },
      { heading: "Set achievable targets", paragraphs: ["Use separate targets for urgent and normal conversations. Alert before a breach so the team can act while the promise is still recoverable."] },
    ],
  },
];

export function getHelpCategory(slug: string) {
  return helpCategories.find((category) => category.slug === slug);
}

export function getHelpArticle(slug: string) {
  return helpArticles.find((article) => article.slug === slug);
}
