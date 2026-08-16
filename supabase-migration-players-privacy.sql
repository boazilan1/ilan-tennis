-- Fixes an overly-broad RLS policy that let anyone (including anonymous
-- visitors) read every player's full record — name, birth year, and
-- private notes — across all accounts.
--
-- The public tournament bracket page only ever needs id+name to label
-- matches, so that's exposed instead via a narrow view.

drop policy if exists "Public read players" on players;

create or replace view public_player_names as
  select id, name from players;

grant select on public_player_names to anon, authenticated;
