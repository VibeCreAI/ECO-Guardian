import { HEARTBEAT_INTERVAL_MS } from './config';
import { heartbeatMember, pruneStaleMembers } from './matchmaker';

let intervalHandle: number | null = null;
let activePlayerId: string | null = null;
let ticks = 0;

export const startHeartbeat = (playerId: string): void => {
  stopHeartbeat();
  activePlayerId = playerId;
  ticks = 0;
  heartbeatMember(playerId).catch(() => undefined);
  intervalHandle = window.setInterval(() => {
    if (!activePlayerId) return;
    ticks += 1;
    heartbeatMember(activePlayerId).catch(() => undefined);
    if (ticks % 6 === 0) {
      pruneStaleMembers().catch(() => undefined);
    }
  }, HEARTBEAT_INTERVAL_MS);
};

export const stopHeartbeat = (): void => {
  if (intervalHandle !== null) {
    window.clearInterval(intervalHandle);
    intervalHandle = null;
  }
  activePlayerId = null;
};
