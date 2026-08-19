-- Ownership/succession compliance fields, set per account (not per client) since a
-- client can hold accounts under different titularidad at different custodians.
-- titularidad: 'personal' | 'juridica' | null (not yet classified by the advisor).
-- tod_completado/tod_fecha: whether a Transfer on Death beneficiary designation has
-- been completed for this account, and when — relevant for succession planning on
-- personal-title accounts.

alter table accounts add column titularidad text;
alter table accounts add column tod_completado boolean not null default false;
alter table accounts add column tod_fecha date;
