
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { WEAPONS_DATA, PASSIVES_DATA, EVOLUTION_RECIPES } from '../../constants';

const PlayerIdleSprite = () => {
    const [frame, setFrame] = useState(0);
    const spriteUrl = "https://storage.googleapis.com/eco-guardian/player/idle.png";

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(f => (f + 1) % 16);
        }, 166); // 6 FPS approx
        return () => clearInterval(interval);
    }, []);

    const col = frame % 4;
    const row = Math.floor(frame / 4);
    
    // Background Position Calculation for 4x4 grid
    const xPos = col * (100 / 3);
    const yPos = row * (100 / 3);

    return (
        <div 
            className="w-24 h-24 mx-auto mb-2 drop-shadow-xl bg-slate-800 rounded-full border-4 border-slate-600 overflow-hidden relative"
        >
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage: `url(${spriteUrl})`,
                    backgroundSize: '400% 400%',
                    backgroundPosition: `${xPos}% ${yPos}%`,
                    imageRendering: 'pixelated',
                    transform: 'scale(1.5)', // Slight zoom to fill the circle better
                    transformOrigin: 'center center'
                }}
            />
        </div>
    );
};

export const StatusModal: React.FC = () => {
    const { playerStats, togglePause } = useGameStore();
    const [selectedItem, setSelectedItem] = useState<{key: string, type: 'WEAPON' | 'PASSIVE'} | null>(null);

    const weapons = Object.entries(playerStats.unlockedWeapons) as [string, number][];
    const passives = Object.entries(playerStats.unlockedPassives) as [string, number][];

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[100] p-4 pointer-events-auto">
            <div className="bg-slate-900 border-4 border-green-600 retro-border w-full max-w-4xl h-[90vh] flex flex-col relative shadow-[0_0_50px_rgba(22,163,74,0.3)]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl md:text-2xl text-green-400 font-bold tracking-widest">STATUS SCREEN</h2>
                    <button onClick={togglePause} className="text-white font-bold text-xl px-2 hover:text-green-400">✕</button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    
                    {/* LEFT COL: STATS */}
                    <div className="w-full md:w-1/3 bg-black/30 p-6 border-r border-gray-700 flex flex-col gap-6 overflow-y-auto">
                        <div className="text-center">
                            <PlayerIdleSprite />
                            <div className="text-yellow-400 font-bold text-xl">LVL {playerStats.level}</div>
                            <div className="text-gray-400 text-xs">Eco Guardian</div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-gray-400">HP</span>
                                <span className="text-white font-bold">{Math.ceil(playerStats.hp)} / {playerStats.maxHp}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-gray-400">Attack</span>
                                <span className="text-white font-bold">{playerStats.attackPower}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-gray-400">Speed</span>
                                <span className="text-white font-bold">{playerStats.moveSpeed}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-gray-400">Dash CD</span>
                                <span className="text-white font-bold">{playerStats.dashCooldownTime.toFixed(1)}s</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-gray-400">Weapon Slots</span>
                                <span className="text-white font-bold">{Object.keys(playerStats.unlockedWeapons).length} / {playerStats.maxWeaponSlots}</span>
                            </div>
                        </div>

                        <div className="mt-auto bg-slate-800 p-3 rounded border border-slate-600">
                            <div className="text-xs text-gray-400 mb-1">MODIFIERS</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-blue-300">Proj: +{playerStats.modifiers.projectileCount}</div>
                                <div className="text-red-300">Dmg: x{playerStats.modifiers.damage.toFixed(2)}</div>
                                <div className="text-yellow-300">Area: x{playerStats.modifiers.area.toFixed(2)}</div>
                                <div className="text-green-300">CD: x{playerStats.modifiers.cooldown.toFixed(2)}</div>
                                <div className="text-purple-300 col-span-2">Knockback: x{playerStats.modifiers.knockback.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: INVENTORY */}
                    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                        
                        {/* WEAPONS */}
                        <div>
                            <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-2">WEAPONS</h3>
                            <div className="flex flex-wrap gap-3">
                                {weapons.map(([key, level]) => {
                                    const data = WEAPONS_DATA[key];
                                    if(!data) return null;
                                    return (
                                        <button 
                                            key={key}
                                            onClick={() => setSelectedItem({key, type: 'WEAPON'})}
                                            className={`w-16 h-16 bg-slate-800 border-2 ${selectedItem?.key === key ? 'border-yellow-400' : (data.isEvolution ? 'border-purple-500' : 'border-gray-600')} hover:bg-slate-700 relative group`}
                                        >
                                            <div className="text-3xl flex items-center justify-center h-full">{data.icon as React.ReactNode}</div>
                                            <div className="absolute bottom-0 right-0 bg-black text-white text-[10px] px-1 font-bold">Lv.{level}</div>
                                        </button>
                                    );
                                })}
                                {Array.from({length: Math.max(0, playerStats.maxWeaponSlots - weapons.length)}).map((_, i) => (
                                    <div key={i} className="w-16 h-16 bg-black/20 border-2 border-gray-800 flex items-center justify-center text-gray-700">
                                        Empty
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PASSIVES */}
                        <div>
                            <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-2">PASSIVES</h3>
                            <div className="flex flex-wrap gap-3">
                                {passives.map(([key, level]) => {
                                    const data = PASSIVES_DATA[key];
                                    if(!data) return null;
                                    return (
                                        <button 
                                            key={key}
                                            onClick={() => setSelectedItem({key, type: 'PASSIVE'})}
                                            className={`w-12 h-12 bg-blue-900/30 border-2 ${selectedItem?.key === key ? 'border-yellow-400' : 'border-blue-500'} hover:bg-blue-900/50 relative rounded-full`}
                                        >
                                            <div className="text-xl flex items-center justify-center h-full">{data.icon as React.ReactNode}</div>
                                            <div className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] px-1 rounded-full border border-blue-500">{level}</div>
                                        </button>
                                    );
                                })}
                                {passives.length === 0 && <div className="text-gray-600 italic text-sm">No passives yet. Open chests!</div>}
                            </div>
                        </div>

                        {/* DETAILS PANE */}
                        <div className="mt-auto min-h-[160px] bg-black/50 border-2 border-gray-600 p-4 rounded relative">
                            {selectedItem ? (
                                <>
                                    {selectedItem.type === 'WEAPON' ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="text-3xl">{WEAPONS_DATA[selectedItem.key].icon}</div>
                                                <div>
                                                    <h4 className={`font-bold ${WEAPONS_DATA[selectedItem.key].isEvolution ? 'text-purple-400' : 'text-white'}`}>
                                                        {WEAPONS_DATA[selectedItem.key].label}
                                                    </h4>
                                                    <div className="text-xs text-gray-400">
                                                        {WEAPONS_DATA[selectedItem.key].isEvolution ? 'Evolution Weapon' : 'Base Weapon'}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-300 mb-2">{WEAPONS_DATA[selectedItem.key].description}</p>
                                            <div className="text-xs text-blue-300 mb-2">Base Knockback: {WEAPONS_DATA[selectedItem.key].knockback}</div>
                                            
                                            {!WEAPONS_DATA[selectedItem.key].isEvolution && (
                                                <div className="bg-yellow-900/10 p-2 rounded border border-yellow-700/30">
                                                    <div className="text-[10px] text-yellow-500 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                                                        <span>★</span> Evolution Recipe
                                                    </div>
                                                    {EVOLUTION_RECIPES.filter(r => r.ingredients.includes(selectedItem.key)).map(recipe => {
                                                        const partnerKey = recipe.ingredients.find(i => i !== selectedItem.key)!;
                                                        const partner = WEAPONS_DATA[partnerKey];
                                                        const result = WEAPONS_DATA[recipe.result];
                                                        const hasPartner = !!playerStats.unlockedWeapons[partnerKey];
                                                        
                                                        return (
                                                            <div key={recipe.result} className="flex items-center gap-2 mb-1 last:mb-0 bg-black/40 p-1.5 rounded border border-white/5">
                                                                <span className="text-base">{WEAPONS_DATA[selectedItem.key].icon}</span>
                                                                <span className="text-gray-500 text-xs font-bold">+</span>
                                                                <div className="relative group/partner">
                                                                    <span className={`text-base ${!hasPartner ? 'opacity-40 grayscale' : ''}`}>{partner?.icon || '❓'}</span>
                                                                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[7px] border ${hasPartner ? 'bg-green-600 border-green-400 text-white' : 'bg-red-600 border-red-400 text-white'}`}>
                                                                        {hasPartner ? '✓' : '✕'}
                                                                    </div>
                                                                    {/* Tooltip for partner name */}
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/partner:block bg-black text-white text-[9px] px-1 rounded border border-gray-600 whitespace-nowrap z-50">
                                                                        {partner?.label || partnerKey}
                                                                    </div>
                                                                </div>
                                                                <span className="text-blue-400 text-xs">➜</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-base drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">{result?.icon || '⭐'}</span>
                                                                    <span className="text-[10px] text-purple-300 font-bold">{result?.label}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {EVOLUTION_RECIPES.filter(r => r.ingredients.includes(selectedItem.key)).length === 0 && (
                                                        <div className="text-[10px] text-gray-500 italic px-1">No known evolutions</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="text-3xl">{PASSIVES_DATA[selectedItem.key].icon}</div>
                                                <h4 className="font-bold text-blue-300">{PASSIVES_DATA[selectedItem.key].label}</h4>
                                            </div>
                                            <p className="text-sm text-gray-300">{PASSIVES_DATA[selectedItem.key].description}</p>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500 italic">
                                    Select an item to view details
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
