-- Add billing address columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS billing_street TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_state TEXT,
ADD COLUMN IF NOT EXISTS billing_zip TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT;
