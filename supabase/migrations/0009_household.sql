-- Free-text grouping label so an advisor can tie separate client records together as
-- one household (e.g. spouses each with their own account) without a full relational
-- model — clients sharing the same non-null, trimmed household_label are one group.
alter table clients add column household_label text;
