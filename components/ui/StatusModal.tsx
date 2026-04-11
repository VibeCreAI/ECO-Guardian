
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { WEAPONS_DATA, PASSIVES_DATA, EVOLUTION_RECIPES } from '../../constants';
import { ASSET_PATHS } from '../../assets';

const PlayerIdleSprite = () => {
    const [frame, setFrame] = useState(0);
    const spriteUrl = ASSET_PATHS.images.player.idle;

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
            className="w-24 h-24 mx-auto mb-2 ui-card overflow-hidden relative"
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
        <div className="absolute inset-0 flex items-center justify-center ui-backdrop z-[100] p-4 pointer-events-auto">
            <div className="ui-panel w-full max-w-4xl h-[90vh] flex flex-col relative">
                
                {/* Header */}
                <div className="p-4 flex justify-between items-center ui-panel-header">
                    <h2 className="text-xl md:text-2xl font-bold ui-title">STATUS SCREEN</h2>
                    <button onClick={togglePause} className="ui-modal-close text-xl px-3 py-1">✕</button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                    
                    {/* LEFT COL: STATS */}
                    <div className="w-full md:w-1/3 bg-black/30 p-6 border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-col gap-6 md:overflow-y-auto md:min-h-0">
                        <div className="text-center">
                            <PlayerIdleSprite />
                            <div className="ui-warning font-bold text-xl">LVL {playerStats.level}</div>
                            <div className="ui-muted text-xs">Eco Guardian</div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b-2 border-black pb-1">
                                <span className="ui-muted">HP</span>
                                <span className="text-white font-bold">{Math.ceil(playerStats.hp)} / {playerStats.maxHp}</span>
                            </div>
                            <div className="flex justify-between border-b-2 border-black pb-1">
                                <span className="ui-muted">Attack</span>
                                <span className="text-white font-bold">{playerStats.attackPower}</span>
                            </div>
                            <div className="flex justify-between border-b-2 border-black pb-1">
                                <span className="ui-muted">Speed</span>
                                <span className="text-white font-bold">{playerStats.moveSpeed}</span>
                            </div>
                            <div className="flex justify-between border-b-2 border-black pb-1">
                                <span className="ui-muted">Dash CD</span>
                                <span className="text-white font-bold">{playerStats.dashCooldownTime.toFixed(1)}s</span>
                            </div>
                            <div className="flex justify-between border-b-2 border-black pb-1">
                                <span className="ui-muted">Weapon Slots</span>
                                <span className="text-white font-bold">{Object.keys(playerStats.unlockedWeapons).length} / {playerStats.maxWeaponSlots}</span>
                            </div>
                        </div>

                        <div className="mt-auto ui-card p-3">
                            <div className="text-xs ui-muted mb-1">MODIFIERS</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="ui-cyan">Proj: +{playerStats.modifiers.projectileCount}</div>
                                <div className="ui-danger">Dmg: x{playerStats.modifiers.damage.toFixed(2)}</div>
                                <div className="ui-warning">Area: x{playerStats.modifiers.area.toFixed(2)}</div>
                                <div className="text-green-300">CD: x{playerStats.modifiers.cooldown.toFixed(2)}</div>
                                <div className="text-green-200 col-span-2">Knockback: x{playerStats.modifiers.knockback.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: INVENTORY */}
                    <div className="flex-1 p-6 md:overflow-y-auto flex flex-col gap-6 md:min-h-0">
                        
                        {/* WEAPONS */}
                        <div>
                            <h3 className="text-white font-bold mb-3 border-b-4 border-black pb-2">WEAPONS</h3>
                            <div className="flex flex-wrap gap-3">
                                {weapons.map(([key, level]) => {
                                    const data = WEAPONS_DATA[key];
                                    if(!data) return null;
                                    return (
                                        <button 
                                            key={key}
                                            onClick={() => setSelectedItem({key, type: 'WEAPON'})}
                                            className={`w-16 h-16 ui-slot ${selectedItem?.key === key ? 'ui-slot-active' : (data.isEvolution ? 'border-yellow-400' : 'border-black')} relative group`}
                                        >
                                            <div className="text-3xl flex items-center justify-center h-full">{data.icon as React.ReactNode}</div>
                                            <div className="absolute bottom-0 right-0 bg-black text-white text-[10px] px-1 font-bold">Lv.{level}</div>
                                        </button>
                                    );
                                })}
                                {Array.from({length: Math.max(0, playerStats.maxWeaponSlots - weapons.length)}).map((_, i) => (
                                    <div key={i} className="w-16 h-16 ui-slot ui-slot-empty flex items-center justify-center">
                                        <span className="text-[8px]">OPEN</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PASSIVES */}
                        <div>
                            <h3 className="text-white font-bold mb-3 border-b-4 border-black pb-2">PASSIVES</h3>
                            <div className="flex flex-wrap gap-3">
                                {passives.map(([key, level]) => {
                                    const data = PASSIVES_DATA[key];
                                    if(!data) return null;
                                    return (
                                        <button 
                                            key={key}
                                            onClick={() => setSelectedItem({key, type: 'PASSIVE'})}
                                            className={`w-12 h-12 ui-slot ${selectedItem?.key === key ? 'ui-slot-active' : ''} relative`}
                                        >
                                            <div className="text-xl flex items-center justify-center h-full">{data.icon as React.ReactNode}</div>
                                            <div className="absolute -bottom-1 -right-1 ui-chip ui-chip-primary text-[8px] px-1">{level}</div>
                                        </button>
                                    );
                                })}
                                {passives.length === 0 && <div className="ui-muted text-sm">No passives yet. Open chests!</div>}
                            </div>
                        </div>

                        {/* DETAILS PANE */}
                        <div className="mt-auto min-h-[160px] ui-card p-4 relative">
                            {selectedItem ? (
                                <>
                                    {selectedItem.type === 'WEAPON' ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="text-3xl">{WEAPONS_DATA[selectedItem.key].icon}</div>
                                                <div>
                                                    <h4 className={`font-bold ${WEAPONS_DATA[selectedItem.key].isEvolution ? 'ui-warning' : 'text-white'}`}>
                                                        {WEAPONS_DATA[selectedItem.key].label}
                                                    </h4>
                                                    <div className="text-xs ui-muted">
                                                        {WEAPONS_DATA[selectedItem.key].isEvolution ? 'Evolution Weapon' : 'Base Weapon'}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm ui-copy mb-2">{WEAPONS_DATA[selectedItem.key].description}</p>
                                            <div className="text-xs ui-cyan mb-2">Base Knockback: {WEAPONS_DATA[selectedItem.key].knockback}</div>
                                            
                                            {!WEAPONS_DATA[selectedItem.key].isEvolution && (
                                                <div className="bg-black/40 p-2 border-2 border-black">
                                                    <div className="text-[10px] ui-warning font-bold mb-1 uppercase flex items-center gap-1">
                                                        <span>★</span> Evolution Recipe
                                                    </div>
                                                    {EVOLUTION_RECIPES.filter(r => r.ingredients.includes(selectedItem.key)).map(recipe => {
                                                        const partnerKey = recipe.ingredients.find(i => i !== selectedItem.key)!;
                                                        const partner = WEAPONS_DATA[partnerKey];
                                                        const result = WEAPONS_DATA[recipe.result];
                                                        const hasPartner = !!playerStats.unlockedWeapons[partnerKey];
                                                        
                                                        return (
                                                            <div key={recipe.result} className="flex items-center gap-2 mb-1 last:mb-0 bg-black/40 p-1.5 border-2 border-black">
                                                                <span className="text-base">{WEAPONS_DATA[selectedItem.key].icon}</span>
                                                                <span className="text-gray-500 text-xs font-bold">+</span>
                                                                <div className="relative group/partner">
                                                                    <span className={`text-base ${!hasPartner ? 'opacity-40 grayscale' : ''}`}>{partner?.icon || '❓'}</span>
                                                                    <div className={`absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center text-[7px] border-2 border-black ${hasPartner ? 'bg-green-500 text-black' : 'bg-red-600 text-white'}`}>
                                                                        {hasPartner ? '✓' : '✕'}
                                                                    </div>
                                                                    {/* Tooltip for partner name */}
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/partner:block bg-black text-white text-[9px] px-1 border-2 border-black whitespace-nowrap z-50">
                                                                        {partner?.label || partnerKey}
                                                                    </div>
                                                                </div>
                                                                <span className="ui-cyan text-xs">➜</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-base">{result?.icon || '⭐'}</span>
                                                                    <span className="text-[10px] ui-warning font-bold">{result?.label}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {EVOLUTION_RECIPES.filter(r => r.ingredients.includes(selectedItem.key)).length === 0 && (
                                                        <div className="text-[10px] ui-muted px-1">No known evolutions</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="text-3xl">{PASSIVES_DATA[selectedItem.key].icon}</div>
                                                <h4 className="font-bold text-green-200">{PASSIVES_DATA[selectedItem.key].label}</h4>
                                            </div>
                                            <p className="text-sm ui-copy">{PASSIVES_DATA[selectedItem.key].description}</p>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center ui-muted">
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
