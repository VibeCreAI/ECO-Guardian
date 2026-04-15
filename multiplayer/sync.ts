import type { SlotIndex } from './config';

export type PlayerFacing = 'UP' | 'DOWN' | 'SIDE';
export type PeerScene = 'OVERWORLD' | 'BATTLE';

export interface PeerState {
  playerId: string;
  name: string;
  slotIndex: SlotIndex;
  joinedAt: number;
  x: number;
  z: number;
  facing: number;
  viewDirection: PlayerFacing;
  action: 'IDLE' | 'RUN';
  isDashing: boolean;
  scene: PeerScene;
  hp: number;
  maxHp: number;
  portalVote: string | null;
  lastSeen: number;
}

export interface PlayerStateMsg {
  type: 'player_state';
  playerId: string;
  x: number;
  z: number;
  facing: number;
  viewDirection: PlayerFacing;
  action: 'IDLE' | 'RUN';
  isDashing: boolean;
  scene: PeerScene;
  hp: number;
  maxHp: number;
  portalVote: string | null;
  t: number;
}

export interface AttackMsg {
  type: 'attack';
  playerId: string;
  weaponKey: string;
  originX: number;
  originZ: number;
  dirX: number;
  dirZ: number;
  seed: number;
  t: number;
}

export interface EnemySnapshotEntry {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp?: number;
  enemyType?: string;
  name?: string;
  visualVariant?: string;
  facing?: number;
}

export interface EnemySpawnMsg {
  type: 'enemy_spawn';
  id: string;
  enemyType: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  name?: string;
  visualVariant?: string;
  t: number;
}

export interface EnemySnapshotMsg {
  type: 'enemy_snapshot';
  enemies: EnemySnapshotEntry[];
  t: number;
}

export interface EnemyDeathMsg {
  type: 'enemy_death';
  id: string;
  killerPlayerId?: string;
  t: number;
}

export interface HitReportMsg {
  type: 'hit_report';
  enemyId: string;
  damage: number;
  byPlayerId: string;
  t: number;
}

export interface PickupClaimMsg {
  type: 'pickup_claim';
  orbId: string;
  byPlayerId: string;
  t: number;
}

export interface QuizShowMsg {
  type: 'quiz_show';
  questionId: string;
  t: number;
}

export interface QuizAnswerMsg {
  type: 'quiz_answer';
  questionId: string;
  optionKey: string;
  correct: boolean;
  byPlayerId: string;
  t: number;
}

export interface PortalVoteStateMsg {
  type: 'portal_vote_state';
  votes: Record<string, string[]>;
  required: number;
  livingCount: number;
  countdownPortalId: string | null;
  countdownEndsAt: number | null;
  t: number;
}

export interface BattleStartMsg {
  type: 'battle_start';
  portalId: string;
  t: number;
}

export interface StageAdvanceMsg {
  type: 'stage_advance';
  newStage: number;
  seed: number;
  t: number;
}

export interface StageAckMsg {
  type: 'stage_ack';
  playerId: string;
  newStage: number;
  t: number;
}

export interface PeerAnnounceMsg {
  type: 'peer_announce';
  playerId: string;
  name: string;
  joinedAt: number;
  t: number;
}

export type MultiplayerMessage =
  | PlayerStateMsg
  | AttackMsg
  | EnemySpawnMsg
  | EnemySnapshotMsg
  | EnemyDeathMsg
  | HitReportMsg
  | PickupClaimMsg
  | QuizShowMsg
  | QuizAnswerMsg
  | PortalVoteStateMsg
  | BattleStartMsg
  | StageAdvanceMsg
  | StageAckMsg
  | PeerAnnounceMsg;

export type MultiplayerEventName = MultiplayerMessage['type'];

export const MULTIPLAYER_EVENT_NAMES: readonly MultiplayerEventName[] = [
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
