-- snapshots.moneda already existed (unused). Adds the exchange rate actually used to
-- convert that month's local-currency snapshot to USD, so the conversion is auditable
-- after the fact instead of being silently recomputed later against a different rate.
-- Expressed as "units of local currency per 1 USD" (e.g. 900 for ARS), consistent with
-- how these currencies are quoted; null/unset means the snapshot is already in USD.

alter table snapshots add column tipo_cambio numeric;
