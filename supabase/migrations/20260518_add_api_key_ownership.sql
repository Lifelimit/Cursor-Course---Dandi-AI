-- Ownership column required by API-key RLS policies and server route handlers.
ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS user_id text;

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
