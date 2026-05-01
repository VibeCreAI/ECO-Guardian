
import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN, type FinalEndingCinematicState, type SavedRunSummary, useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore';
import { GameMode, HighScore, ImpactLogEntry, UpgradeOption, Vector2 } from '../../types';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { VirtualJoystick } from './VirtualJoystick';
import { StatusModal } from './StatusModal';
import { LibraryModal } from './LibraryModal';
import { ShopModal } from './ShopModal';
import { WEAPONS_DATA, EVOLUTION_RECIPES, PASSIVES_DATA } from '../../constants';
import { ASSET_PATHS, preloadStartupAssets } from '../../assets';
import { PortalVoteBadge } from './PortalVoteBadge';
import { requestGaiaNarration, requestSfx } from '../game/AudioManager';

interface UIOverlayProps {
  onJoystickMove: (vector: Vector2) => void;
  onDash: () => void;
  isMobile: boolean;
}

interface FinalEndingCinematicOverlayProps {
    cinematic: FinalEndingCinematicState;
    onVideoEnded: () => void;
}

const FinalEndingCinematicOverlay: React.FC<FinalEndingCinematicOverlayProps> = ({ cinematic, onVideoEnded }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);
    const videoSettledRef = useRef(false);
    const narrationEndedRef = useRef(cinematic.narrationEnded);
    const isLoopingRef = useRef(false);
    const shouldPlayVideo = cinematic.narrationStarted || cinematic.narrationEnded;

    // Start background music at the same moment the video starts (narration started)
    useEffect(() => {
        if (!shouldPlayVideo) return;
        const audio = new Audio(ASSET_PATHS.audio.music.endingBackground);
        audio.loop = false;
        audio.volume = 0.35;
        bgMusicRef.current = audio;
        void audio.play().catch(() => {});
        return () => {
            audio.pause();
            audio.src = '';
            bgMusicRef.current = null;
        };
    }, [shouldPlayVideo]);

    useEffect(() => {
        videoSettledRef.current = cinematic.videoEnded;
    }, [cinematic.videoEnded]);

    useEffect(() => {
        narrationEndedRef.current = cinematic.narrationEnded;
    }, [cinematic.narrationEnded]);

    const handleVideoComplete = React.useCallback(() => {
        if (videoSettledRef.current) return;
        videoSettledRef.current = true;
        onVideoEnded();
    }, [onVideoEnded]);

    // Once narration ends while looping the tail, stop and finalize
    useEffect(() => {
        if (!cinematic.narrationEnded || !isLoopingRef.current) return;
        const video = videoRef.current;
        if (video) video.pause();
        handleVideoComplete();
    }, [cinematic.narrationEnded, handleVideoComplete]);

    const handleVideoEnded = React.useCallback(() => {
        if (narrationEndedRef.current) {
            handleVideoComplete();
            return;
        }
        // Narration still playing — loop the last second of video
        isLoopingRef.current = true;
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, video.duration - 0.5);
        void video.play();
    }, [handleVideoComplete]);

    useEffect(() => {
        if (!shouldPlayVideo || cinematic.videoEnded) return;

        const video = videoRef.current;
        if (!video) return;

        video.loop = false;
        video.muted = true;
        video.playbackRate = 0.8;
        const playPromise = video.play();
        if (playPromise) {
            playPromise.catch(handleVideoComplete);
        }
    }, [cinematic.videoEnded, handleVideoComplete, shouldPlayVideo]);

    return (
        <div className="absolute inset-0 z-[120] bg-black/80 flex items-center justify-center pointer-events-auto">
            {shouldPlayVideo && (
                <video
                    ref={videoRef}
                    src={ASSET_PATHS.video.finalEnding}
                    className="w-full max-w-[1280px] max-h-[720px] aspect-video object-contain bg-black shadow-[0_0_60px_rgba(0,0,0,0.9)]"
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    onEnded={handleVideoEnded}
                    onError={handleVideoComplete}
                    aria-label="ECO Guardian ending cinematic"
                />
            )}
        </div>
    );
};

const MenuHero = () => {
    const [frame, setFrame] = useState(0);
    const spriteUrl = ASSET_PATHS.images.player.walkNorth;

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(f => (f + 1) % 16);
        }, 125); // 8 FPS
        return () => clearInterval(interval);
    }, []);

    const col = frame % 4;
    const row = Math.floor(frame / 4);
    
    // Background Position Calculation for 4x4 grid
    const xPos = col * (100 / 3);
    const yPos = row * (100 / 3);

    return (
        <div 
            className="h-24 w-24"
            style={{
                backgroundImage: `url(${spriteUrl})`,
                backgroundSize: '400% 400%',
                backgroundPosition: `${xPos}% ${yPos}%`,
                imageRendering: 'pixelated'
            }}
        />
    );
};

const SoundIcon: React.FC<{ muted: boolean; size?: number }> = ({ muted, size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        {muted ? (
            <path fill="currentColor" d="m19.8 22.6l-3.025-3.025q-.625.4-1.325.688t-1.45.462v-2.05q.35-.125.688-.25t.637-.3L12 14.8V20l-5-5H3V9h3.2L1.4 4.2l1.4-1.4l18.4 18.4zm-.2-5.8l-1.45-1.45q.425-.775.638-1.625t.212-1.75q0-2.35-1.375-4.2T14 5.275v-2.05q3.1.7 5.05 3.138T21 11.975q0 1.325-.363 2.55T19.6 16.8m-3.35-3.35L14 11.2V7.95q1.175.55 1.838 1.65T16.5 12q0 .375-.062.738t-.188.712M12 9.2L9.4 6.6L12 4z"/>
        ) : (
            <path fill="currentColor" d="M14 20.725v-2.05q2.25-.65 3.625-2.5t1.375-4.2t-1.375-4.2T14 5.275v-2.05q3.1.7 5.05 3.138T21 11.975t-1.95 5.613T14 20.725M3 15V9h4l5-5v16l-5-5zm11 1V7.95q1.175.55 1.838 1.65T16.5 12q0 1.275-.663 2.363T14 16"/>
        )}
    </svg>
);

const PauseIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14 19V5h4v14zm-8 0V5h4v14z"/>
    </svg>
);

const StatusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
    </svg>
);

const FpsMeter: React.FC<{ isShortHeight: boolean }> = React.memo(({ isShortHeight }) => {
    const [fps, setFps] = useState(0);
    const bottomOffset = `calc(env(safe-area-inset-bottom, 0px) + ${isShortHeight ? 58 : 108}px)`;
    const rightOffset = isShortHeight ? '1rem' : '2rem';

    useEffect(() => {
        let frameCount = 0;
        let lastSample = performance.now();
        let rafId = 0;

        const tick = (now: number) => {
            frameCount += 1;
            const elapsed = now - lastSample;

            if (elapsed >= 500) {
                setFps(Math.round((frameCount * 1000) / elapsed));
                frameCount = 0;
                lastSample = now;
            }

            rafId = window.requestAnimationFrame(tick);
        };

        rafId = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(rafId);
    }, []);

    return (
        <div
            className="absolute z-[70] font-mono font-bold text-[10px] md:text-[11px] leading-none tracking-normal text-white/35 pointer-events-none select-none"
            style={{
                right: rightOffset,
                bottom: bottomOffset,
                textShadow: '1px 1px 0 rgba(0, 0, 0, 0.45)'
            }}
            aria-label={`FPS ${fps}`}
        >
            FPS {fps}
        </div>
    );
});

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

