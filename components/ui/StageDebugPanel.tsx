import React, { useEffect, useState } from 'react';
import { ASSET_PATHS } from '../../assets';
import { FINAL_ENDING_NARRATION_KEY, requestGaiaNarration } from '../game/AudioManager';
import { useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore';
import { PASSIVES_DATA, WEAPONS_DATA } from '../../constants';

const DEBUG_PARAM = 'stageDebug';
const COLLAPSED_STORAGE_KEY = 'ecoGuardian.stageDebugCollapsed';
const STAGES = Array.from({ length: 10 }, (_, index) => index + 1);
const STAGE_DEBUG_ALLOWED = import.meta.env.DEV;
const WEAPON_OPTIONS = Object.values(WEAPONS_DATA);
const PASSIVE_OPTIONS = Object.values(PASSIVES_DATA);

export const StageDebugPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingStage, setPendingStage] = useState<number | null>(null);
  const [loadingEnding, setLoadingEnding] = useState(false);
  const [selectedWeapon, setSelectedWeapon] = useState('HOLY_BEAM');
  const [selectedPassive, setSelectedPassive] = useState('DUPLICATOR');
  const activeStage = useGameStore((state) => state.activeStage);
  const playerStats = useGameStore((state) => state.playerStats);
  const debugGrantWeapon = useGameStore((state) => state.debugGrantWeapon);
  const debugGrantPassive = useGameStore((state) => state.debugGrantPassive);
  const debugGrantHolyBeamKit = useGameStore((state) => state.debugGrantHolyBeamKit);
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
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] left-1/2 z-[120] w-[min(92vw,34rem)] -translate-x-1/2 pointer-events-auto select-none">
      <div className="ui-panel border-2 border-cyan-400 bg-black/85 px-2 py-2 shadow-[0_0_0_2px_#000]">
        <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[9px] leading-none text-cyan-100">
          <span className="font-bold">STAGE DEBUG</span>
          <span className="min-w-0 truncate text-lime-200">
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
        <div className="mt-2 grid gap-1 border-t-2 border-cyan-900/70 pt-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1">
            <select
              value={selectedWeapon}
              onChange={(event) => setSelectedWeapon(event.target.value)}
              className="min-w-0 border-2 border-black bg-cyan-950 px-1 py-1 text-[9px] font-black leading-none text-cyan-100 outline-none"
              title="Select debug weapon grant"
              aria-label="Select debug weapon grant"
            >
              {WEAPON_OPTIONS.map((weapon) => (
                <option key={weapon.key} value={weapon.key}>
                  {weapon.label} Lv.{playerStats.unlockedWeapons[weapon.key] || 0}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => debugGrantWeapon(selectedWeapon)}
              className="border-2 border-black bg-lime-500 px-2 py-1 text-[9px] font-black leading-none text-black hover:bg-lime-300"
              title="Add one level of the selected weapon"
            >
              + WPN
            </button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1">
            <select
              value={selectedPassive}
              onChange={(event) => setSelectedPassive(event.target.value)}
              className="min-w-0 border-2 border-black bg-cyan-950 px-1 py-1 text-[9px] font-black leading-none text-cyan-100 outline-none"
              title="Select debug passive grant"
              aria-label="Select debug passive grant"
            >
              {PASSIVE_OPTIONS.map((passive) => (
                <option key={passive.key} value={passive.key}>
                  {passive.label} Lv.{playerStats.unlockedPassives[passive.key] || 0}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => debugGrantPassive(selectedPassive)}
              className="border-2 border-black bg-green-500 px-2 py-1 text-[9px] font-black leading-none text-black hover:bg-green-300"
              title="Add one level of the selected passive"
            >
              + PASS
            </button>
          </div>
          <button
            type="button"
            onClick={debugGrantHolyBeamKit}
            className="w-full border-2 border-black bg-fuchsia-500 px-2 py-1 text-[10px] font-black leading-none text-black hover:bg-fuchsia-300"
            title="Grant Holy Beam, Cross, Bible, Duplicator, and Tome for quick beam testing"
          >
            HOLY BEAM KIT
          </button>
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
