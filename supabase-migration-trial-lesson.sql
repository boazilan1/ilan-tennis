-- Trial lesson (שיעור ניסיון) signups
CREATE TABLE IF NOT EXISTS trial_signups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  child_notes text,
  lesson_date date NOT NULL,
  time_slot text NOT NULL,
  age_group text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trial_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own trial signup" ON trial_signups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own trial signups" ON trial_signups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin all trial signups" ON trial_signups FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
