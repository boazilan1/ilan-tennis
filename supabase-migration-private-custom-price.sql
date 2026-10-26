-- Per-player price for private lessons, set by the admin (e.g. a friend or a
-- long-time student who pays less than the public rate). It is a flat price
-- per lesson: a single lesson costs it, and a package of N lessons costs
-- N * it. Players with no row here pay the regular slot / package prices.
create table player_private_prices (
  player_id uuid primary key references players(id) on delete cascade,
  price_per_lesson numeric not null check (price_per_lesson > 0),
  updated_at timestamptz not null default now()
);

alter table player_private_prices enable row level security;
create policy "Owner views own private price" on player_private_prices for select using (
  exists (select 1 from players where players.id = player_id and players.user_id = auth.uid())
);
create policy "Admin manages private prices" on player_private_prices for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- The price a booking is charged is fixed when it is made (so a later price
-- change doesn't alter a payment already in flight) and is decided here on
-- the server, never by the browser. Null for bookings paid from a package.
alter table private_slot_bookings add column price numeric;

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
  v_price numeric;
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

  if (v_slot.slot_date::timestamp + v_slot.time::time) at time zone 'Asia/Jerusalem' < now() + interval '3 hours' then
    raise exception 'TOO_LATE';
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
    v_price := null;
  else
    v_status := 'pending';
    select coalesce(
      (select price_per_lesson from player_private_prices where player_id = p_player_id),
      v_slot.price
    ) into v_price;
  end if;

  if v_existing.id is not null then
    update private_slot_bookings
      set status = v_status,
          payment_method = p_payment_method,
          package_id = v_package.id,
          price = v_price,
          signature_name = p_signature_name,
          signature_data = p_signature_data,
          terms_accepted_at = now(),
          payment_redirect_at = null
      where id = v_existing.id
      returning * into v_result;
  else
    insert into private_slot_bookings
      (slot_id, player_id, user_id, package_id, payment_method, status, price, signature_name, signature_data, terms_accepted_at)
      values (p_slot_id, p_player_id, auth.uid(), v_package.id, p_payment_method, v_status, v_price, p_signature_name, p_signature_data, now())
      returning * into v_result;
  end if;

  update private_slots set status = 'booked' where id = p_slot_id;

  return v_result;
end;
$$;

grant execute on function book_private_slot(uuid, uuid, text, text, text) to authenticated;

-- Packages used to be inserted straight from the browser with whatever price
-- it sent. Now the price is worked out here: the player's personal rate times
-- the number of lessons, or else the package price from the site settings.
create or replace function create_lesson_package(p_player_id uuid, p_sessions int)
returns lesson_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price numeric;
  v_custom numeric;
  v_result lesson_packages;
begin
  if not exists (select 1 from players where id = p_player_id and user_id = auth.uid()) then
    raise exception 'NOT_OWNER';
  end if;

  select case
    when (select value from site_settings where key = 'package_option1_sessions') = p_sessions::text
      then (select value from site_settings where key = 'package_option1_price')::numeric
    when (select value from site_settings where key = 'package_option2_sessions') = p_sessions::text
      then (select value from site_settings where key = 'package_option2_price')::numeric
  end into v_price;

  if v_price is null then
    raise exception 'INVALID_PACKAGE';
  end if;

  select price_per_lesson into v_custom from player_private_prices where player_id = p_player_id;
  if v_custom is not null then
    v_price := v_custom * p_sessions;
  end if;

  insert into lesson_packages (user_id, player_id, session_count, remaining_sessions, price, status)
    values (auth.uid(), p_player_id, p_sessions, p_sessions, v_price, 'pending')
    returning * into v_result;

  return v_result;
end;
$$;

grant execute on function create_lesson_package(uuid, int) to authenticated;

drop policy "Users can purchase packages" on lesson_packages;
