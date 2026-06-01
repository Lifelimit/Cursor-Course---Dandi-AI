-- Add is_active column to api_keys for soft-disable on plan downgrade
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Re-enable all previously disabled keys (for clean slate)
UPDATE api_keys SET is_active = true WHERE is_active = false;
