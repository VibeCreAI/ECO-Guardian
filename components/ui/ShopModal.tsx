
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
            <div className="fixed inset-0 flex items-center justify-center ui-backdrop z-[110] p-4 animate-in fade-in zoom-in duration-200">
                <div className="ui-panel ui-card-danger w-full max-w-lg p-6">
                    <h2 className="text-2xl ui-danger font-bold mb-2 text-center">⚠️ STORAGE FULL</h2>
                    <p className="ui-copy text-sm mb-6 text-center">
                        To equip <span className="text-yellow-300 font-bold">{replaceMode.item.label}</span>, 
                        you must dismantle an existing weapon.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6 max-h-[50vh] overflow-y-auto pr-2">
                        {equippedWeaponsArr.map(([key, level]) => {
                            const weaponData = WEAPONS_DATA[key];
                            return (
                                <button
                                    data-modal-btn=""
                                    key={key}
                                    onClick={() => handleReplace(key)}
                                    className="ui-card ui-card-danger p-3 transition-all text-left group flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 ui-slot flex items-center justify-center text-2xl shrink-0">
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
                        data-modal-btn=""
                        onClick={() => setReplaceMode(null)}
                        className="w-full ui-button ui-button-secondary py-4 font-bold"
                    >
                        CANCEL TRANSACTION
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN SHOP UI ---
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 ui-backdrop animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="relative w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] flex flex-col ui-panel overflow-hidden">
                
                {/* --- HEADER --- */}
                <div className="ui-panel-header p-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shrink-0 z-10">
                    
                    {/* Top Row: Title + Close */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 ui-slot ui-slot-active flex items-center justify-center text-2xl">
                                ♻️
                            </div>
                            <div>
                                <h2 className="text-xl md:text-3xl font-black ui-title leading-none">
                                    ECO-MART
                                </h2>
                                <p className="text-[10px] text-green-200 font-bold hidden md:block mt-1">SUSTAINABLE ARMORY</p>
                            </div>
                        </div>

                        {/* Mobile Close Button */}
                        <button
                            data-modal-btn=""
                            onClick={handleClose}
                            className="md:hidden w-10 h-10 ui-modal-close font-bold flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-3 md:gap-6 justify-between md:justify-end bg-black/30 md:bg-transparent p-2 md:p-0 border-2 border-black md:border-none">
                        
                        {/* Balance */}
                        <div className="flex flex-col md:items-end">
                            <span className="text-[10px] text-green-300 font-bold uppercase">Carbon Credit</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-mono font-bold text-white">{playerStats.carbonSaved}</span>
                                <span className="text-xs text-gray-400">kg</span>
                            </div>
                        </div>

                        <div className="w-1 h-8 bg-black hidden md:block"></div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Ask Gaia Button */}
                            <button
                                data-modal-btn=""
                                onClick={askForUpgradeAdvice}
                                disabled={adviceLoading || !!adviceResult}
                                className={`hidden md:flex items-center gap-2 px-4 py-2 font-bold text-xs ui-button ${adviceLoading ? 'ui-button-disabled' : 'ui-button-primary'}`}
                            >
                                {adviceLoading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin" />
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
                                data-modal-btn=""
                                onClick={refreshShop}
                                disabled={playerStats.carbonSaved < SHOP_REFRESH_COST}
                                className={`group px-3 py-2 md:py-3 transition-all flex items-center gap-2 ui-button ${playerStats.carbonSaved >= SHOP_REFRESH_COST ? 'ui-button-cyan' : 'ui-button-disabled opacity-60'}`}
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
                                data-modal-btn=""
                                onClick={handleClose}
                                className="hidden md:flex px-6 py-2 ui-button ui-button-danger font-bold items-center justify-center h-full transition-all"
                            >
                                LEAVE
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 relative flex flex-col gap-6">
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
                        <div className="relative z-10 ui-card ui-card-highlight p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                            <div className="text-3xl pt-1">💡</div>
                            <div>
                                <h4 className="text-green-200 font-bold text-sm mb-1 uppercase">Gaia's Recommendation:</h4>
                                <p className="ui-copy text-sm">"{adviceResult.reason}"</p>
                            </div>
                        </div>
                    )}

                    {/* Mobile Ask Gaia Button (Shown only if advice is not active) */}
                    <div className="md:hidden">
                        {!adviceResult && (
                            <button
                                data-modal-btn=""
                                onClick={askForUpgradeAdvice}
                                disabled={adviceLoading}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 transition-all font-bold text-sm ui-button ${adviceLoading ? 'ui-button-disabled' : 'ui-button-primary'}`}
                            >
                                {adviceLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
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
                            
                            let cardClass = '';
                            let badgeColor = 'ui-chip';
                            let titleColor = 'text-gray-100';
                            
                            if (isEvo) {
                                cardClass = 'ui-card-warning';
                                badgeColor = 'ui-chip ui-chip-warning';
                                titleColor = 'ui-warning';
                            } else if (isPassive) {
                                cardClass = 'ui-card-highlight';
                                badgeColor = 'ui-chip ui-chip-primary';
                                titleColor = 'text-green-200';
                            } else if (isStat) {
                                cardClass = 'ui-card-cyan';
                                badgeColor = 'ui-chip ui-chip-cyan';
                                titleColor = 'ui-cyan';
                            }

                            // Highlight Recommendation
                            if (isRecommended) {
                                cardClass = 'ui-card-highlight scale-[1.02] z-20';
                            }

                            return (
                                <div key={option.id} className={`ui-card ${cardClass} p-4 flex flex-col h-full relative group transition-all`}>
                                    {isRecommended && <div className="absolute -top-3 -left-2 ui-chip ui-chip-primary text-[10px] font-bold px-3 py-1 z-30">GAIA'S PICK</div>}
                                    {isEvo && (
                                        <div className="absolute -top-3 -right-3 w-12 h-12 ui-chip ui-chip-warning rotate-12 flex items-center justify-center z-10 animate-pulse">
                                            <span className="text-xl">★</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-14 h-14 ui-slot flex items-center justify-center text-3xl">
                                            {option.icon}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`px-2 py-1 text-[10px] font-bold uppercase ${badgeColor}`}>
                                                {isEvo ? 'Ultimate' : (isPassive ? 'Passive' : (isStat ? 'Stat' : 'Weapon'))}
                                            </div>
                                            {currentLevel > 0 && (
                                                <div className="text-[10px] text-green-200 font-bold ui-chip px-2">
                                                    OWNED: LV.{currentLevel}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <h3 className={`font-bold text-lg mb-1 leading-tight ${titleColor}`}>
                                        {option.label}
                                    </h3>
                                    
                                    <p className="text-xs ui-muted mb-4 flex-1 leading-relaxed border-t-2 border-black pt-2 mt-1">
                                        {option.description}
                                    </p>
                                    
                                    {/* Visual Evolution Path - Mirroring Level Up UI */}
                                    {option.type === 'WEAPON' && !isEvo && (
                                        <div className="mb-4 bg-black/30 p-2 border-2 border-black">
                                            <div className="text-[9px] text-green-300 font-bold mb-1 flex items-center gap-1 uppercase">
                                                <span>💡</span> Evolution Potential
                                            </div>
                                            {EVOLUTION_RECIPES.filter(r => r.ingredients.includes(option.key)).map(recipe => {
                                                const partnerKey = recipe.ingredients.find(k => k !== option.key)!;
                                                const partnerData = WEAPONS_DATA[partnerKey];
                                                const resultData = WEAPONS_DATA[recipe.result];
                                                const hasPartner = !!playerStats.unlockedWeapons[partnerKey];
                                                
                                                return (
                                                    <div key={recipe.result} className="flex items-center gap-2 mt-1 bg-black/40 p-1 border-2 border-black">
                                                        <span className="text-base">{option.icon}</span>
                                                        <span className="text-gray-600 font-black text-[10px]">+</span>
                                                        <div className="relative">
                                                            <span className={`text-base ${!hasPartner ? 'opacity-30 grayscale' : ''}`}>{partnerData?.icon || '❓'}</span>
                                                            {!hasPartner && <span className="absolute -top-1 -right-1 text-[7px] bg-red-600 text-white border border-black w-3 h-3 flex items-center justify-center font-bold">✕</span>}
                                                            {hasPartner && <span className="absolute -top-1 -right-1 text-[7px] bg-green-500 text-black border border-black w-3 h-3 flex items-center justify-center font-bold">✔</span>}
                                                        </div>
                                                        <span className="ui-cyan text-[10px]">➜</span>
                                                        <span className="text-base">{resultData?.icon || '⭐'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <button
                                        data-modal-btn=""
                                        onClick={() => handleBuy(option)}
                                        disabled={!canAfford}
                                        className={`w-full py-3 font-bold flex items-center justify-center px-4 transition-all ui-button ${canAfford ? 'ui-button-primary' : 'ui-button-disabled grayscale'}`}
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
                    <div className="mt-auto relative z-10 p-4 ui-card">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Weapons Section */}
                            <div className="flex-1">
                                <h3 className="text-white text-[10px] font-bold mb-3 uppercase flex items-center gap-2">
                                    <span className="text-green-500">▶</span> WEAPON ARSENAL ({equippedWeaponsArr.length}/{playerStats.maxWeaponSlots})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {equippedWeaponsArr.map(([key, level]) => {
                                        const data = WEAPONS_DATA[key];
                                        if (!data) return null;
                                        return (
                                            <div key={key} className={`w-12 h-12 flex flex-col items-center justify-center ui-slot ${data.isEvolution ? 'ui-slot-active' : ''} relative group`}>
                                                <span className="text-2xl">{data.icon}</span>
                                                <span className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] px-1 font-bold border border-gray-600">Lv.{level as number}</span>
                                            </div>
                                        );
                                    })}
                                    {Array.from({ length: Math.max(0, playerStats.maxWeaponSlots - equippedWeaponsArr.length) }).map((_, i) => (
                                        <div key={i} className="w-12 h-12 flex items-center justify-center ui-slot ui-slot-empty font-bold text-[8px]">
                                            OPEN
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Passives Section */}
                            <div className="md:w-1/3">
                                <h3 className="text-white text-[10px] font-bold mb-3 uppercase flex items-center gap-2">
                                    <span className="ui-cyan">▶</span> PASSIVE BUFFS
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {equippedPassivesArr.map(([key, level]) => {
                                        const data = PASSIVES_DATA[key];
                                        if (!data) return null;
                                        return (
                                            <div key={key} className="w-10 h-10 flex items-center justify-center ui-slot relative" title={data.label}>
                                                <span className="text-xl">{data.icon}</span>
                                                <span className="absolute -bottom-1 -right-1 ui-chip ui-chip-cyan text-[8px] px-1">Lv.{level as number}</span>
                                            </div>
                                        );
                                    })}
                                    {equippedPassivesArr.length === 0 && (
                                        <div className="ui-muted text-[10px] py-2">No passives installed.</div>
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
