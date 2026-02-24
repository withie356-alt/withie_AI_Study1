create table if not exists public.leaderboard (
  id bigint generated always as identity primary key,
  player_name text not null,
  score integer not null default 0,
  level integer not null default 1,
  attempts integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard_select_all" on public.leaderboard;
create policy "leaderboard_select_all" on public.leaderboard for select using (true);

drop policy if exists "leaderboard_insert_all" on public.leaderboard;
create policy "leaderboard_insert_all" on public.leaderboard for insert with check (true);

drop policy if exists "leaderboard_update_all" on public.leaderboard;
create policy "leaderboard_update_all" on public.leaderboard for update using (true);
