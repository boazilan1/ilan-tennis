create table if not exists admin_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_recurring boolean default false,
  day_of_week text,   -- לפעילות שבועית: 'sunday', 'monday' וכו'
  event_date date,    -- לפעילות חד-פעמית
  time text,
  status text default 'scheduled', -- scheduled | completed | cancelled
  notes text,
  created_at timestamptz default now()
);

alter table admin_events enable row level security;

create policy "Admin manages own events" on admin_events for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
