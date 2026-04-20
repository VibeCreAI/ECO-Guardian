
import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameMode } from '../types';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || el.isContentEditable) return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    // Allow our hook to handle range inputs — we'll skip nav interception separately
    // Block only text-entry inputs
    return type !== 'range';
  }
  return false;
}

function isRangeInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLInputElement)) return false;
  return target.type === 'range';
}

const NAV_NEXT = new Set(['ArrowRight', 'ArrowDown', 's', 'S', 'd', 'D']);
const NAV_PREV = new Set(['ArrowLeft', 'ArrowUp', 'w', 'W', 'a', 'A']);
const CONFIRM  = new Set(['Enter', ' ']);
const MODAL_CONTROL_KEYS = new Set([...NAV_NEXT, ...NAV_PREV, ...CONFIRM]);
const MODAL_OPEN_INPUT_GRACE_MS = 280;
const MODAL_NAV_REPEAT_MS = 140;

// Modes where WASD/Arrow navigation is active (player is not moving)
const MODAL_MODES = new Set([
  GameMode.MENU,
  GameMode.LEADERBOARD,
  GameMode.QUIZ_RESULT,
  GameMode.CHEST_REWARD,
  GameMode.REWARD,
  GameMode.PAUSED,
  GameMode.STATUS,
  GameMode.LIBRARY,
  GameMode.SHOP,
  GameMode.GAMEOVER,
  GameMode.VICTORY,
  GameMode.LOADING_LEVEL,
  GameMode.DIFFICULTY_SELECT,
]);

// Also need nav in OVERWORLD/BATTLE when bossNarrative overlay is up —
// that's handled separately since it's a boolean, not a mode.
// We include OVERWORLD/BATTLE in the set so nav keys still work for boss warning.
const BOSS_NAV_MODES = new Set([GameMode.OVERWORLD, GameMode.BATTLE]);

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const isModalKeyboardActive = (mode: GameMode, bossNarrativeOpen: boolean) =>
  MODAL_MODES.has(mode) || (BOSS_NAV_MODES.has(mode) && bossNarrativeOpen);

interface ModalKeyboardCallbacks {
  onEscapeOverworld: () => void;
  onEscapePaused: () => void;
  onEscapeLibrary: () => void;
  onEscapeStatus: () => void;
  onEscapeLeaderboard: () => void;
  onEscapeShop: () => void;
}

