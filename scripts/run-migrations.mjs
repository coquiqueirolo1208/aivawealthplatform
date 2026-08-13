// Applies every SQL file in supabase/migrations/ (in filename order) directly to
// the project's Postgres database (via the pooler connection string), inside one
// transaction — no Supabase CLI link required.
//
// Requires env var: SUPABASE_DB_URL (Settings -> Database -> Connect -> "Transaction
// pooler" URI, with the password filled in).
// Usage: node --env-file=.env.local scripts/run-migrations.mjs

import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Set SUPABASE_DB_URL first (see .env.local.example).");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const migrationsDir = path.resolve(import.meta.dirname, "../supabase/migrations");
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

await client.connect();
try {
  await client.query("begin");
  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await client.query(sql);
  }
  await client.query("commit");
  console.log(`\nApplied ${files.length} migration file(s) successfully.`);
} catch (err) {
  await client.query("rollback");
  console.error("\nMigration failed, rolled back:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
