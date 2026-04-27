-- Execute this in the Supabase SQL Editor to add the password column to your profiles table
-- This allows us to support email/password authentication via NextAuth's CredentialsProvider

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hashed_password text;
