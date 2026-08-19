-- Drawn (canvas) signature image, stored as a base64 PNG data URL,
-- alongside the existing typed-name signature_name.
alter table enrollments add column if not exists signature_data text;

-- Replacing the 3-arg version with a 4-arg one is a different overload in
-- Postgres, not a true replace — drop the old signature first.
drop function if exists upsert_registration(uuid, uuid, text);

create or replace function upsert_registration(
  p_player_id uuid,
  p_activity_id uuid,
  p_signature_name text,
  p_signature_data text default null
)
returns enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing enrollments;
  v_result enrollments;
begin
  if not exists (select 1 from players where id = p_player_id and user_id = auth.uid()) then
    raise exception 'NOT_OWNER';
  end if;

  select * into v_existing from enrollments
    where player_id = p_player_id and activity_id = p_activity_id;

  if v_existing.id is not null and v_existing.status = 'active' then
    raise exception 'ALREADY_ACTIVE';
  end if;

  if v_existing.id is not null then
    update enrollments
      set status = 'pending',
          terms_accepted_at = now(),
          signature_name = p_signature_name,
          signature_data = p_signature_data,
          payment_redirect_at = null
      where id = v_existing.id
      returning * into v_result;
  else
    insert into enrollments (user_id, player_id, activity_id, status, terms_accepted_at, signature_name, signature_data)
      values (auth.uid(), p_player_id, p_activity_id, 'pending', now(), p_signature_name, p_signature_data)
      returning * into v_result;
  end if;

  return v_result;
end;
$$;

grant execute on function upsert_registration(uuid, uuid, text, text) to authenticated;
