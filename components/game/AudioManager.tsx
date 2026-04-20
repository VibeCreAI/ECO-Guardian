import React, { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameMode } from '../../types';
import { ASSET_PATHS } from '../../assets';

const GAIA_NARRATION_EVENT = 'eco-guardian:gaia-narration';
export const GAIA_NARRATION_LIFECYCLE_EVENT = 'eco-guardian:gaia-narration-lifecycle';
export const FINAL_ENDING_NARRATION_KEY = 'gaia:final-ending';

const SFX_EVENT = 'eco-guardian:sfx';

export type SfxKey =
  | 'hit_enemy'
  | 'die_enemy'
  | 'hit_player'
  | 'co2_orb_pickup'
  | 'level_up'
  | 'upgrade_select'
  | 'chest_reward'
  | 'boss_defeat'
  | 'dash_player'
  | 'dash_enemy'
  | 'game_over';

const SFX_SOURCES: Record<SfxKey, string> = {
  hit_enemy: ASSET_PATHS.audio.sfx.hitEnemy,
  die_enemy: ASSET_PATHS.audio.sfx.dieEnemy,
  hit_player: ASSET_PATHS.audio.sfx.hitPlayer,
  co2_orb_pickup: ASSET_PATHS.audio.sfx.co2OrbPickup,
  level_up: ASSET_PATHS.audio.sfx.levelUp,
  upgrade_select: ASSET_PATHS.audio.sfx.upgradeSelect,
  chest_reward: ASSET_PATHS.audio.sfx.chestReward,
  boss_defeat: ASSET_PATHS.audio.sfx.bossDefeat,
  dash_player: ASSET_PATHS.audio.sfx.dashPlayer,
  dash_enemy: ASSET_PATHS.audio.sfx.dashEnemy,
  game_over: ASSET_PATHS.audio.sfx.gameOver,
};

// Min interval (ms) between repeated plays of the same key — prevents machine-gun sound
// when high-frequency weapons trigger damageEnemy many times per second.
const SFX_MIN_INTERVAL_MS: Record<SfxKey, number> = {
  hit_enemy: 45,
  die_enemy: 40,
  hit_player: 220,
  co2_orb_pickup: 35,
  level_up: 500,
  upgrade_select: 100,
  chest_reward: 200,
  boss_defeat: 500,
  dash_player: 100,
  dash_enemy: 80,
  game_over: 2000,
};

const SFX_POOL_SIZE = 4;

// Master attenuation applied to all SFX playback. Keeps gameplay SFX well below
// Gaia narration (which also reads sfxVolume but at 0.9x and is voice-critical).
const SFX_MASTER_GAIN = 0.45;

type SfxOptions = {
  volume?: number;
  pitchJitter?: boolean;
};

type SfxDetail = { key: SfxKey } & SfxOptions;

export const requestSfx = (key: SfxKey, options: SfxOptions = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SfxDetail>(SFX_EVENT, {
    detail: { key, ...options },
  }));
};

type GaiaNarrationClip = {
  src: string;
  key: string;
};

type GaiaNarrationClipInput = {
  src?: string;
  key?: string;
} | null | undefined;

type GaiaNarrationDetail = {
  clips: GaiaNarrationClip[];
};

type GaiaNarrationLifecycleStatus = 'started' | 'finished' | 'skipped' | 'error';

type GaiaNarrationLifecycleDetail = GaiaNarrationClip & {
  status: GaiaNarrationLifecycleStatus;
};

type AudioContextConstructor = typeof AudioContext;

const getAudioContextConstructor = (): AudioContextConstructor | undefined =>
  window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;

const normalizeNarrationClips = (clips: GaiaNarrationClipInput[]): GaiaNarrationClip[] =>
  clips.flatMap((clip) => (clip?.src && clip.key ? [{ src: clip.src, key: clip.key }] : []));

