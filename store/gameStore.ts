import { create } from 'zustand';
import { GameMode, PlayerStats, UpgradeOption, Portal, ActiveBattleState, HighScore, ImpactLogEntry, QuizDifficulty, AdviceResult } from '../types';
import { useAiDirectorStore } from './aiDirectorStore';
import { WEAPONS_DATA, PASSIVES_DATA, EVOLUTION_RECIPES, getEvolutionHint, PassiveDef } from '../constants';
import type { EnemySnapshotEntry, PeerState, MultiplayerMessage } from '../multiplayer/sync';
import { MAX_GROUP_SIZE, type SlotIndex } from '../multiplayer/config';
import type { PresenceEntry } from '../multiplayer/roomClient';
import { getOrCreateLocalPlayerId } from '../multiplayer/supabaseClient';
import { advanceGroupStageIfHost, broadcastMultiplayer, connectMultiplayer, disconnectMultiplayer, getActiveGroupId } from '../multiplayer/service';

export const SHOP_REFRESH_COST = 50;
export const CAMERA_ZOOM_MIN = 0.5;
export const CAMERA_ZOOM_MAX = 2.0;
const SAVE_KEY = 'pixel_realm_save_v1';
const PENDING_SCORES_KEY = 'eco_pending_scores_v1';

const loadPendingScores = (): HighScore[] => {
  try {
    const saved = localStorage.getItem(PENDING_SCORES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) { return []; }
};

const savePendingScores = (scores: HighScore[]) => {
  try {
    localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(scores));
  } catch (e) { /* storage full — silently skip */ }
};

const removePendingScore = (score: HighScore) => {
  const pending = loadPendingScores().filter(
    s => !(s.name === score.name && s.date === score.date)
  );
  savePendingScores(pending);
};

const sortLeaderboardScores = (scores: HighScore[]) =>
  [...scores].sort((a, b) => b.carbonSaved - a.carbonSaved).slice(0, 50);

const getScoreDate = (score: HighScore) => {
  const value = Number(score.date);
  return Number.isFinite(value) ? value : 0;
};

const isSameScoreFingerprint = (a: HighScore, b: HighScore) =>
  a.name === b.name &&
  a.stage === b.stage &&
  a.kills === b.kills &&
  a.damage === b.damage &&
  a.carbonSaved === b.carbonSaved;

const findSubmittedScoreIndex = (scores: HighScore[], submitted: HighScore) => {
  const matches = scores
    .map((score, index) => ({ score, index }))
    .filter(({ score }) => isSameScoreFingerprint(score, submitted));

  if (matches.length === 0) return -1;
  if (matches.length === 1) return matches[0].index;

  const submittedDate = getScoreDate(submitted);
  return matches.reduce((best, current) => {
    const bestDelta = Math.abs(getScoreDate(best.score) - submittedDate);
    const currentDelta = Math.abs(getScoreDate(current.score) - submittedDate);
    return currentDelta < bestDelta ? current : best;
  }).index;
};

const clampCameraZoom = (value: number) =>
  Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, value));

interface GameState {
  mode: GameMode;
  previousMode: GameMode;
  lastGameplayMode: GameMode;
  playerStats: PlayerStats;
  worldPosition: { x: number; z: number };
  savedOverworldPosition: { x: number; z: number };
  
  activeStage: number;
  portals: Portal[];
  activeBattle: ActiveBattleState;
  battleWon: boolean;
  
  quizResult: { correct: boolean; explanation: string; answerLabel: string; bonus: boolean; carbonValue: number; streak: number; lostStreak: number } | null;
  
  bossStats: { currentHp: number; maxHp: number; name: string } | null;
  bossNarrativeOpen: boolean; 

  dashCooldownCurrent: number;
  levelUpOptions: UpgradeOption[];
  queuedLevelUp: boolean;
  shopOptions: UpgradeOption[]; 
  chestReward: UpgradeOption | null;
  highScores: HighScore[];
  dbStatus: 'connecting' | 'connected' | 'local' | 'offline';

  isQuizOpen: boolean;
  isImpactOpen: boolean; 
  isStageReady: boolean;
  isOverworldSceneReady: boolean;
  
  // Narrative State
  showNarrative: boolean;
  narrativeDismissed: boolean;

  highlightedPortalId: string | null; 

  adviceLoading: boolean;
  adviceResult: AdviceResult | null;
  
  isMuted: boolean; // New state for audio control
  cameraZoom: number;
  playMode: 'multiplayer' | 'solo';

  isPortalEntry: boolean;
  portalRefUrl: string | null;

  multiplayer: {
    localPlayerId: string;
    joinedAt: number | null;
    groupId: string | null;
    isHost: boolean;
    slotIndex: SlotIndex;
    peers: Record<string, PeerState>;
    enemyStates: Record<
      string,
      {
        id: string;
        x: number;
        z: number;
        hp: number;
        maxHp: number;
        enemyType: string;
        name?: string;
        visualVariant?: string;
        facing: number;
        lastSeen: number;
      }
    >;
    portalVotes: Record<string, { voters: string[]; required: number; countdownMs: number | null }>;
    guideMessage: string | null;
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
    livingCount: number;
    stageSync: {
      pendingStage: number | null;
      expectedPlayerIds: string[];
      ackedByPlayerId: Record<string, boolean>;
    };
  };

  joinMatchmaking: (stage: number) => Promise<void>;
  leaveMatchmaking: () => Promise<void>;
  applyPresenceUpdate: (entries: PresenceEntry[], localSlot: SlotIndex, isHost: boolean) => void;
  applyMultiplayerMessage: (msg: MultiplayerMessage) => void;
  applyPeerSnapshot: (id: string, state: Partial<PeerState>) => void;
  removePeer: (id: string) => void;
  promoteToHost: () => void;
  onGroupStageAdvance: (newStage: number) => void;
  setLocalPortalVote: (portalId: string | null) => void;
  applyPortalVoteState: (votes: Record<string, string[]>, required: number, livingCount: number, countdownPortalId: string | null, countdownEndsAt: number | null) => void;
  setGuideMessage: (msg: string | null) => void;
  setMultiplayerConnectionStatus: (status: 'idle' | 'connecting' | 'connected' | 'error') => void;
  setMultiplayerGroupId: (groupId: string | null) => void;
  resetMultiplayerSession: () => void;

  setMode: (mode: GameMode) => void;
  togglePause: () => void; 
  toggleMute: () => void; // New action
  setCameraZoom: (zoom: number | ((current: number) => number)) => void;
  setPlayMode: (mode: 'multiplayer' | 'solo') => void;
  setQuizOpen: (isOpen: boolean) => void;
  setImpactOpen: (isOpen: boolean) => void; 
  setOverworldSceneReady: (ready: boolean) => void;
  setShowNarrative: (show: boolean) => void;
  setNarrativeDismissed: (dismissed: boolean) => void;
  dismissBossNarrative: () => void;
  enterBattle: (portal: Portal) => void;
  enterShop: () => void;
  buyShopItem: (item: UpgradeOption, replaceKey?: string) => void;
  refreshShop: () => void; 
  updatePosition: (x: number, z: number) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  
  gainXp: (amount: number) => void;
  collectCo2Orb: (amount: number) => void;

  recordDamage: (amount: number) => void;
  recordKill: () => void;
  submitScore: (name: string) => Promise<{ score: HighScore; rank: number | null }>;
  fetchLeaderboard: () => Promise<void>; 
  checkDbStatus: () => Promise<void>;

  selectUpgrade: (option: UpgradeOption) => void;
  showQueuedLevelUp: () => void;
  askForUpgradeAdvice: () => void;
  rerollLevelUpOptions: () => void;
  
  openChest: () => void;
  claimChestReward: () => void;

  setDashCooldown: (time: number) => void;
  setBattleWon: (won: boolean) => void;
  
  setBossStats: (stats: { currentHp: number; maxHp: number; name: string } | null) => void;
  
  resetGame: () => void;
  
  completePortal: (portalId: string) => void;
  dismissQuizResult: () => void;
  completeStage: () => void;
  
