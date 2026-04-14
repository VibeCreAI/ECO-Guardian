-- Create leaderboard table
create table if not exists leaderboard (
  id           bigint generated always as identity primary key,
  name         text        not null,
  stage        integer     not null default 1,
  kills        integer     not null default 0,
  damage       bigint      not null default 0,
  carbon_saved integer     not null default 0,
  date         bigint      not null
);

-- Enable Row Level Security
alter table leaderboard enable row level security;

-- Allow anyone to read scores (public leaderboard)
create policy "Public read"
  on leaderboard for select
  using (true);

-- Allow anyone to insert a score (submit score)
create policy "Public insert"
  on leaderboard for insert
  with check (
    length(name) > 0 and length(name) <= 10 and
    stage >= 1 and stage <= 20 and
    carbon_saved >= 0 and carbon_saved <= 500000 and
    kills >= 0 and kills <= 10000 and
    damage >= 0 and damage <= 10000000
  );

-- No update or delete policies — scores are immutable once submitted

-- Index for fast leaderboard queries
create index if not exists leaderboard_carbon_saved_idx on leaderboard (carbon_saved desc);