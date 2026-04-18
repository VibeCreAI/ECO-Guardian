
import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { WEAPONS_DATA, PASSIVES_DATA, EVOLUTION_RECIPES } from '../../constants';
import { GameMode } from '../../types';

export const LibraryModal: React.FC = () => {
    const { setMode, previousMode, togglePause, playerStats } = useGameStore();
    const [tab, setTab] = useState<'TREE' | 'PASSIVES'>('TREE');
    const isFullLibraryView = previousMode === GameMode.MENU;

    const handleClose = () => {
        if (previousMode === GameMode.MENU) {
            setMode(GameMode.MENU);
        } else {
            togglePause();
        }
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 pointer-events-auto">
            <div className="ui-panel w-full max-w-5xl h-[90vh] flex flex-col relative">
                
                {/* Header */}
                <div className="p-4 flex justify-between items-center ui-panel-header">
                    <h2 className="text-xl md:text-3xl font-bold ui-title flex items-center gap-3">
                        <span>📖</span> GRIMOIRE
                    </h2>
                    <button data-modal-btn="" onClick={handleClose} className="ui-modal-close text-xl px-3 py-1">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b-4 border-black bg-black/40">
                    <button
                        data-modal-btn=""
                        onClick={() => setTab('TREE')}
                        className={`flex-1 py-3 font-bold text-sm md:text-base ui-tab ${tab === 'TREE' ? 'ui-tab-active' : ''}`}
                    >
                        EVOLUTION TREE
                    </button>
                    <button
                        data-modal-btn=""
                        onClick={() => setTab('PASSIVES')}
                        className={`flex-1 py-3 font-bold text-sm md:text-base ui-tab ${tab === 'PASSIVES' ? 'ui-tab-active' : ''}`}
                    >
                        PASSIVE ARCHIVE
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                    
                    {tab === 'TREE' && (
                        <div className="space-y-8">
                            <div className="ui-card p-4">
                                <p className="text-center ui-copy text-sm">
                                    "When two compatible base weapons are owned, they can fuse into an Ultimate Evolution."
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {EVOLUTION_RECIPES.map((recipe, idx) => {
                                    const w1 = WEAPONS_DATA[recipe.ingredients[0]];
                                    const w2 = WEAPONS_DATA[recipe.ingredients[1]];
                                    const res = WEAPONS_DATA[recipe.result];
                                    const hasW1 = !!playerStats.unlockedWeapons[w1.key];
                                    const hasW2 = !!playerStats.unlockedWeapons[w2.key];
                                    const hasRes = !!playerStats.unlockedWeapons[res.key];
                                    const showAsUnlocked = !isFullLibraryView && hasRes;

                                    return (
                                        <div key={idx} className={`ui-card ${showAsUnlocked ? 'ui-card-highlight' : ''} p-3 sm:p-4 flex items-center justify-between group transition-all duration-300 relative overflow-hidden min-w-0`}>
                                            {showAsUnlocked && <div className="absolute top-0 right-0 ui-chip ui-chip-warning text-[8px] font-bold px-3 py-1">UNLOCKED</div>}

                                            {/* Ingredients */}
                                            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                                                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                                    <div className={`w-10 h-10 sm:w-14 sm:h-14 ui-slot flex items-center justify-center text-2xl sm:text-3xl shrink-0 ${isFullLibraryView ? '' : (hasW1 ? 'ui-slot-active' : 'opacity-50')}`}>
                                                        {w1.icon}
                                                    </div>
                                                    <div className="text-[9px] sm:text-[10px] ui-muted font-bold text-center leading-tight">{w1.label}</div>
                                                </div>
                                                <div className="ui-cyan font-black text-base sm:text-xl shrink-0">+</div>
                                                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                                    <div className={`w-10 h-10 sm:w-14 sm:h-14 ui-slot flex items-center justify-center text-2xl sm:text-3xl shrink-0 ${isFullLibraryView ? '' : (hasW2 ? 'ui-slot-active' : 'opacity-50')}`}>
                                                        {w2.icon}
                                                    </div>
                                                    <div className="text-[9px] sm:text-[10px] ui-muted font-bold text-center leading-tight">{w2.label}</div>
                                                </div>
                                            </div>

                                            {/* Evolution Flow */}
                                            <div className="flex flex-col items-center px-1 sm:px-2 shrink-0">
                                                <div className="ui-cyan text-xl sm:text-2xl animate-pulse">➜</div>
                                            </div>

                                            {/* Result */}
                                            <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                                                <div className={`w-12 h-12 sm:w-16 sm:h-16 ui-slot ${showAsUnlocked ? 'ui-slot-active' : ''} flex items-center justify-center text-3xl sm:text-4xl shrink-0`}>
                                                    {res.icon}
                                                </div>
                                                <div className="text-[10px] sm:text-[11px] ui-warning font-black text-center leading-tight">{res.label}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-8 border-t-4 border-black">
                                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                    <span className="text-green-300">■</span> BASE WEAPON ARSENAL
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.values(WEAPONS_DATA).filter(w => !w.isEvolution).map(w => {
                                        const isUnlocked = !!playerStats.unlockedWeapons[w.key];
                                        return (
                                            <div key={w.key} className={`flex items-start gap-3 p-3 transition-colors ui-card ${isFullLibraryView ? '' : (isUnlocked ? 'ui-card-highlight' : 'ui-card-muted opacity-80')}`}>
                                                <div className="w-12 h-12 ui-slot flex items-center justify-center text-2xl shrink-0">
                                                    {w.icon}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-gray-100 text-sm flex items-center gap-2">
                                                        {w.label}
                                                        {!isFullLibraryView && isUnlocked && <span className="text-[9px] ui-chip ui-chip-primary px-1">EQ</span>}
                                                    </div>
                                                    <div className="text-[10px] ui-muted mt-1 leading-tight">{w.description}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'PASSIVES' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.values(PASSIVES_DATA).map(p => {
                                    const isUnlocked = (playerStats.unlockedPassives[p.key] || 0) > 0;
                                    return (
                                        <div key={p.key} className={`p-4 flex items-start gap-4 transition-all duration-300 ui-card ${isFullLibraryView ? '' : (isUnlocked ? 'ui-card-highlight' : 'ui-card-muted opacity-70')}`}>
                                            <div className={`w-12 h-12 ui-slot flex items-center justify-center text-2xl shrink-0 ${!isFullLibraryView && isUnlocked ? 'ui-slot-active' : ''}`}>
                                                {p.icon}
                                            </div>
                                            <div>
                                                <h4 className={`font-bold ${isFullLibraryView ? 'text-gray-100' : (isUnlocked ? 'text-green-200' : 'ui-muted')}`}>{p.label}</h4>
                                                <p className="ui-muted text-[11px] mt-1 leading-relaxed">{p.description}</p>
                                                {!isFullLibraryView && isUnlocked && <div className="text-green-300 text-[10px] mt-2 font-bold">RANK {playerStats.unlockedPassives[p.key]}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
                
                {/* Status Bar / Hint */}
                <div className="p-3 ui-panel-footer flex justify-between items-center text-[10px] font-mono">
                    <span>TIP: Master combinations to survive high-difficulty stages.</span>
                    <span>{isFullLibraryView ? `FULL LIBRARY: ${Object.keys(WEAPONS_DATA).length} WEAPONS` : `LOADED: ${Object.keys(playerStats.unlockedWeapons).length} WEAPONS`}</span>
                </div>
            </div>
        </div>
    );
};
