/**
 * Grants or revokes complimentary (never billed) access for workspaces.
 *
 *   npm run complimentary -- grant  --email owner@example.com [--seats 25]
 *   npm run complimentary -- grant  --org <organization-id>
 *   npm run complimentary -- revoke --org <organization-id>
 *   npm run complimentary -- list
 *
 * --email covers every workspace that user belongs to. Revoking removes the
 * complimentary row, so the workspace falls back to the normal paid flow.
 */
import pg from "pg";

function flag(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

async function main() {
  const command = process.argv[2];
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    if (command === "list") {
      const { rows } = await client.query(
        `select o.id, o.name, s.metadata->>'agents' seats, s.metadata->>'granted_at' granted_at
         from subscriptions s join organizations o on o.id = s.organization_id
         where s.provider = 'complimentary' and s.status = 'active' order by o.name`,
      );
      console.table(rows);
      return;
    }
    const email = flag("email")?.toLowerCase();
    const org = flag("org");
    if (!["grant", "revoke"].includes(command) || (!email && !org))
      throw new Error(
        "Usage: grant|revoke --email <email> | --org <id>, or list.",
      );
    const { rows: organizations } = await client.query<{
      id: string;
      name: string;
    }>(
      email
        ? `select distinct o.id, o.name from organizations o
           join memberships m on m.organization_id = o.id
           join auth.users u on u.id = m.user_id where lower(u.email) = $1`
        : `select id, name from organizations where id = $1`,
      [email ?? org],
    );
    if (!organizations.length) throw new Error("No matching workspace found.");
    for (const organization of organizations) {
      if (command === "grant") {
        await client.query(
          `insert into subscriptions (organization_id, provider, status, plan, metadata, updated_at)
           values ($1, 'complimentary', 'active', 'complimentary', $2, now())
           on conflict (organization_id) do update set
             provider = 'complimentary', status = 'active', plan = 'complimentary',
             provider_customer_id = null, provider_subscription_id = null,
             current_period_end = null, metadata = excluded.metadata, updated_at = now()`,
          [
            organization.id,
            {
              agents: Number(flag("seats") ?? 25),
              granted_at: new Date().toISOString(),
              reason: flag("reason") ?? "Founder / partner workspace",
            },
          ],
        );
        console.log(`Granted complimentary access: ${organization.name}`);
      } else {
        await client.query(
          `delete from subscriptions where organization_id = $1 and provider = 'complimentary'`,
          [organization.id],
        );
        console.log(`Revoked complimentary access: ${organization.name}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
