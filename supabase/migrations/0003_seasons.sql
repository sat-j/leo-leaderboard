create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  reset_strategy text not null default 'hard_reset' check (reset_strategy in ('hard_reset', 'soft_reset')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_seasons_single_current
  on public.seasons (is_current)
  where is_current = true;

create table if not exists public.player_season_assignments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  level text not null check (level in ('PLUS', 'INT', 'ADV')),
  seed_mu numeric(8,3) not null,
  seed_sigma numeric(8,3) not null,
  seed_source text not null default 'level_baseline' check (seed_source in ('level_baseline', 'carryover', 'manual')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id)
);

alter table public.play_dates
  add column if not exists season_id uuid references public.seasons(id) on delete set null;

alter table public.matches
  add column if not exists season_id uuid references public.seasons(id) on delete set null;

alter table public.rating_snapshots
  add column if not exists season_id uuid references public.seasons(id) on delete cascade;

alter table public.player_date_stats
  add column if not exists season_id uuid references public.seasons(id) on delete cascade;

alter table public.player_narratives
  add column if not exists season_id uuid references public.seasons(id) on delete set null;

create index if not exists idx_play_dates_season_id_date on public.play_dates (season_id, play_date desc);
create index if not exists idx_matches_season_id_played_at on public.matches (season_id, played_at desc);
create index if not exists idx_rating_snapshots_season_id_play_date on public.rating_snapshots (season_id, play_date_id);
create index if not exists idx_player_date_stats_season_id_play_date on public.player_date_stats (season_id, play_date_id);
create index if not exists idx_player_narratives_season_id on public.player_narratives (season_id);