  preloadGame: (difficulty: QuizDifficulty) => void;
  preloadGameFromPortal: (refUrl: string | null) => void;
  startGame: () => void;
  setHighlightedPortal: (id: string | null) => void;
}

const loadMetaStats = () => {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) { return null; }
};

const saveMetaStats = (stats: PlayerStats) => {
    const meta = {
        carbonSaved: stats.carbonSaved,
        lifetimeCarbon: stats.lifetimeCarbon,
        modifiers: stats.modifiers,
        maxWeaponSlots: stats.maxWeaponSlots,
        unlockedPassives: stats.unlockedPassives,
        impactHistory: stats.impactHistory,
        quizDifficulty: stats.quizDifficulty,
        rerollCount: stats.rerollCount,
        statUpgrades: stats.statUpgrades
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(meta));
};

const getInitialStats = (useSaved = true): PlayerStats => {
  const defaults: PlayerStats = {
      level: 1,
      xp: 0,
      xpToNextLevel: 300, 
      hp: 100,
      maxHp: 100,
      attackPower: 10,
      moveSpeed: 5,
      dashCooldownTime: 1.5,
      maxWeaponSlots: 4, 
      unlockedWeapons: { 'MAGIC_MISSILE': 1 },
      unlockedPassives: {},
      modifiers: {
        projectileCount: 0,
        damage: 1.0,
        area: 1.0,
        cooldown: 1.0,
        knockback: 1.0,
      },
      enemiesKilled: 0,
      totalDamage: 0,
      lastDamageTime: 0,
      correctAnswers: 0,
      quizStreak: 0,
      carbonSaved: 0,
      lifetimeCarbon: 0,
      impactHistory: [],
      quizDifficulty: 'MEDIUM',
      rerollCount: 0,
      statUpgrades: { hp: 0, attack: 0, speed: 0 }
  };

  if (useSaved) {
      const saved = loadMetaStats();
      if (saved) {
          let history = saved.impactHistory || [];
          if (!history.length && saved.quizHistory && Array.isArray(saved.quizHistory)) {
              history = saved.quizHistory.map((q: any) => ({
                  id: Math.random().toString(),
                  type: 'QUIZ',
                  stage: q.stage,
                  timestamp: q.timestamp || Date.now(),
                  carbonValue: q.carbonValue,
                  question: q.question,
                  yourAnswer: q.yourAnswer,
                  correctAnswer: q.correctAnswer,
                  isCorrect: q.isCorrect
              }));
          }

          const mergedModifiers = { ...defaults.modifiers, ...(saved.modifiers || {}) };

          return {
              ...defaults,
              carbonSaved: saved.carbonSaved ?? 0,
              lifetimeCarbon: saved.lifetimeCarbon ?? (saved.carbonSaved ?? 0),
              modifiers: mergedModifiers,
              maxWeaponSlots: saved.maxWeaponSlots ?? defaults.maxWeaponSlots,
              unlockedPassives: saved.unlockedPassives ?? defaults.unlockedPassives,
              impactHistory: history,
              quizDifficulty: saved.quizDifficulty || 'MEDIUM',
              rerollCount: saved.rerollCount || 0,
              statUpgrades: saved.statUpgrades || { hp: 0, attack: 0, speed: 0 }
          };
      }
  }
  
  return defaults;
};

const generatePortals = (stage: number): Portal[] => {
  const baseLevel = (stage - 1) * 5;
  // Two YES/NO portals south of the landmark (landmark is at x:0, z:-10, south = higher z)
  const quizPortals: Portal[] = [
      { id: `p_A`, x: -7, z: 6, level: baseLevel + 1, type: 'NORMAL', quizOption: 'A', colorOverride: '#22c55e' }, // YES = green
      { id: `p_B`, x:  7, z: 6, level: baseLevel + 1, type: 'NORMAL', quizOption: 'B', colorOverride: '#ef4444' }, // NO  = red
  ];
  return quizPortals;
};

const generateShopOptions = (stats: PlayerStats): UpgradeOption[] => {
    const pool: UpgradeOption[] = [];
    
    const hpCount = stats.statUpgrades?.hp || 0;
    const atkCount = stats.statUpgrades?.attack || 0;
    const spdCount = stats.statUpgrades?.speed || 0;

    pool.push({
        id: `shop_stat_hp_${Date.now()}`,
        type: 'STAT',
        key: 'HP',
        label: 'Max HP Boost',
        description: `+50 Max HP & Full Heal (Lv.${hpCount + 1})`,
        icon: '❤️',
        value: 50,
        cost: 300 + (hpCount * 150)
    });

    pool.push({
        id: `shop_stat_atk_${Date.now()}`,
        type: 'STAT',
        key: 'ATTACK',
        label: 'Attack Boost',
        description: `+5 Base Damage (Lv.${atkCount + 1})`,
        icon: '⚔️',
        value: 5,
        cost: 450 + (atkCount * 250)
    });

    pool.push({
        id: `shop_stat_spd_${Date.now()}`,
        type: 'STAT',
        key: 'SPEED',
        label: 'Agility Boost',
        description: `+Speed & -Dash Cooldown (Lv.${spdCount + 1})`,
        icon: '⚡',
        value: 0.5,
        cost: 400 + (spdCount * 200)
    });
    
    Object.values(PASSIVES_DATA).forEach(p => {
        const currentLvl = stats.unlockedPassives[p.key] || 0;
        
        if (p.key === 'BACKPACK' && currentLvl >= 1) return;

        pool.push({
            id: `shop_passive_${p.key}`,
            type: 'PASSIVE',
            key: p.key,
            label: p.label,
            description: p.description,
            icon: p.icon,
            value: p.value,
            cost: 400 + (currentLvl * 200) 
        });
    });

    const w = stats.unlockedWeapons;
    Object.values(WEAPONS_DATA).forEach(wd => {
        const lvl = w[wd.key] || 0;
        
        if (wd.isEvolution && lvl > 0) {
             pool.push({
                id: `shop_evo_${wd.key}`,
                type: 'WEAPON',
                key: wd.key,
                label: `Upgrade ${wd.label}`,
                description: `+Damage (Current: Lv.${lvl})`,
                icon: wd.icon,
                isNewWeapon: false,
                isEvolution: true,
                cost: 800 + (lvl * 400) 
            });
            return;
        }

        if (!wd.isEvolution) {
            if (lvl === 0) {
                pool.push({
                    id: `shop_unlock_${wd.key}`,
                    type: 'WEAPON',
                    key: wd.key,
                    label: `Unlock ${wd.label}`,
                    description: wd.description,
                    icon: wd.icon,
                    isNewWeapon: true,
                    evolutionHint: getEvolutionHint(wd.key),
                    cost: 500
                });
            } else {
                pool.push({
                    id: `shop_up_${wd.key}`,
                    type: 'WEAPON',
                    key: wd.key,
                    label: `Upgrade ${wd.label}`,
                    description: `To Lv.${lvl + 1}`,
                    icon: wd.icon,
                    isNewWeapon: false,
                    evolutionHint: getEvolutionHint(wd.key),
                    cost: 300 + (lvl * 150)
                });
            }
        }
    });

    return pool.sort(() => 0.5 - Math.random()).slice(0, 6);
};

const getPassiveUpgradeDescription = (passive: PassiveDef, currentLevel: number) => {
  const nextLevel = currentLevel + 1;

  switch (passive.key) {
    case 'DUPLICATOR':
      return currentLevel === 0
        ? passive.description
        : `+1 Projectile to all weapons. Lv.${nextLevel} total: +${nextLevel} projectiles.`;
    case 'SPINACH':
      return currentLevel === 0
        ? passive.description
        : `+15% Damage Multiplier. Lv.${nextLevel} total: +${Math.round(nextLevel * 15)}% damage.`;
    case 'TOME':
      return currentLevel === 0
        ? passive.description
        : `-10% Cooldown Reduction. Lv.${nextLevel} total: -${Math.round(nextLevel * 10)}% cooldown.`;
    case 'CANDLE':
      return currentLevel === 0
        ? passive.description
        : `+20% Area of Effect. Lv.${nextLevel} total: +${Math.round(nextLevel * 20)}% area.`;
    case 'BACKPACK':
      return passive.description;
    case 'GAUNTLET':
      return currentLevel === 0
        ? passive.description
        : `+20% Knockback Force. Lv.${nextLevel} total: +${Math.round(nextLevel * 20)}% knockback.`;
    default:
      return passive.description;
  }
};

