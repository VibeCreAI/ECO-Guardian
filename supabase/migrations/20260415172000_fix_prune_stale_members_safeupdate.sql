create or replace function public.prune_stale_members() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.mp_members
    where last_seen < now() - interval '60 seconds';

  -- Safe-update friendly: explicit WHERE on UPDATE.
  update public.mp_groups g
    set member_count = coalesce((
      select count(*)::int from public.mp_members m where m.group_id = g.id
    ), 0),
    last_activity = now()
    where g.id in (select id from public.mp_groups);

  delete from public.mp_groups
    where member_count <= 0
      and last_activity < now() - interval '60 seconds';
end;
$$;