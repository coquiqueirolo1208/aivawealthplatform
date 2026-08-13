-- advisor_metrics used to be a manually-entered singleton per advisor (office-wide
-- AUM by asset class, commissions, flows). Most of those figures are now computed
-- directly from client/account data instead (see app/(protected)/oficina/page.tsx),
-- but "comisiones del trimestre" has no equivalent in client data at all, so it's
-- still read from here — as a single fixed reference figure off the seeded demo
-- advisor's row, shown read-only to every advisor. Mark that row shared/readable.

alter table advisor_metrics add column is_demo boolean not null default false;

update advisor_metrics set is_demo = true
where advisor_id = 'ad8e152d-8a7e-4d52-be2a-b7594eba21eb';

create policy advisor_metrics_select_demo on advisor_metrics for select
  to authenticated using (is_demo = true);
