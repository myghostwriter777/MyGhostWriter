create table if not exists public.users (
  email text primary key check (email = lower(email)),
  name text,
  google_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'student')),
  role text not null default 'user' check (role in ('user', 'admin')),
  all_features boolean not null default false,
  entitlement_expires_at timestamptz,
  trial_used boolean not null default false,
  notices_accepted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  check (not all_features or role = 'admin')
);

-- Keep this script safe to re-run against projects created before permanent
-- account entitlements were introduced.
alter table public.users add column if not exists role text not null default 'user';
alter table public.users add column if not exists all_features boolean not null default false;
alter table public.users add column if not exists entitlement_expires_at timestamptz;

-- Service-role key bypasses RLS, but enable it so anon access stays blocked:
alter table public.users enable row level security;
