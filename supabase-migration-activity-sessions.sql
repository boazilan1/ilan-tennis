create table if not exists activity_sessions (
  activity_id uuid references activities(id) on delete cascade,
  session_date date not null,
  status text default 'scheduled',
  notes text,
  primary key (activity_id, session_date)
);
alter table activity_sessions enable row level security;
create policy "Admin manages activity sessions" on activity_sessions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
