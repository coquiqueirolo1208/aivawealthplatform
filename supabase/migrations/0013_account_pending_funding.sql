-- Amount the client still needs to transfer into an already-approved account —
-- null/0 means nothing pending. Set/cleared by the advisor alongside the other
-- per-account operational fields (titularidad, TOD); feeds the new "fondeo
-- pendiente" Radar alert.
alter table accounts add column monto_pendiente_transferir numeric check (monto_pendiente_transferir is null or monto_pendiente_transferir >= 0);
