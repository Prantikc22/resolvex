import "server-only";
import { Composio } from "@composio/core";

export const composioCatalog = [
  { slug: "gmail", name: "Gmail", category: "Communication" },
  { slug: "slack", name: "Slack", category: "Communication" },
  { slug: "googlecalendar", name: "Google Calendar", category: "Scheduling" },
  { slug: "googledrive", name: "Google Drive", category: "Productivity" },
  { slug: "googlesheets", name: "Google Sheets", category: "Productivity" },
  { slug: "notion", name: "Notion", category: "Productivity" },
  { slug: "hubspot", name: "HubSpot", category: "CRM" },
  { slug: "shopify", name: "Shopify", category: "Commerce" },
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
