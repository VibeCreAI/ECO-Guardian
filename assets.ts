const assetRoot = `${import.meta.env.BASE_URL}assets`;

const assetSlug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const assetPath = (relativePath: string) =>
  `${assetRoot}/${relativePath.replace(/^\/+/, '')}`;

const ENEMY_SPRITE_SHEET_PATHS = {
  BOTTLE_SPRITE: assetPath('images/enemies/stage_1_plastic_woods/water_bottle.png'),
  WRAPPER_MOTH: assetPath('images/enemies/stage_1_plastic_woods/plastic_bag.png'),
  STRAW_CRAWLER: assetPath('images/enemies/stage_1_plastic_woods/plastic_folk.png'),
  SIXPACK_VINE: assetPath('images/enemies/stage_1_plastic_woods/wasted_tire.png'),
  STYROFOAM_TREANT: assetPath('images/enemies/stage_1_plastic_woods/plastic_cup.png'),
  COMPOST_HULK: assetPath('images/enemies/stage_1_plastic_woods/food_wast.png'),
  CIRCUIT_WRAITH: assetPath('images/enemies/stage_2_e_waste_graveyard/circute_wraith.png'),
  WIRE_PHANTOM: assetPath('images/enemies/stage_2_e_waste_graveyard/hard_drive.png'),
  BATTERY_ZOMBIE: assetPath('images/enemies/stage_2_e_waste_graveyard/dead_battery.png'),
  MONITOR_GHOUL: assetPath('images/enemies/stage_2_e_waste_graveyard/wasted_scanner.png'),
  MOTHERBOARD_GOLEM: assetPath('images/enemies/stage_2_e_waste_graveyard/fan_monster.png'),
  PRINTER_REVENANT: assetPath('images/enemies/stage_2_e_waste_graveyard/wasted_printer.png'),
  COOLANT_WISP: assetPath('images/enemies/stage_3_frozen_server_farm/frozen_battery.png'),
  FAN_BLADE_DJINN: assetPath('images/enemies/stage_3_frozen_server_farm/frozen_fan.png'),
  FROZEN_PHONE: assetPath('images/enemies/stage_3_frozen_server_farm/frozen_computer.png'),
  FROST_CABLE: assetPath('images/enemies/stage_3_frozen_server_farm/frozen_laptops.png'),
  SERVER_RACK_YETI: assetPath('images/enemies/stage_3_frozen_server_farm/server_tower.png'),
  CRYO_DUMP_BEAST: assetPath('images/enemies/stage_3_frozen_server_farm/frozen_tower.png'),
  EMBER_BAG: assetPath('images/enemies/stage_4_magma_refinery/fire_cloth.png'),
  ASH_FLIER: assetPath('images/enemies/stage_4_magma_refinery/fire_oil.png'),
  SLAG_DRUM: assetPath('images/enemies/stage_4_magma_refinery/fire_drum.png'),
  SMELT_RAT: assetPath('images/enemies/stage_4_magma_refinery/burnning_coal.png'),
  FURNACE_TITAN: assetPath('images/enemies/stage_4_magma_refinery/fire_machine.png'),
  REFINERY_COLOSSUS: assetPath('images/enemies/stage_4_magma_refinery/burnning_factory.png'),
  GLASS_SCARAB: assetPath('images/enemies/stage_5_silicon_dunes/sand_wind.png'),
  SILICON_WASP: assetPath('images/enemies/stage_5_silicon_dunes/sand_bucket.png'),
  SAND_BATTERY: assetPath('images/enemies/stage_5_silicon_dunes/sand_battery.png'),
  DUST_FILTER: assetPath('images/enemies/stage_5_silicon_dunes/sand_can.png'),
  PYRAMID_JUNK: assetPath('images/enemies/stage_5_silicon_dunes/sand_machine.png'),
  DUNE_COMPACTOR: assetPath('images/enemies/stage_5_silicon_dunes/sand_factory.png'),
  SPORE_AEROSOL: assetPath('images/enemies/stage_6_toxic_swamp/swamp_spray.png'),
  SWAMP_DIAPER: assetPath('images/enemies/stage_6_toxic_swamp/swamp_diper.png'),
  ALGAE_BARREL: assetPath('images/enemies/stage_6_toxic_swamp/swamp_drum1.png'),
  FUNGAL_TIRE: assetPath('images/enemies/stage_6_toxic_swamp/swamp_drum2.png'),
  SLUDGE_TOAD: assetPath('images/enemies/stage_6_toxic_swamp/swamp_jelly.png'),
  BOG_HEAP: assetPath('images/enemies/stage_6_toxic_swamp/swamp_mud.png'),
  NEON_WRAPPER: assetPath('images/enemies/stage_7_cyber_city_ruins/city_smile.png'),
  DRONE_LITTER: assetPath('images/enemies/stage_7_cyber_city_ruins/city_drone.png'),
  VENDING_HUSK: assetPath('images/enemies/stage_7_cyber_city_ruins/city_vending.png'),
  TRAFFIC_CONE_BOT: assetPath('images/enemies/stage_7_cyber_city_ruins/city_corn.png'),
  DUMPSTER_MECH: assetPath('images/enemies/stage_7_cyber_city_ruins/city_bin.png'),
  BILLBOARD_TANK: assetPath('images/enemies/stage_7_cyber_city_ruins/city_monster.png'),
  VOID_PARTICLE: assetPath('images/enemies/stage_8_null_void/void_co2.png'),
  NULL_EMISSION: assetPath('images/enemies/stage_8_null_void/void_tv.png'),
  ENTROPY_CAN: assetPath('images/enemies/stage_8_null_void/void_bottle.png'),
  STATIC_WASTE: assetPath('images/enemies/stage_8_null_void/void_battery.png'),
  ABYSS_LANDFILL: assetPath('images/enemies/stage_8_null_void/void_drum.png'),
  OBLIVION_SLUDGE: assetPath('images/enemies/stage_8_null_void/void_milk.png'),
  CLOUD_BAG: assetPath('images/enemies/stage_9_cloud_data_center/cloud_bags.png'),
  CONTRAIL_SERPENT: assetPath('images/enemies/stage_9_cloud_data_center/cloud_co2.png'),
  SATELLITE_JUNK: assetPath('images/enemies/stage_9_cloud_data_center/cloud_satellite.png'),
  DATA_SMOG: assetPath('images/enemies/stage_9_cloud_data_center/cloud_filter.png'),
  STRATOSPHERE_HEAP: assetPath('images/enemies/stage_9_cloud_data_center/cloud_server.png'),
  OZONE_EATER: assetPath('images/enemies/stage_9_cloud_data_center/cloud_polluted.png'),
  HELLFIRE_WRAPPER: assetPath('images/enemies/stage_10_digital_hell/hell_bag.png'),
  DAMNED_DRONE: assetPath('images/enemies/stage_10_digital_hell/hell_tire.png'),
  INFERNAL_BARREL: assetPath('images/enemies/stage_10_digital_hell/hell_drum.png'),
  BRIMSTONE_PHONE: assetPath('images/enemies/stage_10_digital_hell/hell_monitor.png'),
  WASTE_DEMON: assetPath('images/enemies/stage_10_digital_hell/hell_bin.png'),
  LANDFILL_ARCHFIEND: assetPath('images/enemies/stage_10_digital_hell/hell_waste.png'),
  MISINFORMATION: assetPath('images/enemies/misinformation.png'),
} as const satisfies Record<string, string>;

