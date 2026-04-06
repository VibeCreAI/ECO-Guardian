
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore'; 
import { GameMode, UpgradeOption } from '../../types';
import { VirtualJoystick } from './VirtualJoystick';
import { StatusModal } from './StatusModal';
import { LibraryModal } from './LibraryModal';
import { ShopModal } from './ShopModal';
import { WEAPONS_DATA, EVOLUTION_RECIPES, PASSIVES_DATA } from '../../constants';
import { ASSET_PATHS, preloadStartupAssets } from '../../assets';

interface UIOverlayProps {
  inputVector: React.MutableRefObject<{x: number, y: number}>;
  onDash: () => void;
  isMobile: boolean;
}

const MenuHero = () => {
    const [frame, setFrame] = useState(0);
    const spriteUrl = ASSET_PATHS.images.player.walkNorth;

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(f => (f + 1) % 16);
        }, 166); // 6 FPS
        return () => clearInterval(interval);
    }, []);

    const col = frame % 4;
    const row = Math.floor(frame / 4);
    
    // Background Position Calculation for 4x4 grid
    const xPos = col * (100 / 3);
    const yPos = row * (100 / 3);

    return (
        <div 
            className="h-24 w-24 drop-shadow-2xl"
            style={{
                backgroundImage: `url(${spriteUrl})`,
                backgroundSize: '400% 400%',
                backgroundPosition: `${xPos}% ${yPos}%`,
                imageRendering: 'pixelated'
            }}
        />
    );
};

const describeStartupAsset = (assetUrl: string) => {
    if (!assetUrl) return 'Opening command channel...';
    if (assetUrl.includes('/player/')) return 'Caching player sprite sheets...';
    if (assetUrl.includes('/audio/')) return 'Priming soundtrack buffers...';
    if (assetUrl.includes('/start/')) return 'Preparing mission display assets...';
    return 'Synchronizing field assets...';
};

