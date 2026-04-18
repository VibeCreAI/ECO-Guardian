
import React, { Suspense, useRef, useEffect, useState, useCallback } from 'react';
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
  const keyboardVector = useRef<Vector2>({ x: 0, y: 0 });
  const joystickVector = useRef<Vector2>({ x: 0, y: 0 });
  const dashTrigger = useRef<boolean>(false);
  
  const [isMobile, setIsMobile] = useState(false);

  // Auto-join matchmaking when a run begins; auto-leave when returning to menu.
  const gameMode = useGameStore((s) => s.mode);
  const activeStage = useGameStore((s) => s.activeStage);
  const playMode = useGameStore((s) => s.playMode);
  const mpGroupId = useGameStore((s) => s.multiplayer.groupId);
  const mpStatus = useGameStore((s) => s.multiplayer.connectionStatus);
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
  const multiplayerRuntimeEnabled = playMode === 'multiplayer' && inRun;

  useMultiplayer(multiplayerRuntimeEnabled);
  useHostPortalVoteTick();

  useEffect(() => {
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
      const isMobileUserAgent = /android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isIpadDesktopMode = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
      const isTouchFirstDevice =
        window.matchMedia?.('(pointer: coarse)').matches === true &&
        window.matchMedia?.('(hover: none)').matches === true;

      return isMobileUserAgent || isIpadDesktopMode || isTouchFirstDevice;
    };

    setIsMobile(checkMobile());
  }, []);

  const syncInputVector = useCallback(() => {
    const x = keyboardVector.current.x + joystickVector.current.x;
    const y = keyboardVector.current.y + joystickVector.current.y;
    const length = Math.hypot(x, y);

    if (length > 1) {
      inputVector.current.x = x / length;
      inputVector.current.y = y / length;
    } else {
      inputVector.current.x = x;
      inputVector.current.y = y;
    }
  }, []);

  const resetMovementInput = useCallback(() => {
    keyboardVector.current.x = 0;
    keyboardVector.current.y = 0;
    joystickVector.current.x = 0;
    joystickVector.current.y = 0;
    inputVector.current.x = 0;
    inputVector.current.y = 0;
    dashTrigger.current = false;
  }, []);

  const handleJoystickMove = useCallback((vector: Vector2) => {
    joystickVector.current.x = vector.x;
    joystickVector.current.y = vector.y;
    syncInputVector();
  }, [syncInputVector]);

  useEffect(() => {
    resetMovementInput();
  }, [gameMode, resetMovementInput]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        resetMovementInput();
      }
    };

    window.addEventListener('blur', resetMovementInput);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', resetMovementInput);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetMovementInput]);

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

    const syncKeyboardVector = () => {
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
        keyboardVector.current.x = x * diagonalScale;
        keyboardVector.current.y = y * diagonalScale;
      } else {
        keyboardVector.current.x = x;
        keyboardVector.current.y = y;
      }

      syncInputVector();
    };

    const resetKeyboardMovement = () => {
      heldMovementKeys.clear();
      keyboardVector.current.x = 0;
      keyboardVector.current.y = 0;
      syncInputVector();
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
        syncKeyboardVector();
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
        syncKeyboardVector();
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
  }, [syncInputVector]);

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
      className="relative bg-neutral-900 overflow-hidden pixel-art notranslate"
      translate="no"
      style={{ width: '100vw', height: '100dvh', minHeight: '100dvh' }}
    >
      <AudioManager />
      {/* Performance Optimization: Removed shadows={true} */}
      <div className="absolute inset-0" onPointerDown={handleCanvasPointerDown}>
        <Canvas
          camera={{ position: [0, 10, 10], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <Scene inputVector={inputVector} dashTrigger={dashTrigger} />
            <Preload all />
          </Suspense>
        </Canvas>
      </div>
      
      <UIOverlay
        onJoystickMove={handleJoystickMove}
        onDash={handleDash}
        isMobile={isMobile}
      />
    </div>
  );
};

export default App;