const PROP_SPRITE_FILE_NAMES = {
  TREE: 'tree.png',
  TREE_STUMP: 'tree_stump.png',
  PLASTIC_BAG_SHRUB: 'plastic_bag_shrub.png',
  BOTTLE_PILE: 'bottle_pile.png',
  STONE: 'stone.png',
  MUSHROOM: 'mushroom.png',
  GRAVE: 'grave.png',
  RUIN: 'ruin.png',
  BATTERY_GRAVE: 'battery_grave.png',
  CABLE_ROOTS: 'cable_roots.png',
  SKULL_STONE: 'skull_stone.png',
  BONE_TRASH_PILE: 'bone_trash_pile.png',
  CRYSTAL: 'crystal.png',
  SNOW_TREE: 'snow_tree.png',
  FROZEN_SERVER: 'frozen_server.png',
  ICE_SHARD: 'ice_shard.png',
  ICE_STONE: 'ice_stone.png',
  FROZEN_CABLE_PILE: 'frozen_cable_pile.png',
  MAGMA_ROCK: 'magma_rock.png',
  LAVA_PILLAR: 'lava_pillar.png',
  OIL_DRUM: 'oil_drum.png',
  EMBER_VENT: 'ember_vent.png',
  SCORCHED_EWASTE_PILE: 'scorched_ewaste_pile.png',
  CACTUS: 'cactus.png',
  PALM: 'palm.png',
  GLASS_DUNE: 'glass_dune.png',
  SILICON_SPIRE: 'silicon_spire.png',
  PYRAMID_STONE: 'pyramid_stone.png',
  SILICON_EWASTE_PILE: 'silicon_ewaste_pile.png',
  SWAMP_TREE: 'swamp_tree.png',
  VINE: 'vine.png',
  TOXIC_MUSHROOM: 'toxic_mushroom.png',
  TOXIC_BARREL: 'toxic_barrel.png',
  SLUDGE_POOL: 'sludge_pool.png',
  BOG_TRASH_PILE: 'bog_trash_pile.png',
  CYBER_SERVER: 'cyber_server.png',
  SERVER: 'server.png',
  NEON_SIGN: 'neon_sign.png',
  CABLE_POST: 'cable_post.png',
  TRASH_CAN: 'trash_can.png',
  BILLBOARD_RUIN: 'billboard_ruin.png',
  VOID_ROCK: 'void_rock.png',
  STAR_PILLAR: 'star_pillar.png',
  NULL_CRYSTAL: 'null_crystal.png',
  STATIC_RIFT: 'static_rift.png',
  CLOUD_PILLAR: 'cloud_pillar.png',
  GOLD_GATE: 'gold_gate.png',
  SKY_SERVER: 'sky_server.png',
  SATELLITE_DISH: 'satellite_dish.png',
  HELL_SPIKE_ROCK: 'hell_spike_rock.png',
  HELL_LAVA_PILLAR: 'hell_lava_pillar.png',
  HELL_MAGMA_ROCK: 'hell_magma_rock.png',
  SPIKE_ROCK: 'spike_rock.png',
  HELL_OBELISK: 'hell_obelisk.png',
  BURNED_SERVER: 'burned_server.png',
} as const satisfies Record<string, string>;

