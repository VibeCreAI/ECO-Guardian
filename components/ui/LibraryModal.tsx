
import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { WEAPONS_DATA, PASSIVES_DATA, EVOLUTION_RECIPES } from '../../constants';
import { GameMode } from '../../types';

export const LibraryModal: React.FC = () => {
    const { setMode, previousMode, togglePause, playerStats } = useGameStore();
    const [tab, setTab] = useState<'TREE' | 'PASSIVES'>('TREE');

    const handleClose = () => {
        if (previousMode === GameMode.MENU) {
            setMode(GameMode.MENU);
        } else {
            togglePause();
        }
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] p-4 pointer-events-auto">
            <div className="bg-slate-900 border-4 border-blue-500 retro-border w-full max-w-5xl h-[90vh] flex flex-col relative shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl md:text-3xl text-blue-400 font-bold tracking-widest flex items-center gap-3">
                        <span>📖</span> GRIMOIRE
                    </h2>
                    <button onClick={handleClose} className="text-white font-bold text-xl px-2 hover:text-blue-400">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 bg-black/40">
                    <button 
                        onClick={() => setTab('TREE')}
                        className={`flex-1 py-3 font-bold text-sm md:text-base ${tab === 'TREE' ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}
                    >
                        EVOLUTION TREE
                    </button>
                    <button 
                        onClick={() => setTab('PASSIVES')}
                        className={`flex-1 py-3 font-bold text-sm md:text-base ${tab === 'PASSIVES' ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}
                    >
                        PASSIVE ARCHIVE
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                    
                    {tab === 'TREE' && (
                        <div className="space-y-8">
                            <div className="bg-blue-900/20 p-4 rounded border border-blue-900/50">
                                <p className="text-center text-blue-200 text-sm italic">
                                    "When two base weapons reach their peak (Lv.5), they can fuse into an Ultimate Evolution."
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

                                    return (
                                        <div key={idx} className={`bg-slate-800 border-2 ${hasRes ? 'border-purple-400 bg-purple-900/10' : 'border-gray-700'} p-4 rounded-lg flex items-center justify-between group hover:border-blue-400 transition-all duration-300 relative overflow-hidden shadow-lg`}>
                                            {hasRes && <div className="absolute top-0 right-0 bg-purple-500 text-white text-[8px] font-bold px-4 py-1 rotate-45 translate-x-3 -translate-y-1">UNLOCKED</div>}
                                            
                                            {/* Ingredients */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={`w-14 h-14 bg-black/40 rounded flex items-center justify-center text-3xl border ${hasW1 ? 'border-green-400' : 'border-gray-600 opacity-50'}`}>
                                                        {w1.icon}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold">{w1.label}</div>
                                                </div>
                                                <div className="text-blue-500 font-black text-xl">+</div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={`w-14 h-14 bg-black/40 rounded flex items-center justify-center text-3xl border ${hasW2 ? 'border-green-400' : 'border-gray-600 opacity-50'}`}>
                                                        {w2.icon}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold">{w2.label}</div>
                                                </div>
                                            </div>

                                            {/* Evolution Flow */}
                                            <div className="flex flex-col items-center px-2">
                                                <div className="text-blue-400 text-2xl animate-pulse">➜</div>
                                            </div>

                                            {/* Result */}
                                            <div className="flex flex-col items-center gap-1">
                                                <div className={`w-16 h-16 bg-purple-900/40 rounded border-2 ${hasRes ? 'border-purple-400' : 'border-purple-900/30'} flex items-center justify-center text-4xl shadow-[0_0_15px_rgba(168,85,247,0.3)]`}>
                                                    {res.icon}
                                                </div>
                                                <div className="text-[11px] text-purple-300 font-black text-center">{res.label}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-700">
                                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                    <span className="text-blue-400">■</span> BASE WEAPON ARSENAL
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.values(WEAPONS_DATA).filter(w => !w.isEvolution).map(w => {
                                        const isUnlocked = !!playerStats.unlockedWeapons[w.key];
                                        return (
                                            <div key={w.key} className={`flex items-start gap-3 p-3 rounded border transition-colors ${isUnlocked ? 'bg-slate-800 border-green-700' : 'bg-black/20 border-gray-800 opacity-70'}`}>
                                                <div className="w-12 h-12 bg-black/40 rounded flex items-center justify-center text-2xl border border-gray-700 shrink-0">
                                                    {w.icon}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-gray-100 text-sm flex items-center gap-2">
                                                        {w.label}
                                                        {isUnlocked && <span className="text-[9px] bg-green-900 text-green-300 px-1 rounded">EQ</span>}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 mt-1 leading-tight">{w.description}</div>
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
                                        <div key={p.key} className={`p-4 rounded border flex items-start gap-4 transition-all duration-300 ${isUnlocked ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-slate-800 border-gray-700 opacity-60'}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border shrink-0 ${isUnlocked ? 'bg-blue-900 border-blue-400' : 'bg-gray-800 border-gray-600'}`}>
                                                {p.icon}
                                            </div>
                                            <div>
                                                <h4 className={`font-bold ${isUnlocked ? 'text-blue-300' : 'text-gray-400'}`}>{p.label}</h4>
                                                <p className="text-gray-400 text-[11px] mt-1 leading-relaxed">{p.description}</p>
                                                {isUnlocked && <div className="text-blue-500 text-[10px] mt-2 font-bold tracking-widest">RANK {playerStats.unlockedPassives[p.key]}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
                
                {/* Status Bar / Hint */}
                <div className="p-3 bg-slate-800 border-t border-gray-700 flex justify-between items-center text-[10px] text-gray-500 font-mono italic">
                    <span>TIP: Master combinations to survive high-difficulty stages.</span>
                    <span>LOADED: {Object.keys(playerStats.unlockedWeapons).length} WEAPONS</span>
                </div>
            </div>
        </div>
    );
};
