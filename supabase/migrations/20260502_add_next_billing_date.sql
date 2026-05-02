-- Add billing_next_date to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS billing_next_date TIMESTAMPTZ;

-- Comment for clarity
COMMENT ON COLUMN profiles.billing_next_date IS 'Stores the timestamp for the next expected billing event or subscription renewal, synced from Stripe current_period_end.';
