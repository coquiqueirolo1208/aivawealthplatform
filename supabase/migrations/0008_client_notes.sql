-- Lightweight activity log per client (calls, meetings, any touchpoint) — not a full
-- CRM, just a running list of free-text entries with a timestamp. Also the basis for
-- the "sin contacto reciente" Radar check (last note/task activity vs. today).

create table client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);
create index client_notes_client_id_idx on client_notes (client_id);

alter table client_notes enable row level security;

create policy client_notes_all_own on client_notes for all
  to authenticated
  using (exists (select 1 from clients c where c.id = client_notes.client_id and c.advisor_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = client_notes.client_id and c.advisor_id = auth.uid()));

create policy client_notes_all_demo on client_notes for all
  to authenticated
  using (exists (select 1 from clients c where c.id = client_notes.client_id and c.is_demo = true))
  with check (exists (select 1 from clients c where c.id = client_notes.client_id and c.is_demo = true));
