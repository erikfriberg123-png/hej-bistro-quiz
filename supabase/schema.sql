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

-- ─────────────────────────────────────────────────
-- CHALLENGE MODE — run this block separately if
-- the tables above already exist in your project
-- ─────────────────────────────────────────────────

-- 7. Challenges (async turn-based multiplayer)
create table public.challenges (
  id             uuid    default gen_random_uuid() primary key,
  code           text    unique not null,
  category_id    text    not null,
  question_ids   text[]  not null,
  creator_id     uuid    references public.profiles(id) not null,
  creator_name   text    not null default 'Anonym',
  creator_score  integer not null,
  opponent_id    uuid    references public.profiles(id),
  opponent_name  text,
  opponent_score integer,
  created_at     timestamptz not null default now()
);

alter table public.challenges enable row level security;

create policy "Challenges are publicly readable"
  on public.challenges for select using (true);

create policy "Users can create challenges"
  on public.challenges for insert with check (auth.uid() = creator_id);

create policy "Opponent can claim open challenge"
  on public.challenges for update using (
    opponent_id is null or auth.uid() = opponent_id
  );

create index idx_challenges_code       on public.challenges (code);
create index idx_challenges_open       on public.challenges (created_at)
  where opponent_id is null;

-- ─────────────────────────────────────────────────
-- REMOTE QUESTIONS — run this block separately
-- ─────────────────────────────────────────────────

-- 8. Add admin flag to profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 9. Remote questions (pushed live without a release)
create table public.remote_questions (
  id            text primary key,
  category_id   text    not null,
  question      text    not null,
  answers       text[]  not null,
  correct_index integer not null check (correct_index between 0 and 3),
  difficulty    text    not null default 'medium'
                        check (difficulty in ('easy','medium','hard')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.remote_questions enable row level security;

-- Regular users read only active questions
create policy "Active questions are publicly readable"
  on public.remote_questions for select
  using (
    active = true
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can insert questions"
  on public.remote_questions for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can update questions"
  on public.remote_questions for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can delete questions"
  on public.remote_questions for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create index idx_remote_questions_category on public.remote_questions (category_id)
  where active = true;

-- ─────────────────────────────────────────────────
-- Run this once while logged in to make yourself admin:
-- update public.profiles set is_admin = true where id = auth.uid();
-- ─────────────────────────────────────────────────
