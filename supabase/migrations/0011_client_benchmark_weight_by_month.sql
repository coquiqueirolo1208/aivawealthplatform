-- Replaces the single always-on clients.benchmark_msci_pct (added in 0010, never used in
-- production) with a per-month weight, mirroring benchmark_levels' own (month -> value)
-- shape. This lets MTD use the weight in effect for the latest month, and lets YTD chain
-- each month's own return using whatever weight was active that month, instead of
-- applying today's mix to the whole year retroactively.

alter table clients drop constraint if exists clients_benchmark_msci_pct_range;
alter table clients drop column if exists benchmark_msci_pct;

create table client_benchmark_weights (
  client_id uuid not null references clients (id) on delete cascade,
  month char(7) not null, -- 'YYYY-MM'
  msci_pct integer not null check (msci_pct >= 0 and msci_pct <= 100),
  primary key (client_id, month)
);
create index client_benchmark_weights_client_id_idx on client_benchmark_weights (client_id);

alter table client_benchmark_weights enable row level security;

create policy client_benchmark_weights_all_own on client_benchmark_weights for all
  to authenticated
  using (exists (select 1 from clients c where c.id = client_benchmark_weights.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = client_benchmark_weights.client_id and c.advisor_id = auth.uid()));

create policy client_benchmark_weights_all_demo on client_benchmark_weights for all
  to authenticated
  using (exists (select 1 from clients c where c.id = client_benchmark_weights.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = client_benchmark_weights.client_id and c.is_demo = true));
