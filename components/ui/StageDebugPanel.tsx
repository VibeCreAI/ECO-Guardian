import React, { useEffect, useState } from 'react';
import { ASSET_PATHS } from '../../assets';
import { FINAL_ENDING_NARRATION_KEY, requestGaiaNarration } from '../game/AudioManager';
import { useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore';

const DEBUG_PARAM = 'stageDebug';
const COLLAPSED_STORAGE_KEY = 'ecoGuardian.stageDebugCollapsed';
const STAGES = Array.from({ length: 10 }, (_, index) => index + 1);
const STAGE_DEBUG_ALLOWED = import.meta.env.DEV;

export const StageDebugPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingStage, setPendingStage] = useState<number | null>(null);
  const [loadingEnding, setLoadingEnding] = useState(false);
  const activeStage = useGameStore((state) => state.activeStage);
  const debugJumpToStage = useGameStore((state) => state.debugJumpToStage);
  const debugEnterEndingCinematic = useGameStore((state) => state.debugEnterEndingCinematic);
  const currentConfig = useAiDirectorStore((state) => state.currentConfig);
  const isGenerating = useAiDirectorStore((state) => state.isGenerating);

  useEffect(() => {
    if (!STAGE_DEBUG_ALLOWED) {
      setEnabled(false);
      setCollapsed(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const isEnabled = params.get(DEBUG_PARAM) === '1';
    setEnabled(isEnabled);

    if (!isEnabled) return;

    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1');
    } catch {
      setCollapsed(false);
    }
  }, []);

  if (!STAGE_DEBUG_ALLOWED || !enabled) return null;

  const updateCollapsed = (nextCollapsed: boolean) => {
    setCollapsed(nextCollapsed);

    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, nextCollapsed ? '1' : '0');
    } catch {
      // Best-effort dev preference only.
    }
  };

  const jumpToStage = async (stage: number) => {
    setPendingStage(stage);
    try {
      await debugJumpToStage(stage);
    } finally {
      setPendingStage(null);
    }
  };

  const triggerEndingScene = async () => {
    setLoadingEnding(true);
    try {
      await debugEnterEndingCinematic();
      requestGaiaNarration(ASSET_PATHS.audio.gaia.finalEnding, FINAL_ENDING_NARRATION_KEY);
    } finally {
      setLoadingEnding(false);
    }
  };

  const isBusy = pendingStage !== null || isGenerating || loadingEnding;

  if (collapsed) {
    return (
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 z-[120] pointer-events-auto select-none">
        <button
          type="button"
          onClick={() => updateCollapsed(false)}
          className="ui-button ui-button-secondary-cyan px-3 py-2 text-[9px] font-black leading-none"
          aria-expanded="false"
          aria-label="Open stage debug controls"
          title="Open stage debug controls"
        >
          DEBUG
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] left-1/2 z-[120] -translate-x-1/2 pointer-events-auto select-none">
      <div className="ui-panel border-2 border-cyan-400 bg-black/85 px-2 py-2 shadow-[0_0_0_2px_#000]">
        <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[9px] leading-none text-cyan-100">
          <span className="font-bold">STAGE DEBUG</span>
          <span className="min-w-0 max-w-[42vw] truncate text-lime-200">
            {currentConfig?.stageName ?? `STAGE ${activeStage}`}
          </span>
          <button
            type="button"
            onClick={() => updateCollapsed(true)}
            className="border-2 border-black bg-cyan-950 px-1.5 py-1 text-[8px] font-black leading-none text-cyan-100 hover:bg-cyan-700"
            aria-expanded="true"
            aria-label="Collapse stage debug controls"
            title="Collapse stage debug controls"
          >
            HIDE
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {STAGES.map((stage) => {
            const isActive = stage === activeStage;
            const isPending = stage === pendingStage || (isGenerating && isActive);
            return (
              <button
                key={stage}
                type="button"
                onClick={() => void jumpToStage(stage)}
                disabled={isBusy}
                className={`min-w-8 px-2 py-1 border-2 border-black text-[10px] font-black leading-none ${
                  isActive
                    ? 'bg-lime-400 text-black'
                    : 'bg-cyan-950 text-cyan-100 hover:bg-cyan-700'
                } disabled:opacity-60 disabled:cursor-wait`}
                title={`Preview stage ${stage}`}
              >
                {isPending ? '...' : stage}
              </button>
            );
          })}
        </div>
        <div className="mt-1">
          <button
            type="button"
            onClick={() => void triggerEndingScene()}
            disabled={isBusy}
            className="w-full px-2 py-1 border-2 border-black text-[10px] font-black leading-none bg-yellow-500 text-black hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-wait"
            title="Jump to stage 10 and trigger the full ending cinematic"
          >
            {loadingEnding ? '...' : 'ENDING SCENE'}
          </button>
        </div>
      </div>
    </div>
  );
};
