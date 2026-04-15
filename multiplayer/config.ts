export const MAX_GROUP_SIZE = 4;

export const POSITION_BROADCAST_HZ = 15;
export const POSITION_BROADCAST_INTERVAL_MS = 1000 / POSITION_BROADCAST_HZ;

export const ENEMY_BROADCAST_HZ = 10;
export const ENEMY_BROADCAST_INTERVAL_MS = 1000 / ENEMY_BROADCAST_HZ;

export const INTERP_BUFFER_MS = 120;

export const HEARTBEAT_INTERVAL_MS = 10_000;
export const STALE_TIMEOUT_MS = 30_000;

export const PORTAL_VOTE_PROXIMITY = 1.5;
export const PORTAL_VOTE_COUNTDOWN_MS = 2000;

export const PLAYER_SLOT_FILTERS: readonly string[] = [
  '',
  'hue-rotate(200deg) saturate(1.7) brightness(1.05)',  // blue
  'hue-rotate(130deg) saturate(1.7) brightness(1.08)',  // green-cyan
  'hue-rotate(60deg) saturate(1.1) brightness(1.1)',    // orange
];

export const REALTIME_CHANNEL_PREFIX = 'eco-group:';

export type SlotIndex = 0 | 1 | 2 | 3;
