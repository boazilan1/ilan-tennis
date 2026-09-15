-- Recurring billing via Morning: one row per enrollment's standing-order plan.
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  morning_client_id text,
  morning_token_id text,
  monthly_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending_first_payment'
    CHECK (status IN ('pending_first_payment', 'active', 'paused', 'cancelled', 'failed')),
  next_charge_date date NOT NULL,
  covers_month date NOT NULL,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscriptions" ON billing_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin all subscriptions" ON billing_subscriptions FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Append-only log of every charge attempt (initial payment-form charge and
-- every recurring token charge), for admin visibility and debugging.
CREATE TABLE IF NOT EXISTS billing_charges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES billing_subscriptions(id) ON DELETE CASCADE,
  charge_type text NOT NULL CHECK (charge_type IN ('initial', 'recurring')),
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  morning_document_id text,
  error_message text,
  attempted_at timestamptz DEFAULT now()
);
ALTER TABLE billing_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin all billing charges" ON billing_charges FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
