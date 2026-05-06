-- ─────────────────────────────────────────────────
-- Hej Bistro Quiz — Supabase schema
-- Run this in the Supabase SQL editor on a fresh project
-- ─────────────────────────────────────────────────

-- 1. Profiles (one row per auth user)
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  username   text unique,
  is_admin   boolean not null default false,
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

-- 3. Friends (bidirectional, one row per direction)
create table public.friends (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  friend_id  uuid references public.profiles(id) on delete cascade not null,
  status     text not null default 'pending'
             check (status in ('pending', 'accepted')),
  created_at timestamptz,
  unique (user_id, friend_id)
);

-- 4. Challenges (async turn-based multiplayer)
create table public.challenges (
  id             uuid    default gen_random_uuid() primary key,
  code           text    unique not null,
  category_id    text    not null,
  question_ids   text[]  not null,
  creator_id     uuid    references public.profiles(id) not null,
  creator_name   text    not null default 'Anonym',
  creator_score  integer not null,
  target_user_id uuid    references public.profiles(id),
  opponent_id    uuid    references public.profiles(id),
  opponent_name  text,
  opponent_score integer,
  created_at     timestamptz not null default now()
);

-- 5. Remote questions (pushed live without a release)
create table public.remote_questions (
  id            text primary key,
  category_id   text    not null,
  question      text    not null,
  answers       text[]  not null,
  correct_index integer not null check (correct_index between 0 and 3),
  difficulty    text    not null default 'medium'
                        check (difficulty in ('easy', 'medium', 'hard')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 6. Leaderboard view (best score per user per category)
create or replace view public.leaderboard as
select
  p.id                              as user_id,
  coalesce(p.username, 'Anonym')    as username,
  s.category_id,
  max(s.score)                      as best_score
from public.scores s
join public.profiles p on p.id = s.user_id
group by p.id, p.username, s.category_id;

-- 7. Row-level security
alter table public.profiles        enable row level security;
alter table public.scores          enable row level security;
alter table public.friends         enable row level security;
alter table public.challenges      enable row level security;
alter table public.remote_questions enable row level security;

-- profiles
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- scores
create policy "Scores are publicly readable"
  on public.scores for select using (true);

create policy "Users can insert own scores"
  on public.scores for insert with check (auth.uid() = user_id);

-- friends
create policy "Users can see their own friend rows"
  on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can send friend requests"
  on public.friends for insert
  with check (auth.uid() = user_id);

create policy "Users can update requests directed at them"
  on public.friends for update
  using (auth.uid() = friend_id);

create policy "Users can remove their own friend rows"
  on public.friends for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- challenges
create policy "Challenges are publicly readable"
  on public.challenges for select using (true);

create policy "Users can create challenges"
  on public.challenges for insert with check (auth.uid() = creator_id);

create policy "Opponent can claim open challenge"
  on public.challenges for update using (
    opponent_id is null or auth.uid() = opponent_id
  );

-- remote_questions
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

-- 8. Auto-create profile when a new auth user signs up
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

-- 8b. Battles (multi-round async PvP)
create table public.battles (
  id              uuid    default gen_random_uuid() primary key,
  code            text    unique not null,
  creator_id      uuid    references public.profiles(id) not null,
  creator_name    text    not null default 'Anonym',
  opponent_id     uuid    references public.profiles(id),
  opponent_name   text,
  creator_turns   jsonb   not null default '[]',
  opponent_turns  jsonb   not null default '[]',
  status          text    not null default 'waiting_opponent'
                          check (status in ('waiting_opponent','creator_turn','opponent_turn','finished')),
  winner          text    check (winner in ('creator','opponent','draw')),
  created_at      timestamptz not null default now()
);

alter table public.battles enable row level security;

create policy "Battles are publicly readable"
  on public.battles for select using (true);

create policy "Users can create battles"
  on public.battles for insert with check (auth.uid() = creator_id);

create policy "Participants can update battles"
  on public.battles for update using (
    auth.uid() = creator_id or
    opponent_id is null or
    auth.uid() = opponent_id
  );

create index idx_battles_code       on public.battles (code);
create index idx_battles_creator    on public.battles (creator_id) where status <> 'finished';
create index idx_battles_opponent   on public.battles (opponent_id) where status <> 'finished';

-- 9. Performance indexes
create index idx_scores_category_score    on public.scores (category_id, score desc);
create index idx_scores_user_id           on public.scores (user_id);
create index idx_friends_friend_id        on public.friends (friend_id, status);
create index idx_challenges_code          on public.challenges (code);
create index idx_challenges_target        on public.challenges (target_user_id) where opponent_id is null;
create index idx_challenges_open          on public.challenges (created_at) where opponent_id is null;
create index idx_remote_questions_category on public.remote_questions (category_id) where active = true;

-- ─────────────────────────────────────────────────
-- To make yourself admin (run once while logged in):
-- update public.profiles set is_admin = true where id = auth.uid();
-- ─────────────────────────────────────────────────
