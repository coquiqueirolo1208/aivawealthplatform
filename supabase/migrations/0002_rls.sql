-- Row Level Security: advisor-owned data is scoped to auth.uid(); firm-wide
-- reference/catalog data is readable by any authenticated advisor.
--
-- Catalog tables (funds, ideas_*, model_portfolios, model_portfolio_holdings,
-- investec_solutions, investec_classes, reference_data) get SELECT-only policies:
-- nothing in the original app ever writes to them from the client (they're seeded
-- curated data), so only service_role (which bypasses RLS) can write. benchmark_levels
-- and daily_reports DO have an app-driven write path (save benchmark level / publish
-- daily report), so those get INSERT/UPDATE for authenticated advisors too.

alter table advisors enable row level security;
alter table clients enable row level security;
alter table client_documents enable row level security;
alter table risk_profiles enable row level security;
alter table accounts enable row level security;
alter table snapshots enable row level security;
alter table tasks enable row level security;
alter table prospects enable row level security;
alter table advisor_metrics enable row level security;
alter table recommendations_cache enable row level security;
alter table meeting_prep_cache enable row level security;
alter table benchmark_levels enable row level security;
alter table daily_reports enable row level security;
alter table funds enable row level security;
alter table ideas_funds enable row level security;
alter table ideas_etfs enable row level security;
alter table ideas_bonds enable row level security;
alter table ideas_stocks enable row level security;
alter table model_portfolios enable row level security;
alter table model_portfolio_holdings enable row level security;
alter table investec_solutions enable row level security;
alter table investec_classes enable row level security;
alter table reference_data enable row level security;

-- advisors: can see/update only their own profile row
create policy advisors_select_own on advisors for select
  to authenticated using (id = auth.uid());
create policy advisors_update_own on advisors for update
  to authenticated using (id = auth.uid());

-- clients: fully scoped to the owning advisor
create policy clients_all_own on clients for all
  to authenticated using (advisor_id = auth.uid()) with check (advisor_id = auth.uid());

-- child tables of clients: scoped via a join back to clients.advisor_id
create policy client_documents_all_own on client_documents for all
  to authenticated
  using (exists (select 1 from clients c where c.id = client_documents.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = client_documents.client_id and c.advisor_id = auth.uid()));

create policy risk_profiles_all_own on risk_profiles for all
  to authenticated
  using (exists (select 1 from clients c where c.id = risk_profiles.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = risk_profiles.client_id and c.advisor_id = auth.uid()));

create policy accounts_all_own on accounts for all
  to authenticated
  using (exists (select 1 from clients c where c.id = accounts.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = accounts.client_id and c.advisor_id = auth.uid()));

create policy tasks_all_own on tasks for all
  to authenticated
  using (exists (select 1 from clients c where c.id = tasks.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = tasks.client_id and c.advisor_id = auth.uid()));

create policy recommendations_cache_all_own on recommendations_cache for all
  to authenticated
  using (exists (select 1 from clients c where c.id = recommendations_cache.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = recommendations_cache.client_id and c.advisor_id = auth.uid()));

create policy meeting_prep_cache_all_own on meeting_prep_cache for all
  to authenticated
  using (exists (select 1 from clients c where c.id = meeting_prep_cache.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = meeting_prep_cache.client_id and c.advisor_id = auth.uid()));

-- snapshots: scoped via accounts -> clients
create policy snapshots_all_own on snapshots for all
  to authenticated
  using (exists (
    select 1 from accounts a join clients c on c.id = a.client_id
    where a.id = snapshots.account_id and c.advisor_id = auth.uid()
  ))
  with check (exists (
    select 1 from accounts a join clients c on c.id = a.client_id
    where a.id = snapshots.account_id and c.advisor_id = auth.uid()
  ));

-- prospects, advisor_metrics: scoped directly by advisor_id
create policy prospects_all_own on prospects for all
  to authenticated using (advisor_id = auth.uid()) with check (advisor_id = auth.uid());

create policy advisor_metrics_all_own on advisor_metrics for all
  to authenticated using (advisor_id = auth.uid()) with check (advisor_id = auth.uid());

-- Firm-wide: read for everyone authenticated
create policy benchmark_levels_select_all on benchmark_levels for select to authenticated using (true);
create policy daily_reports_select_all on daily_reports for select to authenticated using (true);
create policy funds_select_all on funds for select to authenticated using (true);
create policy ideas_funds_select_all on ideas_funds for select to authenticated using (true);
create policy ideas_etfs_select_all on ideas_etfs for select to authenticated using (true);
create policy ideas_bonds_select_all on ideas_bonds for select to authenticated using (true);
create policy ideas_stocks_select_all on ideas_stocks for select to authenticated using (true);
create policy model_portfolios_select_all on model_portfolios for select to authenticated using (true);
create policy model_portfolio_holdings_select_all on model_portfolio_holdings for select to authenticated using (true);
create policy investec_solutions_select_all on investec_solutions for select to authenticated using (true);
create policy investec_classes_select_all on investec_classes for select to authenticated using (true);
create policy reference_data_select_all on reference_data for select to authenticated using (true);

-- Firm-wide tables with an actual app-driven write path (benchmark entry, daily report publish)
create policy benchmark_levels_write_all on benchmark_levels for insert to authenticated with check (true);
create policy benchmark_levels_update_all on benchmark_levels for update to authenticated using (true) with check (true);
create policy daily_reports_write_all on daily_reports for insert to authenticated with check (true);
create policy daily_reports_update_all on daily_reports for update to authenticated using (true) with check (true);

-- =========================================================================
-- Storage: shared 'daily-reports' bucket (replaces the base64-in-KV workaround)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('daily-reports', 'daily-reports', false)
on conflict (id) do nothing;

create policy daily_reports_bucket_read on storage.objects for select
  to authenticated using (bucket_id = 'daily-reports');
create policy daily_reports_bucket_write on storage.objects for insert
  to authenticated with check (bucket_id = 'daily-reports');
