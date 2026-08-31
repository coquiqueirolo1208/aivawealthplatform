-- Tasks can now belong to a prospect instead of a client (e.g. "llamar para
-- coordinar reunión"), so client_id becomes optional and a new prospect_id is
-- added, with a check ensuring each task belongs to exactly one of the two.
alter table tasks add column prospect_id uuid references prospects (id) on delete cascade;
alter table tasks alter column client_id drop not null;
alter table tasks add constraint tasks_client_or_prospect check ((client_id is not null) <> (prospect_id is not null));
create index tasks_prospect_id_idx on tasks (prospect_id);

-- Prospects are owned directly by the advisor (not shared/demo like clients), so
-- this mirrors the direct advisor_id check on prospects itself rather than the
-- join-through-clients pattern the existing tasks_all_own policy uses.
create policy tasks_prospect_own on tasks for all
  to authenticated
  using (exists (select 1 from prospects p where p.id = tasks.prospect_id and p.advisor_id = auth.uid()))
  with check (exists (select 1 from prospects p where p.id = tasks.prospect_id and p.advisor_id = auth.uid()));
