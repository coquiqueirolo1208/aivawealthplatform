-- Lets an advisor log a "pedir propuesta" request against a prospect, with
-- file attachments (account statement, etc). No email integration yet — this
-- is purely an internal record the advisor can see and revisit; attachments
-- is a jsonb array of {path, name} since there's no separate metadata per
-- file worth a child table for.
create table proposal_requests (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects (id) on delete cascade,
  monto_estimado numeric,
  horizonte text,
  perfil text,
  comentarios text,
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index proposal_requests_prospect_id_idx on proposal_requests (prospect_id);

alter table proposal_requests enable row level security;

create policy proposal_requests_own on proposal_requests for all
  to authenticated
  using (exists (select 1 from prospects p where p.id = proposal_requests.prospect_id and p.advisor_id = auth.uid()))
  with check (exists (select 1 from prospects p where p.id = proposal_requests.prospect_id and p.advisor_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('proposal-attachments', 'proposal-attachments', false)
on conflict (id) do nothing;

-- Objects are stored at "<prospect_id>/<filename>" — scope access by joining
-- back to the owning prospect, same idea as the advisor-logos folder-prefix
-- check but via a table join since ownership lives on prospects, not on the id.
create policy proposal_attachments_own on storage.objects for all
  to authenticated
  using (
    bucket_id = 'proposal-attachments'
    and exists (select 1 from prospects p where p.advisor_id = auth.uid() and (storage.foldername(name))[1] = p.id::text)
  )
  with check (
    bucket_id = 'proposal-attachments'
    and exists (select 1 from prospects p where p.advisor_id = auth.uid() and (storage.foldername(name))[1] = p.id::text)
  );
