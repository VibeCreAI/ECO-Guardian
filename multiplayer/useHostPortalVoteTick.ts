import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { broadcastMultiplayer, lockGroupIfHost } from './service';
import { GameMode } from '../types';
import {
  tallyPortalVotes,
  updateCountdown,
  isCountdownExpired,
  getLocalPortalVote,
  type CountdownState,
} from './portalVote';

// 2 Hz tick that runs only on the host client while peers exist.
// Aggregates each peer's portalVote + the local player's portalVote,
// maintains a countdown, and broadcasts portal_vote_state / battle_start.
export const useHostPortalVoteTick = (): void => {
  const countdownRef = useRef<CountdownState>({ portalId: null, endsAt: null });
  const lockAppliedRef = useRef(false);
  const activeStage = useGameStore((s) => s.activeStage);

  useEffect(() => {
    lockAppliedRef.current = false;
  }, [activeStage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const state = useGameStore.getState();
      const { isHost, peers, localPlayerId, groupId } = state.multiplayer;
      if (!groupId || !isHost) {
        lockAppliedRef.current = false;
        countdownRef.current = { portalId: null, endsAt: null };
        return;
      }
      if (state.mode !== GameMode.OVERWORLD) {
        countdownRef.current = { portalId: null, endsAt: null };
        return;
      }
      const peerIds = Object.keys(peers);
      if (peerIds.length === 0) return;

      const memberVotes: Record<string, string | null> = {
        [localPlayerId]: getLocalPortalVote(),
      };
      for (const id of peerIds) {
        memberVotes[id] = peers[id].portalVote ?? null;
      }
      const livingIds = [localPlayerId, ...peerIds];
      const tally = tallyPortalVotes(memberVotes, livingIds);

      const now = Date.now();
      const next = updateCountdown(countdownRef.current, tally, now);
      countdownRef.current = next;

      broadcastMultiplayer({
        type: 'portal_vote_state',
        votes: tally.votes,
        required: tally.required,
        livingCount: tally.livingCount,
        countdownPortalId: next.portalId,
        countdownEndsAt: next.endsAt,
        t: now,
      });

      // Also apply locally since broadcasts have self:false
      useGameStore.getState().applyPortalVoteState?.(
        tally.votes,
        tally.required,
        tally.livingCount,
        next.portalId,
        next.endsAt
      );

      if (next.portalId && isCountdownExpired(next, now)) {
        const portal = useGameStore.getState().portals.find((p) => p.id === next.portalId);
        countdownRef.current = { portalId: null, endsAt: null };
        if (portal) {
          if (!lockAppliedRef.current) {
            // Lock this group once quiz combat starts so late joiners cannot enter mid-round.
            void lockGroupIfHost(true);
            lockAppliedRef.current = true;
          }
          broadcastMultiplayer({ type: 'battle_start', portalId: portal.id, t: now });
          useGameStore.getState().enterBattle(portal);
        }
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, []);
};
