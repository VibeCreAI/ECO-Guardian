import React, { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameMode } from '../../types';
import { ASSET_PATHS } from '../../assets';

const GAIA_NARRATION_EVENT = 'eco-guardian:gaia-narration';

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

type AudioContextConstructor = typeof AudioContext;

const getAudioContextConstructor = (): AudioContextConstructor | undefined =>
  window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;

const normalizeNarrationClips = (clips: GaiaNarrationClipInput[]): GaiaNarrationClip[] =>
  clips.flatMap((clip) => (clip?.src && clip.key ? [{ src: clip.src, key: clip.key }] : []));

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

  const stopNarration = useCallback(() => {
    const narration = narrationRef.current;
    pendingNarrationQueueRef.current = [];
    narrationQueueRef.current = [];
    narrationKeyRef.current = null;
    disconnectNarrationNodes();

    if (!narration) {
      applyMusicVolume(false);
      return;
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
    narration.volume = 0.9 * sfxVolume;
    narrationRef.current = narration;
    narrationKeyRef.current = detail.key;
    applyMusicVolume(true);

    try {
      connectNarrationEcho(narration);
    } catch {
      disconnectNarrationNodes();
    }

    const cleanup = () => {
      if (narrationRef.current !== narration) return;

      disconnectNarrationNodes();
      narrationRef.current = null;
      narrationKeyRef.current = null;

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

    narration.addEventListener('ended', cleanup, { once: true });
    narration.addEventListener('error', cleanup, { once: true });

    narration.play().catch(() => {
      cleanup();
    });
  }, [applyMusicVolume, connectNarrationEcho, disconnectNarrationNodes]);

  playNextNarrationRef.current = playNextNarration;

  const enqueueNarration = useCallback((clips: GaiaNarrationClipInput[]) => {
    const playableClips = normalizeNarrationClips(clips);
    if (playableClips.length === 0) return;

    const { sfxMuted, sfxVolume } = useGameStore.getState();
    if (sfxMuted || sfxVolume <= 0) return;

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
    const isMenuLibrary = mode === GameMode.LIBRARY && previousMode === GameMode.MENU;

    // Priority 1: Menu / Intro / Game Over / Leaderboard
    if (mode === GameMode.MENU || mode === GameMode.DIFFICULTY_SELECT || mode === GameMode.INSTRUCTIONS || mode === GameMode.GAMEOVER || mode === GameMode.LEADERBOARD || isMenuLibrary) {
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
      narrationRef.current.volume = 0.9 * sfxVolume;
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
    if (!audio || !targetTrack) return;

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

      if (musicMuted || musicVolume <= 0) {
          audio.pause();
      } else {
          // If unmuted and paused, try to resume (only if interacted)
          if (audio.paused && audio.src && hasInteracted.current) {
              audio.play().catch(() => { /* Suppress errors */ });
          }
          applyMusicVolume();
      }
  }, [applyMusicVolume, musicMuted, musicVolume]);

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
