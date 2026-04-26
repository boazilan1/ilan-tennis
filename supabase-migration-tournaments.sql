create table if not exists tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  start_date date,
  status text default 'draft', -- draft | groups | knockout | completed
  groups_count int default 2,
  advance_per_group int default 2,
  created_at timestamptz default now()
);

create table if not exists tournament_players (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  group_num int,
  group_points int default 0,
  advanced boolean default false,
  unique(tournament_id, player_id)
);

create table if not exists tournament_matches (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  phase text not null, -- group | knockout
  group_num int,
  round int, -- knockout: 1=final, 2=semi, 4=quarter, 8=eighth
  match_num int,
  player1_id uuid references players(id) on delete set null,
  player2_id uuid references players(id) on delete set null,
  score text,
  winner_id uuid references players(id) on delete set null,
  status text default 'pending', -- pending | completed
  created_at timestamptz default now()
);

alter table tournaments enable row level security;
alter table tournament_players enable row level security;
alter table tournament_matches enable row level security;

create policy "Public read tournaments" on tournaments for select using (true);
create policy "Admin all tournaments" on tournaments for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Public read tournament players" on tournament_players for select using (true);
create policy "Admin all tournament players" on tournament_players for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Public read tournament matches" on tournament_matches for select using (true);
create policy "Admin all tournament matches" on tournament_matches for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