export const ASSET_PATHS = {
  video: {
    finalEnding: assetPath('video/ECO Guardial Ending.mp4'),
  },
  audio: {
    music: {
      menu: assetPath('audio/music/menu.mp3'),
      battle: assetPath('audio/music/battle.mp3'),
      boss: assetPath('audio/music/boss.mp3'),
      stage: (stageNumber: number) => assetPath(`audio/music/stage_${stageNumber}.mp3`),
      endingBackground: assetPath('audio/music/ending_background.mp3'),
    },
    gaia: {
      missionStart: assetPath('audio/gaia/mission_start.mp3'),
      quizCorrect: assetPath('audio/gaia/quiz_correct.mp3'),
      quizWrong: assetPath('audio/gaia/quiz_wrong.mp3'),
      stageIntro: (stageNumber: number) =>
        assetPath(`audio/gaia/stage_${String(stageNumber).padStart(2, '0')}_intro.mp3`),
      bossPrompt: (stageNumber: number) =>
        assetPath(`audio/gaia/stage_${String(stageNumber).padStart(2, '0')}_boss_prompt.mp3`),
      stageSaved: (stageNumber: number) =>
        assetPath(`audio/gaia/stage_${String(stageNumber).padStart(2, '0')}_saved.mp3`),
      finalEnding: assetPath('audio/gaia/final_ending.mp3'),
    },
    quiz: {
      question: (stageSlug: string, questionNumber: number) =>
        assetPath(`audio/quiz/${stageSlug}_q${String(questionNumber).padStart(2, '0')}.mp3`),
      explanation: (stageSlug: string, questionNumber: number) =>
        assetPath(`audio/quiz/${stageSlug}_ex${String(questionNumber).padStart(2, '0')}.mp3`),
    },
    sfx: {
      hitEnemy: assetPath('audio/sfx/hit_enemy.mp3'),
      dieEnemy: assetPath('audio/sfx/die_enemy.mp3'),
      hitPlayer: assetPath('audio/sfx/hit_player.mp3'),
      co2OrbPickup: assetPath('audio/sfx/co2_orb_pickup.mp3'),
      levelUp: assetPath('audio/sfx/level-up.mp3'),
      upgradeSelect: assetPath('audio/sfx/upgrade_select.mp3'),
      chestReward: assetPath('audio/sfx/chest_reward.mp3'),
      bossDefeat: assetPath('audio/sfx/boss_defeat.mp3'),
      dashPlayer: assetPath('audio/sfx/dash_player.mp3'),
      dashEnemy: assetPath('audio/sfx/dash_enemy.mp3'),
      gameOver: assetPath('audio/sfx/game_over.mp3'),
    },
  },
  images: {
    backgrounds: {
      overworldSkyByTheme: (themeName: string) =>
        assetPath(`images/backgrounds/${assetSlug(themeName)}_overworld_sky.png`),
    },
    bosses: {
      byStage: (stageNumber: number) => assetPath(`images/bosses/boss_${stageNumber}.png`),
    },
    player: {
      idle: assetPath('images/player/idle.png'),
      walkSouth: assetPath('images/player/walk-south.png'),
      walkNorth: assetPath('images/player/walk-north2.png'),
      walkEast: assetPath('images/player/walk-east.png'),
      walkWest: assetPath('images/player/walk-west.png'),
    },
    enemies: {
      byType: (enemyType: string) => ENEMY_SPRITE_SHEET_PATHS[enemyType as keyof typeof ENEMY_SPRITE_SHEET_PATHS],
    },
    props: {
      byType: (propType: string) => assetPath(`images/props/${PROP_SPRITE_FILE_NAMES[propType as keyof typeof PROP_SPRITE_FILE_NAMES] ?? `${propType.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}.png`}`),
    },
    ground: {
      byTheme: (themeName: string, _mode = 'OVERWORLD') =>
        assetPath(`images/ground/${assetSlug(themeName)}_overworld.png`),
      byThemeVariant: (themeName: string, _mode = 'OVERWORLD', variantIndex = 0) =>
        assetPath(`images/ground/${assetSlug(themeName)}_overworld${variantIndex > 0 ? `_v${variantIndex + 1}` : ''}.png`),
    },
    quiz: {
      explanation: (stageSlug: string, questionNumber: number) =>
        assetPath(`images/ui/quiz/${stageSlug}_ex${String(questionNumber).padStart(2, '0')}.png`),
    },
    reward: {
      recycleBin: assetPath('images/ui/recycle_reward_bin.png'),
    },
    start: {
      background: assetPath('images/start/background.png'),
      favicon: assetPath('images/start/favicon.png'),
      ogImage: assetPath('images/start/og_image.png'),
      title: assetPath('images/start/title2.png'),
    },
  },
} as const;

