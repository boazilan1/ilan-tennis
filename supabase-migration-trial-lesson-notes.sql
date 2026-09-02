-- Free-text note admins can attach when checking off trial lesson attendance
ALTER TABLE trial_signups ADD COLUMN IF NOT EXISTS attendance_note text;
