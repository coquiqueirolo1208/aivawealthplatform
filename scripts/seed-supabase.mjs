// Inserts the cleaned firm-wide catalog data (supabase/seed-data/clean/*.json) into
// a real Supabase project via the service_role key (bypasses RLS, required since
// these tables have no INSERT policy for regular authenticated advisors).
//
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (see web/.env.local.example).
// Usage: node scripts/seed-supabase.mjs

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const cleanDir = path.resolve(import.meta.dirname, "../supabase/seed-data/clean");

// Order matters: model_portfolio_holdings/investec_classes reference parent tables via FK.
const TABLES = [
  "funds",
  "ideas_stocks",
  "ideas_funds",
  "ideas_etfs",
  "ideas_bonds",
  "model_portfolios",
  "model_portfolio_holdings",
  "investec_solutions",
  "investec_classes",
  "reference_data",
];

const CHUNK_SIZE = 500;

async function seedTable(table) {
  const filePath = path.join(cleanDir, `${table}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipping ${table}: ${filePath} not found (run transform-seed-data.mjs first)`);
    return;
  }
  const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) {
      console.error(`Error seeding ${table} (rows ${i}-${i + chunk.length}):`, error.message);
      process.exitCode = 1;
      return;
    }
    inserted += chunk.length;
  }
  console.log(`${table}: upserted ${inserted} row(s)`);
}

for (const table of TABLES) {
  // Sequential (not Promise.all) to respect FK order and keep error messages attributable.
  await seedTable(table);
}

console.log("\nDone. DEMO_DATA still needs `node scripts/seed-demo-data.mjs <advisor_id>` (see that script).");
