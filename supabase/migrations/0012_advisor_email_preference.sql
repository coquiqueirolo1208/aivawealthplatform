-- Lets an advisor opt out of the Monday-morning weekly summary email (there was no way
-- to turn it off once it existed).
alter table advisors add column weekly_email_enabled boolean not null default true;
