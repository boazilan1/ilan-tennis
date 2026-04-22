-- מיגרציה: הוספת טבלת players ועדכון enrollments
-- יש להריץ את זה ב-Supabase SQL Editor

-- 1. טבלת שחקנים (הילד / האדם שמתאמן)
create table players (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  birth_year int not null,
  notes text,
  created_at timestamptz default now()
);

-- 2. RLS על players
alter table players enable row level security;

-- משתמש רואה ומנהל רק את השחקנים שלו
create policy "Users manage own players" on players for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- admin רואה הכל
create policy "Admin views all players" on players for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 3. עדכון טבלת enrollments — הוספת player_id
alter table enrollments add column player_id uuid references players(id) on delete cascade;

-- הסרת unique constraint הישן והוספת חדש
alter table enrollments drop constraint enrollments_user_id_activity_id_key;
alter table enrollments add constraint enrollments_player_id_activity_id_key unique (player_id, activity_id);

-- 4. עדכון RLS של enrollments — משתמש רואה הרשמות של השחקנים שלו
drop policy if exists "Users view own enrollments" on enrollments;
drop policy if exists "Users can enroll" on enrollments;

create policy "Users view own enrollments" on enrollments for select
  using (auth.uid() = user_id);

create policy "Users can enroll" on enrollments for insert
  with check (
    auth.uid() = user_id and
    exists (select 1 from players where id = player_id and user_id = auth.uid())
  );

create policy "Users can unenroll" on enrollments for delete
  using (auth.uid() = user_id);
