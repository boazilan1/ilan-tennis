-- פעילויות / חוגים
create table activities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  day_of_week text not null, -- 'sunday', 'monday', etc.
  time text not null,        -- '17:00'
  price numeric not null,
  max_students int,
  created_at timestamptz default now()
);

-- הרשמות לחוגים
create table enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  activity_id uuid references activities(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, activity_id)
);

-- נוכחות
create table attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  activity_id uuid references activities(id) on delete cascade,
  date date not null,
  present boolean default false,
  created_at timestamptz default now(),
  unique(user_id, activity_id, date)
);

-- פרופיל משתמש (שם, טלפון וכו')
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  role text default 'student', -- 'student' או 'admin'
  created_at timestamptz default now()
);

-- יצירת פרופיל אוטומטית בהרשמה
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS policies
alter table activities enable row level security;
alter table enrollments enable row level security;
alter table attendance enable row level security;
alter table profiles enable row level security;

-- כולם יכולים לראות פעילויות
create policy "Anyone can view activities" on activities for select using (true);

-- רק admin יכול לנהל פעילויות
create policy "Admin can manage activities" on activities for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- משתמש רואה רק את ההרשמות שלו
create policy "Users view own enrollments" on enrollments for select
  using (auth.uid() = user_id);

create policy "Users can enroll" on enrollments for insert
  with check (auth.uid() = user_id);

-- admin רואה הכל
create policy "Admin views all enrollments" on enrollments for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- נוכחות — admin בלבד
create policy "Admin manages attendance" on attendance for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- פרופיל — כל אחד רואה את שלו
create policy "Users view own profile" on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile" on profiles for update
  using (auth.uid() = id);

create policy "Admin views all profiles" on profiles for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