export const UIOverlay: React.FC<UIOverlayProps> = ({ inputVector, onDash, isMobile }) => {
  const { mode, playerStats, dashCooldownCurrent, resetGame, selectUpgrade, levelUpOptions, setMode, worldPosition, portals, battleWon, activeStage, highScores, submitScore, chestReward, claimChestReward, preloadGame, startGame, quizResult, dismissQuizResult, activeBattle, isQuizOpen, setQuizOpen, bossNarrativeOpen, dismissBossNarrative, togglePause, isImpactOpen, setImpactOpen, highlightedPortalId, setHighlightedPortal, askForUpgradeAdvice, adviceLoading, adviceResult, rerollLevelUpOptions, isMuted, toggleMute, showNarrative, setShowNarrative, narrativeDismissed, setNarrativeDismissed, fetchLeaderboard, dbStatus, isStageReady } = useGameStore();
  const { currentConfig, gameOverMessage, isGenerating } = useAiDirectorStore();
  const [playerName, setPlayerNameInput] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [startupAssetProgress, setStartupAssetProgress] = useState(0);
  const [startupDisplayedProgress, setStartupDisplayedProgress] = useState(0);
  const [startupAssetsReady, setStartupAssetsReady] = useState(false);
  const [startupStatusDetail, setStartupStatusDetail] = useState('Opening command channel...');
  
  // UI Scaling for short screens (mobile landscape)
  const [uiScale, setUiScale] = useState(1);
  const [isShortHeight, setIsShortHeight] = useState(false);

  useEffect(() => {
    const handleResize = () => {
        const h = window.innerHeight;
        const targetH = 800; // Target height for 100% scale
        
        setIsShortHeight(h < 500);

        if (h < targetH) {
            // Scale down, but cap at 0.5 to remain usable
            setUiScale(Math.max(0.5, h / targetH));
        } else {
            setUiScale(1);
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Leaderboard when entering LEADERBOARD mode
  useEffect(() => {
      if (mode === GameMode.LEADERBOARD) {
          fetchLeaderboard();
      }
  }, [mode, fetchLeaderboard]);

  // Fullscreen Logic
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // Loading Screen Tips Cycle
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const loadingTips = [
      "TIP: Answering Gaia's questions correctly grants a BONUS CHEST before battle!",
      "TIP: Dash through enemies to escape tight corners.",
      "TIP: XP comes from KILLING enemies. Orbs now give CO2 currency!",
      "TIP: Visit the Eco-Exchange near the landmark to spend CO2.",
      "TIP: Evolution Weapons are significantly stronger than basic ones.",
      "TIP: Different stages have different environmental themes and enemies."
  ];
  
  useEffect(() => {
      if (mode === GameMode.LOADING_LEVEL) {
          const interval = setInterval(() => {
              setLoadingTipIndex(prev => (prev + 1) % loadingTips.length);
          }, 2500);
          return () => clearInterval(interval);
      }
  }, [mode]);

  const lastNarrativeStage = useRef(0);
  const lastQuizSignature = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultScrollRef = useRef<HTMLDivElement>(null);
  const startupSequenceRef = useRef(0);
  const startupLaunchTimeoutRef = useRef<number | null>(null);

  // Fix: Reset tracking refs when returning to Menu/Setup so narrative triggers again on restart
  useEffect(() => {
      if (mode === GameMode.MENU || mode === GameMode.DIFFICULTY_SELECT || mode === GameMode.INSTRUCTIONS) {
          lastNarrativeStage.current = 0;
          lastQuizSignature.current = "";
      }
  }, [mode]);

  useEffect(() => {
      // If we just loaded stage 1, ensure lastNarrativeStage is reset if needed
      if (activeStage === 1 && lastNarrativeStage.current > 1) {
          lastNarrativeStage.current = 0;
      }

      if (mode === GameMode.OVERWORLD && currentConfig && activeStage > lastNarrativeStage.current) {
          setShowNarrative(true);
          setNarrativeDismissed(false); 
          lastNarrativeStage.current = activeStage;
      }
  }, [mode, activeStage, currentConfig, setShowNarrative, setNarrativeDismissed]);

  useEffect(() => {
      if (mode === GameMode.OVERWORLD && currentConfig?.quiz && narrativeDismissed) {
          const optionSignature = Object.entries(currentConfig.quiz.options || {})
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([key, value]) => `${key}:${value}`)
              .join('|');
          const quizSignature = [
              activeStage,
              currentConfig.quiz.question,
              currentConfig.quiz.correctOption,
              optionSignature,
          ].join('::');

          if (quizSignature !== lastQuizSignature.current) {
              setQuizOpen(true);
              lastQuizSignature.current = quizSignature;
          }
      }
  }, [mode, currentConfig, setQuizOpen, narrativeDismissed, activeStage]);

  const handleDismissNarrative = () => {
      setShowNarrative(false);
      setNarrativeDismissed(true);
  };

  useEffect(() => {
    if (!isQuizOpen && ! bossNarrativeOpen) return;
    const handleScrollKey = (e: KeyboardEvent) => {
        if (!scrollRef.current) return;
        if (e.key === 'ArrowDown') scrollRef.current.scrollBy({ top: 50, behavior: 'smooth' });
        if (e.key === 'ArrowUp') scrollRef.current.scrollBy({ top: -50, behavior: 'smooth' });
    };
    window.addEventListener('keydown', handleScrollKey);
    return () => window.removeEventListener('keydown', handleScrollKey);
  }, [isQuizOpen, bossNarrativeOpen]);

  useEffect(() => {
    if (mode !== GameMode.QUIZ_RESULT) return;
    const handleScrollKey = (e: KeyboardEvent) => {
        if (!resultScrollRef.current) return;
        if (e.key === 'ArrowDown') resultScrollRef.current.scrollBy({ top: 50, behavior: 'smooth' });
        if (e.key === 'ArrowUp') resultScrollRef.current.scrollBy({ top: -50, behavior: 'smooth' });
    };
    window.addEventListener('keydown', handleScrollKey);
    return () => window.removeEventListener('keydown', handleScrollKey);
  }, [mode]);

  useEffect(() => {
      if (mode !== GameMode.INSTRUCTIONS) {
          startupSequenceRef.current += 1;
          setStartupAssetProgress(0);
          setStartupDisplayedProgress(0);
          setStartupAssetsReady(false);
          setStartupStatusDetail('Opening command channel...');
          return;
      }

      const sequenceId = startupSequenceRef.current + 1;
      startupSequenceRef.current = sequenceId;
      setStartupAssetProgress(0);
      setStartupDisplayedProgress(0);
      setStartupAssetsReady(false);
      setStartupStatusDetail('Opening command channel...');

      let active = true;

      preloadStartupAssets((loaded, total, assetUrl) => {
          if (!active || startupSequenceRef.current !== sequenceId) return;
          setStartupAssetProgress(total === 0 ? 1 : loaded / total);
          setStartupStatusDetail(describeStartupAsset(assetUrl));
      }).then(() => {
          if (!active || startupSequenceRef.current !== sequenceId) return;
          setStartupAssetProgress(1);
          setStartupAssetsReady(true);
      });

      return () => {
          active = false;
      };
  }, [mode]);

  const startupTargetProgress = mode === GameMode.INSTRUCTIONS
      ? Math.min(100, Math.round((startupAssetProgress * 0.7 + (isStageReady ? 0.25 : 0) + 0.05) * 100))
      : 0;

  useEffect(() => {
      if (mode !== GameMode.INSTRUCTIONS) return;

      const interval = window.setInterval(() => {
          setStartupDisplayedProgress((current) => {
              if (current === startupTargetProgress) return current;
              const delta = startupTargetProgress - current;
              if (delta <= 0) return startupTargetProgress;
              return Math.min(startupTargetProgress, current + Math.max(1, Math.ceil(delta * 0.16)));
          });
      }, 16);

      return () => window.clearInterval(interval);
  }, [mode, startupTargetProgress]);

  useEffect(() => {
      if (startupLaunchTimeoutRef.current !== null) {
          window.clearTimeout(startupLaunchTimeoutRef.current);
          startupLaunchTimeoutRef.current = null;
      }

      if (
          mode !== GameMode.INSTRUCTIONS ||
          !isStageReady ||
          !startupAssetsReady ||
          startupDisplayedProgress < 100
      ) {
          return;
      }

      startupLaunchTimeoutRef.current = window.setTimeout(() => {
          startGame();
          startupLaunchTimeoutRef.current = null;
      }, 350);

      return () => {
          if (startupLaunchTimeoutRef.current !== null) {
              window.clearTimeout(startupLaunchTimeoutRef.current);
              startupLaunchTimeoutRef.current = null;
          }
      };
  }, [mode, isStageReady, startupAssetsReady, startupDisplayedProgress, startGame]);

  const handleJoystick = (vec: { x: number, y: number }) => {
    inputVector.current = vec;
  };

  const handleDashAction = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (dashCooldownCurrent <= 0 && (mode === GameMode.BATTLE || mode === GameMode.OVERWORLD)) onDash();
  };

  const handleSubmitScore = () => {
      if (playerName.trim().length > 0) {
          submitScore(playerName);
          setScoreSubmitted(true);
      }
  };
  
  const handleReset = () => {
      setScoreSubmitted(false);
      setPlayerNameInput('');
      resetGame();
  };

  const handleAnswerSelect = (option: 'A' | 'B') => {
      setHighlightedPortal(`p_${option}`);
      setQuizOpen(false);
  };

  const renderMinimap = () => {
    if (mode !== GameMode.OVERWORLD) return null;
    const mapSize = 120; const mapRadius = mapSize / 2; const center = mapRadius; const scale = 3; 

    // SHOP COORDINATES: Must match Scene.tsx (x: 15, z: -5)
    const SHOP_POS = { x: 15, z: -5 };

    // Shop Marker
    const dxShop = SHOP_POS.x - worldPosition.x;
    const dzShop = SHOP_POS.z - worldPosition.z;
    const distShop = Math.sqrt(dxShop * dxShop + dzShop * dzShop);
    const angleShop = Math.atan2(dzShop, dxShop);
    const renderDistShop = Math.min(distShop * scale, mapRadius - 12);
    const shopPinX = Math.cos(angleShop) * renderDistShop;
    const shopPinY = Math.sin(angleShop) * renderDistShop;

    return (
      <div 
        className="absolute top-4 right-4 w-[120px] h-[120px] rounded-full bg-black/60 border-2 border-slate-500 overflow-hidden pointer-events-none z-50 retro-border origin-top-right transition-transform"
        style={{ transform: isShortHeight ? 'scale(0.7)' : 'scale(1)' }}
      >
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/20 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_4px_white]" />
        
        {/* SHOP ICON ON MINIMAP */}
        <div 
            className="absolute text-[10px] -translate-x-1/2 -translate-y-1/2"
            style={{ 
                top: center + shopPinY, 
                left: center + shopPinX 
            }}
        >
            ♻️
        </div>

        {portals.map(portal => {
            const dx = portal.x - worldPosition.x; const dz = portal.z - worldPosition.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx); 
            const renderDist = Math.min(dist * scale, mapRadius - 8); 
            const pinX = Math.cos(angle) * renderDist; const pinY = Math.sin(angle) * renderDist;
            let portalColor = portal.colorOverride || '#00ffff'; let size = 3;
            if (portal.type === 'BOSS') size = 4;
            
            const isHighlighted = highlightedPortalId === portal.id;

            return (
                <div key={portal.id} className="absolute" style={{ top: center + pinY, left: center + pinX }}>
                    <div 
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white flex items-center justify-center ${portal.type === 'BOSS' || isHighlighted ? 'animate-pulse' : ''}`} 
                        style={{ 
                            width: (isHighlighted ? size * 7 : size * 4), 
                            height: (isHighlighted ? size * 7 : size * 4), 
                            backgroundColor: portalColor, 
                            boxShadow: `0 0 ${isHighlighted ? '12px' : '4px'} ${portalColor}`,
                            zIndex: isHighlighted ? 10 : 1
                        }} 
                    >
                        {portal.quizOption && (
                            <span className="text-[7px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                                {portal.quizOption === 'A' ? 'Y' : portal.quizOption === 'B' ? 'N' : portal.quizOption}
                            </span>
                        )}
                    </div>
                </div>
            );
        })}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-gray-400">N</div>
      </div>
    );
  };
  
  // --- LOADING SCREEN ---
  if (mode === GameMode.LOADING_LEVEL) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
              <div className="text-center p-8 max-w-lg">
                  <h2 className="text-3xl md:text-4xl text-green-400 font-bold mb-6 animate-pulse">CONSULTING GAIA...</h2>
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"/>
                  <div className="bg-slate-900 border-2 border-slate-700 p-6 rounded-lg retro-border h-40 flex items-center justify-center">
                     <p className="text-yellow-200 text-sm md:text-base italic leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500 key={loadingTipIndex}">
                         {loadingTips[loadingTipIndex]}
                     </p>
                  </div>
              </div>
          </div>
      );
  }

  // --- VICTORY SCREEN (NEW) ---
  if (mode === GameMode.VICTORY) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] p-4 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{ backgroundImage: 'radial-gradient(circle, #facc15 1px, transparent 1px)', backgroundSize: '30px 30px' }}
              />
              <div className="bg-slate-900/90 border-4 border-yellow-500 retro-border w-full max-w-2xl p-8 text-center relative shadow-[0_0_100px_rgba(234,179,8,0.3)] flex flex-col gap-6 animate-in zoom-in duration-700">
                  
                  <div className="mb-4">
                      <div className="text-6xl mb-4 animate-bounce">🏆</div>
                      <h1 className="text-3xl md:text-5xl font-black text-yellow-400 tracking-tighter drop-shadow-lg mb-2">
                          MISSION COMPLETE
                      </h1>
                      <p className="text-yellow-200 font-bold tracking-widest text-sm uppercase">Protocol Gemini: Success</p>
                  </div>

                  <div className="bg-black/40 p-6 rounded border border-yellow-500/30 grid grid-cols-2 gap-4 text-left">
                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Final Clearance</div>
                          <div className="text-white font-bold text-xl">Stage 10 Cleared</div>
                      </div>
                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Eco-Rating</div>
                          <div className="text-green-400 font-bold text-xl">S-Class Guardian</div>
                      </div>
                      
                      <div className="col-span-2 border-t border-white/10 my-2"></div>

                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Total CO2 Saved</div>
                          <div className="text-green-300 font-bold text-2xl">{playerStats.lifetimeCarbon || playerStats.carbonSaved} kg</div>
                      </div>
                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Hostiles Purged</div>
                          <div className="text-red-300 font-bold text-2xl">{playerStats.enemiesKilled}</div>
                      </div>
                  </div>

                  <div className="text-gray-300 italic text-sm md:text-base leading-relaxed">
                      "The balance is restored. The biomes breathe once more. Thank you, Guardian."
                  </div>

                  <button 
                      onClick={() => setMode(GameMode.MENU)}
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-4 font-bold retro-btn retro-border text-xl shadow-lg mt-4"
                  >
                      RETURN TO BASE
                  </button>
              </div>
          </div>
      );
  }

  // --- LEVEL UP REWARD (GameMode.REWARD) ---
  if (mode === GameMode.REWARD) {
      const rerollCost = 100 * Math.pow(2, playerStats.rerollCount || 0);
      const canReroll = playerStats.carbonSaved >= rerollCost;
      const equippedWeapons = Object.entries(playerStats.unlockedWeapons);
      const equippedPassives = Object.entries(playerStats.unlockedPassives).filter(([_, l]) => (l as number) > 0);

      // Helper to determine text label based on type
      const getTypeLabel = (opt: UpgradeOption) => {
          if (opt.isEvolution) return 'Evolution';
          if (opt.type === 'WEAPON') return opt.isNewWeapon ? 'New Weapon' : 'Weapon Upgrade';
          if (opt.type === 'PASSIVE') return 'Passive Item';
          if (opt.type === 'STAT') return 'Stat Boost';
          return 'Upgrade';
      };

      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[100] p-4 pointer-events-auto">
              <div className="bg-slate-900 border-4 border-yellow-500 retro-border w-full max-w-5xl max-h-[95vh] flex flex-col relative shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                  
                  {/* Header */}
                  <div className="p-4 md:p-6 text-center border-b border-gray-700 bg-slate-800 flex justify-between items-center">
                        <div className="text-left">
                            <h2 className="text-2xl md:text-4xl text-yellow-400 font-bold tracking-widest animate-pulse">LEVEL UP!</h2>
                            <div className="text-gray-400 text-xs md:text-sm mt-1">Select an enhancement for your Eco-Guardian</div>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={rerollLevelUpOptions}
                                disabled={!canReroll}
                                className={`px-4 py-2 font-bold border-2 rounded flex flex-col items-center justify-center text-xs ${canReroll ? 'bg-orange-700 border-orange-500 text-white hover:bg-orange-600' : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'}`}
                            >
                                <span className="text-lg">🎲</span>
                                <span>REROLL {rerollCost}kg</span>
                            </button>
                            <button 
                                onClick={askForUpgradeAdvice}
                                disabled={adviceLoading}
                                className={`px-4 py-2 font-bold border-2 rounded flex flex-col items-center justify-center text-xs ${adviceLoading ? 'bg-purple-900/50 border-purple-800 text-gray-400' : 'bg-purple-700 border-purple-500 text-white hover:bg-purple-600'}`}
                            >
                                <span className="text-lg">🧠</span>
                                <span>ASK GAIA</span>
                            </button>
                        </div>
                  </div>

                  {/* Gaia Advice Overlay - Positioned above options for better visibility */}
                  {adviceResult && (
                        <div className="mx-4 md:mx-6 mt-4 bg-purple-900/90 border-2 border-purple-500 p-3 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 rounded">
                            <div className="text-3xl shrink-0">💡</div>
                            <div>
                                <h4 className="text-purple-200 font-bold text-xs uppercase mb-1">Gaia's Insight:</h4>
                                <p className="text-white text-sm italic leading-relaxed">"{adviceResult.reason}"</p>
                            </div>
                        </div>
                  )}

                  {/* Options */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {levelUpOptions.map((option) => {
                          const isRecommended = adviceResult?.recommendedOptionId === option.id;
                          const isEvolution = option.isEvolution;
                          const isWeapon = option.type === 'WEAPON';
                          const isPassive = option.type === 'PASSIVE';
                          const isStat = option.type === 'STAT';

                          let borderColor = 'border-gray-600';
                          let bgColor = 'bg-slate-800';
                          let titleColor = 'text-white';
                          let shadowClass = '';

                          // Style priority: Recommended > Evolution > Weapon > Passive > Stat
                          if (isEvolution) {
                              borderColor = 'border-yellow-500'; // Gold Border
                              titleColor = 'text-yellow-300';
                              shadowClass = 'shadow-[0_0_20px_rgba(234,179,8,0.3)]';
                          } else if (isWeapon) {
                              borderColor = 'border-purple-500'; // Purple Border for weapons
                              titleColor = 'text-purple-300';
                          } else if (isPassive) {
                              borderColor = 'border-blue-500';
                              titleColor = 'text-blue-300';
                          } else if (isStat) {
                              borderColor = 'border-slate-500';
                              titleColor = 'text-gray-300';
                          }

                          // Override if recommended
                          if (isRecommended) {
                              borderColor = 'border-green-400';
                              shadowClass = 'shadow-[0_0_25px_rgba(74,222,128,0.6)] z-10 scale-[1.02]';
                          }

                          return (
                              <button
                                  key={option.id}
                                  onClick={() => selectUpgrade(option)}
                                  className={`relative ${bgColor} border-4 ${borderColor} ${shadowClass} p-4 rounded hover:bg-slate-700 transition-all group flex flex-col items-start text-left gap-2 h-full`}
                              >
                                  {isRecommended && (
                                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg border border-green-300 animate-pulse tracking-wider z-20 whitespace-nowrap">
                                          RECOMMENDED
                                      </div>
                                  )}
                                  
                                  {isEvolution && <div className="absolute top-0 right-0 bg-yellow-600 text-white text-[10px] font-bold px-2 py-1">EVO</div>}
                                  {option.isNewWeapon && !isEvolution && <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1">NEW</div>}
                                  
                                  <div className="flex items-center gap-3 mb-2 w-full mt-2">
                                    <div className="text-4xl group-hover:scale-110 transition-transform">{option.icon}</div>
                                    <div>
                                        <h3 className={`font-bold text-base leading-tight ${titleColor}`}>{option.label}</h3>
                                        <p className="text-gray-400 text-[10px] uppercase tracking-wide">{getTypeLabel(option)}</p>
                                    </div>
                                  </div>
                                  
                                  <p className="text-gray-300 text-xs leading-relaxed mb-2 min-h-[40px]">{option.description}</p>
                                  
                                  {/* Evolution Recipe Visualization */}
                                  {option.type === 'WEAPON' && !option.isEvolution && (
                                    <div className="mt-auto w-full bg-black/40 p-2 rounded border border-white/10">
                                        {EVOLUTION_RECIPES.filter(r => r.ingredients.includes(option.key)).length > 0 ? (
                                            EVOLUTION_RECIPES.filter(r => r.ingredients.includes(option.key)).map(recipe => {
                                                const partnerKey = recipe.ingredients.find(i => i !== option.key)!;
                                                const partner = WEAPONS_DATA[partnerKey];
                                                const result = WEAPONS_DATA[recipe.result];
                                                const hasPartner = !!playerStats.unlockedWeapons[partnerKey];
                                                
                                                return (
                                                    <div key={recipe.result} className="flex items-center gap-2 mb-1 last:mb-0">
                                                        <span className="text-base">{option.icon}</span>
                                                        <span className="text-gray-500 text-[10px]">+</span>
                                                        <div className="relative">
                                                            <span className={`text-base ${!hasPartner ? 'opacity-40 grayscale' : ''}`}>{partner?.icon || '❓'}</span>
                                                            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[8px] border ${hasPartner ? 'bg-green-600 border-green-400 text-white' : 'bg-red-600 border-red-400 text-white'}`}>
                                                                {hasPartner ? '✓' : '✕'}
                                                            </div>
                                                        </div>
                                                        <span className="text-blue-400 text-[10px]">➜</span>
                                                        <span className="text-base">{result?.icon || '⭐'}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-[10px] text-gray-500 italic">No known evolutions</div>
                                        )}
                                    </div>
                                  )}
                              </button>
                          );
                      })}
                  </div>

                  {/* Footer: Arsenal */}
                  <div className="p-4 bg-slate-950 border-t border-gray-700">
                        <div className="flex items-center gap-2 mb-3 text-yellow-500 text-xs font-bold uppercase tracking-widest">
                            <span>▶</span> CURRENT ARSENAL
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {equippedWeapons.map(([key, level]) => {
                                const data = WEAPONS_DATA[key];
                                if(!data) return null;
                                return (
                                    <div key={key} className="w-10 h-10 bg-slate-800 border border-gray-600 rounded flex flex-col items-center justify-center relative group">
                                        <span className="text-xl">{data.icon}</span>
                                        <div className="absolute -bottom-1 right-0 bg-black text-[8px] text-white px-1 border border-gray-600">Lv.{level as number}</div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-2 rounded whitespace-nowrap z-50 border border-gray-500">
                                            {data.label} (Lv.{level as number})
                                        </div>
                                    </div>
                                )
                            })}
                            {Array.from({length: Math.max(0, playerStats.maxWeaponSlots - equippedWeapons.length)}).map((_, i) => (
                                <div key={`empty_${i}`} className="w-10 h-10 bg-black/30 border border-dashed border-gray-700 rounded flex items-center justify-center">
                                    <span className="text-gray-700 text-lg">+</span>
                                </div>
                            ))}
                            
                            {/* Passives Separator */}
                            <div className="w-px h-10 bg-gray-700 mx-2"></div>

                            {equippedPassives.map(([key, level]) => {
                                const data = PASSIVES_DATA[key];
                                if(!data) return null;
                                return (
                                    <div key={key} className="w-8 h-8 bg-blue-900/20 border border-blue-800 rounded-full flex items-center justify-center relative group">
                                        <span className="text-sm">{data.icon}</span>
                                        <div className="absolute -bottom-1 -right-1 bg-black text-[7px] text-white px-1 border border-blue-800 rounded">Lv.{level as number}</div>
                                    </div>
                                )
                            })}
                        </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- CHEST REWARD (GameMode.CHEST_REWARD) ---
  if (mode === GameMode.CHEST_REWARD && chestReward) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[100] p-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-slate-900 border-4 border-yellow-400 retro-border w-full max-w-md p-8 text-center flex flex-col gap-6 shadow-[0_0_100px_rgba(250,204,21,0.5)] relative overflow-hidden">
                  {/* Rays Effect */}
                  <div className="absolute inset-0 animate-[spin_10s_linear_infinite] opacity-10 pointer-events-none" 
                       style={{background: 'conic-gradient(from 0deg, transparent 0deg, yellow 20deg, transparent 40deg, yellow 60deg, transparent 80deg, yellow 100deg, transparent 120deg, yellow 140deg, transparent 160deg, yellow 180deg, transparent 200deg, yellow 220deg, transparent 240deg, yellow 260deg, transparent 280deg, yellow 300deg, transparent 320deg, yellow 340deg, transparent 360deg)'}}>
                  </div>

                  <h2 className="text-3xl text-yellow-300 font-black tracking-widest drop-shadow-md z-10">TREASURE FOUND!</h2>
                  
                  <div className="bg-black/50 p-6 rounded border-2 border-yellow-600/50 flex flex-col items-center gap-4 z-10">
                      <div className="text-6xl animate-bounce">{chestReward.icon}</div>
                      <div>
                          <h3 className="text-xl font-bold text-white">{chestReward.label}</h3>
                          <p className="text-gray-300 text-sm mt-1">{chestReward.description}</p>
                      </div>
                  </div>

                  <button 
                      onClick={claimChestReward}
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-4 font-bold retro-btn retro-border text-xl shadow-lg z-10"
                  >
                      CLAIM LOOT
                  </button>
              </div>
          </div>
      );
  }

  // --- LEADERBOARD ---
  if (mode === GameMode.LEADERBOARD) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-50">
            <div className="bg-slate-900 p-6 retro-border w-full max-w-2xl border-4 border-yellow-600 h-[80vh] flex flex-col relative">
                <div className="flex justify-between items-center mb-6 border-b-2 border-yellow-800 pb-4">
                    <h2 className="text-2xl md:text-3xl text-yellow-400 font-bold tracking-wider">HALL OF HEROES</h2>
                    {/* Database Status Indicator */}
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-gray-700">
                        <div className={`w-3 h-3 rounded-full ${dbStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_lime]' : (dbStatus === 'local' ? 'bg-orange-500' : 'bg-red-500')}`} />
                        <span className={`text-[10px] font-bold ${dbStatus === 'connected' ? 'text-green-400' : (dbStatus === 'local' ? 'text-orange-400' : 'text-red-400')}`}>
                            {dbStatus === 'connected' ? 'CLOUD SYNC' : (dbStatus === 'local' ? 'LOCAL STORAGE' : 'OFFLINE')}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-6 bg-black/40 p-2 retro-border border-slate-700">
                    {highScores.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 italic">No records found yet. Be the first!</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-yellow-200 border-b border-gray-700 text-xs md:text-sm">
                                    <th className="p-2">RANK</th>
                                    <th className="p-2">NAME</th>
                                    <th className="p-2 text-center">STAGE</th>
                                    <th className="p-2 text-right">TOTAL CO2</th>
                                    <th className="p-2 text-right">DMG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {highScores.map((score, index) => (
                                    <tr key={index} className={`border-b border-gray-800 text-xs md:text-base ${index === 0 ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
                                        <td className="p-3">#{index + 1}</td>
                                        <td className="p-3">{score.name}</td>
                                        <td className="p-3 text-center">{score.stage}</td>
                                        <td className="p-3 text-right text-green-400">{score.carbonSaved || 0}kg</td>
                                        <td className="p-3 text-right">{(score.damage / 1000).toFixed(1)}k</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="flex gap-4">
                    <button onClick={() => fetchLeaderboard()} className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-4 font-bold retro-btn retro-border text-lg">
                        REFRESH
                    </button>
                    <button onClick={() => setMode(GameMode.MENU)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 font-bold retro-btn retro-border text-lg">
                        BACK TO MENU
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // --- GAME OVER ---
  if (mode === GameMode.GAMEOVER) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] p-4">
              <div className="bg-slate-900 border-4 border-red-600 retro-border w-full max-w-lg p-8 text-center flex flex-col gap-6 animate-in zoom-in duration-300 shadow-[0_0_50px_red]">
                  <h2 className="text-4xl md:text-6xl text-red-500 font-black mb-2 tracking-tighter drop-shadow-md">DEFEATED</h2>
                  
                  <div className="bg-black/40 p-4 rounded border border-red-900/50">
                      <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest">Cause of Failure</p>
                      <p className="text-white text-lg font-bold">Overwhelmed by Pollution</p>
                  </div>

                  {gameOverMessage && (
                      <div className="text-gray-300 italic text-sm border-l-2 border-red-500 pl-4 text-left">
                          "{gameOverMessage}"
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm bg-red-950/30 p-4 rounded">
                      <div className="text-left">
                          <div className="text-gray-500 text-xs uppercase">Stage Reached</div>
                          <div className="text-white font-bold text-xl">{activeStage}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-gray-500 text-xs uppercase">CO2 Saved</div>
                          <div className="text-green-400 font-bold text-xl">{playerStats.lifetimeCarbon || playerStats.carbonSaved}</div>
                      </div>
                  </div>

                  {!scoreSubmitted ? (
                      <div className="flex flex-col gap-2">
                          <input 
                              type="text" 
                              placeholder="ENTER HERO NAME" 
                              maxLength={10}
                              className="bg-black border-2 border-gray-600 p-3 text-center text-white font-bold uppercase focus:border-yellow-500 outline-none retro-border"
                              value={playerName}
                              onChange={(e) => setPlayerNameInput(e.target.value.toUpperCase())}
                          />
                          <button 
                              onClick={handleSubmitScore}
                              disabled={playerName.length === 0}
                              className={`w-full py-3 font-bold retro-btn retro-border text-lg transition-all ${playerName.length > 0 ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                          >
                              SUBMIT SCORE
                          </button>
                      </div>
                  ) : (
                      <div className="text-green-400 font-bold py-2 border-2 border-green-500 bg-green-900/20 rounded animate-pulse">
                          SCORE UPLOADED
                      </div>
                  )}

                  <button 
                      onClick={handleReset}
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 font-bold retro-btn retro-border text-xl mt-2"
                  >
                      TRY AGAIN
                  </button>
              </div>
          </div>
      );
  }

  // --- MAIN MENU ---
  if (mode === GameMode.MENU) {
    return (
      <div 
        className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url('${ASSET_PATHS.images.start.background}')` }}
      >
        {/* Dark overlay for better menu contrast */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* --- TOP RIGHT CONTROLS (Fixed Position) --- */}
        <div className="absolute top-4 right-4 z-50 flex gap-2 pointer-events-auto">
            <button 
                onClick={toggleFullScreen}
                className="p-3 bg-slate-800/80 border-2 border-slate-600 rounded-full text-white hover:bg-slate-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center backdrop-blur-sm"
                title="Toggle Fullscreen"
            >
                {isFullScreen ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m15 3l2.3 2.3l-2.89 2.87l1.42 1.42L18.7 6.7L21 9V3zM3 9l2.3-2.3l2.87 2.89l1.42-1.42L6.7 5.3L9 3H3zm6 12l-2.3-2.3l2.89-2.87l-1.42-1.42L5.3 17.3L3 15v6zm12-6l-2.3 2.3l-2.87-2.89l-1.42 1.42l2.89 2.87L15 21h6z"/></svg>
                )}
            </button>
            <button 
                onClick={toggleMute}
                className="p-3 bg-slate-800/80 border-2 border-slate-600 rounded-full text-xl hover:bg-slate-700 transition-colors shadow-lg active:scale-95 backdrop-blur-sm"
                title="Toggle Sound"
            >
                {isMuted ? '🔇' : '🔊'}
            </button>
        </div>

        {/* --- MAIN INTERFACE (Scalable) --- */}
        <div 
            className="relative z-10 flex flex-col items-center justify-center h-full w-full px-4 transition-transform duration-200 ease-out"
            style={{ transform: `scale(${uiScale})` }}
        >
            <div className="max-w-lg w-full flex flex-col items-center mt-12 md:mt-16">
                
                {/* TITLE IMAGE - CLICKABLE FOR AUDIO START */}
                <button 
                    className="mb-12 cursor-pointer focus:outline-none hover:scale-105 transition-transform duration-500" 
                    onClick={() => {
                        const audio = document.querySelector('audio');
                        if (audio && audio.paused) audio.play().catch(e => console.log(e));
                    }}
                >
                    <img
                        src={ASSET_PATHS.images.start.title}
                        alt="ECO GUARDIAN"
                        className="w-full max-w-4xl drop-shadow-[0_0_25px_rgba(74,222,128,0.6)]"
                        style={{ transform: 'scale(1.4)', transformOrigin: 'center' }}
                    />
                </button>

                {/* CONTROL PANEL */}
                <div className="
                relative mb-6 w-full
                bg-slate-950/70
                border border-cyan-400/30
                shadow-[0_0_60px_rgba(34,211,238,0.15)]
                p-8
                ">
                {/* Scanlines + subtle noise */}
                <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
                    style={{
                        backgroundImage:
                        "repeating-linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)"
                    }}
                />
                <div className="pointer-events-none absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                        "radial-gradient(circle at 50% 0%, rgba(34,211,238,0.25), transparent 60%)"
                    }}
                />

                {/* Pixel corners */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-cyan-300/80 border border-black" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-300/80 border border-black" />
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-cyan-300/80 border border-black" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-cyan-300/80 border border-black" />

                <p className="text-center text-gray-400 text-xs mb-6 uppercase tracking-widest border-b border-slate-800 pb-4 font-mono">
                    <span className="text-cyan-300 mr-2">●</span> PROTOCOL ONLINE <span className="text-green-400 ml-2">●</span>
                </p>

                <div className="space-y-4">
                    <button
                    onClick={() => preloadGame('MEDIUM')}
                    className="
                        group relative w-full
                        bg-gradient-to-r from-cyan-600 to-emerald-600
                        hover:from-cyan-500 hover:to-emerald-500
                        text-white py-5 font-extrabold
                        border border-cyan-200/30
                        shadow-[0_0_25px_rgba(34,211,238,0.25)]
                        active:translate-y-0.5 transition-all overflow-hidden
                    "
                    >
                    {/* Shine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-[120%] group-hover:animate-[shine_1s_infinite]" />
                    <span className="flex items-center justify-center gap-3 text-xl tracking-wider drop-shadow-md">
                        <span className="animate-pulse"> START MISSION</span>
                    </span>
                    </button>

                    <div className="flex gap-4">
                    <button
                        onClick={() => setMode(GameMode.LIBRARY)}
                        className="
                        flex-1 bg-slate-900/80 hover:bg-slate-800
                        text-cyan-300 py-3 font-bold
                        border border-cyan-400/25
                        shadow-[0_0_20px_rgba(34,211,238,0.12)]
                        active:translate-y-0.5 transition-all
                        "
                    >
                        <span className="text-sm tracking-wider flex items-center justify-center gap-2">
                        <span className="text-cyan-300"> GRIMOIRE</span>
                        </span>
                    </button>

                    <button
                        onClick={() => setMode(GameMode.LEADERBOARD)}
                        className="
                        flex-1 bg-slate-900/80 hover:bg-slate-800
                        text-emerald-300 py-3 font-bold
                        border border-emerald-400/25
                        shadow-[0_0_20px_rgba(16,185,129,0.12)]
                        active:translate-y-0.5 transition-all
                        "
                    >
                        <span className="text-sm tracking-wider flex items-center justify-center gap-2">
                        <span className="text-emerald-300"> LEADERBOARD</span>
                        </span>
                    </button>
                    </div>
                </div>

                <style>{`@keyframes shine { 100% { transform: translateX(120%); } }`}</style>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-slate-800 text-center flex justify-between items-center text-[10px] text-gray-500 font-mono">
                    <span>VER 1.7</span>
                    <span>{isMobile ? "TOUCH ENABLED" : "KEYBOARD READY"}</span>
                </div>
                </div>

                {/* HERO SPRITE ANIMATION */}
                <div className="relative mt-2 group pointer-events-none top-6">
                    <div className="absolute inset-0 bg-green-500/10 blur-2xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-1000" />
                    <MenuHero />
                </div>

            </div>
        </div>
      </div>
    );
  }

  // --- NEW MODALS ---
  if (mode === GameMode.STATUS) {
      return <StatusModal />;
  }

  if (mode === GameMode.LIBRARY) {
      return <LibraryModal />;
  }

  if (mode === GameMode.SHOP) {
      return <ShopModal />;
  }

  // --- IMPACT HISTORY MODAL ---
  if (isImpactOpen) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] p-4 pointer-events-auto">
              <div className="bg-slate-900 border-4 border-green-500 retro-border w-full max-w-2xl h-[90vh] flex flex-col relative">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-slate-800">
                      <h2 className="text-xl md:text-2xl text-green-400 font-bold">IMPACT REPORT</h2>
                      <button onClick={() => setImpactOpen(false)} className="text-white font-bold text-xl px-2">✕</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-green-900/20 p-4 border-b border-gray-700 text-center">
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Lifetime Saved (Score)</div>
                        <div className="text-2xl md:text-3xl font-bold text-white text-shadow-lg">{playerStats.lifetimeCarbon || playerStats.carbonSaved} <span className="text-sm text-green-400">kg</span></div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Wallet</div>
                        <div className="text-2xl md:text-3xl font-bold text-yellow-300 text-shadow-lg">{playerStats.carbonSaved} <span className="text-sm text-yellow-500">kg</span></div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {playerStats.impactHistory.length === 0 ? (
                          <div className="text-center text-gray-500 italic mt-10">No impact data recorded yet. Complete stages or scans to see history!</div>
                      ) : (
                          playerStats.impactHistory.map((entry: any, idx) => (
                              <div key={entry.id || idx} className={`p-4 border-l-4 ${entry.type === 'SCAN' ? 'border-green-500 bg-green-900/20' : (entry.isCorrect ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20')} rounded-r`}>
                                  {entry.type === 'SCAN' ? (
                                      <>
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-gray-400 text-xs">Stage {entry.stage} • ECO SCAN</span>
                                              <span className="text-gray-500 text-xs">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                          </div>
                                          <p className="text-white font-bold mb-1 text-sm md:text-base">{entry.itemName}</p>
                                          <p className="text-gray-300 text-xs italic mb-2">"{entry.feedback}"</p>
                                          <div className="text-right">
                                              <div className="text-green-400 font-bold">+{entry.carbonValue} kg</div>
                                          </div>
                                      </>
                                  ) : (
                                      <>
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-gray-400 text-xs">Stage {entry.stage} • QUIZ</span>
                                              <span className="text-gray-500 text-xs">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                          </div>
                                          <p className="text-white font-bold mb-2 text-sm md:text-base">"{entry.question}"</p>
                                          <div className="flex justify-between items-center text-sm">
                                              <div>
                                                  <div className={`font-bold ${entry.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                                                      You chose: {entry.yourAnswer}
                                                  </div>
                                                  {!entry.isCorrect && (
                                                      <div className="text-gray-400 text-xs mt-1">
                                                          Correct: {entry.correctAnswer}
                                                      </div>
                                                  )}
                                              </div>
                                              {entry.isCorrect && (
                                                  <div className="text-green-400 font-bold">+{entry.carbonValue} kg</div>
                                              )}
                                          </div>
                                      </>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
                  
                  <button onClick={() => setImpactOpen(false)} className="bg-slate-800 p-4 text-white font-bold hover:bg-slate-700 border-t border-gray-700">
                      CLOSE REPORT
                  </button>
              </div>
          </div>
      );
  }

  // --- PAUSE MODAL ---
  if (mode === GameMode.PAUSED) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[100] p-4 pointer-events-auto backdrop-blur-sm">
              <div className="bg-slate-900 border-4 border-white retro-border p-8 text-center max-w-sm w-full">
                  <h2 className="text-3xl md:text-4xl text-white font-bold mb-8">PAUSED</h2>
                  <div className="space-y-4">
                      <button onClick={togglePause} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 font-bold retro-btn retro-border text-xl">RESUME</button>
                      
                      <div className="flex gap-4">
                          <button 
                            onClick={() => setMode(GameMode.STATUS)} 
                            className="flex-1 bg-green-700 hover:bg-green-600 text-white py-3 font-bold retro-btn retro-border text-sm flex flex-col items-center justify-center"
                          >
                              <span className="text-lg">👷</span>
                              STATUS
                          </button>
                          <button 
                            onClick={() => setMode(GameMode.LIBRARY)} 
                            className="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-3 font-bold retro-btn retro-border text-sm flex flex-col items-center justify-center"
                          >
                              <span className="text-lg">📖</span>
                              GRIMOIRE
                          </button>
                      </div>

                      <div className="flex gap-2">
                        <button 
                            onClick={toggleMute} 
                            className={`flex-1 py-3 font-bold retro-btn retro-border text-sm flex items-center justify-center gap-2 transition-colors ${isMuted ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}
                        >
                            <span>{isMuted ? '🔇' : '🔊'}</span>
                            <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
                        </button>
                        
                        <button 
                            onClick={toggleFullScreen}
                            className="flex-1 py-3 font-bold retro-btn retro-border text-sm flex items-center justify-center gap-2 bg-slate-700 text-white hover:bg-slate-600"
                        >
                            {isFullScreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m15 3l2.3 2.3l-2.89 2.87l1.42 1.42L18.7 6.7L21 9V3zM3 9l2.3-2.3l2.87 2.89l1.42-1.42L6.7 5.3L9 3H3zm6 12l-2.3-2.3l2.89-2.87l-1.42-1.42L5.3 17.3L3 15v6zm12-6l-2.3 2.3l-2.87-2.89l-1.42 1.42l2.89 2.87L15 21h6z"/></svg>
                            )}
                            <span>{isFullScreen ? 'EXIT FS' : 'FULL SCR'}</span>
                        </button>
                      </div>

                      <button onClick={() => setMode(GameMode.MENU)} className="w-full bg-red-600 hover:bg-red-500 text-white py-4 font-bold retro-btn retro-border text-xl">QUIT TO MENU</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- INSTRUCTIONS / MISSION BRIEFING ---
  if (mode === GameMode.INSTRUCTIONS) {
      const startupHeadline = !isStageReady
          ? 'Consulting Gaia'
          : !startupAssetsReady
              ? 'Caching Mission Assets'
              : 'Deploying Guardian';
      const startupSummary = !isStageReady
          ? 'Generating the first biome, mission question, and combat state.'
          : !startupAssetsReady
              ? 'Preloading sprites, music, and first-run assets for a smoother mobile handoff.'
              : 'Launch window acquired. Entering the overworld now.';

      return (
          <div 
              className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden bg-cover bg-center p-4"
              style={{ backgroundImage: `url('${ASSET_PATHS.images.start.background}')` }}
          >
              <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]" />

              <div className="relative w-full max-w-4xl border border-cyan-400/30 bg-slate-950/85 p-6 md:p-8 shadow-[0_0_80px_rgba(34,211,238,0.14)]">
                  <div
                      className="pointer-events-none absolute inset-0 opacity-20"
                      style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)' }}
                  />

                  <div className="relative flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
                      <div>
                          <p className="text-cyan-300 text-[11px] uppercase tracking-[0.35em] mb-2">Mission Protocol</p>
                          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">{startupHeadline}</h2>
                          <p className="mt-3 max-w-2xl text-sm md:text-base text-slate-300 leading-relaxed">{startupSummary}</p>
                      </div>
                      <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 md:flex">
                          01
                      </div>
                  </div>

                  <div className="relative mt-6 grid gap-3 md:grid-cols-3">
                      <div className="border border-slate-800 bg-black/25 p-4">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Objective</p>
                          <p className="mt-2 text-sm text-slate-200">Cleanse 10 polluted biomes and restore balance for Gaia.</p>
                      </div>
                      <div className="border border-slate-800 bg-black/25 p-4">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Protocol</p>
                          <p className="mt-2 text-sm text-slate-200">Answer Gaia with YES or NO, then enter the matching portal for bonus carbon.</p>
                      </div>
                      <div className="border border-slate-800 bg-black/25 p-4">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Support</p>
                          <p className="mt-2 text-sm text-slate-200">Use the Eco-Exchange between waves to convert saved CO2 into upgrades.</p>
                      </div>
                  </div>

                  <div className="relative mt-6 border border-slate-800 bg-black/35 p-5">
                      <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                          <span>{currentConfig?.stageName ? `First Biome: ${currentConfig.stageName}` : 'Preparing First Biome'}</span>
                          <span>{startupDisplayedProgress}%</span>
                      </div>

                      <div className="mt-3 h-4 overflow-hidden border border-slate-700 bg-slate-900">
                          <div
                              className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300 transition-[width] duration-200 ease-out"
                              style={{ width: `${startupDisplayedProgress}%` }}
                          />
                      </div>

                      <div className="mt-4 flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
                          <p className="text-slate-200">{startupStatusDetail}</p>
                          <p className="text-slate-400">
                              {isStageReady ? 'mission data locked' : 'mission data compiling'}
                              {' · '}
                              {startupAssetsReady ? 'assets cached' : 'assets streaming'}
                          </p>
                      </div>
                  </div>

                  <div className="relative mt-6 flex flex-col gap-3 border-t border-slate-800 pt-5 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs text-slate-400">
                          The game launches automatically when the initial mission payload is fully ready.
                      </p>
                      <button 
                          onClick={() => setMode(GameMode.MENU)}
                          className="bg-slate-800 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700"
                      >
                          ABORT MISSION
                      </button>
                  </div>
              </div>
          </div>
      );
/*
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-50">
              <div className="bg-slate-900 p-6 retro-border w-full max-w-2xl border-4 border-blue-600 overflow-y-auto max-h-[90vh]">
                  <h2 className="text-2xl md:text-3xl text-blue-400 mb-6 font-bold text-center border-b-2 border-blue-900 pb-4">MISSION PROTOCOL</h2>
                  
                  <div className="space-y-6 text-sm md:text-base text-gray-200 mb-8">
                      <div className="flex gap-4 items-center">
                          <div className="text-2xl">📜</div>
                          <div>
                              <h3 className="text-yellow-400 font-bold mb-1">THE MISSION</h3>
                              <p>Pollution chokes the 10 Biomes. Gaia needs a champion to cleanse the land.</p>
                          </div>
                      </div>

                      <div className="flex gap-4 items-center">
                          <div className="text-2xl">🌿</div>
                          <div>
                              <h3 className="text-green-400 font-bold mb-1">GAIA'S CHALLENGE</h3>
                              <p>Gaia asks a <span className="text-green-300 font-bold">YES or NO</span> sustainability question. Walk into the matching portal — answer correctly for <span className="text-yellow-300 font-bold">+100kg CO2!</span></p>
                          </div>
                      </div>

                      <div className="flex gap-4 items-center">
                          <div className="text-2xl">⚔️</div>
                          <div>
                              <h3 className="text-red-400 font-bold mb-1">BATTLE</h3>
                              <p>Survive two mob waves, answer both challenges, then face the <span className="text-red-300 font-bold">Stage Boss.</span> Collect ORBS for CO2 currency.</p>
                          </div>
                      </div>

                      <div className="flex gap-4 items-center">
                          <div className="text-2xl">♻️</div>
                          <div>
                              <h3 className="text-blue-400 font-bold mb-1">THE SHOP</h3>
                              <p>Visit the <span className="text-blue-300 font-bold">Eco-Exchange</span> near the Landmark to spend CO2 on upgrades.</p>
                          </div>
                      </div>
                  </div>

                  <button 
                      onClick={startGame}
                      className="w-full bg-green-600 hover:bg-green-500 text-white py-4 font-bold retro-btn retro-border text-xl"
                  >
                      I AM READY
                  </button>
              </div>
          </div>
      );
*/
  }

  // --- QUIZ RESULT MODAL ---
  if (mode === GameMode.QUIZ_RESULT && quizResult) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[100] p-4 animate-in fade-in duration-300">
              <div className={`flex flex-col w-full max-w-lg max-h-[90vh] retro-border border-4 ${quizResult.correct ? 'bg-green-900/90 border-green-400' : 'bg-red-900/90 border-red-400'}`}>
                  
                  {/* Header */}
                  <div className="p-6 pb-2 shrink-0 text-center">
                    <h2 className={`text-2xl md:text-4xl mb-2 font-bold ${quizResult.correct ? 'text-green-300' : 'text-red-300'}`}>
                        {quizResult.correct ? "GAIA APPROVES!" : "OOPS!"}
                    </h2>
                  </div>
                  
                  {/* Scrollable Body */}
                  <div ref={resultScrollRef} className="overflow-y-auto p-6 pt-0 flex-1 text-center">
                    {quizResult.bonus && (
                        <div className="text-yellow-300 font-bold animate-pulse mb-4 text-lg">
                            ★ BONUS CHEST UNLOCKED ★
                        </div>
                    )}

                    <p className="text-white text-base mb-2">You answered: <span className="font-bold text-xl">{quizResult.answerLabel}</span></p>

                    {quizResult.correct ? (
                        <div className="text-green-400 font-bold text-sm mb-4">
                            +{quizResult.carbonValue}kg CO2 Saved!
                        </div>
                    ) : (
                        <div className="text-red-400 font-bold text-sm mb-4">
                            The oceans felt that one.
                        </div>
                    )}

                    <div className="bg-black/40 p-4 rounded mb-2 text-sm md:text-base text-gray-200 italic border border-white/20 leading-relaxed">
                        {quizResult.explanation}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 pt-4 shrink-0">
                    <button 
                        onClick={dismissQuizResult}
                        className="w-full py-3 bg-white text-black font-bold retro-btn retro-border hover:bg-gray-200 text-lg"
                    >
                        CONTINUE
                    </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- BOSS WARNING MODAL (New) ---
  if (bossNarrativeOpen && currentConfig?.boss) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[100] p-4 animate-in fade-in duration-300">
              <div className="bg-red-900/80 p-6 retro-border w-full max-w-lg border-4 border-red-600 shadow-[0_0_50px_red] max-h-[90vh] flex flex-col">
                  <div className="text-center mb-6 shrink-0">
                      <h2 className="text-3xl md:text-5xl text-red-500 font-bold animate-pulse tracking-widest" style={{ textShadow: '2px 2px black'}}>WARNING</h2>
                      <div className="h-1 bg-red-600 w-full mt-2"></div>
                  </div>
                  
                  <div 
                    ref={scrollRef} 
                    className="bg-black/50 p-6 rounded border border-red-800 mb-6 text-center overflow-y-auto flex-1"
                    style={{ touchAction: 'pan-y' }}
                  >
                      <h3 className="text-red-300 text-xl font-bold mb-4">{currentConfig.boss.name} DETECTED</h3>
                      <p className="text-white text-lg leading-relaxed italic">
                          "{currentConfig.boss.narrative}"
                      </p>
                  </div>

                  <button 
                      onClick={dismissBossNarrative}
                      className="w-full bg-red-600 hover:bg-red-500 text-white py-4 font-bold retro-btn retro-border text-xl animate-bounce shrink-0"
                  >
                      ENGAGE THREAT
                  </button>
              </div>
          </div>
      );
  }

  // --- GAIA YES/NO MODAL ---
  if (isQuizOpen && currentConfig?.quiz && !showNarrative) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 z-[100] p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border-4 border-green-500 retro-border w-full max-w-md relative shadow-[0_0_50px_rgba(34,197,94,0.3)] flex flex-col max-h-[90vh]">

                  <div className="p-6 pb-3 shrink-0 text-center">
                      <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Gaia Asks...</p>
                      <h2 className="text-yellow-300 text-lg md:text-xl font-bold leading-snug">
                          {currentConfig.quiz.question}
                      </h2>
                  </div>

                  <div className="flex gap-4 px-6 pb-6 shrink-0">
                      <button
                          onClick={() => handleAnswerSelect('A')}
                          className="flex-1 py-5 bg-green-700 hover:bg-green-600 border-4 border-green-400 retro-border retro-btn text-white font-black text-3xl tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-colors"
                      >
                          YES
                      </button>
                      <button
                          onClick={() => handleAnswerSelect('B')}
                          className="flex-1 py-5 bg-red-700 hover:bg-red-600 border-4 border-red-400 retro-border retro-btn text-white font-black text-3xl tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-colors"
                      >
                          NO
                      </button>
                  </div>

                  <div className="px-6 pb-5 shrink-0 text-center">
                      <p className="text-slate-400 text-xs">Walk into the portal matching your answer</p>
                      <button onClick={() => setQuizOpen(false)} className="mt-3 text-slate-500 hover:text-white text-xs underline">
                          Dismiss
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- SLOT LOGIC FOR HUD ---
  const MAX_DISPLAY_WEAPONS = 5;
  const weaponSlotsUI = [];
  const unlockedWeaponsArr = Object.entries(playerStats.unlockedWeapons).filter(([_, lvl]) => (lvl as number) > 0);

  const EVO_KEYS = ['MAGIC_ARROW', 'FIRE_MORTAR', 'JAVELIN', 'TOXIC_FLASK', 'CHAIN_LIGHTNING', 'HOLY_BEAM', 'PLAGUE_SPREADER', 'TESLA_COIL'];

  for (let i = 0; i < MAX_DISPLAY_WEAPONS; i++) {
     if (i < playerStats.maxWeaponSlots) {
         if (i < unlockedWeaponsArr.length) {
             weaponSlotsUI.push({ status: 'FILLED', data: unlockedWeaponsArr[i] });
         } else {
             weaponSlotsUI.push({ status: 'EMPTY' });
         }
     } else {
         weaponSlotsUI.push({ status: 'LOCKED' });
     }
  }

  const passiveSlotsUI = Object.entries(playerStats.unlockedPassives || {}).filter(([_, lvl]) => (lvl as number) > 0);

  const maxDashCooldown = playerStats.dashCooldownTime;
  const dashProgress = Math.max(0, Math.min(1, 1 - (dashCooldownCurrent / maxDashCooldown)));
  const dashRadius = 40;
  const dashCircumference = 2 * Math.PI * dashRadius;
  const dashOffset = dashCircumference * (1 - dashProgress);

  return (
    <>
      {showNarrative && currentConfig && (
           <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[90%] md:w-[600px] z-[60] animate-in fade-in slide-in-from-top-4 duration-1000 pointer-events-auto">
               <div className="bg-black/90 border-2 border-green-500 p-6 retro-border backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.3)] flex flex-col items-center">
                   <h3 className="text-green-400 text-center text-xl mb-4 font-bold tracking-widest">{currentConfig.stageName.toUpperCase()}</h3>
                   <p className="text-white text-center italic text-sm mb-6 leading-relaxed">"{currentConfig.narrativeIntro}"</p>
                   
                   <button 
                       onClick={handleDismissNarrative}
                       className="px-8 py-3 bg-green-700 hover:bg-green-600 text-white font-bold retro-btn retro-border text-sm tracking-wider animate-pulse transition-transform active:scale-95"
                   >
                       TAP TO CONTINUE
                   </button>
               </div>
           </div>
      )}
      
      {isGenerating && mode === GameMode.OVERWORLD && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] animate-pulse">
              <div className="bg-black/90 border-2 border-blue-400 p-4 retro-border text-blue-200 text-xs font-bold tracking-widest flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-400 animate-ping"/>
                  DECRYPTING SIGNAL...
              </div>
          </div>
      )}

      {battleWon && !chestReward && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[100] animate-in fade-in zoom-in duration-300">
             <div className="text-center">
                 <h2 className="text-4xl md:text-6xl font-bold text-yellow-300 drop-shadow-[0_4px_0_#000] mb-4">
                     {useGameStore.getState().activeBattle.isBoss ? "STAGE COMPLETE!" : "VICTORY!"}
                 </h2>
                 <p className="text-white text-xl animate-pulse">Returning to Overworld...</p>
             </div>
         </div>
      )}

      <div 
        className="absolute top-4 left-4 flex flex-col gap-2 select-none pointer-events-none z-50 origin-top-left transition-transform"
        style={{ transform: isShortHeight ? 'scale(0.8)' : 'scale(1)' }}
      >
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 p-1 retro-border text-white text-xs px-2">LVL {playerStats.level}</div>
          <div className="bg-green-900 p-1 retro-border text-white text-xs px-2 border-green-500 border">STAGE {activeStage}</div>
        </div>
        
        <div className="w-36 md:w-64 h-6 bg-slate-900 border-2 border-white relative">
          <div 
            className="h-full bg-red-600 transition-all duration-200" 
            style={{ width: `${(playerStats.hp / playerStats.maxHp) * 100}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs text-white drop-shadow-md font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
            HP {Math.ceil(playerStats.hp)} / {playerStats.maxHp}
          </span>
        </div>

        <div className="w-36 md:w-64 h-6 bg-slate-900 border-2 border-gray-400 relative -mt-1">
          <div 
            className="h-full bg-cyan-500 transition-all duration-200" 
            style={{ width: `${Math.min(100, (playerStats.xp / playerStats.xpToNextLevel) * 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs text-white drop-shadow-md font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
            XP {Math.floor(playerStats.xp)} / {playerStats.xpToNextLevel}
          </span>
        </div>

        {/* Updated HUD Container: Relaxed width constraint to prevent passive icons wrapping/hiding incorrectly */}
        <div className="flex flex-col gap-1 mt-1 w-auto max-w-[250px] md:max-w-none">
          <div className="flex gap-1 flex-wrap">
            {weaponSlotsUI.map((slot, idx) => (
               <div key={`w_slot_${idx}`} className={`w-8 h-8 bg-slate-800 retro-border flex items-center justify-center text-white relative ${slot.status === 'LOCKED' ? 'border-2 border-red-900 bg-black/50 opacity-60' : (slot.data && EVO_KEYS.includes(slot.data[0]) ? 'border-2 border-yellow-400 bg-yellow-900' : 'border border-gray-600')}`}>
                  {slot.status === 'FILLED' && slot.data && (
                      <>
                          {slot.data[0] === 'MAGIC_MISSILE' && '✨'}
                          {slot.data[0] === 'AXE' && '🪓'}
                          {slot.data[0] === 'FIRE_AURA' && '🔥'}
                          {slot.data[0] === 'THUNDER' && '⚡'}
                          {slot.data[0] === 'ORBITAL' && '🛡️'}
                          {slot.data[0] === 'CROSS' && '✝️'}
                          {slot.data[0] === 'DAGGER' && '🗡️'}
                          {slot.data[0] === 'FLAMETHROWER' && '🚒'}
                          {slot.data[0] === 'SPEAR' && '🍢'}
                          {slot.data[0] === 'SLIME_BALL' && '🟢'}
                          {slot.data[0] === 'SHURIKEN' && '💠'}
                          {slot.data[0] === 'BIBLE' && '📖'}
                          {slot.data[0] === 'KATANA' && '⚔️'}
                          {slot.data[0] === 'TOXIN_GUN' && '🔫'}
                          {slot.data[0] === 'MAGIC_ARROW' && '🏹'}
                          {slot.data[0] === 'FIRE_MORTAR' && '🌋'}
                          {slot.data[0] === 'JAVELIN' && '🔱'}
                          {slot.data[0] === 'TOXIC_FLASK' && '⚗️'}
                          {slot.data[0] === 'CHAIN_LIGHTNING' && '🌩️'}
                          {slot.data[0] === 'HOLY_BEAM' && '🌟'}
                          {slot.data[0] === 'PLAGUE_SPREADER' && '☣️'}
                          {slot.data[0] === 'TESLA_COIL' && '⚡'}
                          <span className="absolute bottom-0 right-0 text-[8px] bg-black px-1">{slot.data[1] as number}</span>
                      </>
                  )}
                  {slot.status === 'EMPTY' && <span className="text-gray-600 text-[10px]">{idx + 1}</span>}
                  {slot.status === 'LOCKED' && <span className="text-red-500 text-[10px]">🔒</span>}
               </div>
            ))}
          </div>

          <div className="flex gap-1 flex-wrap">
            {passiveSlotsUI.map(([key, level]) => (
               <div key={key} className="w-8 h-8 rounded-full bg-blue-900/40 border-2 border-blue-400 flex items-center justify-center text-white relative shadow-[0_0_5px_rgba(59,130,246,0.5)]" title={key}>
                  <div className="text-sm">
                    {PASSIVES_DATA[key]?.icon || '❓'}
                  </div>
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-black px-1 rounded-full border border-blue-500">{level as number}</span>
               </div>
            ))}
          </div>
        </div>
      </div>

      {renderMinimap()}
      
      {/* Fix: cast mode to any to prevent narrowing error because PAUSED already returned */}
      {((mode as any) === GameMode.OVERWORLD || (mode as any) === GameMode.BATTLE || (mode as any) === GameMode.PAUSED) && (
          <div className={`absolute bottom-0 left-0 w-full bg-slate-900 border-t-2 border-slate-600 z-[60] pointer-events-auto flex items-stretch ${isShortHeight ? 'py-1' : ''}`}>
              <div className="flex-1 flex justify-center">
                  {mode === GameMode.OVERWORLD ? (
                      <button 
                        onClick={() => setQuizOpen(true)}
                        disabled={isGenerating}
                        className={`w-full border-r border-slate-700 ${isShortHeight ? 'py-2' : 'py-4'} px-2 flex flex-col items-center justify-center gap-1 group transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed bg-slate-900' : 'hover:bg-slate-800 active:bg-slate-700'}`}
                      >
                          <span className={`${isShortHeight ? 'text-lg' : 'text-2xl'} ${!isGenerating && 'group-hover:scale-110 transition-transform'}`}>📜</span>
                          <span className={`${isShortHeight ? 'text-[10px]' : 'text-xs'} font-bold text-blue-200`}>{isGenerating ? 'WAITING...' : 'Yes or No'}</span>
                      </button>
                  ) : (
                      <div className="w-full border-r border-slate-700 bg-slate-950/50"></div>
                  )}
              </div>

              <button 
                onClick={() => setImpactOpen(true)}
                className={`flex-[1.5] ${isShortHeight ? 'py-2' : 'py-4'} px-2 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-1 group bg-slate-900 border-x border-slate-700 transition-colors`}
              >
                  <div className="flex flex-col items-center leading-none">
                      <span className={`${isShortHeight ? 'text-sm' : 'text-lg'} group-hover:scale-110 transition-transform text-green-400 font-bold`}>
                         {playerStats.carbonSaved} kg
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono mt-1">
                          Total: {playerStats.lifetimeCarbon || playerStats.carbonSaved}
                      </span>
                  </div>
                  <span className={`${isShortHeight ? 'text-[8px]' : 'text-[10px]'} font-bold text-green-200 flex items-center gap-1 mt-1`}>
                      <span>🌱</span> CO2 SAVED
                  </span>
              </button>
              
              <button 
                onClick={togglePause}
                className={`flex-1 border-l border-slate-700 ${isShortHeight ? 'py-2' : 'py-4'} px-2 hover:bg-slate-800 active:bg-slate-700 flex flex-col items-center justify-center gap-1 group transition-colors`}
              >
                  {/* Fix: cast mode to any to bypass narrowing as GameMode.PAUSED already returned earlier */}
                  <span className={`${isShortHeight ? 'text-lg' : 'text-2xl'} group-hover:scale-110 transition-transform`}>{(mode as any) === GameMode.PAUSED ? '▶️' : '⏸️'}</span>
                  <span className={`${isShortHeight ? 'text-[10px]' : 'text-xs'} font-bold text-gray-200`}>{(mode as any) === GameMode.PAUSED ? 'RESUME' : 'PAUSE'}</span>
              </button>
          </div>
      )}
      
      <div className={`absolute inset-0 z-50 pointer-events-none ${isShortHeight ? 'mb-14' : 'mb-24'}`}>
        {isMobile && <VirtualJoystick onMove={handleJoystick} />}
        
        {/* Fix: cast mode to any to prevent narrowing error due to early returns */}
        {((mode as any) === GameMode.BATTLE || (mode as any) === GameMode.OVERWORLD) && !battleWon && (
          <button 
            className={`absolute rounded-full border-4 border-white/50 flex items-center justify-center active:scale-95 transition-transform pointer-events-auto bg-gray-900/50 ${isShortHeight ? 'w-24 h-24 bottom-2 right-4' : 'w-24 h-24 md:w-28 md:h-28 bottom-8 right-8'}`}
            onTouchStart={handleDashAction}
            onMouseDown={handleDashAction}
            disabled={dashCooldownCurrent > 0}
            style={{ touchAction: 'none' }} 
          >
             <svg className="absolute inset-0 w-full h-full -rotate-90 transform pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={dashRadius} stroke="#333" strokeWidth="8" fill="rgba(0,0,0,0.3)" />
                <circle
                    cx="50" cy="50" r={dashRadius}
                    stroke="#ef4444" strokeWidth="8"
                    fill="none"
                    strokeDasharray={dashCircumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-75 ease-linear"
                />
             </svg>
             <span className={`absolute inset-0 flex items-center justify-center font-bold text-white z-10 pointer-events-none ${isShortHeight ? 'text-xs' : 'text-xs'}`}>
                {dashCooldownCurrent > 0 ? "" : "DASH"}
             </span>
          </button>
        )}
      </div>

      {!isMobile && (
        <div className="absolute bottom-24 left-4 text-white/50 text-[10px] text-left pointer-events-none z-50">
          WASD or Arrows to Move<br/>
          {(mode === GameMode.BATTLE || mode === GameMode.OVERWORLD) ? 'SPACE or Click Dash to Burst' : ''}
        </div>
      )}
    </>
  );
};
