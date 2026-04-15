create or replace function public.leave_group(p_player_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A player may have stale memberships in multiple groups; remove all safely.
  delete from public.mp_members
    where player_id = p_player_id;

  -- Recompute exact counts for all groups to avoid drift.
  update public.mp_groups g
    set member_count = (
      select count(*)::int
      from public.mp_members m
      where m.group_id = g.id
    ),
    last_activity = now();

  -- Remove empty groups.
  delete from public.mp_groups g
    where not exists (
      select 1 from public.mp_members m where m.group_id = g.id
    );
end;
$$;

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