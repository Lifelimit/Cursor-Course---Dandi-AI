-- Add payment method metadata columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT,
ADD COLUMN IF NOT EXISTS payment_method_brand TEXT,
ADD COLUMN IF NOT EXISTS payment_method_expiry TEXT;

-- Comment for security clarity
COMMENT ON COLUMN profiles.payment_method_last4 IS 'Only stores the last 4 digits of the payment card for UI display purposes. No full card numbers are stored here.';
