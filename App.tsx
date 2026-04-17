
import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { UIOverlay } from './components/ui/UIOverlay';
import { Scene } from './components/game/Scene';
import { AudioManager } from './components/game/AudioManager';
import { GameMode, Vector2 } from './types';
import { useGameStore } from './store/gameStore';
import { useMultiplayer } from './multiplayer/useMultiplayer';
import { useHostPortalVoteTick } from './multiplayer/useHostPortalVoteTick';

const App: React.FC = () => {
  // Input References (mutable ref to avoid re-renders on every frame input)
  const inputVector = useRef<Vector2>({ x: 0, y: 0 });
  const dashTrigger = useRef<boolean>(false);
  
  const [isMobile, setIsMobile] = useState(false);

  useMultiplayer();
  useHostPortalVoteTick();

  // Auto-join matchmaking when a run begins; auto-leave when returning to menu.
  const gameMode = useGameStore((s) => s.mode);
  const activeStage = useGameStore((s) => s.activeStage);
  const playMode = useGameStore((s) => s.playMode);
  const mpGroupId = useGameStore((s) => s.multiplayer.groupId);
  const mpStatus = useGameStore((s) => s.multiplayer.connectionStatus);
  useEffect(() => {
    const inRun =
      gameMode === GameMode.OVERWORLD ||
      gameMode === GameMode.BATTLE ||
      gameMode === GameMode.QUIZ_RESULT ||
      gameMode === GameMode.REWARD ||
      gameMode === GameMode.CHEST_REWARD ||
      gameMode === GameMode.LOADING_LEVEL ||
      gameMode === GameMode.PAUSED ||
      gameMode === GameMode.SHOP ||
      gameMode === GameMode.STATUS ||
      gameMode === GameMode.LIBRARY;
    if (playMode === 'multiplayer' && inRun && !mpGroupId && mpStatus === 'idle') {
      useGameStore.getState().joinMatchmaking(activeStage);
    } else if ((playMode === 'solo' || !inRun) && mpGroupId) {
      useGameStore.getState().leaveMatchmaking();
    }
  }, [gameMode, mpGroupId, mpStatus, activeStage, playMode]);

  // VibeJam portal entry detection — must run before any other init
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === 'true') {
      const ref = params.get('ref');
      const refUrl = ref ? (ref.startsWith('http') ? ref : `https://${ref}`) : null;
      useGameStore.getState().preloadGameFromPortal(refUrl);
    }
  }, []);

  // Platform detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      // Robust mobile detection
      return /android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent) === false);
    };

    setIsMobile(checkMobile());
  }, []);

  // Keyboard controls
  useEffect(() => {
    // Use e.code (physical key) rather than e.key so movement works regardless
    // of keyboard layout (AZERTY/QWERTZ/Cyrillic) or active IME (Korean/Japanese/Chinese),
    // which otherwise translate or delay WASD via composition events.
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputVector.current.y = -1; break;
        case 'KeyS':
        case 'ArrowDown':
          inputVector.current.y = 1; break;
        case 'KeyA':
        case 'ArrowLeft':
          inputVector.current.x = -1; break;
        case 'KeyD':
        case 'ArrowRight':
          inputVector.current.x = 1; break;
        case 'Space': dashTrigger.current = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (inputVector.current.y < 0) inputVector.current.y = 0; break;
        case 'KeyS':
        case 'ArrowDown':
          if (inputVector.current.y > 0) inputVector.current.y = 0; break;
        case 'KeyA':
        case 'ArrowLeft':
          if (inputVector.current.x < 0) inputVector.current.x = 0; break;
        case 'KeyD':
        case 'ArrowRight':
          if (inputVector.current.x > 0) inputVector.current.x = 0; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleDash = () => {
    dashTrigger.current = true;
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;

    const { mode, battleWon } = useGameStore.getState();
    if ((mode === GameMode.OVERWORLD || mode === GameMode.BATTLE) && !battleWon) {
      dashTrigger.current = true;
    }
  };

  return (
    <div
      className="relative bg-neutral-900 overflow-hidden pixel-art"
      style={{ width: '100vw', height: '100dvh', minHeight: '100dvh' }}
    >
      <AudioManager />
      {/* Performance Optimization: Removed shadows={true} */}
      <div className="absolute inset-0" onPointerDown={handleCanvasPointerDown}>
        <Canvas camera={{ position: [0, 10, 10], fov: 45 }}>
          <Suspense fallback={null}>
            <Scene inputVector={inputVector} dashTrigger={dashTrigger} />
            <Preload all />
          </Suspense>
        </Canvas>
      </div>
      
      <UIOverlay
        inputVector={inputVector}
        onDash={handleDash}
        isMobile={isMobile}
      />
    </div>
  );
};

export default App;
