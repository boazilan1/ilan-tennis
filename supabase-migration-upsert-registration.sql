-- Registering again for the same activity used to hard-fail on the
-- (player_id, activity_id) unique constraint even when the existing
-- enrollment was just an abandoned "pending" one (never paid) — there was
-- no way to retry. This RPC lets a retry reuse/refresh that pending row
-- instead of blocking, while still blocking a genuine duplicate of an
-- already-active enrollment.

create or replace function upsert_registration(
  p_player_id uuid,
  p_activity_id uuid,
  p_signature_name text
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
          payment_redirect_at = null
      where id = v_existing.id
      returning * into v_result;
  else
    insert into enrollments (user_id, player_id, activity_id, status, terms_accepted_at, signature_name)
      values (auth.uid(), p_player_id, p_activity_id, 'pending', now(), p_signature_name)
      returning * into v_result;
  end if;

  return v_result;
end;
$$;

grant execute on function upsert_registration(uuid, uuid, text) to authenticated;
