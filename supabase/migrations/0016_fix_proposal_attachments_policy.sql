-- 0015's proposal_attachments_own policy referenced a bare `name`, which inside
-- the `exists (select ... from prospects p where ...)` subquery resolved to
-- prospects.name (the prospect's own name text) instead of storage.objects.name
-- (the file path) — prospects has a `name` column too, so it shadowed the
-- intended outer reference. Every upload failed RLS as a result. Recreate the
-- policy with storage.objects.name qualified explicitly.
drop policy if exists proposal_attachments_own on storage.objects;

create policy proposal_attachments_own on storage.objects for all
  to authenticated
  using (
    bucket_id = 'proposal-attachments'
    and exists (select 1 from prospects p where p.advisor_id = auth.uid() and (storage.foldername(storage.objects.name))[1] = p.id::text)
  )
  with check (
    bucket_id = 'proposal-attachments'
    and exists (select 1 from prospects p where p.advisor_id = auth.uid() and (storage.foldername(storage.objects.name))[1] = p.id::text)
  );