export const STARTUP_PRELOAD_ASSETS = [
  ASSET_PATHS.images.start.background,
  ASSET_PATHS.images.start.title,
  ASSET_PATHS.images.player.idle,
  ASSET_PATHS.images.player.walkSouth,
  ASSET_PATHS.images.player.walkNorth,
  ASSET_PATHS.images.player.walkEast,
  ASSET_PATHS.images.player.walkWest,
  ASSET_PATHS.images.reward.recycleBin,
  ...Object.values(ENEMY_SPRITE_SHEET_PATHS),
  ASSET_PATHS.audio.music.menu,
  ASSET_PATHS.audio.music.battle,
] as const;

export const getEnemySpriteSheetPath = (enemyType: string) =>
  ENEMY_SPRITE_SHEET_PATHS[enemyType as keyof typeof ENEMY_SPRITE_SHEET_PATHS];

export const getPropSpritePath = (propType: string) =>
  ASSET_PATHS.images.props.byType(propType);

export const getGroundTilePath = (themeName: string, mode: string) =>
  ASSET_PATHS.images.ground.byTheme(themeName, mode);

export const getGroundTileVariantPath = (themeName: string, mode: string, variantIndex: number) =>
  ASSET_PATHS.images.ground.byThemeVariant(themeName, mode, variantIndex);

