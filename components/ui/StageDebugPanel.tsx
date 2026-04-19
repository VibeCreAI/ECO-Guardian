import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore';

const DEBUG_PARAM = 'stageDebug';
const STAGES = Array.from({ length: 10 }, (_, index) => index + 1);
const STAGE_DEBUG_ALLOWED = import.meta.env.DEV;

export const StageDebugPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [pendingStage, setPendingStage] = useState<number | null>(null);
  const activeStage = useGameStore((state) => state.activeStage);
  const debugJumpToStage = useGameStore((state) => state.debugJumpToStage);
  const currentConfig = useAiDirectorStore((state) => state.currentConfig);
  const isGenerating = useAiDirectorStore((state) => state.isGenerating);

  useEffect(() => {
    if (!STAGE_DEBUG_ALLOWED) {
      setEnabled(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get(DEBUG_PARAM) === '1');
  }, []);

  if (!STAGE_DEBUG_ALLOWED || !enabled) return null;

  const jumpToStage = async (stage: number) => {
    setPendingStage(stage);
    try {
      await debugJumpToStage(stage);
    } finally {
      setPendingStage(null);
    }
  };

  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] left-1/2 z-[120] -translate-x-1/2 pointer-events-auto select-none">
      <div className="ui-panel border-2 border-cyan-400 bg-black/85 px-2 py-2 shadow-[0_0_0_2px_#000]">
        <div className="flex items-center justify-between gap-3 text-[9px] leading-none text-cyan-100 mb-2">
          <span className="font-bold">STAGE DEBUG</span>
          <span className="max-w-[42vw] truncate text-lime-200">
            {currentConfig?.stageName ?? `STAGE ${activeStage}`}
          </span>
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
                disabled={pendingStage !== null || isGenerating}
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
      </div>
    </div>
  );
};
