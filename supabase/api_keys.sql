create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_value text not null unique,
  key_type text not null check (key_type in ('development', 'production')),
  usage_count integer not null default 0,
  monthly_limit integer,
  created_at timestamptz not null default now()
);