export const getOverworldSkyBackgroundPath = (themeName: string) =>
  ASSET_PATHS.images.backgrounds.overworldSkyByTheme(themeName);

// Bumping these versions invalidates browser-cached art when the source files change.
export const GROUND_TILE_ASSET_VERSION = 'stage-ground-1024-v13';
export const PROP_SPRITE_ASSET_VERSION = 'stage-props-512-v1';
export const REWARD_SPRITE_ASSET_VERSION = 'reward-bin-v1';
export const GROUND_TILE_VARIANT_COUNT = 4;

export const versionedAssetUrl = (url: string, version: string) =>
  `${url}${url.includes('?') ? '&' : '?'}v=${version}`;

export const getVersionedGroundTileUrls = (themeName: string, mode: string = 'OVERWORLD') =>
  Array.from({ length: GROUND_TILE_VARIANT_COUNT }, (_, index) =>
    versionedAssetUrl(
      index === 0 ? getGroundTilePath(themeName, mode) : getGroundTileVariantPath(themeName, mode, index),
      GROUND_TILE_ASSET_VERSION,
    ),
  );

export const getVersionedPropSpriteUrl = (propType: string) =>
  versionedAssetUrl(getPropSpritePath(propType), PROP_SPRITE_ASSET_VERSION);

// Mirror of the Scene's THEME_PROP_POOLS, kept here so the stage preloader
// can warm browser + texture caches before the scene mounts.
export const STAGE_PROP_POOL_BY_THEME: Record<string, readonly string[]> = {
  FOREST: ['TREE', 'TREE_STUMP', 'PLASTIC_BAG_SHRUB', 'BOTTLE_PILE', 'MUSHROOM', 'STONE'],
  SKULL: ['GRAVE', 'RUIN', 'BATTERY_GRAVE', 'CABLE_ROOTS', 'SKULL_STONE', 'BONE_TRASH_PILE'],
  ICE: ['SNOW_TREE', 'CRYSTAL', 'FROZEN_SERVER', 'ICE_SHARD', 'ICE_STONE', 'FROZEN_CABLE_PILE'],
  VOLCANO: ['MAGMA_ROCK', 'LAVA_PILLAR', 'OIL_DRUM', 'EMBER_VENT', 'SPIKE_ROCK', 'SCORCHED_EWASTE_PILE'],
  PYRAMID: ['CACTUS', 'PALM', 'GLASS_DUNE', 'SILICON_SPIRE', 'PYRAMID_STONE', 'SILICON_EWASTE_PILE'],
  MUSHROOM: ['SWAMP_TREE', 'VINE', 'TOXIC_MUSHROOM', 'TOXIC_BARREL', 'SLUDGE_POOL', 'BOG_TRASH_PILE'],
  CYBER: ['CYBER_SERVER', 'NEON_SIGN', 'CABLE_POST', 'TRASH_CAN', 'BILLBOARD_RUIN'],
  VOID: ['VOID_ROCK', 'STAR_PILLAR', 'NULL_CRYSTAL', 'STATIC_RIFT'],
  SKY: ['CLOUD_PILLAR', 'GOLD_GATE', 'SKY_SERVER', 'SATELLITE_DISH', 'SERVER'],
  HELL: ['HELL_SPIKE_ROCK', 'HELL_LAVA_PILLAR', 'HELL_OBELISK', 'BURNED_SERVER', 'HELL_MAGMA_ROCK'],
};

export const getStageDefaultTheme = (stage: number): string => {
  const cycle = ((Math.max(1, stage) - 1) % 10) + 1;
  switch (cycle) {
    case 2: return 'SKULL';
    case 3: return 'ICE';
    case 4: return 'VOLCANO';
    case 5: return 'PYRAMID';
    case 6: return 'MUSHROOM';
    case 7: return 'CYBER';
    case 8: return 'VOID';
    case 9: return 'SKY';
    case 10: return 'HELL';
    default: return 'FOREST';
  }
};

