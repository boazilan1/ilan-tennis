-- Track attendance for trial lesson signups, so they can be checked off in the admin calendar
ALTER TABLE trial_signups ADD COLUMN IF NOT EXISTS attended boolean;
