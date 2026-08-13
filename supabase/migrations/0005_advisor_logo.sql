-- Lets each advisor upload their own logo, shown next to "Powered by AIVA
-- Wealth" on PDF exports. Stored in a private bucket (like daily-reports),
-- one object per advisor at "<advisor_id>/logo.<ext>" — advisors can only
-- read/write their own.

alter table advisors add column logo_path text;

insert into storage.buckets (id, name, public)
values ('advisor-logos', 'advisor-logos', false)
on conflict (id) do nothing;

create policy advisor_logos_own on storage.objects for all
  to authenticated
  using (bucket_id = 'advisor-logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'advisor-logos' and (storage.foldername(name))[1] = auth.uid()::text);
