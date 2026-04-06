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
