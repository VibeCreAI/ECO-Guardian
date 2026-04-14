const assetRoot = `${import.meta.env.BASE_URL}assets`;

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
  MISINFORMATION: assetPath('images/enemies/misinformation.png'),
} as const satisfies Record<string, string>;

export const ASSET_PATHS = {
  audio: {
    music: {
      menu: assetPath('audio/music/menu.mp3'),
      battle: assetPath('audio/music/battle.mp3'),
      boss: assetPath('audio/music/boss.mp3'),
      stage: (stageNumber: number) => assetPath(`audio/music/stage_${stageNumber}.mp3`),
    },
  },
  images: {
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
  ...Object.values(ENEMY_SPRITE_SHEET_PATHS),
  ASSET_PATHS.audio.music.menu,
  ASSET_PATHS.audio.music.stage(1),
  ASSET_PATHS.audio.music.battle,
] as const;

export const getEnemySpriteSheetPath = (enemyType: string) =>
  ENEMY_SPRITE_SHEET_PATHS[enemyType as keyof typeof ENEMY_SPRITE_SHEET_PATHS];

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
