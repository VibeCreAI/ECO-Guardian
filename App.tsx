
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
    type MoveDirection = 'up' | 'down' | 'left' | 'right';

    const codeToDirection: Record<string, MoveDirection | undefined> = {
      KeyW: 'up',
      ArrowUp: 'up',
      KeyS: 'down',
      ArrowDown: 'down',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
    };

    const keyToDirection: Record<string, MoveDirection | undefined> = {
      w: 'up',
      ArrowUp: 'up',
      s: 'down',
      ArrowDown: 'down',
      a: 'left',
      ArrowLeft: 'left',
      d: 'right',
      ArrowRight: 'right',
    };

    const heldMovementKeys = new Map<string, MoveDirection>();

    const movementKeyFromEvent = (e: KeyboardEvent): { id: string; direction: MoveDirection } | null => {
      // Prefer e.code so physical WASD keeps working across keyboard layouts and IMEs.
      const directionFromCode = codeToDirection[e.code];
      if (directionFromCode) return { id: `code:${e.code}`, direction: directionFromCode };

      // Fallback for browsers/layouts where users press the actual WASD letters.
      const normalizedKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const directionFromKey = keyToDirection[normalizedKey];
      if (directionFromKey) return { id: `key:${normalizedKey}`, direction: directionFromKey };

      return null;
    };

    const syncInputVector = () => {
      let x = 0;
      let y = 0;

      for (const direction of heldMovementKeys.values()) {
        if (direction === 'left') x -= 1;
        else if (direction === 'right') x += 1;
        else if (direction === 'up') y -= 1;
        else if (direction === 'down') y += 1;
      }

      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));

      if (x !== 0 && y !== 0) {
        const diagonalScale = Math.SQRT1_2;
        inputVector.current.x = x * diagonalScale;
        inputVector.current.y = y * diagonalScale;
      } else {
        inputVector.current.x = x;
        inputVector.current.y = y;
      }
    };

    const resetKeyboardMovement = () => {
      heldMovementKeys.clear();
      inputVector.current.x = 0;
      inputVector.current.y = 0;
    };

    const isSpaceKey = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const movementKey = movementKeyFromEvent(e);
      if (movementKey) {
        e.preventDefault();
        heldMovementKeys.set(movementKey.id, movementKey.direction);
        syncInputVector();
        return;
      }

      if (isSpaceKey(e)) {
        e.preventDefault();
        if (!e.repeat) dashTrigger.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const movementKey = movementKeyFromEvent(e);
      if (movementKey) {
        if (!isEditableTarget(e.target)) e.preventDefault();
        heldMovementKeys.delete(movementKey.id);
        syncInputVector();
        return;
      }

      if (isEditableTarget(e.target)) return;

      if (isSpaceKey(e)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetKeyboardMovement);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetKeyboardMovement);
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
