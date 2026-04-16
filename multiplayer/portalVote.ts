import { PORTAL_VOTE_COUNTDOWN_MS } from './config';

export const requiredVotes = (livingCount: number): number => Math.max(1, livingCount);

export interface PortalTally {
  votes: Record<string, string[]>;
  livingCount: number;
  required: number;
  passingPortalId: string | null;
}

export const tallyPortalVotes = (
  memberVotes: Record<string, string | null>,
  livingPlayerIds: string[]
): PortalTally => {
  const livingSet = new Set(livingPlayerIds);
  const votes: Record<string, string[]> = {};
  for (const [playerId, portalId] of Object.entries(memberVotes)) {
    if (!portalId) continue;
    if (!livingSet.has(playerId)) continue;
    (votes[portalId] ||= []).push(playerId);
  }

  const living = livingPlayerIds.length;
  const required = requiredVotes(Math.max(1, living));
  const totalVotes = Object.values(votes).reduce((sum, voters) => sum + voters.length, 0);
  let passingPortalId: string | null = null;
  let bestCount = 0;
  let tiedBest = false;

  for (const [portalId, voters] of Object.entries(votes)) {
    if (voters.length > bestCount) {
      bestCount = voters.length;
      passingPortalId = portalId;
      tiedBest = false;
    } else if (voters.length === bestCount) {
      tiedBest = true;
    }
  }

  if (totalVotes < required || tiedBest) {
    passingPortalId = null;
  }

  return { votes, livingCount: living, required, passingPortalId };
};

export interface CountdownState {
  portalId: string | null;
  endsAt: number | null;
}

export const updateCountdown = (
  previous: CountdownState,
  tally: PortalTally,
  now: number
): CountdownState => {
  if (!tally.passingPortalId) {
    return { portalId: null, endsAt: null };
  }
  if (previous.portalId === tally.passingPortalId && previous.endsAt !== null) {
    return previous;
  }
  return { portalId: tally.passingPortalId, endsAt: now + PORTAL_VOTE_COUNTDOWN_MS };
};

export const isCountdownExpired = (state: CountdownState, now: number): boolean =>
  state.portalId !== null && state.endsAt !== null && now >= state.endsAt;

// Module-level state for the local player's current portal vote.
// Written by Scene.tsx when the player stands on/off a portal; read by the host tick.
let localPortalVote: string | null = null;
export const setLocalPortalVote = (portalId: string | null): void => {
  localPortalVote = portalId;
};
export const getLocalPortalVote = (): string | null => localPortalVote;

export const guideMessageFor = (tally: PortalTally, countdown: CountdownState, now: number): string | null => {
  if (tally.livingCount <= 1) return null;
  if (countdown.portalId && countdown.endsAt !== null) {
    const remaining = Math.max(0, Math.ceil((countdown.endsAt - now) / 1000));
    return `Starting in ${remaining}...`;
  }
  const totalOnPortals = Object.values(tally.votes).reduce((acc, v) => acc + v.length, 0);
  if (totalOnPortals === 0) return null;
  if (totalOnPortals < tally.required) {
    return `All players must vote - ${totalOnPortals} of ${tally.required} ready`;
  }
  return 'Tie vote - move to break the tie';
};
