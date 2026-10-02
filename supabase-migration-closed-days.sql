-- Lets the admin close an entire date (e.g. a school-vacation day): all
-- group-class sessions and private-lesson slots on that date are cancelled,
-- and the recurring-slot generator skips it going forward.
create table closed_days (
  date date primary key,
  reason text,
  created_at timestamptz not null default now()
);

alter table closed_days enable row level security;
create policy "Anyone can view closed days" on closed_days for select using (true);
create policy "Admin manages closed days" on closed_days for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

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
      if extract(dow from v_date) = v_template.weekday and not exists (select 1 from closed_days where date = v_date) then
        insert into private_slots (slot_date, time, duration_minutes, price, location_id, template_id, status)
        values (v_date, v_template.time, v_template.duration_minutes, v_template.price, v_template.location_id, v_template.id, 'open')
        on conflict (template_id, slot_date) where template_id is not null do nothing;
      end if;
    end loop;
  end loop;
end;
$$;
