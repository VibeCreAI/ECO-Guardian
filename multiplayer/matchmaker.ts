import { getSupabaseClient } from './supabaseClient';

export interface GroupAssignment {
  groupId: string;
  stage: number;
}

export const findOrCreateGroup = async (
  playerId: string,
  name: string,
  stage: number
): Promise<GroupAssignment | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc('find_or_create_group', {
    p_player_id: playerId,
    p_name: name,
    p_stage: stage,
  });
  if (error) {
    console.warn('[multiplayer] find_or_create_group failed:', error.message);
    return null;
  }
  if (typeof data !== 'string') return null;
  return { groupId: data, stage };
};

export const leaveGroup = async (playerId: string): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc('leave_group', { p_player_id: playerId });
  if (error) console.warn('[multiplayer] leave_group failed:', error.message);
};

export const advanceGroupStage = async (groupId: string, newStage: number): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc('advance_group_stage', {
    p_group_id: groupId,
    p_new_stage: newStage,
  });
  if (error) console.warn('[multiplayer] advance_group_stage failed:', error.message);
};

export const lockGroup = async (groupId: string): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc('lock_group', { p_group_id: groupId });
  if (error) console.warn('[multiplayer] lock_group failed:', error.message);
};

export const pruneStaleMembers = async (): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc('prune_stale_members');
  if (error) console.warn('[multiplayer] prune_stale_members failed:', error.message);
};

export const heartbeatMember = async (playerId: string): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc('heartbeat_member', { p_player_id: playerId });
  if (error) console.warn('[multiplayer] heartbeat_member failed:', error.message);
};

export const sendLeaveBeacon = (playerId: string): void => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  try {
    const body = new Blob(
      [JSON.stringify({ p_player_id: playerId })],
      { type: 'application/json' }
    );
    const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/rpc/leave_group`;
    const beaconUrl = `${endpoint}?apikey=${encodeURIComponent(anonKey)}`;
    navigator.sendBeacon(beaconUrl, body);
  } catch (err) {
    console.warn('[multiplayer] sendLeaveBeacon failed:', err);
  }
};