// Synchronous "is this image already loaded?" cache, shared across PixelGround
// and SpriteBillboard. Populated by preloadStageAssets and by component-level
// loaders so consumers can skip the procedural fallback when art is ready.
const preloadedImageCache = new Map<string, HTMLImageElement>();
const inFlightImageLoads = new Map<string, Promise<HTMLImageElement | null>>();
const clampStageMusicNumber = (stageNumber: number) =>
  Math.min(10, Math.max(1, Math.floor(stageNumber)));

export const peekPreloadedImage = (url: string): HTMLImageElement | null =>
  preloadedImageCache.get(url) ?? null;

export const ensureImageLoaded = (url: string): Promise<HTMLImageElement | null> => {
  const cached = preloadedImageCache.get(url);
  if (cached) return Promise.resolve(cached);

  const inFlight = inFlightImageLoads.get(url);
  if (inFlight) return inFlight;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      preloadedImageCache.set(url, image);
      resolve(image);
    };
    image.onerror = () => resolve(null);
    image.src = url;
    if (image.complete && image.naturalWidth > 0) {
      preloadedImageCache.set(url, image);
      resolve(image);
    }
  }).then((image) => {
    inFlightImageLoads.delete(url);
    return image;
  });

  inFlightImageLoads.set(url, promise);
  return promise;
};

export const preloadStageAssets = async (
  themeName: string,
  stageNumber: number,
  quizExplanationImageSrc?: string,
  onProgress?: (loaded: number, total: number, assetUrl: string) => void
): Promise<void> => {
  const groundUrls = getVersionedGroundTileUrls(themeName, 'OVERWORLD');
  const propTypes = STAGE_PROP_POOL_BY_THEME[themeName] ?? [];
  const propUrls = propTypes.map(getVersionedPropSpriteUrl);
  const imageUrls = [
    getOverworldSkyBackgroundPath(themeName),
    ...groundUrls,
    ...propUrls,
    ...(quizExplanationImageSrc ? [quizExplanationImageSrc] : []),
  ];
  const audioUrls = [
    ASSET_PATHS.audio.music.stage(clampStageMusicNumber(stageNumber)),
  ];
  const queue = [...imageUrls, ...audioUrls];
  const total = queue.length;
  let loaded = 0;

  onProgress?.(loaded, total, '');

  await Promise.all(
    queue.map(async (assetUrl) => {
      try {
        if (isAudioAsset(assetUrl)) {
          await preloadAudioAsset(assetUrl);
        } else {
          await ensureImageLoaded(assetUrl);
        }
      } finally {
        loaded += 1;
        onProgress?.(loaded, total, assetUrl);
      }
    })
  );
};

const isAudioAsset = (assetUrl: string) => /\.(mp3|ogg|wav)$/i.test(assetUrl);

const preloadImageAsset = (assetUrl: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();

    const finish = () => {
      image.onload = null;
      image.onerror = null;
      resolve();
    };

    image.onload = finish;
    image.onerror = finish;
    image.decoding = 'async';
    image.src = assetUrl;

    if (image.complete) {
      finish();
    }
  });

const preloadAudioAsset = (assetUrl: string) =>
  new Promise<void>((resolve) => {
    const audio = new Audio();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      audio.removeEventListener('canplaythrough', finish);
      audio.removeEventListener('loadeddata', finish);
      audio.removeEventListener('error', finish);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, 4000);

    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', finish);
    audio.addEventListener('loadeddata', finish);
    audio.addEventListener('error', finish);
    audio.src = assetUrl;
    audio.load();
  });

export const preloadStartupAssets = async (
  onProgress?: (loaded: number, total: number, assetUrl: string) => void
) => {
  const queue = [...new Set(STARTUP_PRELOAD_ASSETS)];
  const total = queue.length;
  let loaded = 0;

  onProgress?.(loaded, total, '');

  await Promise.all(
    queue.map(async (assetUrl) => {
      try {
        if (isAudioAsset(assetUrl)) {
          await preloadAudioAsset(assetUrl);
        } else {
          await preloadImageAsset(assetUrl);
        }
      } finally {
        loaded += 1;
        onProgress?.(loaded, total, assetUrl);
      }
    })
  );
};
