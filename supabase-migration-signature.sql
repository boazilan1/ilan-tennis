-- Adds a typed-name digital signature to enrollments, alongside the
-- existing terms_accepted_at timestamp.
alter table enrollments add column if not exists signature_name text;
