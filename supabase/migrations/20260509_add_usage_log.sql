-- Create api_usage_log table for Tier 2/3 usage analytics
CREATE TABLE IF NOT EXISTS api_usage_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id   uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  repo_url     text,
  used_at      timestamptz NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_usage_log_key ON api_usage_log(api_key_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_user ON api_usage_log(user_id, used_at DESC);
