create or replace function public.leave_group(p_player_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_groups uuid[];
begin
  -- Remove all memberships for this player and track touched groups.
  with deleted as (
    delete from public.mp_members
    where player_id = p_player_id
    returning group_id
  )
  select coalesce(array_agg(distinct group_id), '{}')
    into v_groups
  from deleted;

  if array_length(v_groups, 1) is null then
    return;
  end if;

  -- Recompute counts only for touched groups (safe-update friendly).
  update public.mp_groups g
    set member_count = (
      select count(*)::int
      from public.mp_members m
      where m.group_id = g.id
    ),
    last_activity = now()
    where g.id = any(v_groups);

  -- Remove emptied touched groups.
  delete from public.mp_groups g
    where g.id = any(v_groups)
      and not exists (
        select 1 from public.mp_members m where m.group_id = g.id
      );
end;
$$;