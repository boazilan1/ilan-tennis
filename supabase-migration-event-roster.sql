create table if not exists admin_event_roster (
  event_id uuid references admin_events(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (event_id, player_id)
);
alter table admin_event_roster enable row level security;
create policy "Admin manages roster" on admin_event_roster for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
