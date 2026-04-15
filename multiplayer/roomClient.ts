import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { REALTIME_CHANNEL_PREFIX } from './config';
import type { MultiplayerMessage, MultiplayerEventName } from './sync';

export interface PresenceEntry {
  playerId: string;
  name: string;
  joinedAt: number;
}

export interface RoomHandle {
  channel: RealtimeChannel;
  groupId: string;
  localPlayerId: string;
  broadcast: (message: MultiplayerMessage) => void;
  leave: () => Promise<void>;
  getPresenceList: () => PresenceEntry[];
}

type MessageHandler = (msg: MultiplayerMessage) => void;
type PresenceHandler = (entries: PresenceEntry[]) => void;

export interface RoomSubscribeOptions {
  groupId: string;
  localPlayerId: string;
  name: string;
  joinedAt: number;
  onMessage: MessageHandler;
  onPresence: PresenceHandler;
}

export const subscribeToRoom = async (
  options: RoomSubscribeOptions
): Promise<RoomHandle | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  const channelName = `${REALTIME_CHANNEL_PREFIX}${options.groupId}`;
  const channel = client.channel(channelName, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: options.localPlayerId },
    },
  });

  const eventNames: MultiplayerEventName[] = [
    'player_state',
    'attack',
    'enemy_spawn',
    'enemy_snapshot',
    'enemy_death',
    'hit_report',
    'pickup_claim',
    'quiz_show',
    'quiz_answer',
    'portal_vote_state',
    'battle_start',
    'stage_advance',
    'stage_ack',
    'peer_announce',
  ];

  for (const event of eventNames) {
    channel.on('broadcast', { event }, (payload: { payload: MultiplayerMessage }) => {
      if (payload?.payload) options.onMessage(payload.payload);
    });
  }

  const emitPresence = () => {
    const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
    const entries: PresenceEntry[] = [];
    for (const [, metas] of Object.entries(state)) {
      const meta = metas?.[0];
      if (!meta) continue;
      const playerId = typeof meta.playerId === 'string' ? meta.playerId : null;
      const name = typeof meta.name === 'string' ? meta.name : 'Player';
      const joinedAt = typeof meta.joinedAt === 'number' ? meta.joinedAt : Date.now();
      if (playerId) entries.push({ playerId, name, joinedAt });
    }
    entries.sort((a, b) => a.joinedAt - b.joinedAt);
    options.onPresence(entries);
  };

  channel.on('presence', { event: 'sync' }, emitPresence);
  channel.on('presence', { event: 'join' }, emitPresence);
  channel.on('presence', { event: 'leave' }, emitPresence);

  await new Promise<void>((resolve) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          playerId: options.localPlayerId,
          name: options.name,
          joinedAt: options.joinedAt,
        });
        resolve();
      }
    });
  });

  const handle: RoomHandle = {
    channel,
    groupId: options.groupId,
    localPlayerId: options.localPlayerId,
    broadcast: (message: MultiplayerMessage) => {
      channel.send({ type: 'broadcast', event: message.type, payload: message });
    },
    leave: async () => {
      try {
        await channel.untrack();
      } catch {
        // best-effort
      }
      try {
        await client.removeChannel(channel);
      } catch {
        // best-effort
      }
    },
    getPresenceList: () => {
      const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
      const entries: PresenceEntry[] = [];
      for (const [, metas] of Object.entries(state)) {
        const meta = metas?.[0];
        if (!meta) continue;
        const playerId = typeof meta.playerId === 'string' ? meta.playerId : null;
        const name = typeof meta.name === 'string' ? meta.name : 'Player';
        const joinedAt = typeof meta.joinedAt === 'number' ? meta.joinedAt : Date.now();
        if (playerId) entries.push({ playerId, name, joinedAt });
      }
      entries.sort((a, b) => a.joinedAt - b.joinedAt);
      return entries;
    },
  };

  return handle;
};