export function useModalKeyboard(callbacks: ModalKeyboardCallbacks) {
  const focusedIndex = useRef(0);
  const modalInputGraceUntil = useRef(0);
  const pressedModalKeys = useRef<Set<string>>(new Set());
  const suppressedModalKeys = useRef<Set<string>>(new Set());
  const lastModalNavAt = useRef(0);

  // Helper: get all focusable modal elements (buttons + range inputs) in DOM order
  const getModalButtons = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-modal-btn]:not([disabled])'));

  // Focus element at current index
  const focusAt = (index: number, buttons: HTMLElement[]) => {
    if (buttons.length === 0) return;
    focusedIndex.current = ((index % buttons.length) + buttons.length) % buttons.length;
    buttons[focusedIndex.current]?.focus();
  };

  const startModalInputGrace = () => {
    modalInputGraceUntil.current = getNow() + MODAL_OPEN_INPUT_GRACE_MS;
    suppressedModalKeys.current = new Set(pressedModalKeys.current);
    lastModalNavAt.current = 0;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (MODAL_CONTROL_KEYS.has(e.key)) {
        pressedModalKeys.current.add(e.key);
      }

      if (isEditableTarget(e.target)) return;

      const mode = useGameStore.getState().mode;
      const key = e.key;

      // --- Escape ---
      if (key === 'Escape') {
        if (mode === GameMode.OVERWORLD || mode === GameMode.BATTLE) {
          e.preventDefault();
          callbacks.onEscapeOverworld();
          return;
        }
        if (mode === GameMode.PAUSED) {
          e.preventDefault();
          callbacks.onEscapePaused();
          return;
        }
        if (mode === GameMode.LIBRARY) {
          e.preventDefault();
          callbacks.onEscapeLibrary();
          return;
        }
        if (mode === GameMode.STATUS) {
          e.preventDefault();
          callbacks.onEscapeStatus();
          return;
        }
        if (mode === GameMode.LEADERBOARD) {
          e.preventDefault();
          callbacks.onEscapeLeaderboard();
          return;
        }
        if (mode === GameMode.SHOP) {
          e.preventDefault();
          callbacks.onEscapeShop();
          return;
        }
        return;
      }

      // --- Focus navigation (modal modes only) ---
      // In OVERWORLD/BATTLE, only allow nav when boss narrative is showing
      const isModalMode = isModalKeyboardActive(mode, useGameStore.getState().bossNarrativeOpen);

      if (!isModalMode) return;

      const isModalControlKey = MODAL_CONTROL_KEYS.has(key);
      if (isModalControlKey && (getNow() < modalInputGraceUntil.current || suppressedModalKeys.current.has(key))) {
        e.preventDefault();
        return;
      }

      const buttons = getModalButtons();
      if (buttons.length === 0) return;

      // Sync focusedIndex with actual DOM focus if user tabbed manually
      const activeIdx = buttons.findIndex((b) => b === document.activeElement);
      if (activeIdx !== -1 && activeIdx !== focusedIndex.current) {
        focusedIndex.current = activeIdx;
      }

      if (NAV_NEXT.has(key)) {
        // If a range input is focused, let the browser handle arrow keys natively
        if (isRangeInput(document.activeElement)) return;
        e.preventDefault();
        const now = getNow();
        if (e.repeat && now - lastModalNavAt.current < MODAL_NAV_REPEAT_MS) return;
        lastModalNavAt.current = now;
        focusAt(focusedIndex.current + 1, buttons);
        return;
      }

      if (NAV_PREV.has(key)) {
        if (isRangeInput(document.activeElement)) return;
        e.preventDefault();
        const now = getNow();
        if (e.repeat && now - lastModalNavAt.current < MODAL_NAV_REPEAT_MS) return;
        lastModalNavAt.current = now;
        focusAt(focusedIndex.current - 1, buttons);
        return;
      }

      if (CONFIRM.has(key)) {
        const active = document.activeElement;
        if (active && active.hasAttribute('data-modal-btn')) {
          // Browser will handle Enter/Space on focused button naturally
          return;
        }
        e.preventDefault();
        buttons[focusedIndex.current]?.click();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!MODAL_CONTROL_KEYS.has(e.key)) return;
      pressedModalKeys.current.delete(e.key);
      suppressedModalKeys.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset focus index and auto-focus first button when mode changes
  useEffect(() => {
    const initialState = useGameStore.getState();
    let prevMode = initialState.mode;
    let prevBossNarrativeOpen = initialState.bossNarrativeOpen;
    const unsub = useGameStore.subscribe((state) => {
      const modeChanged = state.mode !== prevMode;
      const bossNarrativeChanged = state.bossNarrativeOpen !== prevBossNarrativeOpen;
      const modalKeyboardActive = isModalKeyboardActive(state.mode, state.bossNarrativeOpen);
      const wasModalKeyboardActive = isModalKeyboardActive(prevMode, prevBossNarrativeOpen);

      if (modeChanged || bossNarrativeChanged) {
        if (modeChanged) focusedIndex.current = 0;
        if (modalKeyboardActive && (modeChanged || !wasModalKeyboardActive)) {
          startModalInputGrace();
          setTimeout(() => {
            const buttons = getModalButtons();
            if (buttons.length > 0) buttons[0].focus();
          }, 80);
        }

        prevMode = state.mode;
        prevBossNarrativeOpen = state.bossNarrativeOpen;
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
