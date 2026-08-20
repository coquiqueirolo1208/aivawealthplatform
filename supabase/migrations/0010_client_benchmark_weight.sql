-- Per-client benchmark blend weight: % allocated to MSCI World, the rest (100 - this)
-- goes to Bloomberg Global Agg. Null means "use the platform default" (70/30), same as
-- before this migration — no backfill needed.
alter table clients add column benchmark_msci_pct integer;

alter table clients add constraint clients_benchmark_msci_pct_range
  check (benchmark_msci_pct is null or (benchmark_msci_pct >= 0 and benchmark_msci_pct <= 100));
