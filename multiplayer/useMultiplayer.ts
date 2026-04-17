import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { isMultiplayerAvailable } from './supabaseClient';
import {
  setMultiplayerCallbacks,
  handlePageHide,
} from './service';
import type { SlotIndex } from './config';
import { MAX_GROUP_SIZE } from './config';
import type { MultiplayerMessage } from './sync';
import type { PresenceEntry } from './roomClient';

const computeSlotIndex = (entries: PresenceEntry[], localPlayerId: string): SlotIndex => {
  const idx = entries.findIndex((e) => e.playerId === localPlayerId);
  if (idx < 0 || idx >= MAX_GROUP_SIZE) return 0;
  return idx as SlotIndex;
};

export const useMultiplayer = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return;
    if (!isMultiplayerAvailable()) return;

    setMultiplayerCallbacks({
      onPresence: (entries, localPlayerId) => {
        const state = useGameStore.getState();
        const actions = state.multiplayer;
        if (!actions) return;
        const sortedEntries = entries.slice().sort((a, b) => a.joinedAt - b.joinedAt);
        const localSlot = computeSlotIndex(sortedEntries, localPlayerId);
        const isHost = sortedEntries[0]?.playerId === localPlayerId;
        useGameStore.getState().applyPresenceUpdate?.(sortedEntries, localSlot, isHost);
      },
      onMessage: (msg: MultiplayerMessage) => {
        useGameStore.getState().applyMultiplayerMessage?.(msg);
      },
      onDisconnect: () => {
        useGameStore.getState().resetMultiplayerSession?.();
      },
    });

    const onPageHide = () => handlePageHide();
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    return () => {
      setMultiplayerCallbacks(null);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, [enabled]);
};
