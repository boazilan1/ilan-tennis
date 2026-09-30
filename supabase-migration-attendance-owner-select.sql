-- Lets a user read attendance rows for their own players (attendance.user_id
-- isn't populated when the admin marks attendance, so ownership has to be
-- checked through the player instead).
create policy "Users view own player attendance" on attendance for select using (
  exists (select 1 from players where players.id = attendance.player_id and players.user_id = auth.uid())
);
