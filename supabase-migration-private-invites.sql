-- The admin can invite someone to a private lesson himself: he types their
-- name, phone, date/time and price, and sends them a payment link by phone.
-- The invitee doesn't need an account, so a booking can now be for a "guest"
-- (name + phone) instead of a registered player.
alter table private_slot_bookings alter column player_id drop not null;
alter table private_slot_bookings alter column user_id drop not null;
alter table private_slot_bookings add column guest_name text;
alter table private_slot_bookings add column guest_phone text;
alter table private_slot_bookings add column guest_morning_client_id text;
alter table private_slot_bookings add constraint private_booking_has_person
  check ((player_id is not null and user_id is not null) or guest_name is not null);

-- What the public payment page (/pay/<booking id>) shows. The page is opened
-- from a link on the invitee's phone, so it can't rely on being logged in;
-- the booking id in the link is the (unguessable) key.
create or replace function get_invite_booking(p_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'status', b.status,
    'name', coalesce(b.guest_name, p.name),
    'slot_date', s.slot_date,
    'time', s.time,
    'duration_minutes', s.duration_minutes,
    'location', l.name,
    'price', coalesce(b.price, s.price)
  )
  from private_slot_bookings b
  join private_slots s on s.id = b.slot_id
  left join locations l on l.id = s.location_id
  left join players p on p.id = b.player_id
  where b.id = p_id and b.status <> 'cancelled'
$$;

grant execute on function get_invite_booking(uuid) to anon, authenticated;
