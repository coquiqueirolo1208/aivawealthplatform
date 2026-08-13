-- Demo clients (is_demo = true) become a shared sandbox: every authenticated
-- advisor can read AND write them (not just the advisor who owns them), so any
-- advisor can explore the full app — snapshots, KYC docs, risk profile,
-- recommendations, tasks — against the same seeded demo dataset instead of
-- only their own empty account. These are additional PERMISSIVE policies
-- (OR'd with the existing *_all_own ones), so non-demo rows are unaffected.

create policy clients_all_demo on clients for all
  to authenticated using (is_demo = true) with check (is_demo = true);

create policy client_documents_all_demo on client_documents for all
  to authenticated
  using (exists (select 1 from clients c where c.id = client_documents.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = client_documents.client_id and c.is_demo = true));

create policy risk_profiles_all_demo on risk_profiles for all
  to authenticated
  using (exists (select 1 from clients c where c.id = risk_profiles.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = risk_profiles.client_id and c.is_demo = true));

create policy accounts_all_demo on accounts for all
  to authenticated
  using (exists (select 1 from clients c where c.id = accounts.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = accounts.client_id and c.is_demo = true));

create policy tasks_all_demo on tasks for all
  to authenticated
  using (exists (select 1 from clients c where c.id = tasks.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = tasks.client_id and c.is_demo = true));

create policy recommendations_cache_all_demo on recommendations_cache for all
  to authenticated
  using (exists (select 1 from clients c where c.id = recommendations_cache.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = recommendations_cache.client_id and c.is_demo = true));

create policy meeting_prep_cache_all_demo on meeting_prep_cache for all
  to authenticated
  using (exists (select 1 from clients c where c.id = meeting_prep_cache.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = meeting_prep_cache.client_id and c.is_demo = true));

create policy snapshots_all_demo on snapshots for all
  to authenticated
  using (exists (
    select 1 from accounts a join clients c on c.id = a.client_id
    where a.id = snapshots.account_id and c.is_demo = true
  ))
  with check (exists (
    select 1 from accounts a join clients c on c.id = a.client_id
    where a.id = snapshots.account_id and c.is_demo = true
  ));
