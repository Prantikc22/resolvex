import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const migrationDirectory = resolve("supabase/migrations");
  const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    for (const file of files) {
      const sql = await readFile(resolve(migrationDirectory, file), "utf8");
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log("ResolveX schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
