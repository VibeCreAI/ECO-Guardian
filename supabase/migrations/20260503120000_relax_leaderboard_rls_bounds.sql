-- Relax leaderboard insert RLS bounds.
--
-- The original policy capped kills at 10k and damage at 10M, which silently
-- rejected late-stage runs (stage 10 boss attempts routinely exceed both).
-- The API-side validateScore already enforces sane upper bounds, so align
-- the RLS check with those caps and give carbon_saved headroom for the
-- cumulative lifetimeCarbon score that gets submitted.

drop policy if exists "Public insert" on leaderboard;

create policy "Public insert"
  on leaderboard for insert
  with check (
    length(name) > 0 and length(name) <= 10 and
    stage >= 1 and stage <= 100 and
    carbon_saved >= 0 and carbon_saved <= 10000000 and
    kills >= 0 and kills <= 1000000 and
    damage >= 0 and damage <= 1000000000
  );
