-- Latest statement per account, for screens that only need each account's current
-- position (Radar, Mis Clientes, the nav badge). Reading every month of history for
-- those was most of the page-load time. security_invoker makes the view run with the
-- querying user's permissions, so the snapshots RLS policies still apply — a plain
-- view runs as its owner and would bypass them.
create view latest_snapshots with (security_invoker = true) as
  select distinct on (account_id) *
  from snapshots
  order by account_id, month desc;

-- Supabase's documented RLS optimization: wrap auth.uid() in a subselect so Postgres
-- evaluates it once per query instead of once per row. Snapshots is the table every
-- page reads the most rows from.
drop policy snapshots_all_own on snapshots;
create policy snapshots_all_own on snapshots for all
  to authenticated
  using (exists (
    select 1 from accounts a join clients c on c.id = a.client_id
    where a.id = snapshots.account_id and c.advisor_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from accounts a join clients c on c.id = a.client_id
    where a.id = snapshots.account_id and c.advisor_id = (select auth.uid())
  ));

-- Most pages filter clients with `advisor_id = me OR is_demo`; advisor_id is already
-- indexed, this covers the is_demo half.
create index clients_is_demo_idx on clients (id) where is_demo;
