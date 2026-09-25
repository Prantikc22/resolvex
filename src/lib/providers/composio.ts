import "server-only";
import { Composio } from "@composio/core";

function toolkit<const T extends string>(
  slug: T,
  name: string,
  category: string,
) {
  return {
    slug,
    name,
    category,
    logo: `https://logos.composio.dev/api/${slug}`,
  } as const;
}

export const composioCatalog = [
  toolkit("gmail", "Gmail", "Communication"),
  toolkit("slack", "Slack", "Communication"),
  toolkit("github", "GitHub", "Developer tools"),
  toolkit("notion", "Notion", "Productivity"),
  toolkit("googlesheets", "Google Sheets", "Productivity"),
  toolkit("googledrive", "Google Drive", "Productivity"),
  toolkit("shopify", "Shopify", "Commerce"),
  toolkit("supabase", "Supabase", "Data"),
  toolkit("hubspot", "HubSpot", "CRM"),
  toolkit("googlecalendar", "Google Calendar", "Scheduling"),
  toolkit("zoom", "Zoom", "Meetings"),
  toolkit("microsoft_teams", "Microsoft Teams", "Meetings"),
  toolkit("googlemeet", "Google Meet", "Meetings"),
  toolkit("salesforce", "Salesforce", "CRM"),
  toolkit("jira", "Jira", "Project management"),
  toolkit("linear", "Linear", "Project management"),
  toolkit("airtable", "Airtable", "Productivity"),
  toolkit("asana", "Asana", "Project management"),
  toolkit("clickup", "ClickUp", "Project management"),
  toolkit("outlook", "Microsoft Outlook", "Communication"),
  toolkit("dropbox", "Dropbox", "Storage"),
  toolkit("stripe", "Stripe", "Finance"),
  toolkit("zendesk", "Zendesk", "Help desk"),
  toolkit("freshdesk", "Freshdesk", "Help desk"),
  toolkit("intercom", "Intercom", "Help desk"),
  toolkit("gorgias", "Gorgias", "Help desk"),
  toolkit("pipedrive", "Pipedrive", "CRM"),
  toolkit("zoho", "Zoho CRM", "CRM"),
  toolkit("calendly", "Calendly", "Scheduling"),
  toolkit("whatsapp", "WhatsApp Business", "Communication"),
  toolkit("discord", "Discord", "Communication"),
  toolkit("telegram", "Telegram", "Communication"),
  toolkit("mailchimp", "Mailchimp", "Marketing"),
  toolkit("linkedin", "LinkedIn", "Marketing"),
  toolkit("typeform", "Typeform", "Productivity"),
  toolkit("googledocs", "Google Docs", "Productivity"),
  toolkit("one_drive", "OneDrive", "Storage"),
  toolkit("trello", "Trello", "Project management"),
  toolkit("monday", "monday.com", "Project management"),
  toolkit("quickbooks", "QuickBooks", "Finance"),
] as const;

export type ComposioToolkit = (typeof composioCatalog)[number]["slug"];

export function getComposio() {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("Composio is not configured.");
  return new Composio({ apiKey: key });
}

export function composioUserId(organizationId: string) {
  return `resolvex_workspace_${organizationId}`;
}

export async function createComposioConnection({
  organizationId,
  toolkit,
  callbackUrl,
}: {
  organizationId: string;
  toolkit: ComposioToolkit;
  callbackUrl: string;
}) {
  const session = await getComposio().sessions.create(
    composioUserId(organizationId),
    { toolkits: [toolkit], manageConnections: true },
  );
  const request = await session.authorize(toolkit, { callbackUrl });
  if (!request.redirectUrl) {
    throw new Error("Composio did not return an authorization URL.");
  }
  return {
    sessionId: session.sessionId,
    requestId: request.id,
    redirectUrl: request.redirectUrl,
  };
}

export async function listComposioConnections(organizationId: string) {
  const response = await getComposio().connectedAccounts.list({
    userIds: [composioUserId(organizationId)],
    limit: 100,
  });
  return response.items;
}

export async function listComposioTools({
  toolkit,
  search,
}: {
  toolkit: ComposioToolkit;
  search?: string;
}) {
  const tools = await getComposio().tools.getRawComposioTools({
    toolkits: [toolkit],
    important: false,
    limit: 60,
    ...(search ? { search } : {}),
  });
  return tools.map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    description: tool.description ?? "",
    inputParameters: tool.inputParameters ?? {},
    tags: tool.tags ?? [],
  }));
}

export async function disconnectComposioAccount(accountId: string) {
  return getComposio().connectedAccounts.delete(accountId);
}

export async function executeComposioTool({
  organizationId,
  toolkit,
  toolSlug,
  arguments: arguments_,
}: {
  organizationId: string;
  toolkit: string;
  toolSlug: string;
  arguments: Record<string, unknown>;
}) {
  const session = await getComposio().sessions.create(
    composioUserId(organizationId),
    { toolkits: [toolkit], manageConnections: false },
  );
  return session.execute(toolSlug, arguments_);
}