const generateOptions = (stats: PlayerStats): UpgradeOption[] => {
  const pool: UpgradeOption[] = [
    { id: 'hp', type: 'STAT', key: 'HP', label: 'Max HP Up', description: '+50 Max HP & Full Heal', icon: '❤️', value: 50 },
    { id: 'atk', type: 'STAT', key: 'ATTACK', label: 'Attack Up', description: '+5 Base Damage', icon: '⚔️', value: 5 },
    { id: 'spd', type: 'STAT', key: 'SPEED', label: 'Agility Up', description: '+Speed & -Dash Cooldown', icon: '⚡', value: 0.5 },
  ];

  const w = stats.unlockedWeapons;

  EVOLUTION_RECIPES.forEach(recipe => {
      const ing1 = recipe.ingredients[0];
      const ing2 = recipe.ingredients[1];
      const result = recipe.result;
      const resultDef = WEAPONS_DATA[result];

      if ((w[ing1]||0) >= 1 && (w[ing2]||0) >= 1 && !w[result]) {
          pool.push({
              id: `merge_${result.toLowerCase()}`,
              type: 'WEAPON',
              key: result,
              label: `EVO: ${resultDef.label}`,
              description: resultDef.description,
              icon: resultDef.icon,
              isNewWeapon: true,
              isEvolution: true
          });
      }
  });

  const weaponCount = Object.keys(stats.unlockedWeapons).length;
  const isSlotsFull = weaponCount >= stats.maxWeaponSlots;

  Object.values(PASSIVES_DATA).forEach(pData => {
      const currentLevel = stats.unlockedPassives[pData.key] || 0;
      if (pData.key === 'BACKPACK' && currentLevel >= 1) return;

      if (currentLevel < 5) {
          pool.push({
              id: `passive_${pData.key}`,
              type: 'PASSIVE',
              key: pData.key,
              label: pData.label,
              description: getPassiveUpgradeDescription(pData, currentLevel),
              icon: pData.icon,
              value: pData.value
          });
      }
  });

  Object.values(WEAPONS_DATA).forEach(wData => {
    if (wData.isEvolution) {
        const currentLvl = stats.unlockedWeapons[wData.key] || 0;
        if (currentLvl > 0 && currentLvl < 5) {
             pool.push({
                id: `upgrade_${wData.key}`,
                type: 'WEAPON',
                key: wData.key,
                label: `${wData.label} Lv.${currentLvl + 1}`,
                description: `Upgrade: Damage & Effect Up`,
                icon: wData.icon,
                isNewWeapon: false,
                isEvolution: true
            });
        }
        return;
    }

    const currentLevel = stats.unlockedWeapons[wData.key] || 0;
    
    if (currentLevel === 0) {
      if (!isSlotsFull) {
        pool.push({
          id: `unlock_${wData.key}`,
          type: 'WEAPON',
          key: wData.key,
          label: `Unlock ${wData.label}`,
          description: `New Weapon! ${wData.description}`,
          icon: wData.icon,
          isNewWeapon: true,
          evolutionHint: getEvolutionHint(wData.key)
        });
      }
    } else if (currentLevel < 5) {
      pool.push({
        id: `upgrade_${wData.key}`,
        type: 'WEAPON',
        key: wData.key,
        label: `${wData.label} Lv.${currentLevel + 1}`,
        description: `Upgrade: Damage & Effect Up`,
        icon: wData.icon,
        isNewWeapon: false,
        evolutionHint: getEvolutionHint(wData.key)
      });
    }
  });
  
  const evolutionOption = pool.find(o => o.isEvolution);
  const otherOptions = pool.filter(o => !o.isEvolution);
  const shuffledOthers = otherOptions.sort(() => 0.5 - Math.random());
  
  let finalOptions = [];
  if (evolutionOption) {
      finalOptions = [evolutionOption, ...shuffledOthers].slice(0, 3);
  } else {
      finalOptions = shuffledOthers.slice(0, 3);
  }

  return finalOptions;
};

