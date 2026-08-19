-- Registration/payment notification emails need the registrant's email
-- address, which lives only in auth.users (not exposed to the client).
-- Denormalize it onto profiles, kept in sync by handle_new_user.
alter table profiles add column if not exists email text;

update profiles p set email = u.email
from auth.users u
where p.id = u.id and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into profiles (id, full_name, phone, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.email,
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
