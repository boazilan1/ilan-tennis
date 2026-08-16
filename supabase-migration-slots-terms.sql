-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)

-- Age group per activity slot (e.g. "8-12", "מבוגרים")
alter table activities add column if not exists age_group text;

-- Records that the registrant confirmed the registration terms
alter table enrollments add column if not exists terms_accepted_at timestamptz;
