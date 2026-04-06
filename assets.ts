const assetRoot = `${import.meta.env.BASE_URL}assets`;

const assetPath = (relativePath: string) =>
  `${assetRoot}/${relativePath.replace(/^\/+/, '')}`;

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
  ASSET_PATHS.audio.music.menu,
  ASSET_PATHS.audio.music.stage(1),
  ASSET_PATHS.audio.music.battle,
] as const;

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
