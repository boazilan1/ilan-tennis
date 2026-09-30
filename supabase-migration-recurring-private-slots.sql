-- Recurring private-lesson slots: fixed weekly slots (e.g. "every Wednesday
-- at 8:00 in Givat Ze'ev") that should always exist, auto-generated for a
-- rolling 14-day window instead of the admin re-creating them by hand.
create table recurring_private_slot_templates (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6), -- 0=Sunday .. 6=Saturday, matches extract(dow)
  time text not null,
  duration_minutes int not null default 45,
  price numeric not null,
  location_id uuid references locations(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recurring_private_slot_templates enable row level security;
create policy "Admin manages recurring templates" on recurring_private_slot_templates for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Links a generated slot back to the template that produced it, so the
-- generator can tell "already created" apart from "not due yet".
alter table private_slots add column template_id uuid references recurring_private_slot_templates(id) on delete set null;

create unique index private_slots_template_date_idx on private_slots (template_id, slot_date) where template_id is not null;

-- Tops up the next 14 days with any missing occurrences of active templates.
-- Idempotent: safe to call repeatedly (daily, via cron).
create or replace function ensure_recurring_private_slots()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template recurring_private_slot_templates;
  v_date date;
  v_day int;
begin
  for v_template in select * from recurring_private_slot_templates where active loop
    for v_day in 0..13 loop
      v_date := current_date + v_day;
      if extract(dow from v_date) = v_template.weekday then
        insert into private_slots (slot_date, time, duration_minutes, price, location_id, template_id, status)
        values (v_date, v_template.time, v_template.duration_minutes, v_template.price, v_template.location_id, v_template.id, 'open')
        on conflict (template_id, slot_date) where template_id is not null do nothing;
      end if;
    end loop;
  end loop;
end;
$$;

-- Wednesday 08:00 in Givat Ze'ev, Monday & Thursday 08:15 in Nokdim.
insert into recurring_private_slot_templates (weekday, time, duration_minutes, price, location_id) values
  (3, '08:00', 45, 200, '3249426d-5263-4121-a8b5-0655907478ac'),
  (1, '08:15', 45, 200, 'bb00d486-7d6e-40b7-8cec-238277415200'),
  (4, '08:15', 45, 200, 'bb00d486-7d6e-40b7-8cec-238277415200');

select ensure_recurring_private_slots();

-- Minimum booking notice: no new bookings within 3 hours of the slot's start.
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
