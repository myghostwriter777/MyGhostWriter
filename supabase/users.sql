create table if not exists public.users (
  email text primary key,
  name text,
  google_id text,
  plan text not null default 'free',
  trial_used boolean not null default false,
  notices_accepted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);
-- Service-role key bypasses RLS, but enable it so anon access stays blocked:
alter table public.users enable row level security;