const dispatchGaiaNarrationLifecycle = (
  clip: GaiaNarrationClip,
  status: GaiaNarrationLifecycleStatus,
) => {
  if (clip.key === FINAL_ENDING_NARRATION_KEY) {
    const store = useGameStore.getState();
    if (status === 'started') {
      store.markFinalEndingNarrationStarted();
    } else {
      store.markFinalEndingNarrationEnded();
    }
  }

  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<GaiaNarrationLifecycleDetail>(GAIA_NARRATION_LIFECYCLE_EVENT, {
    detail: { ...clip, status },
  }));
};

const clampStageNumber = (stageNumber: number) => Math.min(10, Math.max(1, stageNumber));

const getMusicVolumeForMode = (mode: GameMode) =>
  mode === GameMode.PAUSED ||
  mode === GameMode.STATUS ||
  mode === GameMode.LIBRARY ||
  mode === GameMode.SHOP ||
  mode === GameMode.REWARD
    ? 0.15
    : 0.4;

export const requestGaiaNarrationSequence = (clips: GaiaNarrationClipInput[]) => {
  if (typeof window === 'undefined') return;
  const normalizedClips = normalizeNarrationClips(clips);
  if (normalizedClips.length === 0) return;

  window.dispatchEvent(new CustomEvent<GaiaNarrationDetail>(GAIA_NARRATION_EVENT, {
    detail: { clips: normalizedClips },
  }));
};

export const requestGaiaNarration = (src: string | undefined, key: string | undefined) => {
  requestGaiaNarrationSequence([{ src, key }]);
};

export const requestQuizNarration = requestGaiaNarration;

