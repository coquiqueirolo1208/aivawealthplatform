-- The benchmark card's "✕" on a level called delete, but benchmark_levels only had
-- SELECT/INSERT/UPDATE policies, so RLS silently matched zero rows: nothing was
-- deleted and no error was shown. Same access as the existing insert/update
-- policies (any signed-in advisor) — to be narrowed to an admin role together with
-- them when firm-wide writes get locked down.
create policy benchmark_levels_delete_all on benchmark_levels for delete to authenticated using (true);
