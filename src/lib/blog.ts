export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  keywords: string[];
  sections: BlogSection[];
  faq: Array<{ question: string; answer: string }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "ai-customer-support-guide",
    category: "AI support guide",
    title: "AI customer support: what to automate—and what to keep human",
    description:
      "A practical framework for using AI in customer service without sacrificing accuracy, empathy, or accountability.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    readTime: "9 min read",
    keywords: [
      "AI customer support",
      "AI customer service",
      "customer support automation",
      "AI helpdesk",
      "human handoff",
    ],
    sections: [
      {
        heading: "What is AI customer support?",
        paragraphs: [
          "AI customer support uses artificial intelligence to understand a customer question, retrieve approved information, draft or send an answer, complete permitted actions, and route the conversation when a person is needed.",
          "The useful distinction is not AI versus human support. It is which work can be completed safely by software and which moments need judgement, empathy, or authority. A reliable AI helpdesk makes that boundary explicit and keeps the source, confidence, action, and handoff visible.",
        ],
      },
      {
        heading: "The work AI should automate first",
        paragraphs: [
          "Start with frequent, low-risk questions that already have one approved answer. These produce measurable time savings without asking an AI system to invent policy or interpret an exceptional situation.",
        ],
        bullets: [
          "Order status, plan details, operating hours, and setup instructions",
          "Password-reset guidance and other reversible account workflows",
          "Classification, summarisation, translation, and suggested replies",
          "Collecting missing details before a human joins the conversation",
        ],
      },
      {
        heading: "The work that should stay human",
        paragraphs: [
          "Escalate when the outcome can materially affect money, access, safety, legal rights, or the customer relationship. AI can still gather context and prepare a concise brief, but a person should own the final decision.",
        ],
        bullets: [
          "Refund exceptions, disputes, cancellations, and negotiated terms",
          "Security incidents, identity uncertainty, and sensitive personal data",
          "Legal threats, vulnerable customers, or emotionally charged complaints",
          "Any request where the knowledge source is missing or contradictory",
        ],
      },
      {
        heading: "How to measure an AI support rollout",
        paragraphs: [
          "Measure completed outcomes, not message volume. Track the percentage of conversations resolved without a person, citation accuracy, reopened conversations, handoff quality, customer satisfaction, first-response time, and cost per resolved conversation.",
          "Review a sample of automated outcomes every week. When an answer fails, improve the underlying source or rule instead of adding an isolated prompt exception. That keeps the system understandable as usage grows.",
        ],
      },
    ],
    faq: [
      {
        question: "Can AI replace a customer support team?",
        answer:
          "AI can resolve repetitive, well-documented work, but people remain essential for exceptions, sensitive decisions, relationship repair, and cases where policy or context is incomplete.",
      },
      {
        question: "What is the safest first use case for AI customer service?",
        answer:
          "Begin with high-volume informational questions that have one approved source and a low cost of error, then use draft-only mode until answer quality is proven.",
      },
      {
        question: "How should an AI handoff work?",
        answer:
          "The agent should receive the customer history, detected intent, sources consulted, actions attempted, sentiment, and the specific reason for escalation in the same conversation thread.",
      },
    ],
  },
  {
    slug: "reduce-customer-support-costs",
    category: "Support economics",
    title:
      "How to reduce customer support costs without reducing service quality",
    description:
      "A step-by-step cost model for improving resolution speed, agent focus, and support efficiency without hiding behind deflection metrics.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    readTime: "8 min read",
    keywords: [
      "reduce customer support costs",
      "customer support cost",
      "cost per resolution",
      "helpdesk pricing",
      "support automation ROI",
    ],
    sections: [
      {
        heading: "Start with cost per resolved conversation",
        paragraphs: [
          "Customer support cost is easiest to improve when the unit is a completed customer outcome. Divide support labour, software, outsourcing, and channel costs by the number of genuinely resolved conversations in the same period.",
          "Seat price alone is incomplete. A low-cost tool can still be expensive if agents switch between systems, repeat work, or handle questions that approved knowledge could resolve automatically.",
        ],
      },
      {
        heading: "Remove avoidable demand before adding automation",
        paragraphs: [
          "Tag recurring contact reasons and connect them to a broken product step, unclear policy, missing status update, or poor help content. The cheapest ticket is often the one the product prevents.",
        ],
        bullets: [
          "Publish clear answers for the top ten contact reasons",
          "Send proactive updates for delays and known incidents",
          "Fix forms that omit information agents always request",
          "Route conversations once using customer and topic context",
        ],
      },
      {
        heading: "Automate outcomes, not just replies",
        paragraphs: [
          "A fast answer is useful, but a completed action creates more value. Connect safe workflows such as order lookup, appointment changes, or access recovery. Require approval for irreversible or financially sensitive actions.",
          "Count a successful AI resolution only when the customer receives a grounded answer or completed action and does not need a person to finish the same request.",
        ],
      },
      {
        heading: "Protect the quality measures that matter",
        paragraphs: [
          "Track reopened rate, escalation rate, citation accuracy, customer satisfaction, and time to resolution alongside cost. If costs fall while repeat contacts rise, work has moved rather than disappeared.",
        ],
      },
    ],
    faq: [
      {
        question: "What is a good customer support cost metric?",
        answer:
          "Cost per resolved conversation is usually more useful than cost per contact because it rewards completed outcomes and exposes repeat work.",
      },
      {
        question: "Does customer support automation always lower costs?",
        answer:
          "No. Automation lowers cost when it uses accurate knowledge, completes a real outcome, and hands exceptions to people cleanly. Poor automation can increase repeat contacts and recovery work.",
      },
      {
        question: "Which support costs are often overlooked?",
        answer:
          "Implementation services, paid collaborators, AI usage, add-on channels, knowledge software, telephony, and time spent switching between disconnected tools are frequently missed.",
      },
    ],
  },
  {
    slug: "ai-helpdesk-implementation-checklist",
    category: "Implementation",
    title: "AI helpdesk implementation checklist: from knowledge to launch",
    description:
      "A launch-ready checklist for selecting sources, setting automation limits, testing handoffs, and measuring an AI helpdesk.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    readTime: "7 min read",
    keywords: [
      "AI helpdesk implementation",
      "AI helpdesk checklist",
      "customer support software implementation",
      "AI knowledge base",
      "support migration",
    ],
    sections: [
      {
        heading: "Choose a narrow first launch",
        paragraphs: [
          "Select one inbox, one language, and a small group of repeatable contact reasons. A narrow launch makes answer quality, routing, and reporting easier to inspect before the system reaches every customer.",
        ],
        bullets: [
          "Name an owner for knowledge and an owner for support operations",
          "Define success using resolution quality and customer outcomes",
          "Document topics that must always reach a person",
          "Create a rollback path before enabling automatic resolution",
        ],
      },
      {
        heading: "Prepare approved knowledge",
        paragraphs: [
          "Remove duplicate, expired, and contradictory guidance before import. Every automated answer should point to an approved source that a support lead can review and update.",
          "Test the exact wording customers use, including incomplete questions and common misspellings. A knowledge base that looks organised to employees may still fail real customer language.",
        ],
      },
      {
        heading: "Test the handoff as carefully as the answer",
        paragraphs: [
          "Send low-confidence, sensitive, and unsupported questions through the full escalation path. Confirm that the agent sees the conversation, customer identity, source trail, attempted actions, and reason for handoff without asking the customer to repeat the story.",
        ],
      },
      {
        heading: "Launch in stages",
        paragraphs: [
          "Begin with internal testing, move to draft-only assistance, enable automatic resolution for proven topics, and expand only after reviewing live outcomes. Publish ownership and review dates for every automated workflow.",
        ],
      },
    ],
    faq: [
      {
        question: "How long does an AI helpdesk implementation take?",
        answer:
          "A focused widget and knowledge launch can take days, while email migration, complex workflows, voice, identity, and compliance review can extend the rollout. Scope the first launch narrowly.",
      },
      {
        question: "What data is needed to train an AI helpdesk?",
        answer:
          "Use current approved help articles, product documentation, policies, and structured workflow instructions. Historical tickets are useful for identifying demand but should not automatically become approved truth.",
      },
      {
        question: "Should AI answers launch automatically?",
        answer:
          "Start in draft-only mode, review accuracy and handoffs, then enable automatic resolution only for topics with reliable sources and a low cost of error.",
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
