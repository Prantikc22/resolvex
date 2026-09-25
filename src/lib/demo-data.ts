export type Conversation = {
  id: string;
  customer: string;
  initials: string;
  company: string;
  phone: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  priority: "urgent" | "high" | "normal";
  channel: "email" | "chat" | "form";
  sentiment: "positive" | "neutral" | "frustrated";
  assignee: string;
  tags: string[];
};

export const conversations: Conversation[] = [
  {
    id: "R-1842",
    customer: "Avery Morgan",
    initials: "AM",
    company: "Northstar Labs",
    phone: "+1 415 555 0142",
    subject: "Can I change our billing cycle?",
    preview: "We would like to move to annual without losing...",
    time: "Now",
    unread: true,
    priority: "high",
    channel: "chat",
    sentiment: "neutral",
    assignee: "You",
    tags: ["Billing", "Enterprise"],
  },
  {
    id: "R-1841",
    customer: "Sana Khan",
    initials: "SK",
    company: "Fieldnote",
    phone: "+44 20 7946 0821",
    subject: "SSO setup for our team",
    preview: "The metadata URL is returning an invalid...",
    time: "4m",
    unread: true,
    priority: "urgent",
    channel: "email",
    sentiment: "frustrated",
    assignee: "Maya",
    tags: ["Technical", "VIP"],
  },
  {
    id: "R-1840",
    customer: "Jonas Reed",
    initials: "JR",
    company: "Planeview",
    phone: "+91 98304 22184",
    subject: "Webhook delivery failed",
    preview: "Three events have not reached production...",
    time: "12m",
    unread: false,
    priority: "high",
    channel: "form",
    sentiment: "neutral",
    assignee: "You",
    tags: ["API"],
  },
  {
    id: "R-1839",
    customer: "Lena Park",
    initials: "LP",
    company: "Arc & Co.",
    phone: "+65 6123 9088",
    subject: "Export my account data",
    preview: "Could you send a copy of all activity tied...",
    time: "31m",
    unread: false,
    priority: "normal",
    channel: "email",
    sentiment: "neutral",
    assignee: "AI",
    tags: ["Privacy"],
  },
  {
    id: "R-1838",
    customer: "Omar Farooq",
    initials: "OF",
    company: "Forma",
    phone: "+971 4 555 0187",
    subject: "Thank you for the quick fix",
    preview: "Everything is working perfectly now...",
    time: "1h",
    unread: false,
    priority: "normal",
    channel: "chat",
    sentiment: "positive",
    assignee: "Maya",
    tags: ["Feedback"],
  },
  {
    id: "R-1837",
    customer: "Meera Shah",
    initials: "MS",
    company: "Sable Health",
    phone: "+91 99870 45120",
    subject: "Unable to invite a teammate",
    preview: "The invite disappears after I click send...",
    time: "2h",
    unread: false,
    priority: "normal",
    channel: "chat",
    sentiment: "frustrated",
    assignee: "Unassigned",
    tags: ["Account"],
  },
];

export const chartData = [
  { day: "Mon", resolved: 84, ai: 42, firstReply: 9 },
  { day: "Tue", resolved: 96, ai: 51, firstReply: 8 },
  { day: "Wed", resolved: 112, ai: 63, firstReply: 6 },
  { day: "Thu", resolved: 105, ai: 61, firstReply: 7 },
  { day: "Fri", resolved: 128, ai: 79, firstReply: 5 },
  { day: "Sat", resolved: 71, ai: 48, firstReply: 4 },
  { day: "Sun", resolved: 68, ai: 49, firstReply: 4 },
];

export const knowledgeArticles = [
  {
    title: "Billing plans and annual discounts",
    collection: "Billing",
    status: "Healthy",
    used: 148,
    updated: "2 hours ago",
  },
  {
    title: "Configure SAML single sign-on",
    collection: "Security",
    status: "Needs review",
    used: 83,
    updated: "18 days ago",
  },
  {
    title: "Webhook retries and signatures",
    collection: "Developers",
    status: "Healthy",
    used: 71,
    updated: "Yesterday",
  },
  {
    title: "Data exports and deletion requests",
    collection: "Privacy",
    status: "Healthy",
    used: 54,
    updated: "4 days ago",
  },
  {
    title: "Invite and manage teammates",
    collection: "Getting started",
    status: "Gap detected",
    used: 39,
    updated: "26 days ago",
  },
];

export const automations = [
  {
    name: "Route enterprise billing",
    trigger: "Tag is Enterprise + topic is Billing",
    action: "Assign Finance desk · SLA 30m",
    runs: 142,
    saved: "11h",
    on: true,
  },
  {
    name: "Resolve order status",
    trigger: "Intent is order_status + confidence > 90%",
    action: "Look up order · answer · close",
    runs: 618,
    saved: "44h",
    on: true,
  },
  {
    name: "Escalate cancellation risk",
    trigger: "Sentiment frustrated + cancellation mentioned",
    action: "Assign senior agent · notify Slack",
    runs: 29,
    saved: "3h",
    on: true,
  },
  {
    name: "Collect missing diagnostics",
    trigger: "Topic is technical + browser unknown",
    action: "Ask for browser and request ID",
    runs: 87,
    saved: "7h",
    on: false,
  },
];

export const integrations = [
  {
    name: "Slack",
    category: "Collaboration",
    status: "Connected",
    color: "#e8c8ff",
    mark: "S",
  },
  {
    name: "Shopify",
    category: "Commerce",
    status: "Connected",
    color: "#c8ff73",
    mark: "S",
  },
  {
    name: "Linear",
    category: "Engineering",
    status: "Connected",
    color: "#cbd0ff",
    mark: "L",
  },
  {
    name: "Razorpay",
    category: "Billing",
    status: "Ready to configure",
    color: "#b9d8ff",
    mark: "R",
  },
  {
    name: "Salesforce",
    category: "CRM",
    status: "Available",
    color: "#bceeff",
    mark: "S",
  },
  {
    name: "HubSpot",
    category: "CRM",
    status: "Available",
    color: "#ffc1af",
    mark: "H",
  },
  {
    name: "Jira",
    category: "Engineering",
    status: "Available",
    color: "#cad8ff",
    mark: "J",
  },
  {
    name: "WhatsApp",
    category: "Messaging",
    status: "Coming next",
    color: "#bff2d0",
    mark: "W",
  },
];
