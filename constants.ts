
export const GAME_CONSTANTS = {
  PLAYER_SPEED: 5,
  DASH_DURATION: 0.2,
  SPAWN_INTERVAL: 1.5,
  WORLD_SIZE: 100,
};

export interface WeaponDef {
    key: string;
    label: string;
    description: string;
    icon: string;
    isEvolution?: boolean;
    knockback: number; // Base knockback force
}

export interface PassiveDef {
    key: string;
    label: string;
    description: string;
    icon: string;
    value?: number;
}

export interface EvolutionRecipe {
    result: string;
    ingredients: [string, string];
}

export const WEAPONS_DATA: Record<string, WeaponDef> = {
    // Base Weapons
    'MAGIC_MISSILE': { key: 'MAGIC_MISSILE', label: 'Magic Wand', description: 'Fires magic projectiles at nearest enemy.', icon: '✨', knockback: 1.0 },
    'AXE': { key: 'AXE', label: 'Throwing Axe', description: 'Throws heavy axes in an arc.', icon: '🪓', knockback: 2.5 },
    'DAGGER': { key: 'DAGGER', label: 'Throwing Knife', description: 'Fires knives in the direction you face.', icon: '🗡️', knockback: 0.5 },
    'CROSS': { key: 'CROSS', label: 'Boomerang Cross', description: 'Throws a cross that returns to player.', icon: '✝️', knockback: 1.5 },
    'BIBLE': { key: 'BIBLE', label: 'Holy Bible', description: 'Orbits around the player.', icon: '📖', knockback: 3.0 },
    'FIRE_AURA': { key: 'FIRE_AURA', label: 'Fire Aura', description: 'Burns nearby enemies continuously.', icon: '🔥', knockback: 0 },
    'FLAMETHROWER': { key: 'FLAMETHROWER', label: 'Flamethrower', description: 'Sprays a cone of fire forward.', icon: '🚒', knockback: 0.2 },
    'THUNDER': { key: 'THUNDER', label: 'Thunder Strike', description: 'Strikes random enemies with lightning.', icon: '⚡', knockback: 0 },
    'ORBITAL': { key: 'ORBITAL', label: 'Orbital Shield', description: 'Protective orbs block enemies.', icon: '🛡️', knockback: 3.0 },
    'SPEAR': { key: 'SPEAR', label: 'Iron Spear', description: 'Thrusts a short-range melee attack.', icon: '🍢', knockback: 4.0 },
    'SLIME_BALL': { key: 'SLIME_BALL', label: 'Slime Ball', description: 'Bounces around dealing damage.', icon: '🟢', knockback: 1.5 },
    'SHURIKEN': { key: 'SHURIKEN', label: 'Ninja Star', description: 'Fast projectile that pierces enemies.', icon: '💠', knockback: 0.1 },
    'KATANA': { key: 'KATANA', label: 'Katana', description: 'Swift melee slashes in front.', icon: '⚔️', knockback: 4.0 },
    'TOXIN_GUN': { key: 'TOXIN_GUN', label: 'Toxin Gun', description: 'Rapidly shoots poison pellets.', icon: '🔫', knockback: 0.2 },

    // Evolution Weapons
    'MAGIC_ARROW': { key: 'MAGIC_ARROW', label: 'Magic Arrow', description: 'Rapid-fire homing projectiles.', icon: '🏹', isEvolution: true, knockback: 0.3 },
    'FIRE_MORTAR': { key: 'FIRE_MORTAR', label: 'Fire Mortar', description: 'Lobs explosive lava pools.', icon: '🌋', isEvolution: true, knockback: 0 },
    'JAVELIN': { key: 'JAVELIN', label: 'Spirit Javelin', description: 'Infinite pierce, auto-targeting.', icon: '🔱', isEvolution: true, knockback: 1.0 },
    'TOXIC_FLASK': { key: 'TOXIC_FLASK', label: 'Toxic Flask', description: 'Creates slowing poison clouds.', icon: '⚗️', isEvolution: true, knockback: 0 },
    'CHAIN_LIGHTNING': { key: 'CHAIN_LIGHTNING', label: 'Chain Lightning', description: 'Lightning that chains between enemies.', icon: '🌩️', isEvolution: true, knockback: 0 },
    'HOLY_BEAM': { key: 'HOLY_BEAM', label: 'Holy Beam', description: 'Massive pillars of light decimate foes.', icon: '🌟', isEvolution: true, knockback: 2.0 },
    'PLAGUE_SPREADER': { key: 'PLAGUE_SPREADER', label: 'Plague Spreader', description: 'You become a walking plague.', icon: '☣️', isEvolution: true, knockback: 0 },
    'TESLA_COIL': { key: 'TESLA_COIL', label: 'Tesla Coil', description: 'Creates a permanent electric zone.', icon: '⚡', isEvolution: true, knockback: 0.5 }
};

export const PASSIVES_DATA: Record<string, PassiveDef> = {
    'DUPLICATOR': { key: 'DUPLICATOR', label: 'Duplicator', description: '+1 Projectile to all weapons', icon: '💍', value: 1 },
    'SPINACH': { key: 'SPINACH', label: 'Spinach', description: '+15% Damage Multiplier', icon: '🥬', value: 0.15 },
    'TOME': { key: 'TOME', label: 'Empty Tome', description: '-10% Cooldown Reduction', icon: '📕', value: 0.1 },
    'CANDLE': { key: 'CANDLE', label: 'Candelabrador', description: '+20% Area of Effect', icon: '🕯️', value: 0.2 },
    'BACKPACK': { key: 'BACKPACK', label: 'Adventurer\'s Bag', description: 'Increases Max Weapons by 1 (Max 1)', icon: '🎒', value: 1 },
    'GAUNTLET': { key: 'GAUNTLET', label: 'Iron Gauntlet', description: '+20% Knockback Force', icon: '🥊', value: 0.2 }
};

export const EVOLUTION_RECIPES: EvolutionRecipe[] = [
    { result: 'MAGIC_ARROW', ingredients: ['AXE', 'DAGGER'] },
    { result: 'FIRE_MORTAR', ingredients: ['FLAMETHROWER', 'FIRE_AURA'] },
    { result: 'JAVELIN', ingredients: ['SPEAR', 'MAGIC_MISSILE'] },
    { result: 'TOXIC_FLASK', ingredients: ['SLIME_BALL', 'ORBITAL'] },
    { result: 'CHAIN_LIGHTNING', ingredients: ['THUNDER', 'SHURIKEN'] },
    { result: 'HOLY_BEAM', ingredients: ['CROSS', 'BIBLE'] },
    { result: 'PLAGUE_SPREADER', ingredients: ['TOXIN_GUN', 'FLAMETHROWER'] },
    { result: 'TESLA_COIL', ingredients: ['KATANA', 'THUNDER'] }
];

// Helper to get hint text
export const getEvolutionHint = (weaponKey: string): string | undefined => {
    const hints: string[] = [];
    EVOLUTION_RECIPES.forEach(recipe => {
        if (recipe.ingredients.includes(weaponKey)) {
            const partner = recipe.ingredients.find(i => i !== weaponKey);
            const resultName = WEAPONS_DATA[recipe.result]?.label || recipe.result;
            const partnerName = WEAPONS_DATA[partner!]?.label || partner;
            hints.push(`Combines with ${partnerName} -> ${resultName}`);
        }
    });
    return hints.length > 0 ? hints.join('\n') : undefined;
};
