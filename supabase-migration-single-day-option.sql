-- Lets a 2x/week activity offer a reduced-price "once a week" alternative,
-- chosen by the registrant themselves at registration time.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS single_day_price numeric;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_activity_id uuid REFERENCES activities(id) ON DELETE SET NULL;
