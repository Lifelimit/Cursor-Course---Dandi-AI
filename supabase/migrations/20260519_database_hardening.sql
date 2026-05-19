-- Database Hardening & API Key Hashing at Rest
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Security Hardening: Revoke handle_new_user execution from public and anon
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- 2. Schema Alterations: Add hashed_key_value column
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS hashed_key_value text;

-- 3. Backfill existing keys: Generate SHA-256 hashes
UPDATE public.api_keys 
SET hashed_key_value = encode(digest(key_value, 'sha256'), 'hex') 
WHERE hashed_key_value IS NULL;

-- 4. Mask the existing plain text keys in `key_value`
UPDATE public.api_keys 
SET key_value = substring(key_value from 1 for 8) || '...' || right(key_value, 4) 
WHERE length(key_value) > 20;

-- 5. Set constraints on hashed_key_value
ALTER TABLE public.api_keys ALTER COLUMN hashed_key_value SET NOT NULL;
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_hashed_key_value_key;
ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_hashed_key_value_key UNIQUE (hashed_key_value);

-- Drop the unique constraint on key_value since masked values may overlap or no longer need uniqueness checks
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_key_value_key;

-- 6. Hardening API Keys Table RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;

CREATE POLICY "Users can view their own API keys" ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own API keys" ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own API keys" ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own API keys" ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);
