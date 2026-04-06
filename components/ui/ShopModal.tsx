
import React, { useState } from 'react';
import { useGameStore, SHOP_REFRESH_COST } from '../../store/gameStore';
import { UpgradeOption, GameMode } from '../../types';
import { WEAPONS_DATA, PASSIVES_DATA, EVOLUTION_RECIPES } from '../../constants';

export const ShopModal: React.FC = () => {
    const { shopOptions, playerStats, buyShopItem, setMode, refreshShop, askForUpgradeAdvice, adviceLoading, adviceResult } = useGameStore();
    const [replaceMode, setReplaceMode] = useState<{ item: UpgradeOption } | null>(null);

    const handleBuy = (item: UpgradeOption) => {
        if (!item.cost || playerStats.carbonSaved < item.cost) return;

        // Logic for weapon slot cap
        const currentWeapons = Object.keys(playerStats.unlockedWeapons).length;
        if (item.type === 'WEAPON' && item.isNewWeapon && currentWeapons >= playerStats.maxWeaponSlots) {
            setReplaceMode({ item });
            return;
        }

        buyShopItem(item);
    };

    const handleReplace = (keyToReplace: string) => {
        if (replaceMode) {
            buyShopItem(replaceMode.item, keyToReplace);
            setReplaceMode(null);
        }
    };

    const handleClose = () => {
        setMode(GameMode.OVERWORLD);
    };

    const equippedWeaponsArr = Object.entries(playerStats.unlockedWeapons);
    const equippedPassivesArr = Object.entries(playerStats.unlockedPassives).filter(([_, level]) => (level as number) > 0);

    // --- REPLACE ITEM UI ---
    if (replaceMode) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/95 z-[110] p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-900 border-4 border-red-500 retro-border w-full max-w-lg p-6 shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                    <h2 className="text-2xl text-red-500 font-bold mb-2 text-center tracking-widest">⚠️ STORAGE FULL</h2>
                    <p className="text-gray-300 text-sm mb-6 text-center leading-relaxed">
                        To equip <span className="text-yellow-300 font-bold">{replaceMode.item.label}</span>, 
                        you must dismantle an existing weapon.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6 max-h-[50vh] overflow-y-auto pr-2">
                        {equippedWeaponsArr.map(([key, level]) => {
                            const weaponData = WEAPONS_DATA[key];
                            return (
                                <button 
                                    key={key}
                                    onClick={() => handleReplace(key)}
                                    className="bg-slate-800 border-2 border-gray-600 p-3 hover:bg-red-900/80 hover:border-red-400 transition-all text-left group flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 bg-black/40 rounded flex items-center justify-center text-2xl border border-gray-700 shrink-0">
                                        {(weaponData?.icon || '❓') as React.ReactNode}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-xs font-bold text-gray-300 group-hover:text-white mb-1 truncate">
                                            {weaponData?.label || String(key).replace('_', ' ')}
                                        </div>
                                        <div className="text-[10px] text-gray-500 group-hover:text-red-300">Level {level}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    
                    <button 
                        onClick={() => setReplaceMode(null)}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 font-bold retro-btn retro-border border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        CANCEL TRANSACTION
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN SHOP UI ---
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="relative w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] flex flex-col bg-slate-950 border-4 border-green-700 shadow-[0_0_60px_rgba(21,128,61,0.3)] retro-border overflow-hidden">
                
                {/* --- HEADER --- */}
                <div className="bg-slate-900 p-4 border-b-4 border-green-800 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shrink-0 shadow-lg z-10">
                    
                    {/* Top Row: Title + Close */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-900/50 border-2 border-green-500 flex items-center justify-center rounded text-2xl shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                                ♻️
                            </div>
                            <div>
                                <h2 className="text-xl md:text-3xl text-green-400 font-black tracking-tighter italic drop-shadow-md leading-none">
                                    ECO-MART
                                </h2>
                                <p className="text-[10px] text-green-600 font-bold tracking-widest hidden md:block mt-1">SUSTAINABLE ARMORY</p>
                            </div>
                        </div>

                        {/* Mobile Close Button */}
                        <button 
                            onClick={handleClose} 
                            className="md:hidden w-10 h-10 bg-red-600 text-white font-bold retro-border flex items-center justify-center active:scale-95 shadow-md"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-3 md:gap-6 justify-between md:justify-end bg-slate-950/50 md:bg-transparent p-2 md:p-0 rounded border border-white/5 md:border-none">
                        
                        {/* Balance */}
                        <div className="flex flex-col md:items-end">
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Carbon Credit</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-mono font-bold text-white tracking-tight">{playerStats.carbonSaved}</span>
                                <span className="text-xs text-gray-400">kg</span>
                            </div>
                        </div>

                        <div className="w-px h-8 bg-gray-700 hidden md:block"></div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Ask Gaia Button */}
                            <button
                                onClick={askForUpgradeAdvice}
                                disabled={adviceLoading || !!adviceResult}
                                className={`hidden md:flex items-center gap-2 px-4 py-2 border-b-4 transition-all font-bold text-xs rounded active:border-b-0 active:translate-y-1 retro-border ${adviceLoading ? 'bg-purple-900/50 border-purple-800 text-purple-200 cursor-wait' : 'bg-purple-700 border-purple-900 text-white hover:bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]'}`}
                            >
                                {adviceLoading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>CONSULTING...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg">🧠</span>
                                        <span>ASK GAIA</span>
                                    </>
                                )}
                            </button>

                            <button 
                                onClick={refreshShop}
                                disabled={playerStats.carbonSaved < SHOP_REFRESH_COST}
                                className={`group px-3 py-2 md:py-3 border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2 retro-border ${playerStats.carbonSaved >= SHOP_REFRESH_COST ? 'bg-blue-600 border-blue-800 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-gray-800 border-gray-900 text-gray-500 cursor-not-allowed opacity-60'}`}
                                title={`Refresh Stock (-${SHOP_REFRESH_COST}kg)`}
                            >
                                <span className={`text-lg leading-none ${playerStats.carbonSaved >= SHOP_REFRESH_COST ? 'group-hover:rotate-180 transition-transform duration-500' : ''}`}>↻</span>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] md:text-xs font-bold">RESTOCK</span>
                                    <span className="text-[8px] md:text-[9px] opacity-80">-{SHOP_REFRESH_COST} kg</span>
                                </div>
                            </button>

                            {/* Desktop Close Button */}
                            <button 
                                onClick={handleClose} 
                                className="hidden md:flex px-6 py-2 bg-red-600 text-white font-bold retro-border border-b-4 border-red-800 hover:bg-red-500 active:border-b-0 active:translate-y-1 items-center justify-center h-full shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
                            >
                                LEAVE
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900 relative flex flex-col gap-6">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" 
                         style={{ 
                             backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
                             backgroundSize: '20px 20px',
                             backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' 
                         }} 
                    />

                    {/* AI Advice Display */}
                    {adviceResult && (
                        <div className="relative z-10 bg-purple-900/30 border border-purple-500 p-4 rounded-lg flex items-start gap-4 animate-in fade-in slide-in-from-top-4 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <div className="text-3xl pt-1">💡</div>
                            <div>
                                <h4 className="text-purple-300 font-bold text-sm mb-1 uppercase tracking-wider">Gaia's Recommendation:</h4>
                                <p className="text-gray-100 text-sm italic leading-relaxed">"{adviceResult.reason}"</p>
                            </div>
                        </div>
                    )}

                    {/* Mobile Ask Gaia Button (Shown only if advice is not active) */}
                    <div className="md:hidden">
                        {!adviceResult && (
                            <button
                                onClick={askForUpgradeAdvice}
                                disabled={adviceLoading}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-b-4 transition-all font-bold text-sm rounded active:border-b-0 active:translate-y-1 retro-border ${adviceLoading ? 'bg-purple-900/50 border-purple-800 text-purple-200 cursor-wait' : 'bg-purple-700 border-purple-900 text-white hover:bg-purple-600 shadow-lg'}`}
                            >
                                {adviceLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>CONSULTING GAIA...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xl">🧠</span>
                                        <span>ASK GAIA FOR ADVICE</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* ITEM GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {shopOptions.map((option) => {
                            const canAfford = option.cost && playerStats.carbonSaved >= option.cost;
                            const isEvo = option.isEvolution;
                            const isPassive = option.type === 'PASSIVE';
                            const isStat = option.type === 'STAT';
                            const isRecommended = adviceResult?.recommendedOptionId === option.id;
                            
                            // Check if player already has this weapon and what level it is
                            const currentLevel = playerStats.unlockedWeapons[option.key] || playerStats.unlockedPassives[option.key] || 0;
                            
                            let borderColor = 'border-gray-600';
                            let bgColor = 'bg-slate-800';
                            let glowColor = '';
                            let badgeColor = 'bg-gray-700 text-gray-300';
                            
                            if (isEvo) {
                                borderColor = 'border-purple-500';
                                glowColor = 'shadow-[0_0_20px_rgba(168,85,247,0.15)]';
                                badgeColor = 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]';
                            } else if (isPassive) {
                                borderColor = 'border-blue-500';
                                badgeColor = 'bg-blue-600 text-white';
                            } else if (isStat) {
                                borderColor = 'border-orange-500';
                                badgeColor = 'bg-orange-600 text-white';
                            }

                            // Highlight Recommendation
                            if (isRecommended) {
                                borderColor = 'border-green-400';
                                glowColor = 'shadow-[0_0_25px_rgba(74,222,128,0.5)] scale-[1.02] z-20';
                            }

                            return (
                                <div key={option.id} className={`${bgColor} border-2 ${borderColor} p-4 flex flex-col h-full relative group transition-all hover:-translate-y-1 hover:shadow-2xl ${glowColor}`}>
                                    {isRecommended && <div className="absolute -top-3 -left-2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 z-30 shadow-lg border border-white">GAIA'S PICK</div>}
                                    {isEvo && (
                                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-purple-600 rotate-12 border-2 border-white shadow-lg flex items-center justify-center z-10 animate-pulse">
                                            <span className="text-xl">★</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-14 h-14 bg-black/40 rounded border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                                            {option.icon}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${badgeColor}`}>
                                                {isEvo ? 'Ultimate' : (isPassive ? 'Passive' : (isStat ? 'Stat' : 'Weapon'))}
                                            </div>
                                            {currentLevel > 0 && (
                                                <div className="text-[10px] text-green-400 font-bold bg-green-950/50 px-2 rounded border border-green-500/30">
                                                    OWNED: LV.{currentLevel}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <h3 className={`font-bold text-lg mb-1 leading-tight ${isEvo ? 'text-purple-300' : (isPassive ? 'text-blue-300' : (isStat ? 'text-orange-300' : 'text-gray-100'))}`}>
                                        {option.label}
                                    </h3>
                                    
                                    <p className="text-xs text-gray-400 mb-4 flex-1 leading-relaxed border-t border-white/5 pt-2 mt-1">
                                        {option.description}
                                    </p>
                                    
                                    {/* Visual Evolution Path - Mirroring Level Up UI */}
                                    {option.type === 'WEAPON' && !isEvo && (
                                        <div className="mb-4 bg-black/20 p-2 rounded border border-white/5">
                                            <div className="text-[9px] text-green-400 font-bold mb-1 flex items-center gap-1 uppercase tracking-tighter">
                                                <span>💡</span> Evolution Potential
                                            </div>
                                            {EVOLUTION_RECIPES.filter(r => r.ingredients.includes(option.key)).map(recipe => {
                                                const partnerKey = recipe.ingredients.find(k => k !== option.key)!;
                                                const partnerData = WEAPONS_DATA[partnerKey];
                                                const resultData = WEAPONS_DATA[recipe.result];
                                                const hasPartner = !!playerStats.unlockedWeapons[partnerKey];
                                                
                                                return (
                                                    <div key={recipe.result} className="flex items-center gap-2 mt-1 bg-black/40 p-1 rounded border border-white/5">
                                                        <span className="text-base">{option.icon}</span>
                                                        <span className="text-gray-600 font-black text-[10px]">+</span>
                                                        <div className="relative">
                                                            <span className={`text-base ${!hasPartner ? 'opacity-30 grayscale' : ''}`}>{partnerData?.icon || '❓'}</span>
                                                            {!hasPartner && <span className="absolute -top-1 -right-1 text-[7px] bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center font-bold">✕</span>}
                                                            {hasPartner && <span className="absolute -top-1 -right-1 text-[7px] bg-green-500 text-white rounded-full w-3 h-3 flex items-center justify-center font-bold">✔</span>}
                                                        </div>
                                                        <span className="text-blue-500 text-[10px]">➜</span>
                                                        <span className="text-base drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">{resultData?.icon || '⭐'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => handleBuy(option)}
                                        disabled={!canAfford}
                                        className={`w-full py-3 font-bold flex items-center justify-center px-4 retro-border transition-all border-b-4 active:border-b-0 active:translate-y-1 ${canAfford ? 'bg-green-600 border-green-800 hover:bg-green-500 text-white shadow-lg' : 'bg-gray-700 border-gray-800 text-gray-400 cursor-not-allowed grayscale'}`}
                                    >
                                        <div className="flex items-center gap-2 w-full justify-between">
                                            <span className="text-xs uppercase opacity-80">Buy</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-lg">{option.cost}</span>
                                                <span className="text-[10px] font-normal">kg</span>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* CURRENT ARSENAL DISPLAY - MIRRORING LEVEL UP SCREEN */}
                    <div className="mt-auto relative z-10 p-4 bg-slate-950/80 border-2 border-slate-700 rounded-lg backdrop-blur-sm">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Weapons Section */}
                            <div className="flex-1">
                                <h3 className="text-white text-[10px] font-bold mb-3 tracking-widest uppercase flex items-center gap-2">
                                    <span className="text-green-500">▶</span> WEAPON ARSENAL ({equippedWeaponsArr.length}/{playerStats.maxWeaponSlots})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {equippedWeaponsArr.map(([key, level]) => {
                                        const data = WEAPONS_DATA[key];
                                        if (!data) return null;
                                        return (
                                            <div key={key} className={`w-12 h-12 flex flex-col items-center justify-center bg-slate-800 rounded border-2 ${data.isEvolution ? 'border-purple-500' : 'border-gray-600'} relative group`}>
                                                <span className="text-2xl">{data.icon}</span>
                                                <span className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] px-1 font-bold border border-gray-600">Lv.{level as number}</span>
                                            </div>
                                        );
                                    })}
                                    {Array.from({ length: Math.max(0, playerStats.maxWeaponSlots - equippedWeaponsArr.length) }).map((_, i) => (
                                        <div key={i} className="w-12 h-12 flex items-center justify-center bg-black/40 border-2 border-dashed border-gray-800 rounded text-gray-700 font-bold text-[8px]">
                                            OPEN
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Passives Section */}
                            <div className="md:w-1/3">
                                <h3 className="text-white text-[10px] font-bold mb-3 tracking-widest uppercase flex items-center gap-2">
                                    <span className="text-blue-500">▶</span> PASSIVE BUFFS
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {equippedPassivesArr.map(([key, level]) => {
                                        const data = PASSIVES_DATA[key];
                                        if (!data) return null;
                                        return (
                                            <div key={key} className="w-10 h-10 flex items-center justify-center bg-blue-900/20 rounded-full border-2 border-blue-500/50 relative" title={data.label}>
                                                <span className="text-xl">{data.icon}</span>
                                                <span className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] px-1 rounded-full border border-blue-500">Lv.{level as number}</span>
                                            </div>
                                        );
                                    })}
                                    {equippedPassivesArr.length === 0 && (
                                        <div className="text-gray-600 italic text-[10px] py-2">No passives installed.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
