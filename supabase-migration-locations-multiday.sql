-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)

-- Locations, managed from the admin panel
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table locations enable row level security;

drop policy if exists "public read locations" on locations;
create policy "public read locations" on locations for select using (true);

drop policy if exists "admin write locations" on locations;
create policy "admin write locations" on locations for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Activities: multiple days per class, and an optional location
alter table activities add column if not exists days_of_week text[];
alter table activities add column if not exists location_id uuid references locations(id);

-- Backfill days_of_week from the old single day_of_week column
update activities set days_of_week = array[day_of_week] where days_of_week is null and day_of_week is not null;

-- Seed the locations already referenced around the site (safe to edit/remove after, in the admin panel)
insert into locations (name, sort_order)
select v.name, v.sort_order from (values ('ציפורי', 1), ('גבעת זאב', 2), ('נוקדים', 3)) as v(name, sort_order)
where not exists (select 1 from locations l where l.name = v.name);
