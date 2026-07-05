-- Hoardly — Supabase Postgres Schema
-- Run this in your Supabase SQL Editor.
-- Requires: pgvector extension (enabled by default on Supabase)

-- ── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists vector;
-- PGroonga for Chinese full-text search (optional — install via Supabase dashboard)
-- create extension if not exists pgroonga;

-- ── Users (mirrors Supabase Auth) ──────────────────────────────────────────
-- auth.users is managed by Supabase Auth. We extend it with a profile table.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale      text default 'zh-CN',
  mcp_enabled boolean default false,
  mcp_read_only boolean default true,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── Tags ────────────────────────────────────────────────────────────────────
create table if not exists public.tags (
  id          text primary key,  -- e.g. "tag-ai-agents"
  user_id     uuid references auth.users(id) on delete cascade,
  slug        text not null,
  labels      jsonb not null default '{}',  -- {en: "...", "zh-CN": "..."}
  origin      text not null check (origin in ('ai','user','project','system')),
  usage_count integer default 0,
  created_at  timestamptz default now()
);
alter table public.tags enable row level security;
create policy "Users manage their own tags"
  on public.tags for all using (auth.uid() = user_id);

-- ── Projects ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  slug        text not null,
  color       text not null default '#6366f1',
  status      text not null default 'active' check (status in ('active','archived','deleted')),
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.projects enable row level security;
create policy "Users manage their own projects"
  on public.projects for all using (auth.uid() = user_id);

-- ── Cards ────────────────────────────────────────────────────────────────────
create table if not exists public.cards (
  id                  text primary key,
  user_id             uuid references auth.users(id) on delete cascade,
  type                text not null,
  url                 text,
  canonical_url       text,                    -- dedup key (normalised)
  title_original      text not null,
  title_i18n          jsonb default '{}',
  thumbnail_url       text,
  summary             jsonb default '{}',
  source_platform     text,
  author_name         text,
  author_handle       text,
  subreddit           text,
  parse_status        text not null default 'pending'
    check (parse_status in ('pending','ready','failed','invalid')),
  parse_fail_reason   text
    check (parse_fail_reason in ('login_wall','private','network_error','unsupported')),
  storage_location    text not null default 'cloud'
    check (storage_location in ('cloud','local','hybrid')),
  starred             boolean default false,
  note_markdown       text,
  word_count          integer,
  thread_snapshot     jsonb,                   -- HoardlyThreadSnapshot
  highlights          jsonb default '[]',      -- HoardlyHighlight[]
  deleted_at          timestamptz,
  last_opened_at      timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  -- pgvector embedding (text-embedding-3-small = 1536 dims)
  embedding           vector(1536)
);
alter table public.cards enable row level security;
create policy "Users manage their own cards"
  on public.cards for all using (auth.uid() = user_id);

-- Indexes
create index if not exists cards_user_id_idx on public.cards(user_id);
create index if not exists cards_canonical_url_idx on public.cards(canonical_url);
create index if not exists cards_deleted_at_idx on public.cards(deleted_at);
create index if not exists cards_parse_status_idx on public.cards(parse_status);
-- Vector index (HNSW — better recall than IVFFlat for small-mid collections)
create index if not exists cards_embedding_idx
  on public.cards using hnsw (embedding vector_cosine_ops);

-- Full-text search (English tsvector; Chinese needs PGroonga)
alter table public.cards
  add column if not exists fts tsvector
  generated always as (
    to_tsvector('english',
      coalesce(title_original, '') || ' ' ||
      coalesce((title_i18n->>'en'), '') || ' ' ||
      coalesce(source_platform, '') || ' ' ||
      coalesce(note_markdown, '')
    )
  ) stored;
create index if not exists cards_fts_idx on public.cards using gin(fts);

-- ── Card ↔ Project join table ─────────────────────────────────────────────
create table if not exists public.card_projects (
  card_id     text references public.cards(id) on delete cascade,
  project_id  text references public.projects(id) on delete cascade,
  primary key (card_id, project_id)
);
alter table public.card_projects enable row level security;
create policy "Users manage their own card_projects"
  on public.card_projects for all
  using (exists (select 1 from public.cards where id = card_id and user_id = auth.uid()));

-- ── Card ↔ Tag join table ─────────────────────────────────────────────────
create table if not exists public.card_tags (
  card_id     text references public.cards(id) on delete cascade,
  tag_id      text references public.tags(id) on delete cascade,
  primary key (card_id, tag_id)
);
alter table public.card_tags enable row level security;
create policy "Users manage their own card_tags"
  on public.card_tags for all
  using (exists (select 1 from public.cards where id = card_id and user_id = auth.uid()));

-- ── Hybrid search function ────────────────────────────────────────────────
-- Returns cards ranked by RRF(FTS rank, vector cosine similarity)
create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int default 20,
  rrf_k int default 60
)
returns table (
  id text,
  title_original text,
  url text,
  source_platform text,
  parse_status text,
  rrf_score double precision
)
language plpgsql as $$
begin
  return query
  with fts_ranked as (
    select id, row_number() over (order by ts_rank(fts, plainto_tsquery('english', query_text)) desc) as rank
    from public.cards
    where fts @@ plainto_tsquery('english', query_text)
      and deleted_at is null
    limit 100
  ),
  vec_ranked as (
    select id, row_number() over (order by embedding <=> query_embedding) as rank
    from public.cards
    where deleted_at is null and embedding is not null
    limit 100
  ),
  rrf as (
    select
      coalesce(f.id, v.id) as id,
      coalesce(1.0 / (rrf_k + f.rank), 0) + coalesce(1.0 / (rrf_k + v.rank), 0) as score
    from fts_ranked f
    full outer join vec_ranked v on f.id = v.id
  )
  select c.id, c.title_original, c.url, c.source_platform, c.parse_status, r.score
  from rrf r
  join public.cards c on c.id = r.id
  order by r.score desc
  limit match_count;
end;
$$;
