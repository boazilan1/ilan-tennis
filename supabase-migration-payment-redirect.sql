-- Weak (client-asserted) signal that a registrant returned from the Morning
-- payment page. Not authoritative on its own — a real "paid" webhook comes
-- later — but gives the admin a quick hint on which pending enrollments to
-- check first, and lets the thank-you page confirm without needing a broad
-- UPDATE policy for users on enrollments.

alter table enrollments add column if not exists payment_redirect_at timestamptz;

create or replace function mark_payment_redirect(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update enrollments
  set payment_redirect_at = now()
  where id = p_enrollment_id
    and user_id = auth.uid();
end;
$$;

grant execute on function mark_payment_redirect(uuid) to authenticated;
