-- Auto-matchmade co-op groups (Supabase Realtime + Postgres source of truth)

create extension if not exists pgcrypto;

create table if not exists public.mp_groups (
  id            uuid primary key default gen_random_uuid(),
  current_stage int not null,
  member_count  int not null default 0,
  created_at    timestamptz not null default now(),
  last_activity timestamptz not null default now()
);

create index if not exists mp_groups_open_idx
  on public.mp_groups (current_stage, created_at)
  where member_count < 4;

create table if not exists public.mp_members (
  group_id   uuid not null references public.mp_groups(id) on delete cascade,
  player_id  uuid not null,
  name       text not null,
  joined_at  timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (group_id, player_id)
);

create index if not exists mp_members_player_idx on public.mp_members (player_id);

alter table public.mp_groups  enable row level security;
alter table public.mp_members enable row level security;

-- Tables are mutated only through the SECURITY DEFINER functions below; no direct client policies needed.

create or replace function public.find_or_create_group(
  p_player_id uuid, p_name text, p_stage int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
begin
  select id into v_group
  from public.mp_groups
  where current_stage = p_stage and member_count < 4
  order by created_at asc
  for update skip locked
  limit 1;

  if v_group is null then
    insert into public.mp_groups(current_stage, member_count)
      values (p_stage, 1)
      returning id into v_group;
  else
    update public.mp_groups
      set member_count = member_count + 1,
          last_activity = now()
      where id = v_group;
  end if;

  insert into public.mp_members(group_id, player_id, name)
    values (v_group, p_player_id, p_name)
    on conflict (group_id, player_id) do update
      set last_seen = now(),
          name      = excluded.name;

  return v_group;
end;
$$;

create or replace function public.heartbeat_member(p_player_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mp_members
    set last_seen = now()
    where player_id = p_player_id;
end;
$$;

create or replace function public.leave_group(p_player_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
begin
  delete from public.mp_members
    where player_id = p_player_id
    returning group_id into v_group;

  if v_group is not null then
    update public.mp_groups
      set member_count = greatest(member_count - 1, 0),
          last_activity = now()
      where id = v_group;
    delete from public.mp_groups
      where id = v_group and member_count <= 0;
  end if;
end;
$$;

create or replace function public.advance_group_stage(p_group_id uuid, p_new_stage int) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mp_groups
    set current_stage = p_new_stage,
        last_activity = now()
    where id = p_group_id;
end;
$$;

create or replace function public.prune_stale_members() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.mp_members where last_seen < now() - interval '60 seconds';

  update public.mp_groups g
    set member_count = coalesce((
      select count(*) from public.mp_members m where m.group_id = g.id
    ), 0);

  delete from public.mp_groups
    where member_count <= 0
      and last_activity < now() - interval '60 seconds';
end;
$$;

grant execute on function public.find_or_create_group(uuid, text, int) to anon, authenticated;
grant execute on function public.heartbeat_member(uuid)                 to anon, authenticated;
grant execute on function public.leave_group(uuid)                      to anon, authenticated;
grant execute on function public.advance_group_stage(uuid, int)         to anon, authenticated;
grant execute on function public.prune_stale_members()                  to anon, authenticated;
