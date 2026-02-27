-- Add endpoint column for deduplication (upsert on re-subscribe)
ALTER TABLE pmp_push_subscriptions
  ADD COLUMN IF NOT EXISTS endpoint text;

-- Backfill from existing subscription_json rows
UPDATE pmp_push_subscriptions
  SET endpoint = subscription_json->>'endpoint'
  WHERE endpoint IS NULL;

-- Unique constraint so upsert works
ALTER TABLE pmp_push_subscriptions
  DROP CONSTRAINT IF EXISTS pmp_push_subscriptions_endpoint_key;

ALTER TABLE pmp_push_subscriptions
  ADD CONSTRAINT pmp_push_subscriptions_endpoint_key UNIQUE (endpoint);
