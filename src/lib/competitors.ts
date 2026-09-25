/**
 * Comparison-page content. Competitor pricing is described by model rather
 * than dollar amounts: list prices change often and a stale number on our
 * site would be a false claim. Every ResolveX statement must stay true.
 */

export type CompetitorCategory =
  "helpdesk" | "chat" | "ai-agent" | "crm" | "voice";

export type Competitor = {
  slug: string;
  name: string;
  category: CompetitorCategory;
  /** One neutral sentence describing what they are. */
  summary: string;
  /** How they charge, in words. */
  pricingModel: string;
  /** Honest reasons someone should pick them instead. */
  chooseThem: string[];
  /** Specific reasons teams move to ResolveX from this product. */
  switchReasons: string[];
  /** Import notes for the migration section. */
  migration: string;
  popular?: boolean;
};

export const categoryLabels: Record<CompetitorCategory, string> = {
  helpdesk: "Help desks",
  chat: "Live chat",
  "ai-agent": "AI support agents",
  crm: "Sales CRMs",
  voice: "Voice AI platforms",
};

/** What the other side usually looks like, per category, for the table. */
export const categoryComparison: Record<
  CompetitorCategory,
  Array<[feature: string, resolvex: string, typical: string]>
> = {
  helpdesk: [
    ["Agent seat", "$15 / month, one plan", "Tiered per-agent plans"],
    [
      "AI resolutions",
      "50 included, then $0.39 each",
      "Paid AI add-on or per-resolution fee",
    ],
    [
      "AI employees that act in other apps",
      "Included, with approvals",
      "Limited or enterprise tier",
    ],
    [
      "Website voice and phone agents",
      "Included, $0.20 / minute",
      "Separate product or partner",
    ],
    ["Built-in sales CRM", "Included", "Separate product"],
    ["Help center on your domain", "Included", "Often a higher tier"],
    ["Collaborators", "Unlimited, free", "Usually paid seats"],
  ],
  chat: [
    [
      "AI answers from your knowledge",
      "Included, with citations",
      "Add-on bot or limited conversations",
    ],
    [
      "Email, calls and chat in one inbox",
      "Included",
      "Chat-first, other channels vary",
    ],
    ["Website voice assistant", "Included, $0.20 / minute", "Rarely available"],
    [
      "AI employees that complete tasks",
      "Included, with approvals",
      "Not typical",
    ],
    ["Built-in sales CRM", "Included", "Integration required"],
    ["Help center on your domain", "Included", "Varies"],
    ["Pricing", "$15 per agent seat", "Per seat or per conversation volume"],
  ],
  "ai-agent": [
    [
      "Getting started",
      "Self-serve, live in an afternoon",
      "Often sales-led onboarding",
    ],
    [
      "Pricing",
      "$15 seat · 50 resolutions included · $0.39 after",
      "Usage contracts, often enterprise",
    ],
    [
      "Human inbox for handoff",
      "Included",
      "Usually needs a separate help desk",
    ],
    ["Voice on web and phone", "Included, $0.20 / minute", "Varies"],
    ["Sales CRM and follow-ups", "Included", "Not included"],
    [
      "Approvals for risky actions",
      "Built in, confidence thresholds",
      "Varies",
    ],
    ["Help center on your domain", "Included", "Not typical"],
  ],
  crm: [
    ["Contacts, pipeline, sequences", "Included", "Core product"],
    [
      "Support inbox on the same contact",
      "Included",
      "Separate product or integration",
    ],
    [
      "AI Sales employee that qualifies leads",
      "Included, runs 24/7",
      "Add-on or not available",
    ],
    ["Lead scoring with confidence", "Included", "Higher tiers"],
    ["Website chat and voice capture", "Included", "Integration required"],
    [
      "Pricing",
      "$15 per seat, support included",
      "Per-seat tiers for sales only",
    ],
    ["Meeting notes to tasks", "Zoom, Meet and Teams", "Varies"],
  ],
  voice: [
    [
      "Setup",
      "No code: pick a role, connect your number",
      "API and prompt building",
    ],
    [
      "All-in voice price",
      "$0.20 / minute including models",
      "Platform fee plus model and telephony costs",
    ],
    [
      "Bring your own number",
      "Twilio, Plivo, Exotel, Vonage, any SIP",
      "Supported, varies",
    ],
    ["Inbox, transcripts and human transfer", "Included", "Build it yourself"],
    [
      "Knowledge base grounding",
      "Included, with approvals",
      "Build it yourself",
    ],
    ["CRM, tasks and follow-ups", "Included", "Integrations required"],
    ["Chat, email and help center", "Included", "Not included"],
  ],
};

