ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS match_format text DEFAULT 'bo1';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS mode text DEFAULT 'groups_knockout';