export const AudioManager: React.FC = () => {
  const mode = useGameStore(s => s.mode);
  const previousMode = useGameStore(s => s.previousMode);
  const activeStage = useGameStore(s => s.activeStage);
  const activeBattle = useGameStore(s => s.activeBattle);
  const lastGameplayMode = useGameStore(s => s.lastGameplayMode);
  const finalEndingCinematicPhase = useGameStore(s => s.finalEndingCinematic.phase);
  const isCinematicActive = finalEndingCinematicPhase !== 'inactive' && finalEndingCinematicPhase !== 'complete';
  const isCinematicActiveRef = useRef(isCinematicActive);
  const musicMuted = useGameStore(s => s.musicMuted);
  const sfxMuted = useGameStore(s => s.sfxMuted);
  const musicVolume = useGameStore(s => s.musicVolume);
  const sfxVolume = useGameStore(s => s.sfxVolume);
  const quizResult = useGameStore(s => s.quizResult);
  const isOverworldSceneReady = useGameStore(s => s.isOverworldSceneReady);
  const audioRef = useRef<HTMLAudioElement>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const narrationKeyRef = useRef<string | null>(null);
  const narrationQueueRef = useRef<GaiaNarrationClip[]>([]);
  const pendingNarrationQueueRef = useRef<GaiaNarrationClip[]>([]);
  const playNextNarrationRef = useRef<() => void>(() => {});
  const narrationAudioContextRef = useRef<AudioContext | null>(null);
  const narrationNodesRef = useRef<AudioNode[]>([]);
  const introPlayedStagesRef = useRef<Set<number>>(new Set());
  const hasInteracted = useRef(false);
  const sfxPoolRef = useRef<Map<SfxKey, { clones: HTMLAudioElement[]; cursor: number }> | null>(null);
  const sfxLastPlayedRef = useRef<Map<SfxKey, number>>(new Map());
  const playerLevel = useGameStore(s => s.playerStats.level);
  const previousPlayerLevelRef = useRef(playerLevel);
  const playerLastDamageTime = useGameStore(s => s.playerStats.lastDamageTime);
  const previousPlayerLastDamageTimeRef = useRef(playerLastDamageTime);
  const previousModeRef = useRef(mode);

  const applyMusicVolume = useCallback((narrationActive = Boolean(narrationRef.current)) => {
    const audio = audioRef.current;
    if (!audio) return;

    const { mode, musicMuted, musicVolume } = useGameStore.getState();
    if (musicMuted || musicVolume <= 0) {
      audio.volume = 0;
      return;
    }

    const baseVolume = getMusicVolumeForMode(mode) * musicVolume;
    audio.volume = narrationActive ? Math.min(baseVolume, 0.12 * musicVolume) : baseVolume;
  }, []);

  const disconnectNarrationNodes = useCallback(() => {
    narrationNodesRef.current.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // Some browsers throw if a node is already disconnected.
      }
    });
    narrationNodesRef.current = [];
  }, []);

  const stopNarration = useCallback((status: GaiaNarrationLifecycleStatus = 'skipped') => {
    const narration = narrationRef.current;
    const activeKey = narrationKeyRef.current;
    const queuedClips = [
      ...narrationQueueRef.current,
      ...pendingNarrationQueueRef.current,
    ];

    pendingNarrationQueueRef.current = [];
    narrationQueueRef.current = [];
    narrationKeyRef.current = null;
    disconnectNarrationNodes();

    queuedClips.forEach((clip) => dispatchGaiaNarrationLifecycle(clip, 'skipped'));

    if (!narration) {
      applyMusicVolume(false);
      return;
    }

    if (activeKey) {
      dispatchGaiaNarrationLifecycle({
        src: narration.currentSrc || narration.src,
        key: activeKey,
      }, status);
    }

    narration.pause();
    narration.removeAttribute('src');
    narration.load();
    narrationRef.current = null;
    applyMusicVolume(false);
  }, [applyMusicVolume, disconnectNarrationNodes]);

  const connectNarrationEcho = useCallback((narration: HTMLAudioElement) => {
    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) return;

    const context = narrationAudioContextRef.current ?? new AudioContextCtor();
    narrationAudioContextRef.current = context;
    if (context.state === 'suspended') {
      void context.resume();
    }

    const source = context.createMediaElementSource(narration);
    const dryGain = context.createGain();
    const delay = context.createDelay(0.6);
    const echoFilter = context.createBiquadFilter();
    const wetGain = context.createGain();

    dryGain.gain.value = 0.96;
    delay.delayTime.value = 0.09;
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 3400;
    wetGain.gain.value = 0.1;

    source.connect(dryGain);
    dryGain.connect(context.destination);

    source.connect(delay);
    delay.connect(echoFilter);
    echoFilter.connect(wetGain);
    wetGain.connect(context.destination);

    narrationNodesRef.current = [source, dryGain, delay, echoFilter, wetGain];
  }, []);

  const playNextNarration = useCallback(() => {
    if (narrationRef.current) return;

    const { sfxMuted, sfxVolume } = useGameStore.getState();
    if (sfxMuted || sfxVolume <= 0) {
      [
        ...narrationQueueRef.current,
        ...pendingNarrationQueueRef.current,
      ].forEach((clip) => dispatchGaiaNarrationLifecycle(clip, 'skipped'));
      narrationQueueRef.current = [];
      pendingNarrationQueueRef.current = [];
      applyMusicVolume(false);
      return;
    }

    if (!hasInteracted.current) {
      if (narrationQueueRef.current.length > 0) {
        pendingNarrationQueueRef.current = [
          ...pendingNarrationQueueRef.current,
          ...narrationQueueRef.current,
        ];
        narrationQueueRef.current = [];
      }
      return;
    }

    const detail = narrationQueueRef.current.shift();
    if (!detail) {
      applyMusicVolume(false);
      return;
    }

    const narration = new Audio(detail.src);
    narration.preload = 'auto';
    narration.volume = Math.min(1, 1.0 * sfxVolume);
    narrationRef.current = narration;
    narrationKeyRef.current = detail.key;
    applyMusicVolume(true);

    try {
      connectNarrationEcho(narration);
    } catch {
      disconnectNarrationNodes();
    }

    const cleanup = (status: GaiaNarrationLifecycleStatus) => {
      if (narrationRef.current !== narration) return;

      disconnectNarrationNodes();
      narrationRef.current = null;
      narrationKeyRef.current = null;
      dispatchGaiaNarrationLifecycle(detail, status);

      if (
        narrationQueueRef.current.length > 0 &&
        !useGameStore.getState().sfxMuted &&
        useGameStore.getState().sfxVolume > 0
      ) {
        window.setTimeout(() => playNextNarrationRef.current(), 0);
      } else {
        applyMusicVolume(false);
      }
    };

    narration.addEventListener('ended', () => cleanup('finished'), { once: true });
    narration.addEventListener('error', () => cleanup('error'), { once: true });

    narration.play()
      .then(() => {
        if (narrationRef.current === narration) {
          dispatchGaiaNarrationLifecycle(detail, 'started');
        }
      })
      .catch(() => {
        cleanup('error');
      });
  }, [applyMusicVolume, connectNarrationEcho, disconnectNarrationNodes]);

  playNextNarrationRef.current = playNextNarration;

  const enqueueNarration = useCallback((clips: GaiaNarrationClipInput[]) => {
    const playableClips = normalizeNarrationClips(clips);
    if (playableClips.length === 0) return;

    const { sfxMuted, sfxVolume } = useGameStore.getState();
    if (sfxMuted || sfxVolume <= 0) {
      playableClips.forEach((clip) => dispatchGaiaNarrationLifecycle(clip, 'skipped'));
      return;
    }

    const activeKey = narrationKeyRef.current;
    const queuedKeys = new Set([
      ...narrationQueueRef.current.map((clip) => clip.key),
      ...pendingNarrationQueueRef.current.map((clip) => clip.key),
    ]);
    const dedupedClips: GaiaNarrationClip[] = [];

    playableClips.forEach((clip) => {
      if (clip.key === activeKey || queuedKeys.has(clip.key)) return;
      queuedKeys.add(clip.key);
      dedupedClips.push(clip);
    });

    if (dedupedClips.length === 0) return;

    if (!hasInteracted.current) {
      pendingNarrationQueueRef.current.push(...dedupedClips);
      return;
    }

    narrationQueueRef.current.push(...dedupedClips);
    playNextNarrationRef.current();
  }, []);
  
  // Map game state to audio file
  const getTrackForState = () => {
    if (isCinematicActive) return null;

    // Silence music during GAMEOVER so game_over.mp3 plays solo. Menu music
    // resumes when the player hits TRY AGAIN (transition back to MENU).
    if (mode === GameMode.GAMEOVER) return null;

    const isMenuLibrary = mode === GameMode.LIBRARY && previousMode === GameMode.MENU;

    // Priority 1: Menu / Intro / Leaderboard / Victory
    if (mode === GameMode.MENU || mode === GameMode.DIFFICULTY_SELECT || mode === GameMode.INSTRUCTIONS || mode === GameMode.LEADERBOARD || mode === GameMode.VICTORY || isMenuLibrary) {
      return ASSET_PATHS.audio.music.menu;
    }

    // Priority 2: Battle Context (Actual Fighting, or Paused/Menu inside Battle)
    const isBattleContext = mode === GameMode.BATTLE || (mode !== GameMode.OVERWORLD && mode !== GameMode.LOADING_LEVEL && lastGameplayMode === GameMode.BATTLE);

    if (isBattleContext) {
      if (activeBattle.isBoss) {
        return ASSET_PATHS.audio.music.boss;
      } else {
        return ASSET_PATHS.audio.music.battle;
      }
    }

    // Priority 3: Stage / Overworld (Default)
    const trackNum = ((activeStage - 1) % 10) + 1;
    return ASSET_PATHS.audio.music.stage(trackNum);
  };

  const targetTrack = getTrackForState();

  // Keep cinematic-active ref in sync so event listeners read the latest value
  useEffect(() => {
    isCinematicActiveRef.current = isCinematicActive;
  }, [isCinematicActive]);

  // Persistent User Interaction Listener
  // Checks on every click/tap if audio should be playing but isn't
  useEffect(() => {
    const handleInteraction = () => {
      hasInteracted.current = true;
      if (pendingNarrationQueueRef.current.length > 0) {
        narrationQueueRef.current.push(...pendingNarrationQueueRef.current);
        pendingNarrationQueueRef.current = [];
        playNextNarrationRef.current();
      }

      if (isCinematicActiveRef.current) return;

      const audio = audioRef.current;
      if (audio && !musicMuted && musicVolume > 0 && audio.paused && audio.src) {
        audio.play().catch(() => { /* Suppress specific play errors during interaction */ });
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [musicMuted, musicVolume]);

  useEffect(() => {
    const handleNarrationRequest = (event: Event) => {
      const detail = (event as CustomEvent<GaiaNarrationDetail>).detail;
      enqueueNarration(detail?.clips ?? []);
    };

    window.addEventListener(GAIA_NARRATION_EVENT, handleNarrationRequest);
    return () => window.removeEventListener(GAIA_NARRATION_EVENT, handleNarrationRequest);
  }, [enqueueNarration]);

  // Build preloaded SFX pool once on mount; wire event listener.
  useEffect(() => {
    const pool = new Map<SfxKey, { clones: HTMLAudioElement[]; cursor: number }>();
    (Object.keys(SFX_SOURCES) as SfxKey[]).forEach((key) => {
      const src = SFX_SOURCES[key];
      const clones: HTMLAudioElement[] = [];
      for (let i = 0; i < SFX_POOL_SIZE; i++) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        clones.push(audio);
      }
      pool.set(key, { clones, cursor: 0 });
    });
    sfxPoolRef.current = pool;

    const handleSfxRequest = (event: Event) => {
      const detail = (event as CustomEvent<SfxDetail>).detail;
      if (!detail) return;

      const { sfxMuted, sfxVolume } = useGameStore.getState();
      if (sfxMuted || sfxVolume <= 0) return;
      if (!hasInteracted.current) return;

      const entry = sfxPoolRef.current?.get(detail.key);
      if (!entry) return;

      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const minInterval = SFX_MIN_INTERVAL_MS[detail.key] ?? 0;
      const lastPlayed = sfxLastPlayedRef.current.get(detail.key) ?? -Infinity;
      if (now - lastPlayed < minInterval) return;
      sfxLastPlayedRef.current.set(detail.key, now);

      const clone = entry.clones[entry.cursor];
      entry.cursor = (entry.cursor + 1) % entry.clones.length;

      try {
        clone.currentTime = 0;
      } catch {
        // Some browsers throw if the clone hasn't loaded yet.
      }
      clone.volume = Math.min(1, Math.max(0, sfxVolume * SFX_MASTER_GAIN * (detail.volume ?? 1)));
      clone.playbackRate = detail.pitchJitter ? 0.92 + Math.random() * 0.16 : 1;
      clone.play().catch(() => { /* Autoplay rejection — harmless. */ });
    };

    window.addEventListener(SFX_EVENT, handleSfxRequest);
    return () => window.removeEventListener(SFX_EVENT, handleSfxRequest);
  }, []);

  // Play level-up SFX when player level increments.
  useEffect(() => {
    if (playerLevel > previousPlayerLevelRef.current) {
      requestSfx('level_up');
    }
    previousPlayerLevelRef.current = playerLevel;
  }, [playerLevel]);

  // Play hit_player SFX only when damage actually lands (lastDamageTime increases).
  // The store's takeDamage applies a 200ms iframe; watching this field naturally
  // avoids firing on blocked contact-frames.
  useEffect(() => {
    if (playerLastDamageTime > previousPlayerLastDamageTimeRef.current) {
      requestSfx('hit_player');
    }
    previousPlayerLastDamageTimeRef.current = playerLastDamageTime;
  }, [playerLastDamageTime]);

  // Play game_over SFX when transitioning into GAMEOVER from any other mode.
  useEffect(() => {
    if (mode === GameMode.GAMEOVER && previousModeRef.current !== GameMode.GAMEOVER) {
      requestSfx('game_over');
    }
    previousModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (mode === GameMode.MENU) {
      introPlayedStagesRef.current.clear();
    }
  }, [mode]);

  useEffect(() => {
    if (!sfxMuted && sfxVolume > 0) return;
    stopNarration();
  }, [sfxMuted, sfxVolume, stopNarration]);

  useEffect(() => {
    if (narrationRef.current && !sfxMuted) {
      narrationRef.current.volume = Math.min(1, 1.0 * sfxVolume);
    }
  }, [sfxMuted, sfxVolume]);

  useEffect(() => {
    if (!quizResult) return;

    const resultKey = quizResult.explanationAudioKey ??
      quizResult.explanationAudioSrc ??
      `${activeStage}:${quizResult.correct ? 'correct' : 'wrong'}:${quizResult.explanation}`;
    const feedbackType = quizResult.correct ? 'correct' : 'wrong';

    enqueueNarration([
      {
        src: quizResult.correct ? ASSET_PATHS.audio.gaia.quizCorrect : ASSET_PATHS.audio.gaia.quizWrong,
        key: `gaia:quiz-feedback:${feedbackType}:${resultKey}`,
      },
      {
        src: quizResult.explanationAudioSrc,
        key: quizResult.explanationAudioKey ?? `quiz-explanation:${quizResult.explanationAudioSrc}`,
      },
    ]);
  }, [
    activeStage,
    enqueueNarration,
    quizResult?.correct,
    quizResult?.explanation,
    quizResult?.explanationAudioSrc,
    quizResult?.explanationAudioKey,
  ]);

  useEffect(() => {
    if (mode !== GameMode.OVERWORLD || !isOverworldSceneReady) return;

    const stageNumber = clampStageNumber(activeStage);
    if (introPlayedStagesRef.current.has(stageNumber)) return;

    introPlayedStagesRef.current.add(stageNumber);
    enqueueNarration([{
      src: ASSET_PATHS.audio.gaia.stageIntro(stageNumber),
      key: `gaia:stage-intro:${stageNumber}`,
    }]);
  }, [activeStage, enqueueNarration, isOverworldSceneReady, mode]);

  // Handle Track Switching
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!targetTrack) {
      audio.pause();
      if (audio.src) {
        audio.removeAttribute('src');
        audio.load();
      }
      return;
    }

    const playAudio = async () => {
      try {
        // Only change source if it's different to prevent resetting the loop
        if (audio.getAttribute('src') !== targetTrack) {
            audio.src = targetTrack;
            audio.load();
        }

        // Try to play if music is enabled AND user has interacted
        if (!musicMuted && musicVolume > 0 && audio.paused && hasInteracted.current) {
            await audio.play();
        }
      } catch (error) {
        // Suppress autoplay errors as they are expected before interaction
      }
    };

    playAudio();

  }, [targetTrack, musicMuted, musicVolume]);

  // Handle Mute/Unmute State
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isCinematicActive) {
          audio.pause();
          return;
      }

      if (musicMuted || musicVolume <= 0) {
          audio.pause();
      } else {
          // If unmuted and paused, try to resume (only if interacted)
          if (audio.paused && audio.src && hasInteracted.current) {
              audio.play().catch(() => { /* Suppress errors */ });
          }
          applyMusicVolume();
      }
  }, [applyMusicVolume, musicMuted, musicVolume, isCinematicActive]);

  // Handle Volume adjustments
  useEffect(() => {
    if (!audioRef.current) return;
    applyMusicVolume();
  }, [applyMusicVolume, mode, musicMuted, musicVolume]);

  return (
    <audio 
        ref={audioRef} 
        loop 
        preload="auto"
        className="hidden" 
    />
  );
};
