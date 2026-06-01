-- Add multi-channel alert support to api_keys table
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS alert_channels text[] DEFAULT '{"email", "in-page"}';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS alert_phone text;

-- Add a comment to explain the structure
COMMENT ON COLUMN api_keys.alert_channels IS 'Array of channels to notify: email, phone, in-page';
