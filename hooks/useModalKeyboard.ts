
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

  // Helper: get all focusable modal elements (buttons + range inputs) in DOM order
  const getModalButtons = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-modal-btn]:not([disabled])'));

  // Focus element at current index
  const focusAt = (index: number, buttons: HTMLElement[]) => {
    if (buttons.length === 0) return;
    focusedIndex.current = ((index % buttons.length) + buttons.length) % buttons.length;
    buttons[focusedIndex.current]?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      const isModalMode = MODAL_MODES.has(mode);
      const isBossNavMode = BOSS_NAV_MODES.has(mode) && useGameStore.getState().bossNarrativeOpen;

      if (!isModalMode && !isBossNavMode) return;

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
        focusAt(focusedIndex.current + 1, buttons);
        return;
      }

      if (NAV_PREV.has(key)) {
        if (isRangeInput(document.activeElement)) return;
        e.preventDefault();
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset focus index and auto-focus first button when mode changes
  useEffect(() => {
    let prevMode = useGameStore.getState().mode;
    const unsub = useGameStore.subscribe((state) => {
      if (state.mode !== prevMode) {
        prevMode = state.mode;
        focusedIndex.current = 0;
        setTimeout(() => {
          const buttons = getModalButtons();
          if (buttons.length > 0) buttons[0].focus();
        }, 80);
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
