-- Connector tables for GhostwriterMe.
--
-- Run once in the Supabase SQL Editor (Vercel -> Storage -> your Supabase DB
-- -> Open in Supabase Studio -> SQL Editor), then redeploy. Safe to re-run.
--
-- Both tables are reached only through the service-role key from serverless
-- functions, so row-level security is enabled purely to keep anonymous access
-- blocked.

-- Tokens a user pastes into Claude, ChatGPT or Cursor to reach /api/mcp.
-- Only the SHA-256 hash of the secret half is stored, so a database leak
-- cannot be replayed against the MCP endpoint.
create table if not exists public.connector_tokens (
  id text primary key,
  email text not null check (email = lower(email)),
  token_hash text not null,
  label text not null default 'Connector token',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists connector_tokens_email_idx on public.connector_tokens (email);

alter table public.connector_tokens enable row level security;

-- Remote MCP servers a user connects INTO GhostwriterMe, attached to Studio
-- requests through Anthropic's MCP connector.
--
-- auth_token holds the user's access token for that third-party server when
-- they supply one. It is stored in plaintext, readable by anyone with the
-- service-role key, and is never returned to the browser. Treat this column
-- as sensitive when granting database access.
create table if not exists public.user_mcp_servers (
  id uuid primary key,
  email text not null check (email = lower(email)),
  name text not null,
  url text not null,
  auth_token text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (email, name)
);

create index if not exists user_mcp_servers_email_idx on public.user_mcp_servers (email);

alter table public.user_mcp_servers enable row level security;
