-- Add alert_threshold column to api_keys table
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS alert_threshold integer;
-- NULL = no alert; 0-100 = % threshold
