-- enrollments.user_id pointed at auth.users, not profiles, so PostgREST
-- could not resolve the profiles embed used by the admin enrollments view
-- (profiles!enrollments_user_id_fkey) and the whole query silently failed,
-- always returning zero enrollments. profiles.id always equals
-- auth.users.id (enforced by profiles_id_fkey + the handle_new_user
-- trigger), so repointing the FK to profiles is safe.
alter table enrollments drop constraint enrollments_user_id_fkey;
alter table enrollments add constraint enrollments_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;
