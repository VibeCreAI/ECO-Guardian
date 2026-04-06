import { create } from 'zustand';
import { GameMode, PlayerStats, UpgradeOption, Portal, ActiveBattleState, HighScore, ImpactLogEntry, QuizDifficulty, AdviceResult } from '../types';
import { useAiDirectorStore } from './aiDirectorStore';
import { WEAPONS_DATA, PASSIVES_DATA, EVOLUTION_RECIPES, getEvolutionHint } from '../constants';

export const SHOP_REFRESH_COST = 50;
const SAVE_KEY = 'pixel_realm_save_v1';

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
  
  quizResult: { correct: boolean; explanation: string; answerLabel: string; bonus: boolean; carbonValue: number } | null;
  
  bossStats: { currentHp: number; maxHp: number; name: string } | null;
  bossNarrativeOpen: boolean; 

  dashCooldownCurrent: number;
  levelUpOptions: UpgradeOption[];
  shopOptions: UpgradeOption[]; 
  chestReward: UpgradeOption | null;
  highScores: HighScore[];
  dbStatus: 'connecting' | 'connected' | 'local' | 'offline';

  isQuizOpen: boolean;
  isImpactOpen: boolean; 
  isStageReady: boolean;
  
  // Narrative State
  showNarrative: boolean;
  narrativeDismissed: boolean;

  highlightedPortalId: string | null; 

  adviceLoading: boolean;
  adviceResult: AdviceResult | null;
  
  isMuted: boolean; // New state for audio control

  setMode: (mode: GameMode) => void;
  togglePause: () => void; 
  toggleMute: () => void; // New action
  setQuizOpen: (isOpen: boolean) => void;
  setImpactOpen: (isOpen: boolean) => void; 
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
  submitScore: (name: string) => void;
  fetchLeaderboard: () => Promise<void>; 
  checkDbStatus: () => Promise<void>;

  selectUpgrade: (option: UpgradeOption) => void;
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
  const quizPortals: Portal[] = [
      { id: `p_A`, x: -20, z: 15, level: baseLevel + 1, type: 'NORMAL', quizOption: 'A', colorOverride: '#ef4444' }, 
      { id: `p_B`, x: 0, z: 25, level: baseLevel + 1, type: 'NORMAL', quizOption: 'B', colorOverride: '#22c55e' }, 
      { id: `p_C`, x: 20, z: 15, level: baseLevel + 1, type: 'NORMAL', quizOption: 'C', colorOverride: '#3b82f6' } 
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
              description: currentLevel === 0 ? pData.description : `${pData.label} Lv.${currentLevel + 1}`,
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
  
  activeBattle: { portalId: '', level: 1, isBoss: false, isBonus: false },
  battleWon: false,
  bossStats: null,
  bossNarrativeOpen: false, 
  quizResult: null,
  
  dashCooldownCurrent: 0,
  levelUpOptions: [],
  shopOptions: [],
  chestReward: null,
  highScores: [], 
  dbStatus: 'connecting',

  isQuizOpen: false,
  isImpactOpen: false,
  isStageReady: false,
  highlightedPortalId: null,

  showNarrative: false,
  narrativeDismissed: false,

  adviceLoading: false,
  adviceResult: null,
  
  isMuted: false,

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

  setQuizOpen: (isOpen) => set({ isQuizOpen: isOpen }),
  setImpactOpen: (isOpen) => set({ isImpactOpen: isOpen }),
  setShowNarrative: (show) => set({ showNarrative: show }),
  setNarrativeDismissed: (dismissed) => set({ narrativeDismissed: dismissed }),
  dismissBossNarrative: () => set({ bossNarrativeOpen: false }),
  
  preloadGame: (difficulty) => {
      const freshStats = getInitialStats(false);
      freshStats.quizDifficulty = difficulty;
      localStorage.removeItem(SAVE_KEY);

      set({ 
          mode: GameMode.INSTRUCTIONS,
          isStageReady: false,
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
          shopOptions: generateShopOptions(freshStats), 
          chestReward: null,
          quizResult: null,
          isQuizOpen: false,
          isImpactOpen: false,
          showNarrative: false,
          narrativeDismissed: false,
          lastGameplayMode: GameMode.OVERWORLD,
          highlightedPortalId: null
      });

      useAiDirectorStore.getState().generateNextStage(freshStats, 0).then(() => {
          set((state) => {
              const baseUpdate = {
                  isStageReady: true,
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
      if (state.mode === GameMode.BATTLE || state.mode === GameMode.QUIZ_RESULT) return;

      const aiConfig = useAiDirectorStore.getState().currentConfig;
      let isBonus = false;
      let quizResult = null;
      let nextMode = GameMode.BATTLE;
      
      if (portal.type !== 'BOSS' && aiConfig?.quiz) {
         const isEncouragement = !aiConfig.quiz.options || Object.keys(aiConfig.quiz.options).length === 0;

         if (isEncouragement) {
             isBonus = false;
             nextMode = GameMode.BATTLE;
         } else {
             const isCorrect = portal.quizOption === aiConfig.quiz.correctOption;
             isBonus = isCorrect;
             const impact = aiConfig.quiz.impactValue || 50;
             const answerLabel = (portal.quizOption && aiConfig.quiz.options) ? aiConfig.quiz.options[portal.quizOption] : "Destiny";
             const correctAnswerLabel = aiConfig.quiz.options[aiConfig.quiz.correctOption];

             quizResult = {
                 correct: isCorrect,
                 explanation: aiConfig.quiz.explanation || "Go forth!",
                 answerLabel: answerLabel,
                 bonus: isBonus,
                 carbonValue: impact
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

                     if (isCorrect) {
                         newStats.correctAnswers += 1;
                         newStats.carbonSaved += impact;
                         newStats.lifetimeCarbon = (newStats.lifetimeCarbon || 0) + impact;
                         saveMetaStats(newStats); 
                     }
                 }
                 
                 return { playerStats: newStats };
             });
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
            isBonus: isBonus
        },
        battleWon: false,
        bossStats: null,
        quizResult: quizResult,
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
      set({
        mode: GameMode.REWARD,
        previousMode: state.mode === GameMode.REWARD ? state.previousMode : state.mode, 
        levelUpOptions: state.mode === GameMode.REWARD ? state.levelUpOptions : generateOptions(state.playerStats),
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
      
      const currentScores = [...state.highScores, newScore]
          .sort((a, b) => b.carbonSaved - a.carbonSaved)
          .slice(0, 50);
      set({ highScores: currentScores });

      try {
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newScore)
        });
        get().fetchLeaderboard();
      } catch (e) {
        console.error("Failed to submit score to backend", e);
      }
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
      const remainingPortals = state.portals.filter(p => p.id !== portalId);
      const remainingNormalPortals = remainingPortals.filter(p => p.type === 'NORMAL');

      if (remainingNormalPortals.length > 1) {
          const availableOptions = remainingNormalPortals.map(p => p.quizOption!).filter(Boolean);
          useAiDirectorStore.getState().generateMidStageQuiz(state.activeStage, availableOptions, state.playerStats.quizDifficulty);
      } else if (remainingNormalPortals.length === 1) {
          useAiDirectorStore.getState().setLastPortalMessage(remainingNormalPortals[0].quizOption!);
      } else {
           const baseLevel = (state.activeStage - 1) * 5;
           const bossPortal: Portal = {
            id: `stage_${state.activeStage}_boss`,
            x: 0, 
            z: 45,
            level: baseLevel + 5,
            type: 'BOSS',
            colorOverride: '#aa00ff'
           };
           remainingPortals.push(bossPortal);
           
           return {
               portals: remainingPortals,
               mode: GameMode.OVERWORLD, 
               lastGameplayMode: GameMode.OVERWORLD,
               worldPosition: state.savedOverworldPosition,
               battleWon: false,
               bossStats: null,
               quizResult: null,
               bossNarrativeOpen: true,
               highlightedPortalId: null
           };
      }

      return {
          portals: remainingPortals,
          mode: GameMode.OVERWORLD, 
          lastGameplayMode: GameMode.OVERWORLD,
          worldPosition: state.savedOverworldPosition,
          battleWon: false,
          bossStats: null,
          quizResult: null,
          highlightedPortalId: null
      };
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

      saveMetaStats(state.playerStats);
      set({ mode: GameMode.LOADING_LEVEL, isStageReady: false });
      
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
            battleWon: false,
            bossStats: null,
            bossNarrativeOpen: false,
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

    set({
      mode: GameMode.MENU,
      previousMode: GameMode.MENU,
      lastGameplayMode: GameMode.OVERWORLD,
      playerStats: freshStats,
      worldPosition: { x: 0, z: 0 },
      savedOverworldPosition: { x: 0, z: 0 },
      activeStage: 1,
      portals: generatePortals(1),
      activeBattle: { portalId: '', level: 1, isBoss: false, isBonus: false },
      battleWon: false,
      bossStats: null,
      bossNarrativeOpen: false,
      dashCooldownCurrent: 0,
      levelUpOptions: [],
      shopOptions: generateShopOptions(freshStats), 
      chestReward: null,
      quizResult: null,
      isQuizOpen: false,
      isImpactOpen: false,
      showNarrative: false,
      narrativeDismissed: false,
      isStageReady: false,
      highlightedPortalId: null,
      adviceLoading: false,
      adviceResult: null,
      isMuted: false, 
    });
  },

  setHighlightedPortal: (id) => set({ highlightedPortalId: id })
}));