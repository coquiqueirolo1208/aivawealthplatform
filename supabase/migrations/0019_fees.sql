-- Advisory fees ("honorarios"): each client has an annual % on AUM (and an optional
-- annual minimum); the office page estimates each quarter's fee from the statements.
-- fee_records only stores what the advisor actually invoiced/collected, frozen at
-- the moment of invoicing so loading a corrected statement later can't change an
-- amount already billed. No row for a client+quarter = still pending.
alter table clients add column fee_pct numeric check (fee_pct >= 0 and fee_pct <= 10);
alter table clients add column fee_min_annual numeric check (fee_min_annual >= 0);

create table fee_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  period text not null check (period ~ '^\d{4}-Q[1-4]$'),
  base_aum numeric,
  fee_pct numeric,
  amount numeric not null,
  status text not null check (status in ('facturado', 'cobrado')),
  invoiced_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (client_id, period)
);
create index fee_records_period_idx on fee_records (period);

alter table fee_records enable row level security;

create policy fee_records_all_own on fee_records for all
  to authenticated
  using (exists (select 1 from clients c where c.id = fee_records.client_id and c.advisor_id = (select auth.uid())))
  with check (exists (select 1 from clients c where c.id = fee_records.client_id and c.advisor_id = (select auth.uid())));

-- Same shared-sandbox rule as every other demo-client table (see 0003).
create policy fee_records_all_demo on fee_records for all
  to authenticated
  using (exists (select 1 from clients c where c.id = fee_records.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = fee_records.client_id and c.is_demo = true));
