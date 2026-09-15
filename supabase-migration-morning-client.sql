-- Caches the persistent Morning client ID per user, so the saved card
-- token from a payment can actually be found afterward (a payment tied
-- to an ad-hoc/inline client, with no client.id, does not reliably
-- produce a searchable token).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS morning_client_id text;
