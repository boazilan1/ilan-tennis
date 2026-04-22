-- מיגרציה: עדכון attendance לשימוש ב-player_id
alter table attendance add column if not exists player_id uuid references players(id) on delete cascade;

-- RLS: admin מנהל נוכחות
alter table attendance enable row level security;

drop policy if exists "Admin manages attendance" on attendance;
create policy "Admin manages attendance" on attendance for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