const helpdeskReasons = (name: string) => [
  `One $15 seat includes AI, help center, messenger and voice — no tier to climb to unlock features you already need from ${name}.`,
  "AI resolutions are $0.39 after 50 free each month, and only billed when the AI actually closes the conversation.",
  "AI employees go beyond answering: they update your CRM, book meetings and issue refunds with approvals.",
];

export const competitors: Competitor[] = [
  // Help desks
  {
    slug: "intercom",
    name: "Intercom",
    category: "helpdesk",
    popular: true,
    summary:
      "Intercom is a customer service platform built around its messenger and the Fin AI agent.",
    pricingModel:
      "Per-seat plans, with Fin AI billed separately for each resolution.",
    chooseThem: [
      "You are a large team already deep in Intercom’s product tours and outbound messaging.",
      "You need Intercom’s mature enterprise reporting and admin controls today.",
    ],
    switchReasons: [
      "ResolveX charges $0.39 per AI resolution after 50 free each month — a fraction of typical per-resolution AI pricing.",
      "Voice on your website and phone line is part of the same product, not a separate stack.",
      "A sales CRM and AI Sales employee are included, so leads from chat never leave the workspace.",
    ],
    migration:
      "Import contacts, conversation history and help articles, point the ResolveX messenger at your site, and run both side by side until you are ready to switch.",
  },
  {
    slug: "zendesk",
    name: "Zendesk",
    category: "helpdesk",
    popular: true,
    summary:
      "Zendesk is a long-established ticketing and help desk suite used by large support organisations.",
    pricingModel:
      "Per-agent Suite tiers, with advanced AI agents and automated resolutions as paid add-ons.",
    chooseThem: [
      "You run a very large, multi-brand support operation with complex ticket routing already built in Zendesk.",
      "You depend on Zendesk’s marketplace apps that have no equivalent elsewhere.",
    ],
    switchReasons: helpdeskReasons("Zendesk"),
    migration:
      "Export tickets, users and Guide articles from Zendesk, import them into ResolveX, and redirect your help center domain once articles are approved.",
  },
  {
    slug: "freshdesk",
    name: "Freshdesk",
    category: "helpdesk",
    popular: true,
    summary:
      "Freshdesk is Freshworks’ ticketing help desk, sold in per-agent tiers with Freddy AI.",
    pricingModel:
      "Per-agent tiers, with Freddy AI features sold as add-ons or usage packs.",
    chooseThem: [
      "You already run Freshworks CRM and phone products and want a single vendor contract.",
      "Your team needs Freshdesk’s field-service or asset-management modules.",
    ],
    switchReasons: helpdeskReasons("Freshdesk"),
    migration:
      "Bring tickets, contacts and solution articles across, connect Freshdesk through Integrations during the transition, then retire it.",
  },
  {
    slug: "gorgias",
    name: "Gorgias",
    category: "helpdesk",
    popular: true,
    summary:
      "Gorgias is an ecommerce help desk built around Shopify stores, priced by ticket volume.",
    pricingModel:
      "Plans based on monthly ticket volume, with AI Agent interactions billed on top.",
    chooseThem: [
      "You are a Shopify-only store that wants Gorgias’ ecommerce macros out of the box.",
      "Your support volume is small and predictable enough for a ticket-bucket plan.",
    ],
    switchReasons: [
      "Seat pricing does not punish you for busy months — AI resolutions are $0.39 and only charged when resolved.",
      "Arlo Support looks up Shopify orders and answers with the tracking link, then hands off with context when needed.",
      "Phone and website voice are included for stores that still get calls.",
    ],
    migration:
      "Connect Shopify under Integrations, import customers and ticket history, and train Arlo on your policies and FAQ pages.",
  },
  {
    slug: "help-scout",
    name: "Help Scout",
    category: "helpdesk",
    summary:
      "Help Scout is a shared inbox and help desk known for a simple, email-like experience.",
    pricingModel: "Plans priced by the number of contacts helped each month.",
    chooseThem: [
      "You want a deliberately minimal shared inbox and little automation.",
      "Your volume is low and mostly one-to-one email.",
    ],
    switchReasons: helpdeskReasons("Help Scout"),
    migration:
      "Import mailboxes, customers and Docs articles, then forward your support address to ResolveX.",
  },
  {
    slug: "front",
    name: "Front",
    category: "helpdesk",
    summary:
      "Front is a collaborative shared inbox for email-heavy customer and operations teams.",
    pricingModel:
      "Per-seat tiers with AI features on higher plans or as add-ons.",
    chooseThem: [
      "Your work is mostly internal email collaboration rather than customer support.",
      "You rely on Front’s shared-inbox rules across many teams.",
    ],
    switchReasons: helpdeskReasons("Front"),
    migration:
      "Connect Gmail or Outlook, import conversation history, and set up routing rules as Flows.",
  },
  {
    slug: "zoho-desk",
    name: "Zoho Desk",
    category: "helpdesk",
    summary:
      "Zoho Desk is the help desk in the Zoho suite, with the Zia assistant.",
    pricingModel: "Per-agent tiers, with AI features on higher plans.",
    chooseThem: [
      "Your company runs on Zoho One and wants everything under one Zoho licence.",
      "You need Zoho’s deep configuration options and are happy to administer them.",
    ],
    switchReasons: helpdeskReasons("Zoho Desk"),
    migration:
      "Connect Zoho CRM under Integrations, import tickets and articles, and move channels over one at a time.",
  },
  {
    slug: "hubspot-service-hub",
    name: "HubSpot Service Hub",
    category: "helpdesk",
    summary:
      "HubSpot Service Hub is HubSpot’s help desk, sold alongside its marketing and sales hubs.",
    pricingModel:
      "Per-seat tiers, with AI capabilities tied to higher tiers and credits.",
    chooseThem: [
      "Your marketing and sales already live in HubSpot and you want one database above all else.",
      "You need HubSpot’s customer portal and feedback surveys specifically.",
    ],
    switchReasons: [
      "ResolveX includes AI resolution, voice and a CRM at $15 a seat — no Professional tier needed for automation.",
      "Keep HubSpot as your system of record: AI employees can create and update HubSpot records through Integrations.",
      "Human collaborators are free, so the whole company can help without buying seats.",
    ],
    migration:
      "Connect HubSpot under Integrations so contacts stay in sync for AI employees, then move the support inbox and knowledge base.",
  },
  {
    slug: "kustomer",
    name: "Kustomer",
    category: "helpdesk",
    summary:
      "Kustomer is a customer-centric CRM help desk aimed at larger consumer brands.",
    pricingModel: "Sales-led plans priced per seat or by conversation volume.",
    chooseThem: [
      "You are an enterprise consumer brand with a dedicated CX operations team.",
      "You need a vendor-led implementation and custom contract terms.",
    ],
    switchReasons: [
      "Start self-serve in an afternoon, without a sales cycle or implementation project.",
      ...helpdeskReasons("Kustomer").slice(1),
    ],
    migration:
      "Export customers and conversation timelines, import them to ResolveX contacts, and connect order systems through Integrations.",
  },
  {
    slug: "gladly",
    name: "Gladly",
    category: "helpdesk",
    summary:
      "Gladly is a people-centred customer service platform for large retail and travel brands.",
    pricingModel: "Sales-led enterprise pricing per support agent.",
    chooseThem: [
      "You run a large contact centre that wants Gladly’s single-lifelong-conversation model.",
      "You need enterprise telephony features managed by the vendor.",
    ],
    switchReasons: [
      "ResolveX gives mid-sized teams the same one-customer timeline across chat, email and phone at $15 a seat.",
      "AI employees answer and act 24/7, with approvals before anything risky.",
      "Bring your own phone number instead of committing to a contact-centre contract.",
    ],
    migration:
      "Import customer profiles and history, connect your carrier over SIP, and route calls to an AI receptionist first.",
  },
  {
    slug: "reamaze",
    name: "Re:amaze",
    category: "helpdesk",
    summary:
      "Re:amaze is a help desk and live chat tool popular with small online stores.",
    pricingModel: "Per-seat plans with add-ons for AI and extra channels.",
    chooseThem: [
      "You want a very lightweight ecommerce inbox and do not plan to automate much.",
    ],
    switchReasons: helpdeskReasons("Re:amaze"),
    migration:
      "Import customers and FAQ articles, connect Shopify, and swap the chat widget for the ResolveX messenger.",
  },
  // Live chat
  {
    slug: "tidio",
    name: "Tidio",
    category: "chat",
    popular: true,
    summary:
      "Tidio is a live chat and chatbot tool for small businesses, with the Lyro AI agent.",
    pricingModel:
      "Plans based on seats and conversation volume, with Lyro AI conversations sold separately.",
    chooseThem: [
      "You only need a website chat widget with simple bots and minimal setup.",
    ],
    switchReasons: [
      "Arlo answers from your approved knowledge and cites the source, then resolves or hands off with context.",
      "Email, phone and chat land in one inbox with a built-in CRM.",
      "Visitors can talk to your assistant by voice right in the widget.",
    ],
    migration:
      "Replace the Tidio snippet with one ResolveX line, import contacts, and teach Arlo from your website in minutes.",
  },
  {
    slug: "livechat",
    name: "LiveChat",
    category: "chat",
    summary:
      "LiveChat is a live chat platform for sales and support teams, with ChatBot sold as a separate product.",
    pricingModel:
      "Per-agent plans, with the chatbot product priced separately.",
    chooseThem: [
      "Your team staffs chat live all day and rarely needs automation.",
    ],
    switchReasons: [
      "AI and chat are one product at $15 a seat — no second subscription for bots.",
      "AI resolutions only cost money when the AI actually closes the conversation.",
      "Leads from chat go straight into the pipeline with an AI Sales employee following up.",
    ],
    migration:
      "Swap the widget snippet, import transcripts and contacts, and set business hours for handoff.",
  },
  {
    slug: "crisp",
    name: "Crisp",
    category: "chat",
    summary:
      "Crisp is an all-in-one messaging inbox for startups, priced per workspace.",
    pricingModel: "Flat plans per workspace, with AI features on higher plans.",
    chooseThem: [
      "You want a flat-priced inbox for a very small team and few AI conversations.",
    ],
    switchReasons: [
      "AI employees act in 40+ apps with approvals, not just answer questions.",
      "Phone agents on your own number and website voice are built in.",
      "A real sales CRM with pipeline, scoring and sequences is included.",
    ],
    migration:
      "Import contacts and conversations, replace the chat snippet, and connect the tools your team uses.",
  },
  {
    slug: "tawk-to",
    name: "tawk.to",
    category: "chat",
    summary:
      "tawk.to is a free live chat widget monetised through paid add-ons and hired agents.",
    pricingModel:
      "Free core product, with paid add-ons such as branding removal and AI.",
    chooseThem: [
      "You need a free chat widget and have people to answer every message.",
    ],
    switchReasons: [
      "Arlo resolves routine questions around the clock, so nobody has to watch the widget.",
      "Chat, email, phone and CRM share one customer record.",
      "Your brand, colours and assistant name, without third-party branding.",
    ],
    migration:
      "Replace the tawk.to snippet with ResolveX and import your contact list.",
  },
  {
    slug: "chatwoot",
    name: "Chatwoot",
    category: "chat",
    summary:
      "Chatwoot is an open-source customer engagement inbox you can self-host or use in the cloud.",
    pricingModel: "Free self-hosted edition, or per-agent cloud plans.",
    chooseThem: [
      "You must self-host on your own servers and have engineers to maintain it.",
    ],
    switchReasons: [
      "Fully managed: durable AI employee jobs, retries and approvals without running infrastructure.",
      "Voice, phone agents and a sales CRM included.",
      "40+ app integrations with secure OAuth handled for you.",
    ],
    migration:
      "Import contacts and conversations, then replace your Chatwoot widget with ResolveX.",
  },
  // AI agents
  {
    slug: "ada",
    name: "Ada",
    category: "ai-agent",
    summary:
      "Ada is an enterprise AI customer service agent sold through a sales-led process.",
    pricingModel:
      "Enterprise contracts based on automated conversation or resolution volume.",
    chooseThem: [
      "You are an enterprise with millions of conversations and need vendor-managed AI tuning.",
    ],
    switchReasons: [
      "Self-serve and live in an afternoon: 50 resolutions included, $0.39 after.",
      "The human inbox, help center and CRM come with it — no separate help desk to integrate.",
      "Approvals and confidence thresholds keep every risky action under your control.",
    ],
    migration:
      "Point ResolveX at the same knowledge sources, connect your systems through Integrations, and route a share of traffic first.",
  },
  {
    slug: "intercom-fin",
    name: "Intercom Fin",
    category: "ai-agent",
    popular: true,
    summary:
      "Fin is Intercom’s AI agent, available inside Intercom or on top of other help desks.",
    pricingModel:
      "Charged per resolution, on top of any help desk seats you pay for.",
    chooseThem: ["You are committed to Intercom and want its native AI agent."],
    switchReasons: [
      "$0.39 per AI resolution after 50 free each month, with seats, inbox and help center included.",
      "Beyond answers: AI employees run tasks in 40+ apps, on schedules and events.",
      "Website voice and phone agents come in the same product.",
    ],
    migration:
      "Reuse your help articles as ResolveX knowledge, install the messenger, and compare answers side by side.",
  },
  {
    slug: "drift",
    name: "Drift",
    category: "ai-agent",
    summary:
      "Drift, now part of Salesloft, is a conversational marketing and sales chat platform.",
    pricingModel: "Sales-led plans for marketing and revenue teams.",
    chooseThem: [
      "You run an enterprise ABM programme tightly integrated with Salesloft cadences.",
    ],
    switchReasons: [
      "Support and sales in one workspace: the same chat qualifies leads and resolves customer questions.",
      "Arlo Sales scores leads, creates deals and schedules follow-ups automatically.",
      "Transparent self-serve pricing instead of an annual sales contract.",
    ],
    migration:
      "Swap the chat snippet, connect your CRM, and configure lead-qualification rules for Arlo Sales.",
  },
  // CRMs
  {
    slug: "hubspot-crm",
    name: "HubSpot CRM",
    category: "crm",
    popular: true,
    summary:
      "HubSpot offers a free CRM with paid Sales Hub seats for pipeline and automation.",
    pricingModel:
      "Free core CRM, with per-seat Sales Hub tiers for automation and sequences.",
    chooseThem: [
      "You need HubSpot’s marketing automation and want sales in the same suite.",
      "You have a large sales team that needs advanced forecasting and territory reporting.",
    ],
    switchReasons: [
      "Support and sales share one record: every chat, email and call lands on the contact.",
      "Arlo Sales qualifies inbound leads and follows up 24/7 without a separate seat tier.",
      "Or keep HubSpot — AI employees can read and update it through Integrations.",
    ],
    migration:
      "Connect HubSpot to keep syncing, or import contacts and deals into the ResolveX pipeline.",
  },
  {
    slug: "pipedrive",
    name: "Pipedrive",
    category: "crm",
    popular: true,
    summary:
      "Pipedrive is a pipeline-focused sales CRM for small and mid-sized sales teams.",
    pricingModel:
      "Per-seat tiers, with automation and AI features on higher plans.",
    chooseThem: [
      "You need a dedicated sales CRM with many sales-only add-ons and no support workflow.",
    ],
    switchReasons: [
      "Kanban pipeline, lifecycle stages, scoring and sequences — plus the support inbox on the same contact.",
      "An AI Sales employee works new leads the moment they arrive, even overnight.",
      "Website chat and voice capture leads directly into the pipeline.",
    ],
    migration:
      "Import contacts, organisations and deals, or connect Pipedrive so AI employees keep it updated.",
  },
  {
    slug: "zoho-crm",
    name: "Zoho CRM",
    category: "crm",
    summary:
      "Zoho CRM is a highly configurable CRM within the wider Zoho suite.",
    pricingModel: "Per-user tiers, with AI and automation on higher plans.",
    chooseThem: [
      "You want deep customisation and already run other Zoho apps.",
    ],
    switchReasons: [
      "Less configuration: pipeline, scoring and sequences work on day one.",
      "Customer support lives on the same contact record, with AI resolution included.",
      "AI employees follow up on schedules without anyone logged in.",
    ],
    migration:
      "Connect Zoho CRM under Integrations or import contacts and deals directly.",
  },
  {
    slug: "close",
    name: "Close",
    category: "crm",
    summary:
      "Close is a sales CRM with built-in calling and email for inside sales teams.",
    pricingModel:
      "Per-seat tiers, with calling and automation varying by plan.",
    chooseThem: [
      "Your team makes high volumes of human outbound calls all day.",
    ],
    switchReasons: [
      "AI phone agents answer and qualify inbound calls on your own number.",
      "Support conversations and sales deals share one customer timeline.",
      "One $15 seat covers support, CRM and AI employees.",
    ],
    migration:
      "Import leads and opportunities, connect your carrier over SIP, and set up sequences from templates.",
  },
  {
    slug: "freshsales",
    name: "Freshsales",
    category: "crm",
    summary:
      "Freshsales is Freshworks’ sales CRM with the Freddy AI assistant.",
    pricingModel: "Per-user tiers, with AI features on higher plans.",
    chooseThem: [
      "You are standardising on the Freshworks suite across sales and IT.",
    ],
    switchReasons: [
      "Sales and support in one product, without a second Freshworks licence.",
      "AI Sales employee qualifies and follows up automatically.",
      "Transparent pricing: $15 a seat and $0.39 per AI resolution.",
    ],
    migration:
      "Import contacts, accounts and deals, then move your support channels into the same workspace.",
  },
  // Voice AI
  {
    slug: "retell-ai",
    name: "Retell AI",
    category: "voice",
    popular: true,
    summary:
      "Retell AI is a developer platform for building voice agents over the phone.",
    pricingModel:
      "Pay-as-you-go per minute, with model and telephony costs depending on configuration.",
    chooseThem: [
      "You have engineers who want to build a custom voice product on an API.",
    ],
    switchReasons: [
      "No code: choose Arlo Receptionist, connect your number and go live.",
      "Calls land in a real inbox with transcripts, CRM updates and human transfer.",
      "One all-in voice price of $0.20 a minute, including the speech and language models.",
    ],
    migration:
      "Point your SIP trunk or carrier number at ResolveX and reuse your call script as the employee’s instructions.",
  },
  {
    slug: "vapi",
    name: "Vapi",
    category: "voice",
    summary: "Vapi is an API platform for developers building voice AI agents.",
    pricingModel:
      "Per-minute platform fee plus the model, voice and telephony providers you choose.",
    chooseThem: [
      "You want full control over every model and are building voice into your own product.",
    ],
    switchReasons: [
      "Ready-made receptionist, support and sales roles instead of an API to assemble.",
      "Knowledge grounding, approvals, inbox and CRM already built.",
      "Predictable $0.20 per minute rather than stacking several provider bills.",
    ],
    migration:
      "Connect your existing number over SIP and move prompts into the AI employee setup.",
  },
  {
    slug: "bland-ai",
    name: "Bland AI",
    category: "voice",
    summary:
      "Bland AI is an API for automating phone calls with AI agents at scale.",
    pricingModel: "Per-minute API pricing, with enterprise plans for volume.",
    chooseThem: [
      "You run very high-volume outbound calling built by your own developers.",
    ],
    switchReasons: [
      "Business users can configure and approve what the agent does — no developers needed.",
      "Every call becomes a transcript in the inbox and an update on the CRM contact.",
      "Chat, email, help center and website voice in the same workspace.",
    ],
    migration:
      "Bring your number over SIP, then describe the call flow as the AI employee’s instructions.",
  },
  {
    slug: "synthflow",
    name: "Synthflow",
    category: "voice",
    summary:
      "Synthflow is a no-code builder for AI phone agents, sold in minute-based plans.",
    pricingModel:
      "Monthly plans that include a bucket of minutes, with overage.",
    chooseThem: [
      "You only need phone agents and nothing else from a customer platform.",
    ],
    switchReasons: [
      "Phone is one channel of many: chat, email, website voice and CRM share the same AI employee.",
      "Pay per minute used instead of pre-buying a minute bucket.",
      "Approvals and spend limits on every action the agent takes.",
    ],
    migration:
      "Connect your carrier number over SIP and copy your agent’s script into the receptionist role.",
  },
];

export function getCompetitor(slug: string) {
  return competitors.find((item) => item.slug === slug) ?? null;
}

export function relatedCompetitors(competitor: Competitor, limit = 4) {
  return competitors
    .filter(
      (item) =>
        item.slug !== competitor.slug && item.category === competitor.category,
    )
    .slice(0, limit);
}
