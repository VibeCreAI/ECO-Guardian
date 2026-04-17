
import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameMode } from '../../types';
import { ASSET_PATHS } from '../../assets';

export const AudioManager: React.FC = () => {
  const mode = useGameStore(s => s.mode);
  const previousMode = useGameStore(s => s.previousMode);
  const activeStage = useGameStore(s => s.activeStage);
  const activeBattle = useGameStore(s => s.activeBattle);
  const lastGameplayMode = useGameStore(s => s.lastGameplayMode);
  const isMuted = useGameStore(s => s.isMuted);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasInteracted = useRef(false);
  
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
      const audio = audioRef.current;
      if (audio && !isMuted && audio.paused && audio.src) {
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
  }, [isMuted]); // Re-bind if mute state changes

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
        
        // Try to play if not muted AND user has interacted
        if (!isMuted && audio.paused && hasInteracted.current) {
            await audio.play();
        }
      } catch (error) {
        // Suppress autoplay errors as they are expected before interaction
      }
    };

    playAudio();

  }, [targetTrack, isMuted]);

  // Handle Mute/Unmute State
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isMuted) {
          audio.pause();
      } else {
          // If unmuted and paused, try to resume (only if interacted)
          if (audio.paused && audio.src && hasInteracted.current) {
              audio.play().catch(() => { /* Suppress errors */ });
          }
      }
  }, [isMuted]);

  // Handle Volume adjustments
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Lower volume during pause menus or non-action modals
    if (mode === GameMode.PAUSED || mode === GameMode.STATUS || mode === GameMode.LIBRARY || mode === GameMode.SHOP || mode === GameMode.REWARD) {
      audioRef.current.volume = 0.15;
    } else {
      audioRef.current.volume = 0.4;
    }
  }, [mode]);

  return (
    <audio 
        ref={audioRef} 
        loop 
        preload="auto"
        className="hidden" 
    />
  );
};