const formatSavedRunTimestamp = (savedAt: number) => {
    const date = new Date(savedAt);
    if (Number.isNaN(date.getTime())) return 'Recently';

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

const getSavedRunSceneLabel = (scene: SavedRunSummary['scene']) =>
    scene === 'battle' ? 'Battle checkpoint' : 'Overworld checkpoint';


export const UIOverlay: React.FC<UIOverlayProps> = ({ onJoystickMove, onDash, isMobile }) => {
  const { mode, playerStats, dashCooldownCurrent, resetGame, selectUpgrade, levelUpOptions, setMode, worldPosition, portals, battleWon, finalEndingCinematic, markFinalEndingVideoEnded, activeStage, highScores, submitScore, chestReward, claimChestReward, preloadGame, startGame, quizResult, dismissQuizResult, bossNarrativeOpen, dismissBossNarrative, togglePause, isImpactOpen, setImpactOpen, highlightedPortalId, askForUpgradeAdvice, adviceLoading, adviceResult, rerollLevelUpOptions, isMuted, toggleMute, musicMuted, sfxMuted, musicVolume, sfxVolume, toggleMusicMute, toggleSfxMute, setMusicVolume, setSfxVolume, showNarrative, setShowNarrative, narrativeDismissed, setNarrativeDismissed, fetchLeaderboard, dbStatus, isStageReady, isOverworldSceneReady, cameraZoom, setCameraZoom, isPortalEntry, hideVibeJam, playMode, setPlayMode, hasSavedRun, savedRunSummary, resumeSavedRun, discardSavedRun } = useGameStore(useShallow((s) => ({
    mode: s.mode,
    playerStats: s.playerStats,
    dashCooldownCurrent: s.dashCooldownCurrent,
    resetGame: s.resetGame,
    selectUpgrade: s.selectUpgrade,
    levelUpOptions: s.levelUpOptions,
    setMode: s.setMode,
    worldPosition: s.worldPosition,
    portals: s.portals,
    battleWon: s.battleWon,
    finalEndingCinematic: s.finalEndingCinematic,
    markFinalEndingVideoEnded: s.markFinalEndingVideoEnded,
    activeStage: s.activeStage,
    highScores: s.highScores,
    submitScore: s.submitScore,
    chestReward: s.chestReward,
    claimChestReward: s.claimChestReward,
    preloadGame: s.preloadGame,
    startGame: s.startGame,
    quizResult: s.quizResult,
    dismissQuizResult: s.dismissQuizResult,
    bossNarrativeOpen: s.bossNarrativeOpen,
    dismissBossNarrative: s.dismissBossNarrative,
    togglePause: s.togglePause,
    isImpactOpen: s.isImpactOpen,
    setImpactOpen: s.setImpactOpen,
    highlightedPortalId: s.highlightedPortalId,
    askForUpgradeAdvice: s.askForUpgradeAdvice,
    adviceLoading: s.adviceLoading,
    adviceResult: s.adviceResult,
    rerollLevelUpOptions: s.rerollLevelUpOptions,
    isMuted: s.isMuted,
    toggleMute: s.toggleMute,
    musicMuted: s.musicMuted,
    sfxMuted: s.sfxMuted,
    musicVolume: s.musicVolume,
    sfxVolume: s.sfxVolume,
    toggleMusicMute: s.toggleMusicMute,
    toggleSfxMute: s.toggleSfxMute,
    setMusicVolume: s.setMusicVolume,
    setSfxVolume: s.setSfxVolume,
    showNarrative: s.showNarrative,
    setShowNarrative: s.setShowNarrative,
    narrativeDismissed: s.narrativeDismissed,
    setNarrativeDismissed: s.setNarrativeDismissed,
    fetchLeaderboard: s.fetchLeaderboard,
    dbStatus: s.dbStatus,
    isStageReady: s.isStageReady,
    isOverworldSceneReady: s.isOverworldSceneReady,
    cameraZoom: s.cameraZoom,
    setCameraZoom: s.setCameraZoom,
    isPortalEntry: s.isPortalEntry,
    hideVibeJam: s.hideVibeJam,
    playMode: s.playMode,
    setPlayMode: s.setPlayMode,
    hasSavedRun: s.hasSavedRun,
    savedRunSummary: s.savedRunSummary,
    resumeSavedRun: s.resumeSavedRun,
    discardSavedRun: s.discardSavedRun,
  })));
  const { currentConfig, gameOverMessage, isGenerating } = useAiDirectorStore();
  const [playerName, setPlayerNameInput] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRunScore, setSubmittedRunScore] = useState<HighScore | null>(null);
  const [submittedRunRank, setSubmittedRunRank] = useState<number | null>(null);
  const [scoreSubmitError, setScoreSubmitError] = useState<string | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [startupAssetProgress, setStartupAssetProgress] = useState(0);
  const [startupDisplayedProgress, setStartupDisplayedProgress] = useState(0);
  const [startupAssetsReady, setStartupAssetsReady] = useState(false);
  const [missionStartPending, setMissionStartPending] = useState(false);
  const [menuBackgroundReady, setMenuBackgroundReady] = useState(false);
  const [selectedImpactQuiz, setSelectedImpactQuiz] = useState<ImpactLogEntry | null>(null);
  const mpPeers = useGameStore((s) => s.multiplayer.peers);
  const mpPortalVotes = useGameStore((s) => s.multiplayer.portalVotes);
  const mpGuideMessage = useGameStore((s) => s.multiplayer.guideMessage);
  const mpSlotIndex = useGameStore((s) => s.multiplayer.slotIndex);
  const mpLocalPlayerId = useGameStore((s) => s.multiplayer.localPlayerId);
  const mpGroupId = useGameStore((s) => s.multiplayer.groupId);
  
  // UI Scaling for short screens (mobile landscape)
  const [uiScale, setUiScale] = useState(1);
  const [isShortHeight, setIsShortHeight] = useState(false);
  const [isMenuCompact, setIsMenuCompact] = useState(false);
  const [isMenuScrollFallback, setIsMenuScrollFallback] = useState(false);
  const hasMpPeers = Object.keys(mpPeers).length > 0;
  const activePlayers = 1 + Object.keys(mpPeers).length;
  const voterSlotsByPlayerId = React.useMemo(() => {
    const map: Record<string, number> = { [mpLocalPlayerId]: mpSlotIndex };
    Object.values(mpPeers).forEach((peer) => {
      map[peer.playerId] = peer.slotIndex;
    });
    return map;
  }, [mpPeers, mpLocalPlayerId, mpSlotIndex]);

  useEffect(() => {
    if (!isImpactOpen) {
      setSelectedImpactQuiz(null);
    }
  }, [isImpactOpen]);

  useEffect(() => {
    const handleResize = () => {
        const h = window.innerHeight;
        const targetH = 800; // Target height for 100% scale
        
        setIsShortHeight(h < 500);
        setIsMenuCompact(h < 1080);
        setIsMenuScrollFallback(h < 720);

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

  useEffect(() => {
      if (mode === GameMode.GAMEOVER || mode === GameMode.VICTORY) {
          setScoreSubmitted(false);
          setIsSubmitting(false);
          setPlayerNameInput('');
          setSubmittedRunScore(null);
          setSubmittedRunRank(null);
          setScoreSubmitError(null);
      }

      if (mode === GameMode.MENU) {
          setSubmittedRunScore(null);
          setSubmittedRunRank(null);
          setScoreSubmitError(null);
      }
  }, [mode]);

  useEffect(() => {
    let active = true;
    const image = new Image();

    const markReady = () => {
      if (active) setMenuBackgroundReady(true);
    };

    image.onload = markReady;
    image.onerror = markReady;
    image.decoding = 'async';
    image.src = ASSET_PATHS.images.start.background;

    if (image.complete) {
      markReady();
    }

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  // Fetch Leaderboard when entering LEADERBOARD mode
  useEffect(() => {
      if (mode === GameMode.LEADERBOARD) {
          setIsLeaderboardLoading(true);
          fetchLeaderboard().finally(() => setIsLeaderboardLoading(false));
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
  

  const lastNarrativeStage = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultScrollRef = useRef<HTMLDivElement>(null);
  const startupSequenceRef = useRef(0);
  const startupLaunchTimeoutRef = useRef<number | null>(null);
  const startupShownAtRef = useRef<number>(0);
  const missionStartFrameRef = useRef<number | null>(null);
  const zoomTrackRef = useRef<HTMLDivElement>(null);
  const [startupMinElapsed, setStartupMinElapsed] = useState(false);

  // Fix: Reset tracking refs when returning to Menu/Setup so narrative triggers again on restart
  useEffect(() => {
      if (mode === GameMode.MENU || mode === GameMode.DIFFICULTY_SELECT || mode === GameMode.INSTRUCTIONS) {
          lastNarrativeStage.current = 0;
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
    if (mode !== GameMode.QUIZ_RESULT) return;
    const handleScrollKey = (e: KeyboardEvent) => {
        if (!resultScrollRef.current) return;
        if (e.key === 'ArrowDown') resultScrollRef.current.scrollBy({ top: 50, behavior: 'smooth' });
        if (e.key === 'ArrowUp') resultScrollRef.current.scrollBy({ top: -50, behavior: 'smooth' });
    };
    window.addEventListener('keydown', handleScrollKey);
    return () => window.removeEventListener('keydown', handleScrollKey);
  }, [mode]);

  useModalKeyboard({
    onEscapeOverworld: togglePause,
    onEscapePaused: togglePause,
    onEscapeLibrary: () => {
      const prev = useGameStore.getState().previousMode;
      if (prev === GameMode.MENU) setMode(GameMode.MENU);
      else togglePause();
    },
    onEscapeStatus: togglePause,
    onEscapeLeaderboard: () => setMode(GameMode.MENU),
    onEscapeShop: () => setMode(GameMode.OVERWORLD),
  });

  useEffect(() => {
      if (mode !== GameMode.INSTRUCTIONS) {
          startupSequenceRef.current += 1;
          setStartupAssetProgress(0);
          setStartupDisplayedProgress(0);
          setStartupAssetsReady(false);
          return;
      }

      const sequenceId = startupSequenceRef.current + 1;
      startupSequenceRef.current = sequenceId;
      setStartupAssetProgress(0);
      setStartupDisplayedProgress(0);
      setStartupAssetsReady(false);
      setStartupMinElapsed(false);
      startupShownAtRef.current = Date.now();
      setStartupMinElapsed(true);

      let active = true;

      preloadStartupAssets((loaded, total) => {
          if (!active || startupSequenceRef.current !== sequenceId) return;
          setStartupAssetProgress(total === 0 ? 1 : loaded / total);
      }).then(() => {
          if (!active || startupSequenceRef.current !== sequenceId) return;
          setStartupAssetProgress(1);
          setStartupAssetsReady(true);
      });

      return () => {
          active = false;
      };
  }, [mode]);

  useEffect(() => {
      if (mode === GameMode.MENU) return;
      setMissionStartPending(false);
      if (missionStartFrameRef.current !== null) {
          window.cancelAnimationFrame(missionStartFrameRef.current);
          missionStartFrameRef.current = null;
      }
  }, [mode]);

  useEffect(() => {
      return () => {
          if (missionStartFrameRef.current !== null) {
              window.cancelAnimationFrame(missionStartFrameRef.current);
          }
      };
  }, []);

  const beginMissionStartup = () => {
      if (missionStartPending || mode !== GameMode.MENU) return;
      setMissionStartPending(true);
      requestGaiaNarration(ASSET_PATHS.audio.gaia.missionStart, 'gaia:mission-start');

      missionStartFrameRef.current = window.requestAnimationFrame(() => {
          missionStartFrameRef.current = window.requestAnimationFrame(() => {
              missionStartFrameRef.current = null;
              preloadGame('MEDIUM');
          });
      });
  };

  const startupTargetProgress = mode === GameMode.INSTRUCTIONS
      ? Math.min(100, Math.round((startupAssetProgress * 0.65 + (isStageReady ? 0.2 : 0) + (isOverworldSceneReady ? 0.1 : 0) + 0.05) * 100))
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
          !isOverworldSceneReady ||
          !startupAssetsReady ||
          startupDisplayedProgress < 100 ||
          !startupMinElapsed
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
  }, [mode, isStageReady, isOverworldSceneReady, startupAssetsReady, startupDisplayedProgress, startupMinElapsed, startGame]);

  const handleDashAction = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (dashCooldownCurrent <= 0 && (mode === GameMode.BATTLE || mode === GameMode.OVERWORLD)) onDash();
  };

  const handleSubmitScore = async () => {
      if (playerName.trim().length === 0 || isSubmitting) return;

      setIsSubmitting(true);
      setScoreSubmitError(null);
      try {
          const result = await submitScore(playerName.trim());
          if (result.confirmed) {
              setScoreSubmitted(true);
              setSubmittedRunScore(result.score);
              setSubmittedRunRank(result.rank);
              setMode(GameMode.LEADERBOARD);
          } else {
              setScoreSubmitted(false);
              setSubmittedRunScore(null);
              setSubmittedRunRank(null);
              setScoreSubmitError(result.error || 'Score submission failed. Please try again.');
          }
      } finally {
          setIsSubmitting(false);
      }
  };
  
  const handleReset = () => {
      setScoreSubmitted(false);
      setIsSubmitting(false);
      setPlayerNameInput('');
      setSubmittedRunScore(null);
      setSubmittedRunRank(null);
      setScoreSubmitError(null);
      resetGame();
  };

  const handleResumeMission = () => {
      if (missionStartPending) return;
      resumeSavedRun();
  };

  const handleDiscardSave = () => {
      if (missionStartPending) return;
      discardSavedRun();
  };

  const submittedRunRowIndex = submittedRunScore
      ? findSubmittedScoreIndex(highScores, submittedRunScore)
      : -1;


  const renderMinimap = () => {
    if (mode !== GameMode.OVERWORLD) return null;
    const mapSize = 108; const mapRadius = mapSize / 2; const center = mapRadius; const scale = 3; 

    // SHOP COORDINATES: Must match Scene.tsx (x: 15, z: -5)
    const SHOP_POS = { x: 15, z: -5 };
    // VibeJam COORDINATES: Must match Scene.tsx
    const VIBEJAM_NEXT_POS = { x: -13, z: -5 };
    const VIBEJAM_RETURN_POS = { x: -25, z: -5 };

    // Shop Marker
    const dxShop = SHOP_POS.x - worldPosition.x;
    const dzShop = SHOP_POS.z - worldPosition.z;
    const distShop = Math.sqrt(dxShop * dxShop + dzShop * dzShop);
    const angleShop = Math.atan2(dzShop, dxShop);
    const renderDistShop = Math.min(distShop * scale, mapRadius - 12);
    const shopPinX = Math.cos(angleShop) * renderDistShop;
    const shopPinY = Math.sin(angleShop) * renderDistShop;
    const dxVibeNext = VIBEJAM_NEXT_POS.x - worldPosition.x;
    const dzVibeNext = VIBEJAM_NEXT_POS.z - worldPosition.z;
    const distVibeNext = Math.sqrt(dxVibeNext * dxVibeNext + dzVibeNext * dzVibeNext);
    const angleVibeNext = Math.atan2(dzVibeNext, dxVibeNext);
    const renderDistVibeNext = Math.min(distVibeNext * scale, mapRadius - 10);
    const vibeNextPinX = Math.cos(angleVibeNext) * renderDistVibeNext;
    const vibeNextPinY = Math.sin(angleVibeNext) * renderDistVibeNext;
    const dxVibeReturn = VIBEJAM_RETURN_POS.x - worldPosition.x;
    const dzVibeReturn = VIBEJAM_RETURN_POS.z - worldPosition.z;
    const distVibeReturn = Math.sqrt(dxVibeReturn * dxVibeReturn + dzVibeReturn * dzVibeReturn);
    const angleVibeReturn = Math.atan2(dzVibeReturn, dxVibeReturn);
    const renderDistVibeReturn = Math.min(distVibeReturn * scale, mapRadius - 10);
    const vibeReturnPinX = Math.cos(angleVibeReturn) * renderDistVibeReturn;
    const vibeReturnPinY = Math.sin(angleVibeReturn) * renderDistVibeReturn;

    return (
      <div 
        className={`absolute right-4 w-[108px] h-[108px] ui-card overflow-hidden pointer-events-none z-50 origin-top-right transition-transform ${isShortHeight ? 'top-[34px]' : 'top-[42px]'}`}
        style={{ transform: isShortHeight ? 'scale(0.7)' : 'scale(1)' }}
      >
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-green-200/30 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 h-full w-[2px] bg-green-200/30 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-[var(--eco-acid)] border-2 border-black -translate-x-1/2 -translate-y-1/2" />
        
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

        {!hideVibeJam && <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-black bg-cyan-400 text-[7px] leading-[10px] text-black text-center font-bold"
            style={{
                top: center + vibeNextPinY,
                left: center + vibeNextPinX
            }}
            title="Vibe Portal"
        >
            V
        </div>}
        {!hideVibeJam && isPortalEntry && (
            <div
                className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-black bg-orange-400 text-[7px] leading-[10px] text-black text-center font-bold"
                style={{
                    top: center + vibeReturnPinY,
                    left: center + vibeReturnPinX
                }}
                title="Return Portal"
            >
                R
            </div>
        )}

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
                        className={`absolute -translate-x-1/2 -translate-y-1/2 border-2 border-black flex items-center justify-center ${portal.type === 'BOSS' || isHighlighted ? 'animate-pulse' : ''}`}
                        style={{ 
                            width: (isHighlighted ? size * 7 : size * 4), 
                            height: (isHighlighted ? size * 7 : size * 4), 
                            backgroundColor: portalColor, 
                            zIndex: isHighlighted ? 10 : 1
                        }} 
                    >
                        {portal.quizOption && (
                            <span className="text-[7px] font-bold text-white">
                                {portal.quizOption === 'A' ? 'Y' : portal.quizOption === 'B' ? 'N' : portal.quizOption}
                            </span>
                        )}
                    </div>
                </div>
            );
        })}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] ui-muted">N</div>
      </div>
    );
  };

  const isFinalEndingCinematicVisible =
      (mode === GameMode.BATTLE || mode === GameMode.VICTORY) &&
      finalEndingCinematic.phase !== 'inactive' &&
      (finalEndingCinematic.phase !== 'complete' || mode !== GameMode.VICTORY) &&
      (
          mode === GameMode.VICTORY ||
          finalEndingCinematic.narrationStarted ||
          finalEndingCinematic.narrationEnded
      );

  if (isFinalEndingCinematicVisible) {
      return (
          <FinalEndingCinematicOverlay
              cinematic={finalEndingCinematic}
              onVideoEnded={markFinalEndingVideoEnded}
          />
      );
  }

  // --- VICTORY SCREEN (NEW) ---
  if (mode === GameMode.VICTORY) {
      return (
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 overflow-hidden">
              <div className="ui-panel ui-card-warning w-full max-w-2xl p-8 text-center relative flex flex-col gap-6 animate-in zoom-in duration-700">
                  
                  <div className="mb-4">
                      <div className="text-6xl mb-4 animate-bounce">🏆</div>
                      <h1 className="text-3xl md:text-5xl font-black ui-title mb-2">
                          MISSION COMPLETE
                      </h1>
                      <p className="text-yellow-200 font-bold text-sm uppercase">Protocol Gemini: Success</p>
                  </div>

                  <div className="bg-black/40 p-6 border-4 border-black grid grid-cols-2 gap-4 text-left">
                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Final Clearance</div>
                          <div className="text-white font-bold text-xl">Stage 10 Cleared</div>
                      </div>
                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Eco-Rating</div>
                          <div className="text-green-400 font-bold text-xl">S-Class Guardian</div>
                      </div>
                      
                      <div className="col-span-2 border-t-4 border-black my-2"></div>

                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Total CO2 Saved</div>
                          <div className="text-green-300 font-bold text-2xl">{playerStats.lifetimeCarbon || playerStats.carbonSaved} kg</div>
                      </div>
                      <div>
                          <div className="text-gray-400 text-xs uppercase mb-1">Hostiles Purged</div>
                          <div className="text-red-300 font-bold text-2xl">{playerStats.enemiesKilled}</div>
                      </div>
                  </div>

                  <div className="ui-copy text-sm md:text-base">
                      "The balance is restored. The biomes breathe once more. Thank you, Guardian."
                  </div>

                  {!scoreSubmitted ? (
                      <div className="flex flex-col gap-2">
                          <input
                              type="text"
                              placeholder="ENTER HERO NAME"
                              maxLength={10}
                              className="ui-input p-3 text-center font-bold"
                              value={playerName}
                              onChange={(e) => {
                                  setPlayerNameInput(e.target.value);
                                  setScoreSubmitError(null);
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && playerName.trim().length > 0 && !isSubmitting && !scoreSubmitted) {
                                      e.preventDefault();
                                      handleSubmitScore();
                                  }
                              }}
                          />
                          <button
                              data-modal-btn=""
                              onClick={handleSubmitScore}
                              disabled={playerName.length === 0 || isSubmitting}
                              className={`w-full py-3 font-bold text-lg transition-all ui-button ${playerName.length > 0 && !isSubmitting ? 'ui-button-warning' : 'ui-button-disabled'}`}
                          >
                              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT SCORE'}
                          </button>
                          {scoreSubmitError && (
                              <div className="text-red-200 text-xs ui-card ui-card-danger text-left p-2">
                                  {scoreSubmitError}
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="text-green-300 font-bold py-2 ui-card ui-card-highlight animate-pulse">
                          SCORE UPLOADED
                      </div>
                  )}

                  <button
                      data-modal-btn=""
                      onClick={() => setMode(GameMode.MENU)}
                      className="w-full ui-button ui-button-warning py-4 font-bold text-xl mt-4"
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
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 pointer-events-auto">
              <div className="ui-panel w-full max-w-5xl max-h-[95vh] flex flex-col relative">
                  
                  {/* Header */}
                  <div className="p-4 md:p-6 text-center ui-panel-header flex justify-between items-center">
                        <div className="text-left">
                            <h2 className="text-2xl md:text-4xl ui-title font-bold animate-pulse">LEVEL UP!</h2>
                            <div className="ui-muted text-xs md:text-sm mt-1">Select an enhancement for your Eco-Guardian</div>
                        </div>
                        <div className="flex gap-2">
                             <button
                                data-modal-btn=""
                                onClick={rerollLevelUpOptions}
                                disabled={!canReroll}
                                className={`px-4 py-2 font-bold flex flex-col items-center justify-center text-xs ui-button ${canReroll ? 'ui-button-warning' : 'ui-button-disabled'}`}
                            >
                                <span className="text-lg">🎲</span>
                                <span>REROLL {rerollCost}kg</span>
                            </button>
                            <button
                                data-modal-btn=""
                                onClick={askForUpgradeAdvice}
                                disabled={adviceLoading}
                                className={`px-4 py-2 font-bold flex flex-col items-center justify-center text-xs ui-button ${adviceLoading ? 'ui-button-disabled' : 'ui-button-primary'}`}
                            >
                                <span className="text-lg">🧠</span>
                                <span>ASK GAIA</span>
                            </button>
                        </div>
                  </div>

                  {/* Gaia Advice Overlay - Positioned above options for better visibility */}
                  {adviceResult && (
                        <div className="mx-4 md:mx-6 mt-4 ui-card ui-card-highlight p-3 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="text-3xl shrink-0">💡</div>
                            <div>
                                <h4 className="text-green-200 font-bold text-xs uppercase mb-1">Gaia's Insight:</h4>
                                <p className="ui-copy text-sm">"{adviceResult.reason}"</p>
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

                          let cardClass = '';
                          let titleColor = 'text-white';

                          // Style priority: Recommended > Evolution > Weapon > Passive > Stat
                          if (isEvolution) {
                              cardClass = 'ui-card-warning';
                              titleColor = 'text-yellow-300';
                          } else if (isWeapon) {
                              cardClass = 'ui-card-highlight';
                              titleColor = 'text-green-200';
                          } else if (isPassive) {
                              cardClass = 'ui-card-cyan';
                              titleColor = 'ui-cyan';
                          } else if (isStat) {
                              cardClass = '';
                              titleColor = 'text-gray-300';
                          }

                          // Override if recommended
                          if (isRecommended) {
                              cardClass = 'ui-card-highlight z-10 scale-[1.02]';
                          }

                          return (
                              <button
                                  key={option.id}
                                  data-modal-btn=""
                                  onClick={() => { requestSfx('upgrade_select'); selectUpgrade(option); }}
                                  className={`relative ui-card ${cardClass} p-4 transition-all group flex flex-col items-start text-left gap-2 h-full`}
                              >
                                  {isRecommended && (
                                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 ui-chip ui-chip-primary text-[10px] font-bold px-3 py-1 animate-pulse z-20 whitespace-nowrap">
                                          RECOMMENDED
                                      </div>
                                  )}
                                  
                                  {isEvolution && <div className="absolute top-0 right-0 ui-chip ui-chip-warning text-[10px] font-bold px-2 py-1">EVO</div>}
                                  {option.isNewWeapon && !isEvolution && <div className="absolute top-0 right-0 ui-chip ui-chip-primary text-[10px] font-bold px-2 py-1">NEW</div>}
                                  
                                  <div className="flex items-center gap-3 mb-2 w-full mt-2">
                                    <div className="text-4xl group-hover:scale-110 transition-transform">{option.icon}</div>
                                    <div>
                                        <h3 className={`font-bold text-base leading-tight ${titleColor}`}>{option.label}</h3>
                                        <p className="ui-muted text-[10px] uppercase">{getTypeLabel(option)}</p>
                                    </div>
                                  </div>
                                  
                                  <p className="ui-copy text-xs mb-2 min-h-[40px]">{option.description}</p>
                                  
                                  {/* Evolution Recipe Visualization */}
                                  {option.type === 'WEAPON' && !option.isEvolution && (
                                    <div className="mt-auto w-full bg-black/40 p-2 border-2 border-black">
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
                                                            <div className={`absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center text-[8px] border border-black ${hasPartner ? 'bg-green-500 text-black' : 'bg-red-600 text-white'}`}>
                                                                {hasPartner ? '✓' : '✕'}
                                                            </div>
                                                        </div>
                                                        <span className="ui-cyan text-[10px]">➜</span>
                                                        <span className="text-base">{result?.icon || '⭐'}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-[10px] ui-muted">No known evolutions</div>
                                        )}
                                    </div>
                                  )}
                              </button>
                          );
                      })}
                  </div>

                  {/* Footer: Arsenal */}
                  <div className="p-4 ui-panel-footer">
                        <div className="flex items-center gap-2 mb-3 ui-warning text-xs font-bold uppercase">
                            <span>▶</span> CURRENT ARSENAL
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {equippedWeapons.map(([key, level]) => {
                                const data = WEAPONS_DATA[key];
                                if(!data) return null;
                                return (
                                    <div key={key} className="w-10 h-10 ui-slot flex flex-col items-center justify-center relative group">
                                        <span className="text-xl">{data.icon}</span>
                                        <div className="absolute -bottom-1 right-0 bg-black text-[8px] text-white px-1 border border-gray-600">Lv.{level as number}</div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-2 whitespace-nowrap z-50 border-2 border-black">
                                            {data.label} (Lv.{level as number})
                                        </div>
                                    </div>
                                )
                            })}
                            {Array.from({length: Math.max(0, playerStats.maxWeaponSlots - equippedWeapons.length)}).map((_, i) => (
                                <div key={`empty_${i}`} className="w-10 h-10 ui-slot ui-slot-empty flex items-center justify-center">
                                    <span className="text-lg">+</span>
                                </div>
                            ))}
                            
                            {/* Passives Separator */}
                            <div className="w-1 h-10 bg-black mx-2"></div>

                            {equippedPassives.map(([key, level]) => {
                                const data = PASSIVES_DATA[key];
                                if(!data) return null;
                                return (
                                    <div key={key} className="w-8 h-8 ui-slot ui-slot-passive flex items-center justify-center relative group">
                                        <span className="text-sm">{data.icon}</span>
                                        <div className="ui-slot-level ui-slot-level-passive text-[7px]">Lv.{level as number}</div>
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
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 animate-in fade-in zoom-in duration-300">
              <div className="ui-panel ui-card-warning w-full max-w-md p-8 text-center flex flex-col gap-6 relative overflow-hidden">
                  <h2 className="text-3xl ui-warning font-black z-10">TREASURE FOUND!</h2>
                  
                  <div className="bg-black/50 p-6 border-4 border-black flex flex-col items-center gap-4 z-10">
                      <div className="text-6xl animate-bounce">{chestReward.icon}</div>
                      <div>
                          <h3 className="text-xl font-bold text-white">{chestReward.label}</h3>
                          <p className="ui-copy text-sm mt-1">{chestReward.description}</p>
                      </div>
                  </div>

                  <button
                      data-modal-btn=""
                      autoFocus
                      onClick={() => { requestSfx('chest_reward'); claimChestReward(); }}
                      className="w-full ui-button ui-button-warning py-4 font-bold text-xl z-10"
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
        <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-50 p-4">
            <div className="ui-panel p-6 w-full max-w-2xl h-[80vh] flex flex-col relative">
                <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
                    <h2 className="text-2xl md:text-3xl ui-title font-bold">HALL OF HEROES</h2>
                    {/* Database Status Indicator */}
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1 border-2 border-black">
                        <div className={`w-3 h-3 border border-black ${dbStatus === 'connected' ? 'bg-green-500' : (dbStatus === 'local' ? 'bg-orange-500' : 'bg-red-500')}`} />
                        <span className={`text-[10px] font-bold ${dbStatus === 'connected' ? 'text-green-400' : (dbStatus === 'local' ? 'text-orange-400' : 'text-red-400')}`}>
                            {dbStatus === 'connected' ? 'CLOUD SYNC' : (dbStatus === 'local' ? 'LOCAL STORAGE' : 'OFFLINE')}
                        </span>
                    </div>
                </div>

                {submittedRunScore && (
                    <div className={`mb-4 p-3 border-4 border-black ${submittedRunRank ? 'ui-card ui-card-highlight' : 'ui-card ui-card-warning'}`}>
                        {submittedRunRank ? (
                            <div className="text-sm md:text-base font-bold text-green-200">
                                LAST RUN RANK: #{submittedRunRank}
                            </div>
                        ) : (
                            <div className="text-sm md:text-base font-bold text-yellow-100">
                                LAST RUN SUBMITTED: OUTSIDE TOP 50
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto mb-6 bg-black/40 p-2 ui-card">
                    {isLeaderboardLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 ui-muted">
                            <div className="w-6 h-6 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs uppercase tracking-widest">Loading scores...</span>
                        </div>
                    ) : highScores.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 ui-muted">
                            <div className="text-3xl">🌿</div>
                            <div className="text-sm uppercase tracking-widest">No heroes yet.</div>
                            <div className="text-xs opacity-60">Play a round and be the first on the board!</div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-yellow-200 border-b-4 border-black text-xs md:text-sm">
                                    <th className="p-2">RANK</th>
                                    <th className="p-2">NAME</th>
                                    <th className="p-2 text-center">STAGE</th>
                                    <th className="p-2 text-right">TOTAL CO2</th>
                                    <th className="p-2 text-right">DMG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {highScores.map((score, index) => {
                                    const isSubmittedRun = index === submittedRunRowIndex;
                                    return (
                                    <tr key={index} className={`border-b-2 border-black text-xs md:text-base ${isSubmittedRun ? 'bg-yellow-500/20 text-yellow-100 font-bold' : (index === 0 ? 'text-yellow-300 font-bold' : 'text-gray-300')}`}>
                                        <td className="p-3">
                                            #{index + 1}
                                            {isSubmittedRun && <span className="ml-2 text-[10px] uppercase tracking-wide text-yellow-200">Your Run</span>}
                                        </td>
                                        <td className="p-3">{score.name}</td>
                                        <td className="p-3 text-center">{score.stage}</td>
                                        <td className="p-3 text-right text-green-400">{score.carbonSaved || 0}kg</td>
                                        <td className="p-3 text-right">{(score.damage / 1000).toFixed(1)}k</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="flex gap-4">
                    <button
                        data-modal-btn=""
                        onClick={() => { setIsLeaderboardLoading(true); fetchLeaderboard().finally(() => setIsLeaderboardLoading(false)); }}
                        disabled={isLeaderboardLoading}
                        className={`flex-1 ui-button py-4 font-bold text-lg ${isLeaderboardLoading ? 'ui-button-disabled' : 'ui-button-cyan'}`}
                    >
                        {isLeaderboardLoading ? 'LOADING...' : 'REFRESH'}
                    </button>
                    <button data-modal-btn="" onClick={() => setMode(GameMode.MENU)} className="flex-1 ui-button ui-button-secondary py-4 font-bold text-lg">
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
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4">
              <div className="ui-panel ui-card-danger w-full max-w-lg p-8 text-center flex flex-col gap-6 animate-in zoom-in duration-300">
                  <h2 className="text-4xl md:text-5xl ui-danger font-black mb-2 text-center w-full">DEFEATED</h2>
                  
                  <div className="bg-black/40 p-4 border-4 border-black">
                      <p className="ui-muted text-sm mb-1 uppercase">Cause of Failure</p>
                      <p className="text-white text-lg font-bold">Overwhelmed by Pollution</p>
                  </div>

                  {gameOverMessage && (
                      <div className="ui-copy text-sm border-l-4 border-red-500 pl-4 text-left">
                          "{gameOverMessage}"
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm bg-black/40 p-4 border-4 border-black">
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
                              className="ui-input p-3 text-center font-bold"
                              value={playerName}
                              onChange={(e) => {
                                  setPlayerNameInput(e.target.value);
                                  setScoreSubmitError(null);
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && playerName.trim().length > 0 && !isSubmitting && !scoreSubmitted) {
                                      e.preventDefault();
                                      handleSubmitScore();
                                  }
                              }}
                          />
                          <button
                              data-modal-btn=""
                              onClick={handleSubmitScore}
                              disabled={playerName.length === 0 || isSubmitting}
                              className={`w-full py-3 font-bold text-lg transition-all ui-button ${playerName.length > 0 && !isSubmitting ? 'ui-button-warning' : 'ui-button-disabled'}`}
                          >
                              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT SCORE'}
                          </button>
                          {scoreSubmitError && (
                              <div className="text-red-200 text-xs ui-card ui-card-danger text-left p-2">
                                  {scoreSubmitError}
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="text-green-300 font-bold py-2 ui-card ui-card-highlight animate-pulse">
                          SCORE UPLOADED
                      </div>
                  )}

                  <button
                      data-modal-btn=""
                      onClick={handleReset}
                      className="w-full ui-button ui-button-secondary py-4 font-bold text-xl mt-2"
                  >
                      TRY AGAIN
                  </button>
              </div>
          </div>
      );
  }

  // --- MAIN MENU ---
  if (mode === GameMode.MENU) {
    const menuContentClass = menuBackgroundReady ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none';
    const menuUsesCompactLayout = isMenuCompact && hasSavedRun;
    const menuNeedsFallbackScroll = isMenuScrollFallback && hasSavedRun;

    return (
      <div 
        className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden bg-black"
      >
        {missionStartPending && (
          <div className="absolute top-3 left-3 ui-card px-3 py-2 pointer-events-none z-[60]">
              <p className="text-[10px] uppercase ui-muted">Preparing world</p>
              <p className="text-[11px] text-green-300 font-bold">ECO GUARDIAN 1%</p>
          </div>
        )}

        <img
          src={ASSET_PATHS.images.start.background}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${menuBackgroundReady ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
          onLoad={() => setMenuBackgroundReady(true)}
          onError={() => setMenuBackgroundReady(true)}
        />

        {/* Dark overlay for better menu contrast */}
        <div className={`absolute inset-0 bg-black/35 pointer-events-none transition-opacity duration-300 ${menuBackgroundReady ? 'opacity-100' : 'opacity-0'}`} />

        {/* --- TOP RIGHT CONTROLS (Fixed Position) --- */}
        <div className={`absolute top-4 right-4 z-50 flex gap-2 transition-opacity duration-200 ${menuContentClass}`}>
            <button
                onClick={toggleFullScreen}
                className="w-10 h-10 ui-button ui-menu-icon-button transition-all flex items-center justify-center"
                title="Toggle Fullscreen"
            >
                {isFullScreen ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="m15 3l2.3 2.3l-2.89 2.87l1.42 1.42L18.7 6.7L21 9V3zM3 9l2.3-2.3l2.87 2.89l1.42-1.42L6.7 5.3L9 3H3zm6 12l-2.3-2.3l2.89-2.87l-1.42-1.42L5.3 17.3L3 15v6zm12-6l-2.3 2.3l-2.87-2.89l-1.42 1.42l2.89 2.87L15 21h6z"/></svg>
                )}
            </button>
            <button
                onClick={toggleMute}
                className="w-10 h-10 ui-button ui-menu-icon-button transition-all flex items-center justify-center leading-none"
                title="Toggle Sound"
            >
                <SoundIcon muted={isMuted} />
            </button>
        </div>

        {/* --- MAIN INTERFACE (Scalable) --- */}
        <div 
            className={`relative z-10 flex h-full w-full flex-col items-center px-4 transition-[opacity,transform] duration-200 ease-out ${menuNeedsFallbackScroll ? 'justify-start overflow-y-auto overflow-x-hidden py-3' : 'justify-center overflow-hidden'} ${menuContentClass}`}
            style={{ transform: menuNeedsFallbackScroll ? `scale(${uiScale})` : undefined, transformOrigin: 'top center' }}
        >
            <div className={`max-w-lg w-full flex flex-col items-center ${menuNeedsFallbackScroll ? 'pt-8 pb-6' : menuUsesCompactLayout ? 'mt-6 md:mt-10' : 'mt-16 md:mt-24'}`}>
                
                {/* TITLE IMAGE - CLICKABLE FOR AUDIO START */}
                <button 
                    className={`${menuUsesCompactLayout ? 'mb-5' : 'mb-12'} cursor-pointer focus:outline-none hover:scale-105 transition-transform duration-500`}
                    onClick={() => {
                        const audio = document.querySelector('audio');
                        if (audio && audio.paused) audio.play().catch(e => console.log(e));
                    }}
                >
                    <img
                        src={ASSET_PATHS.images.start.title}
                        alt="ECO GUARDIAN"
                        className="w-full max-w-4xl"
                        style={{ transform: 'scale(1.4)', transformOrigin: 'center' }}
                    />
                </button>

                {/* CONTROL PANEL */}
                <div className={`relative mb-6 w-full ui-panel ui-scanlines ${menuUsesCompactLayout ? 'p-5' : 'p-8'}`}>

                {/* Pixel corners */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-green-300 border border-black" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-300 border border-black" />
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-green-300 border border-black" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-green-300 border border-black" />

                <p className={`text-center text-green-200 text-xs uppercase border-b-4 border-black font-mono ${menuUsesCompactLayout ? 'mb-4 pb-3' : 'mb-6 pb-4'}`}>
                    <span className="text-green-400 mr-2">●</span> GAIA PROTOCOL ACTIVE <span className="text-green-400 ml-2">●</span>
                </p>

                <div className={menuUsesCompactLayout ? 'space-y-3' : 'space-y-4'}>
                    {hasSavedRun && savedRunSummary ? (
                      <div className={menuUsesCompactLayout ? 'space-y-2' : 'space-y-3'}>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            data-modal-btn=""
                            autoFocus
                            onClick={handleResumeMission}
                            disabled={missionStartPending}
                            className={`group relative ui-button ui-button-warning font-extrabold transition-all overflow-hidden ${menuUsesCompactLayout ? 'py-3' : 'py-5'} ${missionStartPending ? 'ui-button-disabled pointer-events-none' : ''}`}
                          >
                            <span className={`flex items-center justify-center gap-3 ${menuUsesCompactLayout ? 'text-sm' : 'text-lg'}`}>
                              <span>CONTINUE</span>
                            </span>
                          </button>

                          <button
                            data-modal-btn=""
                            onClick={beginMissionStartup}
                            disabled={missionStartPending}
                            className={`group relative ui-button ui-menu-primary font-extrabold transition-all overflow-hidden ${menuUsesCompactLayout ? 'py-3' : 'py-5'} ${missionStartPending ? 'ui-button-disabled pointer-events-none' : ''}`}
                          >
                            <span className={`flex items-center justify-center gap-3 ${menuUsesCompactLayout ? 'text-sm' : 'text-lg'}`}>
                              <span className="animate-pulse">{missionStartPending ? 'STARTING...' : 'START'}</span>
                            </span>
                          </button>
                        </div>

                        <div className={`ui-chip border border-black/50 bg-black/25 text-left ${menuUsesCompactLayout ? 'px-2 py-2' : 'px-3 py-2'}`}>
                          <div className={`flex items-center justify-between gap-3 uppercase text-green-200 ${menuUsesCompactLayout ? 'text-[9px]' : 'text-[10px] tracking-widest'}`}>
                            <span>Stage {savedRunSummary.stage}</span>
                            <span>{menuUsesCompactLayout ? (savedRunSummary.scene === 'battle' ? 'Battle' : 'Overworld') : getSavedRunSceneLabel(savedRunSummary.scene)}</span>
                          </div>
                          <div className={`${menuUsesCompactLayout ? 'mt-1 text-[9px]' : 'mt-1 text-[10px]'} uppercase ui-muted`}>
                            Saved {formatSavedRunTimestamp(savedRunSummary.savedAt)}
                          </div>
                          {savedRunSummary.sourcePlayMode === 'multiplayer' && !menuUsesCompactLayout && (
                            <div className="mt-1 text-[10px] uppercase text-cyan-200">
                              Co-op snapshot resumes in solo mode
                            </div>
                          )}
                          <button
                            data-modal-btn=""
                            onClick={handleDiscardSave}
                            disabled={missionStartPending}
                            className={`${menuUsesCompactLayout ? 'mt-2 py-1 text-[10px]' : 'mt-2 py-1 text-xs'} w-full ui-button ui-button-secondary font-bold ${missionStartPending ? 'ui-button-disabled pointer-events-none' : ''}`}
                          >
                            DISCARD SAVE
                          </button>
                        </div>
                      </div>
                    ) : (
                        <button
                          data-modal-btn=""
                          autoFocus
                          onClick={beginMissionStartup}
                          disabled={missionStartPending}
                          className={`group relative w-full ui-button ui-menu-primary font-extrabold transition-all overflow-hidden ${menuUsesCompactLayout ? 'py-3' : 'py-5'} ${missionStartPending ? 'ui-button-disabled pointer-events-none' : ''}`}
                        >
                          <span className={`flex items-center justify-center gap-3 ${menuUsesCompactLayout ? 'text-base' : 'text-xl'}`}>
                            <span className="animate-pulse">{missionStartPending ? ' STARTING...' : ' START MISSION'}</span>
                          </span>
                        </button>
                    )}

                    <div className="ui-chip p-2 border border-black/50 bg-black/25">
                      <div className="text-[10px] uppercase ui-muted mb-2 text-center">Play Mode</div>
                      <div className="flex gap-2">
                        <button
                          data-modal-btn=""
                          onClick={() => setPlayMode('multiplayer')}
                          className={`flex-1 ui-button py-2 font-bold text-xs ${playMode === 'multiplayer' ? 'ui-button-warning' : 'ui-button-secondary'}`}
                        >
                          CO-OP
                        </button>
                        <button
                          data-modal-btn=""
                          onClick={() => setPlayMode('solo')}
                          className={`flex-1 ui-button py-2 font-bold text-xs ${playMode === 'solo' ? 'ui-button-warning' : 'ui-button-secondary'}`}
                        >
                          Solo
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4">
                    <button
                        data-modal-btn=""
                        onClick={() => setMode(GameMode.LIBRARY)}
                        className="flex-1 ui-button ui-button-secondary ui-button-secondary-mint py-3 font-bold transition-all"
                    >
                        <span className="text-sm flex items-center justify-center gap-2">
                        <span> GUIDE</span>
                        </span>
                    </button>

                    <button
                        data-modal-btn=""
                        onClick={() => setMode(GameMode.LEADERBOARD)}
                        className="flex-1 ui-button ui-button-secondary ui-button-secondary-cyan py-3 font-bold transition-all"
                    >
                        <span className="text-sm flex items-center justify-center gap-2">
                        <span> RANKS</span>
                        </span>
                    </button>
                    </div>
                </div>
                {/* Footer */}
                <div className="mt-6 pt-4 border-t-4 border-black text-center flex justify-between items-center text-[10px] ui-muted font-mono">
                    <span>CYCLE 1.7</span>
                    <span>{isMobile ? "TOUCH ENABLED" : "KEYBOARD READY"}</span>
                </div>
                </div>

                {/* HERO SPRITE ANIMATION */}
                <div className="relative mt-0 group pointer-events-none top-2 flex flex-col items-center">
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
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 pointer-events-auto">
              <div className="ui-panel w-full max-w-2xl h-[90vh] flex flex-col relative">
                  <div className="p-4 flex justify-between items-center ui-panel-header">
                      <h2 className="text-xl md:text-2xl ui-title font-bold">IMPACT REPORT</h2>
                      <button data-modal-btn="" autoFocus onClick={() => setImpactOpen(false)} className="ui-modal-close text-xl px-3 py-1">✕</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-black/30 p-4 border-b-4 border-black text-center">
                      <div>
                        <div className="text-xs ui-muted uppercase mb-1">Lifetime Saved (Score)</div>
                        <div className="text-2xl md:text-3xl font-bold text-white">{playerStats.lifetimeCarbon || playerStats.carbonSaved} <span className="text-sm text-green-400">kg</span></div>
                      </div>
                      <div>
                        <div className="text-xs ui-muted uppercase mb-1">Current Wallet</div>
                        <div className="text-2xl md:text-3xl font-bold text-yellow-300">{playerStats.carbonSaved} <span className="text-sm text-yellow-500">kg</span></div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {playerStats.impactHistory.length === 0 ? (
                          <div className="text-center ui-muted mt-10">No impact data recorded yet. Complete stages or scans to see history!</div>
                      ) : (
                          playerStats.impactHistory.map((entry: any, idx) => (
                              <div key={entry.id || idx} className={`p-4 ui-card ${entry.type === 'SCAN' ? 'ui-card-highlight' : (entry.isCorrect ? 'ui-card-highlight' : 'ui-card-danger')}`}>
                                  {entry.type === 'SCAN' ? (
                                      <>
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-gray-400 text-xs">Stage {entry.stage} • ECO SCAN</span>
                                              <span className="text-gray-500 text-xs">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                          </div>
                                          <p className="text-white font-bold mb-1 text-sm md:text-base">{entry.itemName}</p>
                                          <p className="ui-copy text-xs mb-2">"{entry.feedback}"</p>
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
                                          <button
                                              type="button"
                                              onClick={() => setSelectedImpactQuiz(entry)}
                                              className="w-full text-left text-white font-bold mb-2 text-sm md:text-base hover:text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
                                          >
                                              "{entry.question}"
                                          </button>
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

                  {selectedImpactQuiz && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3">
                          <div className={`ui-panel w-full max-w-lg max-h-full flex flex-col overflow-hidden ${selectedImpactQuiz.isCorrect ? 'ui-card-highlight' : 'ui-card-danger'}`}>
                              <div className="p-4 pb-2 flex items-start justify-between gap-3 ui-panel-header">
                                  <div>
                                      <div className="text-xs ui-muted uppercase mb-1">Stage {selectedImpactQuiz.stage} Quiz Explanation</div>
                                      <h3 className="text-base md:text-lg font-bold text-white leading-snug">"{selectedImpactQuiz.question}"</h3>
                                  </div>
                                  <button
                                      data-modal-btn=""
                                      type="button"
                                      onClick={() => setSelectedImpactQuiz(null)}
                                      className="ui-modal-close text-lg px-3 py-1 shrink-0"
                                  >
                                      X
                                  </button>
                              </div>

                              <div className="overflow-y-auto p-4 pt-3 text-center">
                                  <div className="bg-black/40 p-3 mb-3 ui-copy border-4 border-black">
                                      <div className="flex flex-col items-center gap-2">
                                          {selectedImpactQuiz.explanationImageSrc && (
                                              <img
                                                  src={selectedImpactQuiz.explanationImageSrc}
                                                  alt=""
                                                  aria-hidden="true"
                                                  className="w-full max-w-80 aspect-square max-h-[42vh] shrink-0 border-4 border-black bg-black/50 object-cover [image-rendering:pixelated]"
                                                  loading="lazy"
                                                  decoding="async"
                                              />
                                          )}
                                          <p className="w-full max-h-28 overflow-y-auto px-1 text-sm md:text-base leading-relaxed">
                                              {selectedImpactQuiz.explanation || 'Explanation details were not saved for this earlier history entry.'}
                                          </p>
                                      </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 text-sm">
                                      <div className={`font-bold ${selectedImpactQuiz.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                                          You chose: {selectedImpactQuiz.yourAnswer}
                                      </div>
                                      {!selectedImpactQuiz.isCorrect && selectedImpactQuiz.correctAnswer && (
                                          <div className="text-gray-300 text-xs">Correct: {selectedImpactQuiz.correctAnswer}</div>
                                      )}
                                      {selectedImpactQuiz.isCorrect && (
                                          <div className="text-green-400 font-bold">+{selectedImpactQuiz.carbonValue} kg</div>
                                      )}
                                  </div>
                              </div>

                              <button
                                  data-modal-btn=""
                                  type="button"
                                  onClick={() => setSelectedImpactQuiz(null)}
                                  className="ui-button ui-button-secondary p-3 font-bold border-t-4 border-black"
                              >
                                  BACK TO REPORT
                              </button>
                          </div>
                      </div>
                  )}
                  
                  <button onClick={() => setImpactOpen(false)} className="ui-button ui-button-secondary p-4 font-bold border-t-4 border-black">
                      CLOSE REPORT
                  </button>
              </div>
          </div>
      );
  }

  // --- PAUSE MODAL ---
  if (mode === GameMode.PAUSED) {
      return (
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 pointer-events-auto">
              <div className="ui-panel p-6 md:p-8 text-center max-w-sm w-full max-h-[92vh] overflow-y-auto">
                  <h2 className="text-3xl md:text-4xl ui-title font-bold mb-8">PAUSED</h2>
                  <div className="space-y-4">
                      <button data-modal-btn="" autoFocus onClick={togglePause} className="w-full ui-button ui-button-primary py-4 font-bold text-xl">RESUME</button>

                      <div className="hidden">
                          <button
                            onClick={() => setMode(GameMode.STATUS)}
                            className="flex-1 ui-button ui-button-primary py-3 font-bold text-sm flex flex-col items-center justify-center"
                          >
                              <span className="text-lg">👷</span>
                              STATUS
                          </button>
                          <button
                            onClick={() => setMode(GameMode.LIBRARY)}
                            className="flex-1 ui-button ui-button-secondary py-3 font-bold text-sm flex flex-col items-center justify-center"
                          >
                              <span className="text-lg">📖</span>
                              GUIDE
                          </button>
                      </div>

                      <button
                        data-modal-btn=""
                        onClick={() => setMode(GameMode.LIBRARY)}
                        className="w-full ui-button ui-button-secondary py-3 font-bold text-sm flex flex-col items-center justify-center"
                      >
                          GUIDE
                      </button>

                      <div className="ui-chip p-2 border border-black/50 bg-black/25">
                        <div className="text-[10px] uppercase ui-muted mb-2 text-center">Play Mode</div>
                        <div className="flex gap-2">
                          <button
                            data-modal-btn=""
                            onClick={() => setPlayMode('multiplayer')}
                            className={`flex-1 ui-button py-2 font-bold text-xs ${playMode === 'multiplayer' ? 'ui-button-warning' : 'ui-button-secondary'}`}
                          >
                            CO-OP
                          </button>
                          <button
                            data-modal-btn=""
                            onClick={() => setPlayMode('solo')}
                            className={`flex-1 ui-button py-2 font-bold text-xs ${playMode === 'solo' ? 'ui-button-warning' : 'ui-button-secondary'}`}
                          >
                            Solo
                          </button>
                        </div>
                      </div>

                      <div className="ui-chip p-3 border border-black/50 bg-black/25 text-left">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[10px] uppercase ui-muted">Audio</div>
                          <button
                            data-modal-btn=""
                            onClick={toggleMute}
                            className={`ui-button px-3 py-1 text-[10px] font-bold flex items-center gap-1 ${isMuted ? 'ui-button-disabled' : 'ui-button-warning'}`}
                          >
                            <SoundIcon muted={isMuted} size={14} />
                            {isMuted ? 'UNMUTE ALL' : 'MUTE ALL'}
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-green-200">Music</span>
                              <span className="text-[10px] ui-muted">{musicMuted ? 'MUTED' : `${Math.round(musicVolume * 100)}%`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                data-modal-btn=""
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(musicVolume * 100)}
                                onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                                className="w-full accent-green-400"
                                aria-label="Music volume"
                              />
                              <button
                                data-modal-btn=""
                                onClick={toggleMusicMute}
                                className={`ui-button px-2 py-1 text-[10px] font-bold min-w-[64px] ${musicMuted ? 'ui-button-disabled' : 'ui-button-secondary'}`}
                              >
                                {musicMuted ? 'UNMUTE' : 'MUTE'}
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-cyan-200">SFX</span>
                              <span className="text-[10px] ui-muted">{sfxMuted ? 'MUTED' : `${Math.round(sfxVolume * 100)}%`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                data-modal-btn=""
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(sfxVolume * 100)}
                                onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                                className="w-full accent-cyan-300"
                                aria-label="SFX volume"
                              />
                              <button
                                data-modal-btn=""
                                onClick={toggleSfxMute}
                                className={`ui-button px-2 py-1 text-[10px] font-bold min-w-[64px] ${sfxMuted ? 'ui-button-disabled' : 'ui-button-secondary'}`}
                              >
                                {sfxMuted ? 'UNMUTE' : 'MUTE'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                          data-modal-btn=""
                          onClick={toggleFullScreen}
                          className="w-full py-3 font-bold text-sm flex items-center justify-center gap-2 ui-button ui-button-secondary"
                      >
                          {isFullScreen ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                          ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m15 3l2.3 2.3l-2.89 2.87l1.42 1.42L18.7 6.7L21 9V3zM3 9l2.3-2.3l2.87 2.89l1.42-1.42L6.7 5.3L9 3H3zm6 12l-2.3-2.3l2.89-2.87l-1.42-1.42L5.3 17.3L3 15v6zm12-6l-2.3 2.3l-2.87-2.89l-1.42 1.42l2.89 2.87L15 21h6z"/></svg>
                          )}
                          <span>{isFullScreen ? 'EXIT FS' : 'FULL SCR'}</span>
                      </button>

                      <button data-modal-btn="" onClick={() => setMode(GameMode.MENU)} className="w-full ui-button ui-button-danger py-4 font-bold text-xl">QUIT TO MENU</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Non-blocking startup badge ---
  if (mode === GameMode.INSTRUCTIONS) {
      return (
          <div className="absolute top-3 left-3 ui-card px-3 py-2 pointer-events-none z-50">
              <p className="text-[10px] uppercase ui-muted">
                  {!isStageReady ? 'Preparing world' : !isOverworldSceneReady ? 'Finalizing scene' : 'Starting'}
              </p>
              <p className="text-[11px] text-green-300 font-bold">
                  {currentConfig?.stageName ?? 'ECO GUARDIAN'} {startupDisplayedProgress}%
              </p>
          </div>
      );
  }

  // --- Stage loading screen ---
  // Covers the canvas while ground tiles + prop sprites preload between
  // stages, after a save resume, or on portal entry. Without this, the
  // procedural placeholder art could flash for a frame on slow loads.
  if (mode === GameMode.LOADING_LEVEL) {
      return (
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] animate-in fade-in duration-200">
              <div className="ui-card px-6 py-5 flex flex-col items-center gap-3">
                  <p className="text-[10px] uppercase ui-muted">Loading next stage</p>
                  <p className="text-base text-green-300 font-bold tracking-wider">
                      {currentConfig?.stageName ?? `STAGE ${activeStage}`}
                  </p>
                  <div className="w-40 h-1 bg-white/10 rounded overflow-hidden">
                      <div className="h-full bg-green-400 animate-pulse" style={{ width: '60%' }} />
                  </div>
              </div>
          </div>
      );
  }

  // --- QUIZ RESULT MODAL ---
  if (mode === GameMode.QUIZ_RESULT && quizResult) {
      return (
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 animate-in fade-in duration-300">
              <div className={`flex flex-col w-full max-w-xl max-h-[90vh] ui-panel ${quizResult.correct ? 'ui-card-highlight' : 'ui-card-danger'}`}>
                  
                  {/* Header */}
                  <div className="p-4 pb-1 shrink-0 text-center">
                    <h2 className={`text-xl md:text-3xl mb-1 font-bold ${quizResult.correct ? 'text-green-300' : 'text-red-300'}`}>
                        {quizResult.correct ? "GAIA APPROVES!" : "OOPS!"}
                    </h2>
                  </div>
                  
                  {/* Scrollable Body */}
                  <div ref={resultScrollRef} className="overflow-y-auto px-4 md:px-6 pt-0 pb-2 flex-1 text-center">
                    {!!quizResult.bonus && (
                        <div className="text-yellow-300 font-bold animate-pulse mb-2 text-sm md:text-base">
                            ★ BONUS CHEST UNLOCKED ★
                        </div>
                    )}

                    <p className="text-white text-sm mb-1">You answered: <span className="font-bold text-base">{quizResult.answerLabel}</span></p>

                    {quizResult.correct ? (
                        <>
                            {quizResult.streak > 1 && (
                                <div className="text-orange-300 font-bold text-base mb-1 animate-pulse">
                                    COMBO x{quizResult.streak}!
                                </div>
                            )}
                            <div className="text-green-400 font-bold text-xs md:text-sm mb-3">
                                +{quizResult.carbonValue}kg CO2 Saved!
                                {quizResult.streak > 1 && (
                                    <span className="text-orange-300 ml-1">(+{(quizResult.streak - 1) * 20} bonus)</span>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-red-400 font-bold text-xs md:text-sm mb-1">
                                The oceans felt that one.
                            </div>
                            <div className="ui-card ui-card-danger p-2 mb-3">
                                {quizResult.lostStreak > 1 && (
                                    <div className="text-red-300 font-bold text-base mb-1">
                                        STREAK LOST! x{quizResult.lostStreak}
                                    </div>
                                )}
                                <div className="text-yellow-300 text-xs animate-pulse">
                                    A Misinformation enemy approaches...
                                </div>
                            </div>
                        </>
                    )}

                    <div className="bg-black/40 p-3 mb-2 ui-copy border-4 border-black">
                        <div className="flex flex-col items-center gap-2 text-center">
                            {quizResult.explanationImageSrc && (
                                <img
                                    src={quizResult.explanationImageSrc}
                                    alt=""
                                    aria-hidden="true"
                                    className="w-full max-w-80 aspect-square max-h-[42vh] shrink-0 border-4 border-black bg-black/50 object-cover [image-rendering:pixelated]"
                                    loading="lazy"
                                    decoding="async"
                                />
                            )}
                            <p className="w-full max-h-24 sm:max-h-28 overflow-y-auto px-1 text-sm md:text-base leading-relaxed">
                                {quizResult.explanation}
                            </p>
                        </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 pt-3 shrink-0">
                    <button
                        data-modal-btn=""
                        autoFocus
                        onClick={dismissQuizResult}
                        className="w-full py-3 ui-button ui-button-primary font-bold text-lg"
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
          <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 animate-in fade-in duration-300">
              <div className="ui-panel ui-card-danger p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
                  <div className="text-center mb-6 shrink-0">
                      <h2 className="text-3xl md:text-5xl ui-danger font-bold animate-pulse">WARNING</h2>
                      <div className="h-2 bg-red-600 border-2 border-black w-full mt-2"></div>
                  </div>
                  
                  <div 
                    ref={scrollRef} 
                    className="bg-black/50 p-6 border-4 border-black mb-6 text-center overflow-y-auto flex-1"
                    style={{ touchAction: 'pan-y' }}
                  >
                      <h3 className="text-red-300 text-xl font-bold mb-4">{currentConfig.boss.name} DETECTED</h3>
                      <p className="text-white text-lg leading-relaxed">
                          "{currentConfig.boss.narrative}"
                      </p>
                  </div>

                  <button
                      data-modal-btn=""
                      autoFocus
                      onClick={dismissBossNarrative}
                      className="w-full ui-button ui-button-danger py-4 font-bold text-xl animate-bounce shrink-0"
                  >
                      ENGAGE THREAT
                  </button>
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
  const safeAreaBottom = 'env(safe-area-inset-bottom, 0px)';
  const bottomHudPaddingBottom = `calc(${safeAreaBottom} + ${isShortHeight ? 4 : 8}px)`;
  const gameplayOverlayMarginBottom = `calc(${safeAreaBottom} + ${isShortHeight ? 64 : 96}px)`;
  const zoomRatio = Math.max(0, Math.min(1, (cameraZoom - CAMERA_ZOOM_MIN) / (CAMERA_ZOOM_MAX - CAMERA_ZOOM_MIN)));
  const zoomThumbTop = `${15 + zoomRatio * 70}%`;
  const zoomFillHeight = `${zoomRatio * 100}%`;
  const zoomDisplay = `${(1 / cameraZoom).toFixed(1)}x`;

  const updateZoomFromClientY = (clientY: number) => {
      const track = zoomTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.height <= 0) return;

      const trackTop = rect.top + rect.height * 0.15;
      const trackHeight = rect.height * 0.7;
      const ratio = Math.max(0, Math.min(1, (clientY - trackTop) / trackHeight));
      setCameraZoom(CAMERA_ZOOM_MIN + ratio * (CAMERA_ZOOM_MAX - CAMERA_ZOOM_MIN));
  };

  const handleZoomPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      updateZoomFromClientY(e.clientY);
  };

  const handleZoomPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.buttons & 1) === 0) return;
      e.preventDefault();
      e.stopPropagation();
      updateZoomFromClientY(e.clientY);
  };

  const handleZoomWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setCameraZoom((current) => current + e.deltaY * 0.001);
  };

  return (
    <div className="contents" style={{ fontSize: 0 }}>
      {hasMpPeers && mode === GameMode.OVERWORLD && portals.map((portal) => {
        const vote = mpPortalVotes[portal.id];
        if (!vote || vote.voters.length === 0) return null;
        const screenPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 - 120 };
        const countdownSeconds = vote.countdownMs != null ? Math.max(0, Math.ceil(vote.countdownMs / 1000)) : null;
        return (
          <PortalVoteBadge
            key={`pv_${portal.id}`}
            voters={vote.voters}
            required={vote.required}
            voterSlotsByPlayerId={voterSlotsByPlayerId}
            screenPos={screenPos}
            countdownSeconds={countdownSeconds}
          />
        );
      })}
      {isGenerating && mode === GameMode.OVERWORLD && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] animate-pulse">
              <div className="ui-card ui-card-cyan p-4 text-xs font-bold flex items-center gap-3">
                  <div className="w-3 h-3 bg-cyan-400 border border-black animate-ping"/>
                  DECRYPTING SIGNAL...
              </div>
          </div>
      )}

      {battleWon && !chestReward && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-[100] animate-in fade-in zoom-in duration-300">
             <div className="text-center ui-panel p-6">
                 <h2 className="text-4xl md:text-6xl font-bold ui-title mb-4">
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
          <div className="ui-chip p-1 text-white text-xs px-2">LVL {playerStats.level}</div>
          <div className="ui-chip ui-chip-primary p-1 text-xs px-2">STAGE {activeStage}</div>
          {mpGroupId && (
            <div
              className="ui-chip p-1 text-xs px-1.5 text-cyan-200 border border-cyan-500/50 flex items-center gap-1"
              aria-label={`${activePlayers} active players`}
              title={`${activePlayers} active players`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span className="font-bold leading-none">x{activePlayers}</span>
            </div>
          )}
          {playerStats.quizStreak > 0 && (
            <div className="ui-chip ui-chip-warning p-1 text-xs px-2 animate-pulse">
              x{playerStats.quizStreak}
            </div>
          )}
        </div>

        {mpGuideMessage && mode === GameMode.OVERWORLD && (
          <div className="ui-chip p-1 text-[10px] px-2 text-yellow-100 border border-yellow-500/50 max-w-64">
            {mpGuideMessage}
          </div>
        )}
        
        <div className="w-36 md:w-64 h-6 ui-progress relative">
          <div 
            className="h-full ui-progress-fill-health transition-all duration-200"
            style={{ width: `${(playerStats.hp / playerStats.maxHp) * 100}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold whitespace-nowrap" style={{ textShadow: '1px 1px 0 #000' }}>
            HP {Math.ceil(playerStats.hp)}/{playerStats.maxHp}
          </span>
        </div>

        <div className="w-36 md:w-64 h-6 ui-progress relative -mt-1">
          <div
            className="h-full ui-progress-fill-xp transition-all duration-200"
            style={{ width: `${Math.min(100, (playerStats.xp / playerStats.xpToNextLevel) * 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold whitespace-nowrap" style={{ textShadow: '1px 1px 0 #000' }}>
            XP {Math.floor(playerStats.xp)}/{playerStats.xpToNextLevel}
          </span>
        </div>

        {/* Updated HUD Container: Relaxed width constraint to prevent passive icons wrapping/hiding incorrectly */}
        <div className="flex flex-col gap-1 mt-1 w-auto max-w-[250px] md:max-w-none">
          <div className="flex gap-1 flex-wrap">
            {weaponSlotsUI.map((slot, idx) => (
               <div key={`w_slot_${idx}`} className={`w-8 h-8 ui-slot flex items-center justify-center text-sm leading-none text-white relative ${slot.status === 'LOCKED' ? 'ui-card-danger opacity-60' : (slot.data && EVO_KEYS.includes(slot.data[0]) ? 'ui-slot-evolution' : '')}`}>
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
                  {slot.status === 'EMPTY' && <span className="ui-muted text-[10px]">{idx + 1}</span>}
                  {slot.status === 'LOCKED' && <span className="text-red-500 text-[10px]">🔒</span>}
               </div>
            ))}
          </div>

          <div className="flex gap-1 flex-wrap">
            {passiveSlotsUI.map(([key, level]) => (
               <div key={key} className="w-8 h-8 ui-slot ui-slot-passive flex items-center justify-center text-white relative" title={key}>
                  <div className="text-sm">
                    {PASSIVES_DATA[key]?.icon || '❓'}
                  </div>
                  <span className="ui-slot-level ui-slot-level-passive text-[8px]">{level as number}</span>
               </div>
            ))}
          </div>
        </div>
      </div>

      {((mode as any) === GameMode.OVERWORLD || (mode as any) === GameMode.BATTLE) && (
        <FpsMeter isShortHeight={isShortHeight} />
      )}

      {renderMinimap()}

      {((mode as any) === GameMode.OVERWORLD || (mode as any) === GameMode.BATTLE) && !battleWon && (
          <div
            className={`absolute right-3 z-[65] pointer-events-auto select-none ${isShortHeight ? 'top-[43%]' : 'top-1/2'} -translate-y-1/2`}
            onPointerDown={handleZoomPointerDown}
            onPointerMove={handleZoomPointerMove}
            onWheel={handleZoomWheel}
            ref={zoomTrackRef}
            role="slider"
            tabIndex={0}
            aria-label="Camera zoom"
            aria-orientation="vertical"
            aria-valuemin={CAMERA_ZOOM_MIN}
            aria-valuemax={CAMERA_ZOOM_MAX}
            aria-valuenow={cameraZoom}
            style={{ touchAction: 'none' }}
            onKeyDown={(e) => {
              const STEP = (CAMERA_ZOOM_MAX - CAMERA_ZOOM_MIN) / 20;
              if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                setCameraZoom((z) => Math.max(CAMERA_ZOOM_MIN, z - STEP));
              } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                e.preventDefault();
                setCameraZoom((z) => Math.min(CAMERA_ZOOM_MAX, z + STEP));
              }
            }}
          >
              <div className={`${isShortHeight ? 'h-28' : 'h-40'} w-8 ui-card flex items-center justify-center relative`}>
                  <div className="absolute top-2 text-[8px] leading-none font-bold text-cyan-200/70">IN</div>
                  <div className="absolute bottom-2 text-[8px] leading-none font-bold text-cyan-200/70">OUT</div>
                  <div className="h-[70%] w-2 bg-black overflow-hidden border border-black">
                      <div className="w-full ui-progress-fill-xp" style={{ height: zoomFillHeight }} />
                  </div>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-12 px-2 py-1 ui-chip ui-chip-cyan text-[10px] font-black text-center"
                    style={{ top: zoomThumbTop }}
                  >
                      {zoomDisplay}
                  </div>
              </div>
          </div>
      )}
      
      {/* Fix: cast mode to any to prevent narrowing error because PAUSED already returned */}
      {((mode as any) === GameMode.OVERWORLD || (mode as any) === GameMode.BATTLE || (mode as any) === GameMode.PAUSED) && (
          <div
            className={`absolute bottom-0 left-0 w-full bg-[var(--eco-panel)] border-t-4 border-black z-[60] pointer-events-auto flex items-stretch ${isShortHeight ? 'py-1' : ''}`}
            style={{ paddingBottom: bottomHudPaddingBottom }}
          >
              <button
                onClick={() => setMode(GameMode.STATUS)}
                className={`flex-1 border-r-4 border-black ${isShortHeight ? 'py-1' : 'py-2'} px-2 hover:bg-green-900/60 active:bg-green-800 flex flex-col items-center justify-center gap-0.5 group bg-black/30 transition-colors`}
              >
                  <span className={`${isShortHeight ? 'text-lg' : 'text-2xl'} text-green-300 group-hover:scale-110 transition-transform leading-none`}>
                      <StatusIcon className="w-[1em] h-[1em]" />
                  </span>
                  <span className={`${isShortHeight ? 'text-[10px]' : 'text-xs'} font-bold text-gray-200`}>
                      STATUS
                  </span>
              </button>

              <button 
                onClick={() => setImpactOpen(true)}
                className={`flex-[1.5] ${isShortHeight ? 'py-1' : 'py-2'} px-2 hover:bg-green-900/60 active:bg-green-800 flex flex-col items-center justify-center gap-0.5 group bg-[var(--eco-panel-2)] border-x-4 border-black transition-colors`}
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
                className={`flex-1 border-l-4 border-black ${isShortHeight ? 'py-1' : 'py-2'} px-2 hover:bg-green-900/60 active:bg-green-800 flex flex-col items-center justify-center gap-0.5 group transition-colors`}
              >
                  {/* Fix: cast mode to any to bypass narrowing as GameMode.PAUSED already returned earlier */}
                  <span className={`${isShortHeight ? 'text-lg' : 'text-2xl'} text-green-300 group-hover:scale-110 transition-transform leading-none`}>
                    {(mode as any) === GameMode.PAUSED ? '▶' : <PauseIcon size={isShortHeight ? 22 : 32} />}
                  </span>
                  <span className={`${isShortHeight ? 'text-[10px]' : 'text-xs'} font-bold text-gray-200`}>{(mode as any) === GameMode.PAUSED ? 'RESUME' : 'PAUSE'}</span>
              </button>
          </div>
      )}
      
      <div
        className="absolute inset-0 z-50 pointer-events-none"
        style={{ marginBottom: gameplayOverlayMarginBottom }}
      >
        {isMobile && <VirtualJoystick key={mode} onMove={onJoystickMove} />}
        
        {/* Fix: cast mode to any to prevent narrowing error due to early returns */}
        {((mode as any) === GameMode.BATTLE || (mode as any) === GameMode.OVERWORLD) && !battleWon && (
          <button 
            className={`absolute ui-button ui-button-danger ui-dash-button flex items-center justify-center transition-transform pointer-events-auto ${isShortHeight ? 'w-24 h-24 bottom-2 right-4' : 'w-24 h-24 md:w-28 md:h-28 bottom-8 right-8'}`}
            onTouchStart={handleDashAction}
            onMouseDown={handleDashAction}
            disabled={dashCooldownCurrent > 0}
            style={{ touchAction: 'none' }} 
          >
             <div className="absolute inset-3 ui-dash-meter pointer-events-none overflow-hidden">
                <div
                    className="absolute bottom-0 left-0 right-0 ui-progress-fill-dash transition-[height] duration-75 ease-linear"
                    style={{ height: `${dashProgress * 100}%` }}
                />
             </div>
             <span className={`absolute inset-0 flex items-center justify-center font-bold text-white z-10 pointer-events-none ${isShortHeight ? 'text-xs' : 'text-xs'}`}>
                {dashCooldownCurrent > 0 ? `${dashCooldownCurrent.toFixed(1)}s` : "DASH"}
             </span>
          </button>
        )}
      </div>

      {!isMobile && (
        <div className="absolute bottom-24 left-1 ui-chip ui-guide-chip px-1 py-0.5 text-[9px] leading-[1.15] text-left pointer-events-none z-50">
          WASD or Arrows to Move
          {(mode === GameMode.BATTLE || mode === GameMode.OVERWORLD) && (
            <>
              <br />
              SPACE or Click Dash to Burst
            </>
          )}
          {mode === GameMode.OVERWORLD && (
            <>
              <br />
              Choose a Portal to Battle
            </>
          )}
        </div>
      )}
    </div>
  );
};
