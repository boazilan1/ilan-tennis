-- Ad-hoc, spontaneous private-lesson slots — separate from the fixed
-- weekly `activities` schedule so the admin can add/remove them freely.
create table private_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  time text not null,
  duration_minutes int not null default 45,
  price numeric not null,
  location_id uuid references locations(id) on delete set null,
  payment_link text,
  notes text,
  status text not null default 'open' check (status in ('open', 'booked', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table private_slots enable row level security;
create policy "Anyone can view private slots" on private_slots for select using (true);
create policy "Admin manages private slots" on private_slots for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- A prepaid balance of private-lesson sessions, bought once as a package.
create table lesson_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  session_count int not null,
  remaining_sessions int not null,
  price numeric not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'depleted', 'cancelled')),
  payment_redirect_at timestamptz,
  created_at timestamptz not null default now()
);

alter table lesson_packages enable row level security;
create policy "Users view own packages" on lesson_packages for select using (auth.uid() = user_id);
create policy "Users can purchase packages" on lesson_packages for insert with check (
  auth.uid() = user_id and exists (select 1 from players where players.id = player_id and players.user_id = auth.uid())
);
create policy "Admin manages packages" on lesson_packages for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Who's booked into a private slot, and how they're paying for it.
create table private_slot_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references private_slots(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  package_id uuid references lesson_packages(id) on delete set null,
  payment_method text not null check (payment_method in ('immediate', 'balance')),
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled')),
  signature_name text,
  signature_data text,
  terms_accepted_at timestamptz,
  payment_redirect_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slot_id, player_id)
);

alter table private_slot_bookings enable row level security;
create policy "Users view own bookings" on private_slot_bookings for select using (auth.uid() = user_id);
create policy "Admin manages bookings" on private_slot_bookings for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Books a player into an open private slot. Atomic: validates ownership and
-- slot availability, and if paying from a package balance, deducts a
-- session under `for update` so two simultaneous bookings can't both spend
-- the same last credit.
create or replace function book_private_slot(
  p_player_id uuid,
  p_slot_id uuid,
  p_payment_method text,
  p_signature_name text,
  p_signature_data text
)
returns private_slot_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot private_slots;
  v_package lesson_packages;
  v_existing private_slot_bookings;
  v_result private_slot_bookings;
  v_status text;
begin
  if not exists (select 1 from players where id = p_player_id and user_id = auth.uid()) then
    raise exception 'NOT_OWNER';
  end if;

  if p_payment_method not in ('immediate', 'balance') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  select * into v_slot from private_slots where id = p_slot_id for update;
  if v_slot.id is null or v_slot.status <> 'open' then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  select * into v_existing from private_slot_bookings where slot_id = p_slot_id and player_id = p_player_id;
  if v_existing.id is not null and v_existing.status <> 'cancelled' then
    raise exception 'ALREADY_BOOKED';
  end if;

  if p_payment_method = 'balance' then
    select * into v_package from lesson_packages
      where player_id = p_player_id and status = 'active' and remaining_sessions > 0
      order by created_at asc
      limit 1
      for update;
    if v_package.id is null then
      raise exception 'NO_BALANCE';
    end if;
    update lesson_packages
      set remaining_sessions = remaining_sessions - 1,
          status = case when remaining_sessions - 1 <= 0 then 'depleted' else status end
      where id = v_package.id;
    v_status := 'active';
  else
    v_status := 'pending';
  end if;

  if v_existing.id is not null then
    update private_slot_bookings
      set status = v_status,
          payment_method = p_payment_method,
          package_id = v_package.id,
          signature_name = p_signature_name,
          signature_data = p_signature_data,
          terms_accepted_at = now(),
          payment_redirect_at = null
      where id = v_existing.id
      returning * into v_result;
  else
    insert into private_slot_bookings
      (slot_id, player_id, user_id, package_id, payment_method, status, signature_name, signature_data, terms_accepted_at)
      values (p_slot_id, p_player_id, auth.uid(), v_package.id, p_payment_method, v_status, p_signature_name, p_signature_data, now())
      returning * into v_result;
  end if;

  update private_slots set status = 'booked' where id = p_slot_id;

  return v_result;
end;
$$;

grant execute on function book_private_slot(uuid, uuid, text, text, text) to authenticated;

create or replace function mark_slot_payment_redirect(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update private_slot_bookings
  set payment_redirect_at = now()
  where id = p_booking_id
    and user_id = auth.uid();
end;
$$;

grant execute on function mark_slot_payment_redirect(uuid) to authenticated;

create or replace function mark_package_payment_redirect(p_package_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update lesson_packages
  set payment_redirect_at = now()
  where id = p_package_id
    and user_id = auth.uid();
end;
$$;

grant execute on function mark_package_payment_redirect(uuid) to authenticated;

-- Default package pricing, editable later from Admin Settings.
insert into site_settings (key, value) values
  ('package_option1_sessions', '5'),
  ('package_option1_price', '600'),
  ('package_option2_sessions', '10'),
  ('package_option2_price', '1100'),
  ('package_payment_link', '')
on conflict (key) do nothing;
