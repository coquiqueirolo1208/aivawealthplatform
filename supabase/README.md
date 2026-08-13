# Supabase setup

## Migrations

- `migrations/0001_schema.sql` — all tables (advisor-owned + firm-wide reference data) and the auth trigger that creates an `advisors` row on signup.
- `migrations/0002_rls.sql` — RLS policies and the `daily-reports` Storage bucket.

Once you have a Supabase project and are linked (`supabase link --project-ref <ref>`), apply them with:

```bash
supabase db push
```

## Seeding

1. `node scripts/extract-data.mjs <path-to-dashboard_patrimonial_13.html>` — pulls `DEMO_DATA`, `FONDOS_DB`, `PM_DATA`, `INVESTEC_DATA`, `INVESTEC_SOLUTIONS`, `INVESTEC_CLASES`, and the 4 "Mejores Ideas" arrays out of the original artifact's `<script>` block into `supabase/seed-data/*.json`. Already run once against the file the user supplied; re-run only if the source data changes.
2. `node scripts/transform-seed-data.mjs` — cleans and reshapes those into snake_case rows matching the schema, written to `supabase/seed-data/clean/*.json`. This is also where known data-quality issues in the source spreadsheet get handled (see comments in the script): a handful of leaked spreadsheet header rows in `FONDOS_DB`/`FONDOS_IDEAS_DB`, and one leaked Excel formula string in a single fund's `rt` field.
3. `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs` — upserts the firm-wide catalogs (`funds`, `ideas_*`, `model_portfolios`/`model_portfolio_holdings`, `investec_solutions`/`investec_classes`, `reference_data`) into the live project.
4. `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo-data.mjs <advisor-uuid>` — seeds the 8 demo clients (with full snapshot history, tasks, prospects) under a specific advisor, once that advisor has signed up. Optional, for development/testing only.

`supabase/seed-data/*.json` (both raw and `clean/`) are committed — they're derived from the app's own static reference data, not secrets, and having them in the repo means step 1 rarely needs to be re-run.
