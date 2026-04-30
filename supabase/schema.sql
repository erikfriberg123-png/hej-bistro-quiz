-- ─────────────────────────────────────────────────
-- Hej Bistro Quiz — Supabase schema
-- Run this in the Supabase SQL editor
-- ─────────────────────────────────────────────────

-- 1. Profiles (one row per auth user)
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  username   text unique,
  created_at timestamptz not null default now()
);

-- 2. Scores (every game result)
create table public.scores (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  category_id text not null,
  score       integer not null,
  created_at  timestamptz not null default now()
);

-- 3. Leaderboard view (best score per user per category)
create view public.leaderboard as
select
  p.id                              as user_id,
  coalesce(p.username, 'Anonym')    as username,
  s.category_id,
  max(s.score)                      as best_score
from public.scores s
join public.profiles p on p.id = s.user_id
group by p.id, p.username, s.category_id;

-- 4. Row-level security
alter table public.profiles enable row level security;
alter table public.scores   enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Scores are publicly readable"
  on public.scores for select using (true);

create policy "Users can insert own scores"
  on public.scores for insert with check (auth.uid() = user_id);

-- 5. Auto-create profile when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Performance indexes
create index idx_scores_category_score on public.scores (category_id, score desc);
create index idx_scores_user_id        on public.scores (user_id);
