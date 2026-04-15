alter table public.mp_groups
  add column if not exists is_open boolean not null default true;

-- Normalize prior temporary stage-lock hack if present.
update public.mp_groups
set current_stage = current_stage - 1000,
    is_open = false
where current_stage >= 1000;

create index if not exists mp_groups_open_stage_idx
  on public.mp_groups (current_stage, created_at)
  where member_count < 4 and is_open = true;

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
  -- Ensure one active membership per player before assignment.
  perform public.leave_group(p_player_id);

  select id into v_group
  from public.mp_groups
  where current_stage = p_stage
    and member_count < 4
    and is_open = true
  order by created_at asc
  for update skip locked
  limit 1;

  if v_group is null then
    insert into public.mp_groups(current_stage, member_count, is_open)
      values (p_stage, 1, true)
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

create or replace function public.advance_group_stage(p_group_id uuid, p_new_stage int) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mp_groups
    set current_stage = p_new_stage,
        is_open = true,
        last_activity = now()
    where id = p_group_id;
end;
$$;

create or replace function public.lock_group(p_group_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mp_groups
    set is_open = false,
        last_activity = now()
    where id = p_group_id;
end;
$$;

grant execute on function public.lock_group(uuid) to anon, authenticated;