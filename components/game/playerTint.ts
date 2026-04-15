import * as THREE from 'three';
import { ASSET_PATHS } from '../../assets';
import { PLAYER_SLOT_FILTERS, type SlotIndex } from '../../multiplayer/config';

export type PlayerFrameKey = 'idle' | 'walkSouth' | 'walkNorth' | 'walkEast' | 'walkWest';

const FRAME_PATHS: Record<PlayerFrameKey, string> = {
  idle: ASSET_PATHS.images.player.idle,
  walkSouth: ASSET_PATHS.images.player.walkSouth,
  walkNorth: ASSET_PATHS.images.player.walkNorth,
  walkEast: ASSET_PATHS.images.player.walkEast,
  walkWest: ASSET_PATHS.images.player.walkWest,
};

const configureTexture = (tex: THREE.Texture): void => {
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.25, 0.25);
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });

const tintImageToTexture = (img: HTMLImageElement, filter: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    configureTexture(fallback);
    return fallback;
  }
  if (filter) {
    ctx.filter = filter;
  }
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';
  const tex = new THREE.CanvasTexture(canvas);
  configureTexture(tex);
  return tex;
};

type SlotTextureMap = Record<PlayerFrameKey, THREE.Texture>;

const cache: Partial<Record<SlotIndex, SlotTextureMap>> = {};
const inFlight: Partial<Record<SlotIndex, Promise<SlotTextureMap>>> = {};

export const getPlayerSlotTextures = async (slot: SlotIndex): Promise<SlotTextureMap> => {
  if (cache[slot]) return cache[slot]!;
  if (inFlight[slot]) return inFlight[slot]!;
  const filter = PLAYER_SLOT_FILTERS[slot] ?? '';

  const promise = (async () => {
    const keys: PlayerFrameKey[] = ['idle', 'walkSouth', 'walkNorth', 'walkEast', 'walkWest'];
    const entries = await Promise.all(
      keys.map(async (key) => {
        const img = await loadImage(FRAME_PATHS[key]);
        const tex = tintImageToTexture(img, filter);
        return [key, tex] as const;
      })
    );
    const map = Object.fromEntries(entries) as unknown as SlotTextureMap;
    cache[slot] = map;
    return map;
  })();

  inFlight[slot] = promise;
  try {
    return await promise;
  } finally {
    delete inFlight[slot];
  }
};

export const getCachedPlayerSlotTextures = (slot: SlotIndex): SlotTextureMap | null =>
  cache[slot] ?? null;

export const preloadPlayerSlotTextures = async (slots: SlotIndex[] = [0, 1, 2, 3]): Promise<void> => {
  await Promise.all(slots.map((s) => getPlayerSlotTextures(s)));
};