export const useGameStore = create<GameState>((set, get) => ({
  mode: GameMode.MENU,
  previousMode: GameMode.MENU,
  lastGameplayMode: GameMode.OVERWORLD,
  playerStats: getInitialStats(true),
  worldPosition: { x: 0, z: 0 },
  savedOverworldPosition: { x: 0, z: 0 },
  
  activeStage: 1,
  portals: generatePortals(1),
  
  activeBattle: { portalId: '', level: 1, isBoss: false, isBonus: false, lostStreak: 0 },
  battleWon: false,
  bossStats: null,
  bossNarrativeOpen: false, 
  quizResult: null,
  
  dashCooldownCurrent: 0,
  levelUpOptions: [],
  queuedLevelUp: false,
  shopOptions: [],
  chestReward: null,
  highScores: [], 
  dbStatus: 'connecting',

  isQuizOpen: false,
  isImpactOpen: false,
  isStageReady: false,
  isOverworldSceneReady: false,
  highlightedPortalId: null,

  showNarrative: false,
  narrativeDismissed: false,

  adviceLoading: false,
  adviceResult: null,
  
  isMuted: false,
  cameraZoom: 1.0,
  playMode: 'multiplayer',

  isPortalEntry: false,
  portalRefUrl: null,

  multiplayer: {
    localPlayerId: getOrCreateLocalPlayerId(),
    joinedAt: null,
    groupId: null,
    isHost: true,
    slotIndex: 0,
    peers: {},
    enemyStates: {},
    portalVotes: {},
    guideMessage: null,
    connectionStatus: 'idle',
    livingCount: 1,
    stageSync: { pendingStage: null, expectedPlayerIds: [], ackedByPlayerId: {} },
  },

  joinMatchmaking: async (stage) => {
    const state = get();
    set((s) => ({ multiplayer: { ...s.multiplayer, connectionStatus: 'connecting' } }));
    try {
      const name = `Player-${state.multiplayer.localPlayerId.slice(0, 4)}`;
      const session = await connectMultiplayer(name, stage);
      if (session) {
        set((s) => ({
          multiplayer: {
            ...s.multiplayer,
            joinedAt: session.joinedAt,
            groupId: getActiveGroupId(),
            connectionStatus: 'connected',
          },
        }));
      } else {
        set((s) => ({ multiplayer: { ...s.multiplayer, connectionStatus: 'idle' } }));
      }
    } catch (err) {
      console.warn('[gameStore] joinMatchmaking failed', err);
      set((s) => ({ multiplayer: { ...s.multiplayer, connectionStatus: 'error' } }));
    }
  },

  leaveMatchmaking: async () => {
    try {
      await disconnectMultiplayer();
    } catch (err) {
      console.warn('[gameStore] leaveMatchmaking failed', err);
    }
    get().resetMultiplayerSession();
  },

  applyPresenceUpdate: (entries, localSlot, isHost) => {
    set((state) => {
      const localId = state.multiplayer.localPlayerId;
      const nextPeers: Record<string, PeerState> = {};
      const assignedSlotsByPlayerId = new Map<string, SlotIndex>();

      // New joiners may first see only themselves (localSlot=0) before full presence sync arrives.
      // Allow one-way promotion from default slot 0 -> actual non-zero slot, but never demote.
      const shouldPromoteFromDefault =
        state.multiplayer.slotIndex === 0 && localSlot !== 0;
      const initialLocalSlot = (shouldPromoteFromDefault
        ? localSlot
        : state.multiplayer.slotIndex) as SlotIndex;

      assignedSlotsByPlayerId.set(localId, initialLocalSlot);
      Object.values(state.multiplayer.peers).forEach((peer) => {
        assignedSlotsByPlayerId.set(peer.playerId, peer.slotIndex);
      });

      const usedSlots = new Set<SlotIndex>();
      entries.forEach((entry) => {
        const existingSlot = assignedSlotsByPlayerId.get(entry.playerId);
        if (existingSlot !== undefined) usedSlots.add(existingSlot);
      });

      const nextFreeSlot = (): SlotIndex => {
        for (let i = 0; i < MAX_GROUP_SIZE; i++) {
          const slot = i as SlotIndex;
          if (!usedSlots.has(slot)) {
            usedSlots.add(slot);
            return slot;
          }
        }
        return 0;
      };

      let computedLocalSlot: SlotIndex = initialLocalSlot;
      entries.forEach((entry, idx) => {
        const existing = state.multiplayer.peers[entry.playerId];
        const slot = assignedSlotsByPlayerId.get(entry.playerId) ?? nextFreeSlot();
        if (entry.playerId === localId) {
          computedLocalSlot = slot;
          return;
        }
        nextPeers[entry.playerId] = existing
          ? { ...existing, name: entry.name, slotIndex: slot, joinedAt: entry.joinedAt }
          : {
              playerId: entry.playerId,
              name: entry.name,
              slotIndex: slot,
              joinedAt: entry.joinedAt,
              x: 0,
              z: 0,
              facing: 1,
              viewDirection: 'DOWN',
              action: 'IDLE',
              isDashing: false,
              scene: 'OVERWORLD',
              hp: 100,
              maxHp: 100,
              portalVote: null,
              lastSeen: Date.now(),
            };
      });
      const livingCount = Math.max(1, entries.length);
      return {
        multiplayer: {
          ...state.multiplayer,
          peers: nextPeers,
          slotIndex: computedLocalSlot,
          isHost,
          livingCount,
        },
      };
    });
  },

  applyMultiplayerMessage: (msg) => {
    const state = get();
    switch (msg.type) {
      case 'player_state': {
        if (msg.playerId === state.multiplayer.localPlayerId) return;
        get().applyPeerSnapshot(msg.playerId, {
          x: msg.x,
          z: msg.z,
          facing: msg.facing,
          viewDirection: msg.viewDirection,
          action: msg.action,
          isDashing: msg.isDashing,
          scene: msg.scene ?? 'OVERWORLD',
          hp: msg.hp,
          maxHp: msg.maxHp,
          portalVote: msg.portalVote,
          lastSeen: Date.now(),
        });
        return;
      }
      case 'portal_vote_state': {
        get().applyPortalVoteState(
          msg.votes,
          msg.required,
          msg.livingCount,
          msg.countdownPortalId,
          msg.countdownEndsAt
        );
        return;
      }
      case 'enemy_snapshot': {
        const now = Date.now();
        const nextEnemies: Record<string, GameState['multiplayer']['enemyStates'][string]> = {};
        for (const entry of msg.enemies as EnemySnapshotEntry[]) {
          const existing = state.multiplayer.enemyStates[entry.id];
          nextEnemies[entry.id] = {
            id: entry.id,
            x: entry.x,
            z: entry.z,
            hp: entry.hp,
            maxHp: entry.maxHp ?? existing?.maxHp ?? 100,
            enemyType: entry.enemyType ?? existing?.enemyType ?? 'UNKNOWN',
            name: entry.name ?? existing?.name,
            visualVariant: entry.visualVariant ?? existing?.visualVariant,
            facing: entry.facing ?? existing?.facing ?? 1,
            lastSeen: now,
          };
        }
        set((s) => ({
          multiplayer: {
            ...s.multiplayer,
            enemyStates: nextEnemies,
          },
        }));
        return;
      }
      case 'enemy_death': {
        set((s) => {
          if (!s.multiplayer.enemyStates[msg.id]) return {};
          const { [msg.id]: _removed, ...rest } = s.multiplayer.enemyStates;
          return { multiplayer: { ...s.multiplayer, enemyStates: rest } };
        });
        return;
      }
      case 'battle_start': {
        set((s) => ({ multiplayer: { ...s.multiplayer, enemyStates: {} } }));
        const portal = state.portals.find((p) => p.id === msg.portalId);
        if (portal) {
          get().enterBattle(portal);
        }
        return;
      }
      case 'stage_advance': {
        get().onGroupStageAdvance(msg.newStage);
        const local = get().multiplayer.localPlayerId;
        broadcastMultiplayer({ type: 'stage_ack', playerId: local, newStage: msg.newStage, t: Date.now() });
        return;
      }
      case 'stage_ack': {
        if (!state.multiplayer.isHost) return;
        const sync = state.multiplayer.stageSync;
        if (sync.pendingStage == null || msg.newStage !== sync.pendingStage) return;
        if (!sync.expectedPlayerIds.includes(msg.playerId)) return;
        const ackedByPlayerId = { ...sync.ackedByPlayerId, [msg.playerId]: true };
        const allAcked = sync.expectedPlayerIds.every((id) => ackedByPlayerId[id]);
        set((s) => ({
          multiplayer: {
            ...s.multiplayer,
            stageSync: {
              ...s.multiplayer.stageSync,
              ackedByPlayerId,
            },
          },
        }));
        if (allAcked) {
          void advanceGroupStageIfHost(sync.pendingStage, true);
          set((s) => ({
            multiplayer: {
              ...s.multiplayer,
              stageSync: { pendingStage: null, expectedPlayerIds: [], ackedByPlayerId: {} },
            },
          }));
        }
        return;
      }
      default:
        return;
    }
  },

  applyPeerSnapshot: (id, partial) => {
    set((state) => {
      const existing = state.multiplayer.peers[id];
      if (!existing) return {};
      return {
        multiplayer: {
          ...state.multiplayer,
          peers: { ...state.multiplayer.peers, [id]: { ...existing, ...partial } },
        },
      };
    });
  },

  removePeer: (id) => {
    set((state) => {
      if (!state.multiplayer.peers[id]) return {};
      const { [id]: _removed, ...rest } = state.multiplayer.peers;
      const nextExpected = state.multiplayer.stageSync.expectedPlayerIds.filter((pid) => pid !== id);
      const nextAcked = { ...state.multiplayer.stageSync.ackedByPlayerId };
      delete nextAcked[id];
      const shouldFinalize =
        state.multiplayer.isHost &&
        state.multiplayer.stageSync.pendingStage != null &&
        nextExpected.length > 0 &&
        nextExpected.every((pid) => nextAcked[pid]);
      if (shouldFinalize) {
        void advanceGroupStageIfHost(state.multiplayer.stageSync.pendingStage!, true);
      }
      return {
        multiplayer: {
          ...state.multiplayer,
          peers: rest,
          stageSync: shouldFinalize
            ? { pendingStage: null, expectedPlayerIds: [], ackedByPlayerId: {} }
            : { ...state.multiplayer.stageSync, expectedPlayerIds: nextExpected, ackedByPlayerId: nextAcked },
        },
      };
    });
  },

  promoteToHost: () => {
    set((state) => ({ multiplayer: { ...state.multiplayer, isHost: true } }));
  },

  onGroupStageAdvance: (newStage) => {
    const state = get();
    if (newStage <= state.activeStage) return;
    set({ mode: GameMode.LOADING_LEVEL, isStageReady: false, isOverworldSceneReady: false });
    useAiDirectorStore.getState().generateNextStage(state.playerStats, state.activeStage, "Group advanced").then(() => {
      set((prevState) => ({
        activeStage: newStage,
        portals: generatePortals(newStage),
        shopOptions: generateShopOptions(prevState.playerStats),
        worldPosition: { x: 0, z: 0 },
        savedOverworldPosition: { x: 0, z: 0 },
        mode: GameMode.OVERWORLD,
        lastGameplayMode: GameMode.OVERWORLD,
        isStageReady: true,
        isOverworldSceneReady: false,
        battleWon: false,
        bossStats: null,
        bossNarrativeOpen: false,
        queuedLevelUp: false,
        playerStats: {
          ...prevState.playerStats,
          hp: prevState.playerStats.maxHp,
        },
        isQuizOpen: false,
        isImpactOpen: false,
        showNarrative: false,
        narrativeDismissed: false,
        highlightedPortalId: null,
      }));
    });
  },

  setLocalPortalVote: (_portalId) => {
    // Piggybacked on player_state broadcast by Scene.tsx; no store mutation needed.
  },

  applyPortalVoteState: (votes, required, livingCount, countdownPortalId, countdownEndsAt) => {
    set((state) => {
      const portalVotes: Record<string, { voters: string[]; required: number; countdownMs: number | null }> = {};
      Object.entries(votes).forEach(([portalId, voters]) => {
        const isCountdown = portalId === countdownPortalId && countdownEndsAt != null;
        const countdownMs = isCountdown ? Math.max(0, countdownEndsAt - Date.now()) : null;
        portalVotes[portalId] = { voters, required, countdownMs };
      });
      let guideMessage: string | null = null;
      const anyVoters = Object.values(votes).some((v) => v.length > 0);
      if (livingCount > 1) {
        if (countdownPortalId && countdownEndsAt != null) {
          const secs = Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000));
          guideMessage = `Starting in ${secs}…`;
        } else if (anyVoters) {
          const passing = Object.values(votes).find((v) => v.length >= required);
          if (!passing) {
            guideMessage = `Stand on the same portal — ${required} of ${livingCount} needed`;
          }
        }
      }
      return {
        multiplayer: { ...state.multiplayer, portalVotes, guideMessage, livingCount },
      };
    });
  },

  setGuideMessage: (msg) => {
    set((state) => ({ multiplayer: { ...state.multiplayer, guideMessage: msg } }));
  },

  setMultiplayerConnectionStatus: (status) => {
    set((state) => ({ multiplayer: { ...state.multiplayer, connectionStatus: status } }));
  },

  setMultiplayerGroupId: (groupId) => {
    set((state) => ({ multiplayer: { ...state.multiplayer, groupId } }));
  },

  resetMultiplayerSession: () => {
    set((state) => ({
      multiplayer: {
        ...state.multiplayer,
        groupId: null,
        joinedAt: null,
        isHost: true,
        slotIndex: 0,
        peers: {},
        enemyStates: {},
        portalVotes: {},
        guideMessage: null,
        connectionStatus: 'idle',
        livingCount: 1,
        stageSync: { pendingStage: null, expectedPlayerIds: [], ackedByPlayerId: {} },
      },
    }));
  },

  setMode: (mode) => set((state) => ({ mode, previousMode: state.mode })),
  
  togglePause: () => set((state) => {
      if (state.mode === GameMode.OVERWORLD || state.mode === GameMode.BATTLE) {
          return { 
              mode: GameMode.PAUSED, 
              previousMode: state.mode,
              lastGameplayMode: state.mode 
          };
      }
      if (state.mode === GameMode.PAUSED || state.mode === GameMode.STATUS || state.mode === GameMode.LIBRARY || state.mode === GameMode.SHOP) {
          return { mode: state.lastGameplayMode || GameMode.OVERWORLD };
      }
      return {};
  }),
  
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setCameraZoom: (zoom) => set((state) => ({
    cameraZoom: clampCameraZoom(typeof zoom === 'function' ? zoom(state.cameraZoom) : zoom),
  })),
  setPlayMode: (mode) => set({ playMode: mode }),

  setQuizOpen: (isOpen) => set({ isQuizOpen: isOpen }),
  setImpactOpen: (isOpen) => set({ isImpactOpen: isOpen }),
  setOverworldSceneReady: (ready) => set({ isOverworldSceneReady: ready }),
  setShowNarrative: (show) => set({ showNarrative: show }),
  setNarrativeDismissed: (dismissed) => set({ narrativeDismissed: dismissed }),
  dismissBossNarrative: () => set({ bossNarrativeOpen: false }),
  
  preloadGame: (difficulty) => {
      const freshStats = getInitialStats(false);
      freshStats.quizDifficulty = difficulty;
      localStorage.removeItem(SAVE_KEY);
      useAiDirectorStore.getState().resetQuizHistory();

      set({ 
          mode: GameMode.INSTRUCTIONS,
          isStageReady: false,
          isOverworldSceneReady: false,
          playerStats: freshStats,
          activeStage: 1,
          portals: [], 
          worldPosition: { x: 0, z: 0 },
          savedOverworldPosition: { x: 0, z: 0 },
          battleWon: false,
          bossStats: null,
          bossNarrativeOpen: false,
          dashCooldownCurrent: 0,
          levelUpOptions: [],
          queuedLevelUp: false,
          shopOptions: generateShopOptions(freshStats), 
          chestReward: null,
          quizResult: null,
          isQuizOpen: false,
          isImpactOpen: false,
          showNarrative: false,
          narrativeDismissed: false,
          lastGameplayMode: GameMode.OVERWORLD,
          highlightedPortalId: null,
          cameraZoom: 1.0
      });

      useAiDirectorStore.getState().generateNextStage(freshStats, 0).then(() => {
          set((state) => {
              const baseUpdate = {
                  isStageReady: true,
                  isOverworldSceneReady: false,
                  portals: generatePortals(1),
                  activeStage: 1,
              };
              if (state.mode === GameMode.LOADING_LEVEL) {
                  return { ...baseUpdate, mode: GameMode.OVERWORLD };
              }
              return baseUpdate;
          });
      });
  },

  preloadGameFromPortal: (refUrl) => {
      // Same as preloadGame('MEDIUM') but marks this session as a portal entry
      // so the in-game VibeJam portals render correctly and the grace period applies.
      const freshStats = getInitialStats(false);
      freshStats.quizDifficulty = 'MEDIUM';
      localStorage.removeItem(SAVE_KEY);
      useAiDirectorStore.getState().resetQuizHistory();

      set({
          mode: GameMode.INSTRUCTIONS,
          isStageReady: false,
          isOverworldSceneReady: false,
          playerStats: freshStats,
          activeStage: 1,
          portals: [],
          worldPosition: { x: 0, z: 0 },
          savedOverworldPosition: { x: 0, z: 0 },
          battleWon: false,
          bossStats: null,
          bossNarrativeOpen: false,
          dashCooldownCurrent: 0,
          levelUpOptions: [],
          queuedLevelUp: false,
          shopOptions: generateShopOptions(freshStats),
          chestReward: null,
          quizResult: null,
          isQuizOpen: false,
          isImpactOpen: false,
          showNarrative: false,
          narrativeDismissed: false,
          lastGameplayMode: GameMode.OVERWORLD,
          highlightedPortalId: null,
          cameraZoom: 1.0,
          isPortalEntry: true,
          portalRefUrl: refUrl,
      });

      useAiDirectorStore.getState().generateNextStage(freshStats, 0).then(() => {
          set((state) => {
              const baseUpdate = {
                  isStageReady: true,
                  isOverworldSceneReady: false,
                  portals: generatePortals(1),
                  activeStage: 1,
              };
              if (state.mode === GameMode.LOADING_LEVEL) {
                  return { ...baseUpdate, mode: GameMode.OVERWORLD };
              }
              return baseUpdate;
          });
      });
  },

  startGame: () => {
      const state = get();
      if (state.isStageReady) {
          set({ mode: GameMode.OVERWORLD, lastGameplayMode: GameMode.OVERWORLD });
      } else {
          set({ mode: GameMode.LOADING_LEVEL, lastGameplayMode: GameMode.OVERWORLD });
      }
  },

  enterBattle: (portal) => {
      const state = get();
      // Battle can only be entered from overworld; ignore stale/duplicate triggers.
      if (state.mode !== GameMode.OVERWORLD) return;

      const aiConfig = useAiDirectorStore.getState().currentConfig;
      let isBonus = false;
      let quizResult = null;
      let nextMode = GameMode.BATTLE;
      let lostStreakForBattle = 0;
      
      if (portal.type !== 'BOSS' && aiConfig?.quiz) {
         const isEncouragement = !aiConfig.quiz.options || Object.keys(aiConfig.quiz.options).length === 0;

         if (isEncouragement) {
             isBonus = false;
             nextMode = GameMode.BATTLE;
         } else {
             const isCorrect = portal.quizOption === aiConfig.quiz.correctOption;
             isBonus = isCorrect;
             const answerLabel = (portal.quizOption && aiConfig.quiz.options) ? aiConfig.quiz.options[portal.quizOption] : "Destiny";
             const correctAnswerLabel = aiConfig.quiz.options[aiConfig.quiz.correctOption];

             // Combo streak system: calculate reward based on streak
             const currentStreak = state.playerStats.quizStreak;
             let newStreak: number;
             let comboLostStreak = 0;
             let impact: number;

             if (isCorrect) {
                 newStreak = currentStreak + 1;
                 impact = 100 + Math.max(0, newStreak - 1) * 20;
             } else {
                 comboLostStreak = Math.max(1, currentStreak); // Always at least 1 to spawn Misinformation enemy
                 newStreak = 0;
                 impact = 0;
             }

             quizResult = {
                 correct: isCorrect,
                 explanation: aiConfig.quiz.explanation || "Go forth!",
                 answerLabel: answerLabel,
                 bonus: isBonus,
                 carbonValue: isCorrect ? impact : 0,
                 streak: newStreak,
                 lostStreak: comboLostStreak
             };
             nextMode = GameMode.QUIZ_RESULT;

             set(currentState => {
                 const newStats = { ...currentState.playerStats };
                 const lastEntry = newStats.impactHistory[0];
                 const isDuplicate = lastEntry && lastEntry.type === 'QUIZ' && lastEntry.stage === currentState.activeStage && lastEntry.question === aiConfig.quiz.question;

                 if (!isDuplicate) {
                     const historyEntry: ImpactLogEntry = {
                         id: Math.random().toString(),
                         type: 'QUIZ',
                         stage: currentState.activeStage,
                         question: aiConfig.quiz.question,
                         yourAnswer: answerLabel,
                         correctAnswer: correctAnswerLabel || "",
                         isCorrect: isCorrect,
                         carbonValue: isCorrect ? impact : 0,
                         timestamp: Date.now()
                     };
                     newStats.impactHistory = [historyEntry, ...newStats.impactHistory];

                     newStats.quizStreak = newStreak;

                     if (isCorrect) {
                         newStats.correctAnswers += 1;
                         newStats.carbonSaved += impact;
                         newStats.lifetimeCarbon = (newStats.lifetimeCarbon || 0) + impact;
                         saveMetaStats(newStats);
                     }
                 }

                 return { playerStats: newStats };
             });

             // Store lost streak for Misinformation enemy spawning
             lostStreakForBattle = comboLostStreak;
         }
      } else {
         isBonus = true;
      }

      set((state) => ({
        mode: nextMode,
        previousMode: GameMode.OVERWORLD,
        lastGameplayMode: GameMode.BATTLE,
        savedOverworldPosition: { x: state.worldPosition.x, z: state.worldPosition.z },
        worldPosition: { x: 0, z: 0 }, 
        activeBattle: {
            portalId: portal.id,
            level: portal.level,
            isBoss: portal.type === 'BOSS',
            isBonus: isBonus,
            lostStreak: lostStreakForBattle
        },
        battleWon: false,
        bossStats: null,
        quizResult: quizResult,
        queuedLevelUp: false,
        isQuizOpen: false,
        isImpactOpen: false,
        highlightedPortalId: null 
      }));
  },

  enterShop: () => {
      const state = get();
      let options = state.shopOptions;
      if (options.length === 0) {
          options = generateShopOptions(state.playerStats);
      }

      set({ 
          mode: GameMode.SHOP, 
          previousMode: state.mode,
          shopOptions: options,
          adviceResult: null, 
          adviceLoading: false
      });
  },

  refreshShop: () => set((state) => {
      if (state.playerStats.carbonSaved < SHOP_REFRESH_COST) return {};
      
      const newStats = { 
          ...state.playerStats,
          carbonSaved: state.playerStats.carbonSaved - SHOP_REFRESH_COST
      };
      saveMetaStats(newStats); 

      return {
          playerStats: newStats,
          shopOptions: generateShopOptions(newStats),
          adviceResult: null 
      };
  }),

  buyShopItem: (item, replaceKey) => {
      set((state) => {
          const stats = { ...state.playerStats };
          
          if (!item.cost || stats.carbonSaved < item.cost) return {}; 

          stats.carbonSaved -= item.cost;
          stats.unlockedPassives = { ...stats.unlockedPassives };
          stats.unlockedWeapons = { ...stats.unlockedWeapons };
          stats.modifiers = { ...stats.modifiers };
          
          if (!stats.statUpgrades) stats.statUpgrades = { hp: 0, attack: 0, speed: 0 };

          if (item.type === 'PASSIVE') {
              stats.unlockedPassives[item.key] = (stats.unlockedPassives[item.key] || 0) + 1;
              const pData = PASSIVES_DATA[item.key];
              if (pData) {
                  if (pData.key === 'DUPLICATOR') stats.modifiers.projectileCount += 1;
                  if (pData.key === 'SPINACH') stats.modifiers.damage += (pData.value || 0.1);
                  if (pData.key === 'TOME') stats.modifiers.cooldown = Math.max(0.4, stats.modifiers.cooldown - (pData.value || 0.1));
                  if (pData.key === 'CANDLE') stats.modifiers.area += (pData.value || 0.1);
                  if (pData.key === 'BACKPACK') stats.maxWeaponSlots += 1;
                  if (pData.key === 'GAUNTLET') stats.modifiers.knockback += (pData.value || 0.2);
              }
          } 
          else if (item.type === 'WEAPON') {
              if (item.isNewWeapon) {
                  if (replaceKey) {
                      delete stats.unlockedWeapons[replaceKey];
                      stats.unlockedWeapons[item.key] = 1;
                  } else {
                      stats.unlockedWeapons[item.key] = 1;
                  }
              } else {
                  stats.unlockedWeapons[item.key] = (stats.unlockedWeapons[item.key] || 0) + 1;
              }
          }
          else if (item.type === 'STAT') {
              if (item.key === 'HP') {
                  stats.maxHp += (item.value || 50);
                  stats.hp = stats.maxHp; 
                  stats.statUpgrades.hp += 1;
              } else if (item.key === 'ATTACK') {
                  stats.attackPower += (item.value || 5);
                  stats.statUpgrades.attack += 1;
              } else if (item.key === 'SPEED') {
                  stats.moveSpeed += (item.value || 0.5);
                  stats.dashCooldownTime = Math.max(0.5, stats.dashCooldownTime - 0.2); 
                  stats.statUpgrades.speed += 1;
              }
          }

          saveMetaStats(stats); 

          return {
              playerStats: stats,
              shopOptions: generateShopOptions(stats), 
              adviceResult: null 
          };
      });
  },

  updatePosition: (x, z) => set({ worldPosition: { x, z } }),
  
  takeDamage: (amount) => set((state) => {
    const now = Date.now();
    if (now - state.playerStats.lastDamageTime < 200) {
        return {}; 
    }

    const newHp = Math.max(0, state.playerStats.hp - amount);
    
    if (newHp === 0 && state.mode !== GameMode.GAMEOVER) {
        useAiDirectorStore.getState().generateDeathMessage(state.playerStats, state.activeStage, state.activeBattle.isBoss ? "Boss" : "Mob");
        return {
             playerStats: { ...state.playerStats, hp: newHp, lastDamageTime: now },
             mode: GameMode.GAMEOVER
        };
    }

    return {
      playerStats: { ...state.playerStats, hp: newHp, lastDamageTime: now }
    };
  }),

  heal: (amount) => set((state) => ({
    playerStats: { 
      ...state.playerStats, 
      hp: Math.min(state.playerStats.maxHp, state.playerStats.hp + amount) 
    }
  })),

  gainXp: (amount) => {
    const state = get();
    const newXp = state.playerStats.xp + amount;
    
    if (newXp >= state.playerStats.xpToNextLevel) {
      const levelUpOptions = state.mode === GameMode.REWARD ? state.levelUpOptions : generateOptions(state.playerStats);

      if (state.activeBattle.isBoss && state.mode === GameMode.BATTLE) {
        set({
          levelUpOptions,
          queuedLevelUp: true,
          playerStats: { ...state.playerStats, xp: newXp },
          adviceResult: null
        });
        return;
      }

      set({
        mode: GameMode.REWARD,
        previousMode: state.mode === GameMode.REWARD ? state.previousMode : state.mode, 
        levelUpOptions,
        queuedLevelUp: false,
        playerStats: { ...state.playerStats, xp: newXp },
        adviceResult: null 
      });
    } else {
      set({
        playerStats: { ...state.playerStats, xp: newXp }
      });
    }
  },

  collectCo2Orb: (amount) => {
    set(state => ({
        playerStats: {
            ...state.playerStats,
            carbonSaved: state.playerStats.carbonSaved + amount,
            lifetimeCarbon: (state.playerStats.lifetimeCarbon || 0) + amount
        }
    }));
  },

  recordDamage: (amount) => set((state) => ({
      playerStats: { 
          ...state.playerStats, 
          totalDamage: Math.floor(state.playerStats.totalDamage + amount)
      }
  })),

  recordKill: () => set((state) => ({
      playerStats: {
          ...state.playerStats,
          enemiesKilled: state.playerStats.enemiesKilled + 1
      }
  })),

  checkDbStatus: async () => {
      try {
          const res = await fetch('/api/health');
          const data = await res.json();
          set({ dbStatus: data.database === 'supabase' ? 'connected' : 'local' });
      } catch (e) {
          set({ dbStatus: 'offline' });
      }
  },

  fetchLeaderboard: async () => {
    // Check status first to update UI
    await get().checkDbStatus();

    // Flush any locally-queued scores that failed to submit while offline
    const pending = loadPendingScores();
    for (const score of pending) {
      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(score)
        });
        if (res.ok) removePendingScore(score);
      } catch (e) {
        // Still offline — stop trying, leave remaining scores queued
        break;
      }
    }

    try {
      const response = await fetch(`/api/leaderboard?_t=${Date.now()}`);
      if (response.ok) {
        const scores = await response.json();
        set({ highScores: scores });
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    }
  },

  submitScore: async (name) => {
      const state = get();
      const newScore: HighScore = {
          name: name.substring(0, 10) || 'Unknown',
          stage: state.activeStage,
          kills: state.playerStats.enemiesKilled,
          damage: state.playerStats.totalDamage,
          carbonSaved: state.playerStats.lifetimeCarbon || state.playerStats.carbonSaved,
          date: Date.now()
      };

      // Save to localStorage queue immediately — score is safe even if offline
      const pending = loadPendingScores();
      savePendingScores([...pending, newScore]);

      // Optimistic update in-memory
      const optimisticScores = sortLeaderboardScores([...state.highScores, newScore]);
      set({ highScores: optimisticScores });
      let rankIndex = findSubmittedScoreIndex(optimisticScores, newScore);

      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newScore)
        });
        if (res.ok) {
          // Confirmed by server — remove from pending queue
          removePendingScore(newScore);
          try {
            const scores = await res.json();
            if (Array.isArray(scores)) {
              const typedScores = scores as HighScore[];
              set({ highScores: typedScores });
              rankIndex = findSubmittedScoreIndex(typedScores, newScore);
            } else {
              void get().fetchLeaderboard();
            }
          } catch (e) {
            void get().fetchLeaderboard();
          }
        }
      } catch (e) {
        // Offline — score stays in localStorage queue, will sync on next fetchLeaderboard()
        set({ dbStatus: 'offline' });
      }

      return { score: newScore, rank: rankIndex >= 0 ? rankIndex + 1 : null };
  },

  selectUpgrade: (option) => set((state) => {
    const stats = { ...state.playerStats };
    const weapons = { ...stats.unlockedWeapons };
    const passives = { ...stats.unlockedPassives };
    
    stats.level += 1;
    stats.xp = Math.max(0, stats.xp - stats.xpToNextLevel);
    
    if (stats.level <= 5) {
        stats.xpToNextLevel = Math.floor(stats.xpToNextLevel * 1.15) + 30;
    } else {
        stats.xpToNextLevel = Math.floor(stats.xpToNextLevel * 1.2) + 50;
    }
    
    if (option.type === 'WEAPON') {
        const recipe = EVOLUTION_RECIPES.find(r => r.result === option.key);
        if (recipe && !weapons[option.key]) {
            weapons[option.key] = 1;
            delete weapons[recipe.ingredients[0]];
            delete weapons[recipe.ingredients[1]];
        } else {
            const current = weapons[option.key] || 0;
            weapons[option.key] = current + 1;
        }
        stats.unlockedWeapons = weapons;
    } else if (option.type === 'PASSIVE') {
        passives[option.key] = (passives[option.key] || 0) + 1;
        
        const pData = PASSIVES_DATA[option.key];
        if (pData) {
            if (pData.key === 'DUPLICATOR') stats.modifiers.projectileCount += 1;
            if (pData.key === 'SPINACH') stats.modifiers.damage += (pData.value || 0.1);
            if (pData.key === 'TOME') stats.modifiers.cooldown = Math.max(0.4, stats.modifiers.cooldown - (pData.value || 0.1));
            if (pData.key === 'CANDLE') stats.modifiers.area += (pData.value || 0.1);
            if (pData.key === 'BACKPACK') stats.maxWeaponSlots += 1;
            if (pData.key === 'GAUNTLET') stats.modifiers.knockback += (pData.value || 0.2);
        }
        stats.unlockedPassives = passives;
    } else {
      switch (option.key) {
        case 'HP':
          stats.maxHp += (option.value || 50);
          stats.hp = stats.maxHp; 
          break;
        case 'ATTACK':
          stats.attackPower += (option.value || 5);
          break;
        case 'SPEED':
          stats.dashCooldownTime = Math.max(0.5, stats.dashCooldownTime - 0.2);
          stats.moveSpeed += (option.value || 0.5);
          break;
      }
    }
    
    if (stats.xp >= stats.xpToNextLevel) {
        return {
            playerStats: stats,
            levelUpOptions: generateOptions(stats),
            mode: GameMode.REWARD,
            adviceResult: null
        };
    }

    return { 
      playerStats: stats, 
      mode: state.previousMode, 
      levelUpOptions: [],
      queuedLevelUp: false,
      adviceResult: null
    };
  }),

  showQueuedLevelUp: () => set((state) => {
    if (!state.queuedLevelUp || state.mode === GameMode.REWARD) return {};

    return {
      mode: GameMode.REWARD,
      previousMode: state.mode,
      queuedLevelUp: false,
      adviceResult: null
    };
  }),

  askForUpgradeAdvice: () => {
      const state = get();
      if (state.adviceLoading || state.adviceResult) return;
      
      let optionsToAnalyze: UpgradeOption[] = [];
      if (state.mode === GameMode.REWARD) optionsToAnalyze = state.levelUpOptions;
      else if (state.mode === GameMode.SHOP) optionsToAnalyze = state.shopOptions;
      else return;

      set({ adviceLoading: true });
      useAiDirectorStore.getState().generateUpgradeAdvice(state.playerStats, optionsToAnalyze)
          .then((result) => {
              set({ adviceLoading: false, adviceResult: result });
          });
  },

  rerollLevelUpOptions: () => set((state) => {
    const count = state.playerStats.rerollCount || 0;
    const cost = 100 * Math.pow(2, count);
    
    if (state.playerStats.carbonSaved < cost) return {};

    const newStats = {
        ...state.playerStats,
        carbonSaved: state.playerStats.carbonSaved - cost,
        rerollCount: count + 1
    };
    saveMetaStats(newStats);

    return {
        playerStats: newStats,
        levelUpOptions: generateOptions(newStats),
        adviceResult: null
    };
  }),

  openChest: () => {
      const state = get();
      const passives: UpgradeOption[] = [];
      Object.values(PASSIVES_DATA).forEach(p => {
          passives.push({
              id: `p_${p.key}`,
              type: 'PASSIVE',
              key: p.key,
              label: p.label,
              description: p.description,
              icon: p.icon,
              value: p.value
          });
      });

      const hasBackpack = (state.playerStats.unlockedPassives['BACKPACK'] || 0) > 0;
      const filteredPassives = passives.filter(p => !(p.key === 'BACKPACK' && hasBackpack));
      const reward = filteredPassives[Math.floor(Math.random() * filteredPassives.length)];
      
      set({ 
          mode: GameMode.CHEST_REWARD, 
          chestReward: reward 
      });
  },

  claimChestReward: () => set((state) => {
      if (!state.chestReward) return {};

      const stats = { ...state.playerStats };
      const mods = { ...stats.modifiers };
      const passives = { ...stats.unlockedPassives };
      const reward = state.chestReward;

      if (reward.key === 'DUPLICATOR') mods.projectileCount += 1;
      if (reward.key === 'SPINACH') mods.damage += (reward.value || 0.1);
      if (reward.key === 'TOME') mods.cooldown = Math.max(0.4, mods.cooldown - (reward.value || 0.1));
      if (reward.key === 'CANDLE') mods.area += (reward.value || 0.1);
      if (reward.key === 'BACKPACK') stats.maxWeaponSlots += 1; 
      if (reward.key === 'GAUNTLET') mods.knockback += (reward.value || 0.2);

      passives[reward.key] = (passives[reward.key] || 0) + 1;

      stats.modifiers = mods;
      stats.unlockedPassives = passives;
      saveMetaStats(stats); 

      return {
          playerStats: stats,
          chestReward: null,
          mode: GameMode.BATTLE 
      };
  }),

  setDashCooldown: (time: number) => set({ dashCooldownCurrent: time }),
  
  setBattleWon: (won) => set({ battleWon: won }),

  setBossStats: (stats) => set({ bossStats: stats }),

  completePortal: (portalId) => set((state) => {
      const overworldSpawn = { x: 0, z: 0 };
      const remainingPortals = state.portals.filter(p => p.id !== portalId);
      // isRound1 = just completed a round-1 portal (p_A or p_B, no _r2 suffix)
      const isRound1 = !portalId.includes('_r2');

      if (isRound1) {
          // Respawn BOTH YES and NO portals fresh for round 2
          const baseLevel = (state.activeStage - 1) * 5;
          const freshPortals: Portal[] = [
              { id: `p_A_r2`, x: -7, z: 6, level: baseLevel + 1, type: 'NORMAL', quizOption: 'A', colorOverride: '#22c55e' },
              { id: `p_B_r2`, x:  7, z: 6, level: baseLevel + 1, type: 'NORMAL', quizOption: 'B', colorOverride: '#ef4444' },
          ];
          useAiDirectorStore.getState().generateMidStageQuiz(state.activeStage, ['A', 'B'], state.playerStats.quizDifficulty);

          return {
              portals: freshPortals,
              mode: GameMode.OVERWORLD,
              lastGameplayMode: GameMode.OVERWORLD,
              worldPosition: overworldSpawn,
              savedOverworldPosition: overworldSpawn,
              battleWon: false,
              bossStats: null,
              quizResult: null,
              queuedLevelUp: false,
              highlightedPortalId: null
          };
      } else {
           const baseLevel = (state.activeStage - 1) * 5;
           const bossPortal: Portal = {
            id: `stage_${state.activeStage}_boss`,
            x: 0,
            z: 10, // South of the landmark (landmark at z:-10)
            level: baseLevel + 5,
            type: 'BOSS',
            colorOverride: '#aa00ff'
           };
           return {
               portals: [bossPortal],
               mode: GameMode.OVERWORLD,
               lastGameplayMode: GameMode.OVERWORLD,
               worldPosition: state.savedOverworldPosition,
               battleWon: false,
               bossStats: null,
               quizResult: null,
               bossNarrativeOpen: true,
               queuedLevelUp: false,
               highlightedPortalId: null
           };
      }
  }),

  dismissQuizResult: () => set({
      mode: GameMode.BATTLE, 
      lastGameplayMode: GameMode.BATTLE,
      quizResult: null,
      highlightedPortalId: null
  }),

  completeStage: () => {
      const state = get();
      
      if (state.activeStage >= 10) {
          saveMetaStats(state.playerStats);
          set({ mode: GameMode.VICTORY, lastGameplayMode: GameMode.VICTORY });
          return;
      }

      const nextStage = state.activeStage + 1;
      const lastResult = state.activeBattle.isBonus ? "Ecosystem purged." : "Ecosystem partially restored.";
      if (state.multiplayer.isHost && state.multiplayer.groupId) {
          const expectedPlayerIds = [state.multiplayer.localPlayerId, ...Object.keys(state.multiplayer.peers)];
          const ackedByPlayerId: Record<string, boolean> = { [state.multiplayer.localPlayerId]: true };
          set((s) => ({
            multiplayer: {
              ...s.multiplayer,
              stageSync: { pendingStage: nextStage, expectedPlayerIds, ackedByPlayerId },
            },
          }));
          broadcastMultiplayer({ type: 'stage_advance', newStage: nextStage, seed: Date.now(), t: Date.now() });
          // Host acks itself immediately. Group is reopened after all expected acks arrive.
          if (expectedPlayerIds.length <= 1) {
            void advanceGroupStageIfHost(nextStage, true);
            set((s) => ({
              multiplayer: {
                ...s.multiplayer,
                stageSync: { pendingStage: null, expectedPlayerIds: [], ackedByPlayerId: {} },
              },
            }));
          }
      }

      saveMetaStats(state.playerStats);
      set({ mode: GameMode.LOADING_LEVEL, isStageReady: false, isOverworldSceneReady: false });
      
      useAiDirectorStore.getState().generateNextStage(state.playerStats, state.activeStage, lastResult).then(() => {
          set((prevState) => ({
            activeStage: nextStage,
            portals: generatePortals(nextStage),
            shopOptions: generateShopOptions(prevState.playerStats), 
            worldPosition: { x: 0, z: 0 },
            savedOverworldPosition: { x: 0, z: 0 },
            mode: GameMode.OVERWORLD,
            lastGameplayMode: GameMode.OVERWORLD,
            isStageReady: true,
            isOverworldSceneReady: false,
            battleWon: false,
            bossStats: null,
            bossNarrativeOpen: false,
            queuedLevelUp: false,
            playerStats: {
                ...prevState.playerStats,
                hp: prevState.playerStats.maxHp 
            },
            isQuizOpen: false,
            isImpactOpen: false,
            showNarrative: false,
            narrativeDismissed: false,
            highlightedPortalId: null
          }));
      });
  },

  resetGame: () => {
    const freshStats = getInitialStats(false);
    localStorage.removeItem(SAVE_KEY);
    useAiDirectorStore.getState().resetQuizHistory();

    set({
      mode: GameMode.MENU,
      previousMode: GameMode.MENU,
      lastGameplayMode: GameMode.OVERWORLD,
      playerStats: freshStats,
      worldPosition: { x: 0, z: 0 },
      savedOverworldPosition: { x: 0, z: 0 },
      activeStage: 1,
      portals: generatePortals(1),
      activeBattle: { portalId: '', level: 1, isBoss: false, isBonus: false, lostStreak: 0 },
      battleWon: false,
      bossStats: null,
      bossNarrativeOpen: false,
      dashCooldownCurrent: 0,
      levelUpOptions: [],
      queuedLevelUp: false,
      shopOptions: generateShopOptions(freshStats), 
      chestReward: null,
      quizResult: null,
      isQuizOpen: false,
      isImpactOpen: false,
      showNarrative: false,
      narrativeDismissed: false,
      isStageReady: false,
      isOverworldSceneReady: false,
      highlightedPortalId: null,
      adviceLoading: false,
      adviceResult: null,
      isMuted: false, 
      cameraZoom: 1.0,
    });
  },

  setHighlightedPortal: (id) => set({ highlightedPortalId: id })
}));
