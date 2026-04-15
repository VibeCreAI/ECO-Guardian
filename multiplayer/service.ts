import { findOrCreateGroup, leaveGroup, advanceGroupStage, lockGroup, sendLeaveBeacon } from './matchmaker';
import { subscribeToRoom, RoomHandle, PresenceEntry } from './roomClient';
import { startHeartbeat, stopHeartbeat } from './heartbeat';
import { getOrCreateLocalPlayerId, isMultiplayerAvailable } from './supabaseClient';
import type { MultiplayerMessage } from './sync';

export interface ServiceCallbacks {
  onPresence: (entries: PresenceEntry[], localPlayerId: string) => void;
  onMessage: (msg: MultiplayerMessage) => void;
  onDisconnect: () => void;
}

interface ActiveSession {
  groupId: string;
  localPlayerId: string;
  joinedAt: number;
  handle: RoomHandle;
}

let active: ActiveSession | null = null;
let callbacks: ServiceCallbacks | null = null;
let connecting = false;

export const setMultiplayerCallbacks = (cb: ServiceCallbacks | null): void => {
  callbacks = cb;
};

export const isConnected = (): boolean => active !== null;

export const getLocalPlayerId = (): string => getOrCreateLocalPlayerId();

export const getActiveGroupId = (): string | null => active?.groupId ?? null;

export const connectMultiplayer = async (
  name: string,
  stage: number
): Promise<ActiveSession | null> => {
  if (!isMultiplayerAvailable()) return null;
  if (active || connecting) return active;
  connecting = true;
  try {
    const localPlayerId = getOrCreateLocalPlayerId();
    const assignment = await findOrCreateGroup(localPlayerId, name, stage);
    if (!assignment) {
      connecting = false;
      return null;
    }
    const joinedAt = Date.now();
    const handle = await subscribeToRoom({
      groupId: assignment.groupId,
      localPlayerId,
      name,
      joinedAt,
      onMessage: (msg) => callbacks?.onMessage(msg),
      onPresence: (entries) => callbacks?.onPresence(entries, localPlayerId),
    });
    if (!handle) {
      await leaveGroup(localPlayerId);
      connecting = false;
      return null;
    }
    active = { groupId: assignment.groupId, localPlayerId, joinedAt, handle };
    startHeartbeat(localPlayerId);
    return active;
  } finally {
    connecting = false;
  }
};

export const disconnectMultiplayer = async (): Promise<void> => {
  if (!active) return;
  const session = active;
  active = null;
  stopHeartbeat();
  try {
    await session.handle.leave();
  } catch {
    // best-effort
  }
  try {
    await leaveGroup(session.localPlayerId);
  } catch {
    // best-effort
  }
  callbacks?.onDisconnect();
};

export const broadcastMultiplayer = (msg: MultiplayerMessage): void => {
  if (!active) return;
  try {
    active.handle.broadcast(msg);
  } catch (err) {
    console.warn('[multiplayer] broadcast failed:', err);
  }
};

export const advanceGroupStageIfHost = async (newStage: number, isHost: boolean): Promise<void> => {
  if (!active || !isHost) return;
  await advanceGroupStage(active.groupId, newStage);
};

export const lockGroupIfHost = async (isHost: boolean): Promise<void> => {
  if (!active || !isHost) return;
  await lockGroup(active.groupId);
};

export const handlePageHide = (): void => {
  if (!active) return;
  sendLeaveBeacon(active.localPlayerId);
};
