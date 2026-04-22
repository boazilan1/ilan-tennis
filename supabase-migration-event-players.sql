-- שדה end_date לאירועים חוזרים (מחיקה מהיום והלאה)
alter table admin_events add column if not exists end_date date;

-- טבלת מתאמנים לאירועים אישיים
create table if not exists admin_event_players (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references admin_events(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  event_date date not null,
  present boolean default true,
  unique(event_id, player_id, event_date)
);

alter table admin_event_players enable row level security;
create policy "Admin manages event players" on admin_event_players for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
