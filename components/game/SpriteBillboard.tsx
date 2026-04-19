
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { ASSET_PATHS, getEnemySpriteSheetPath, getPropSpritePath } from '../../assets';
import { drawEnemySheet, ENEMY_RENDER_TYPES, ENEMY_SHEET_HEIGHT, ENEMY_SHEET_WIDTH, isEnemyRenderType, isGhostEnemyType, usesPixelEnemyStyle } from './enemyDrawing';
import { getCachedPlayerSlotTextures, getPlayerSlotTextures } from './playerTint';

interface SpriteBillboardProps {
  position?: [number, number, number];
  color: string;
  scale?: number;
  facing?: number; 
  renderOrder?: number;
  isHit?: boolean;
  type?: string; 
  action?: 'IDLE' | 'RUN';
  viewDirection?: 'DOWN' | 'UP' | 'SIDE';
  entity?: { x: number; z: number; facing?: number; lastHit?: number; type?: string; dashTime?: number; hp?: number; maxHp?: number; name?: string; taunt?: string; visualVariant?: string; opacity?: number };
  variant?: string;
  pixelArt?: boolean;
}

interface PropSpriteProps {
    position: [number, number, number];
    type: string;
    scale?: number;
}

interface PropSpriteBatchItem {
    id: string | number;
    type: string;
    x: number;
    z: number;
    scale: number;
}

interface PropSpriteBatchProps {
    items: PropSpriteBatchItem[];
}

interface PlayerSpriteProps {
    position: [number, number, number];
    scale?: number;
    facing: number;
    action: 'IDLE' | 'RUN';
    viewDirection: 'DOWN' | 'UP' | 'SIDE';
    isHit: boolean;
    slotIndex?: 0 | 1 | 2 | 3;
}

interface ExternalBossSpriteProps {
    position: [number, number, number];
    scale?: number;
    entity: any;
    opacity?: number;
    textureUrl: string;
}

const textureCache: Record<string, THREE.Texture> = {};
const propSpriteAvailabilityCache: Record<string, Promise<boolean>> = {};
const MOBS: readonly string[] = ENEMY_RENDER_TYPES;
const textureLoader = new THREE.TextureLoader();
const OUTLINE_HEX = '#f8fafc';
const propPlaneGeometry = new THREE.PlaneGeometry(1, 1);
const propGroundDiscGeometry = new THREE.CircleGeometry(1, 16);

const bakeAlphaOutline = (ctx: CanvasRenderingContext2D, width: number, height: number, colorHex: string, radius = 2) => {
    const sourceImage = ctx.getImageData(0, 0, width, height);
    const source = sourceImage.data;
    const outlined = new Uint8ClampedArray(source);
    const outlineColor = new THREE.Color(colorHex);
    const r = Math.round(outlineColor.r * 255);
    const g = Math.round(outlineColor.g * 255);
    const b = Math.round(outlineColor.b * 255);
    const alphaThreshold = 16;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const idx = (y * width + x) * 4;
            if (source[idx + 3] > alphaThreshold) continue;

            let adjacentOpaque = false;
            for (let oy = -radius; oy <= radius && !adjacentOpaque; oy += 1) {
                const ny = y + oy;
                if (ny < 0 || ny >= height) continue;
                for (let ox = -radius; ox <= radius; ox += 1) {
                    if (ox === 0 && oy === 0) continue;
                    const nx = x + ox;
                    if (nx < 0 || nx >= width) continue;
                    const nIdx = (ny * width + nx) * 4;
                    if (source[nIdx + 3] > alphaThreshold) {
                        adjacentOpaque = true;
                        break;
                    }
                }
            }

            if (adjacentOpaque) {
                outlined[idx] = r;
                outlined[idx + 1] = g;
                outlined[idx + 2] = b;
                outlined[idx + 3] = 255;
            }
        }
    }

    ctx.putImageData(new ImageData(outlined, width, height), 0, 0);
};

const createPixelDrawer = (ctx: CanvasRenderingContext2D, size: number, gridSize: number) => {
    const s = Math.floor(size / gridSize); 
    const p = (x: number, y: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.floor(x) * s, Math.floor(y) * s, s, s); };
    const r = (x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.floor(x) * s, Math.floor(y) * s, Math.ceil(w) * s, Math.ceil(h) * s); };
    return { p, r };
};

const maybeApplyExternalPropSprite = (texture: THREE.Texture, type: string) => {
    const spriteUrl = getPropSpritePath(type);
    if (!spriteUrl || typeof window === 'undefined' || typeof fetch !== 'function' || typeof Image === 'undefined') return;

    if (!propSpriteAvailabilityCache[spriteUrl]) {
        propSpriteAvailabilityCache[spriteUrl] = fetch(spriteUrl, { method: 'HEAD', cache: 'force-cache' })
            .then((response) => {
                const contentType = response.headers.get('content-type') ?? '';
                return response.ok && contentType.toLowerCase().startsWith('image/');
            })
            .catch(() => false);
    }

    propSpriteAvailabilityCache[spriteUrl].then((available) => {
        if (!available) return;
        const image = new Image();
        image.onload = () => {
            texture.image = image;
            texture.needsUpdate = true;
        };
        image.src = spriteUrl;
    });
};

const drawPixelDiamond = (
    r: (x: number, y: number, w: number, h: number, color: string) => void,
    cx: number,
    cy: number,
    halfWidth: number,
    halfHeight: number,
    color: string,
) => {
    for (let y = -halfHeight; y <= halfHeight; y += 1) {
        const rowWidth = Math.max(1, Math.round(halfWidth * (1 - Math.abs(y) / (halfHeight + 1))));
        r(cx - rowWidth, cy + y, rowWidth * 2, 1, color);
    }
};

const drawPixelTriangle = (
    r: (x: number, y: number, w: number, h: number, color: string) => void,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
) => {
    for (let row = 0; row < height; row += 1) {
        const rowWidth = Math.max(1, Math.round(width * (1 - row / height)));
        r(x + Math.floor((width - rowWidth) / 2), y + row, rowWidth, 1, color);
    }
};

const drawProceduralProp = (ctx: CanvasRenderingContext2D, type: string) => {
    const { p, r } = createPixelDrawer(ctx, 64, 64);
    const t = type.toUpperCase();
    const shadow = (x = 14, w = 36, alpha = 0.24) => r(x, 56, w, 4, `rgba(0,0,0,${alpha})`);
    const rim = '#0f172a';

    if (t === 'TREE') {
        shadow(13, 38);
        r(26, 34, 13, 24, '#3b2416'); r(29, 35, 7, 23, '#7c4a22'); r(34, 36, 3, 18, '#a16207');
        r(11, 18, 38, 22, rim); r(17, 10, 30, 20, rim); r(24, 4, 20, 14, rim);
        r(13, 19, 34, 20, '#166534'); r(19, 11, 26, 18, '#15803d'); r(25, 5, 18, 12, '#22c55e');
        r(18, 23, 9, 5, '#4ade80'); r(35, 15, 7, 5, '#86efac'); r(39, 30, 6, 5, '#14532d');
        p(22, 35, '#fbbf24'); p(41, 23, '#f9a8d4');
    } else if (t === 'TREE_STUMP') {
        shadow(19, 28);
        r(20, 36, 26, 22, rim); r(23, 34, 20, 24, '#6b3f1d'); r(25, 36, 16, 5, '#a16207');
        r(26, 42, 12, 2, '#3b2416'); r(29, 47, 8, 2, '#3b2416'); r(19, 51, 5, 4, '#166534'); r(43, 50, 4, 5, '#22c55e');
    } else if (t === 'PLASTIC_BAG_SHRUB') {
        shadow(14, 36);
        r(17, 36, 30, 18, '#14532d'); r(14, 41, 36, 10, '#166534'); r(22, 31, 20, 13, '#22c55e');
        r(25, 25, 16, 23, '#f8fafc'); r(28, 28, 10, 16, '#e2e8f0'); r(30, 25, 3, 5, '#cbd5e1'); r(35, 26, 3, 4, '#cbd5e1');
        r(27, 35, 10, 2, '#94a3b8'); p(22, 45, '#f472b6'); p(42, 42, '#38bdf8');
    } else if (t === 'BOTTLE_PILE') {
        shadow(15, 36);
        r(18, 45, 13, 7, rim); r(20, 39, 8, 14, '#38bdf8'); r(22, 35, 4, 4, '#e0f2fe');
        r(31, 43, 16, 7, rim); r(34, 37, 9, 15, '#86efac'); r(36, 33, 4, 5, '#dcfce7');
        r(25, 48, 18, 5, '#facc15'); r(27, 46, 13, 3, '#fde68a'); r(17, 52, 30, 3, '#475569');
    } else if (t === 'MUSHROOM') {
        shadow(18, 30);
        r(27, 37, 10, 20, rim); r(29, 38, 7, 18, '#fef3c7'); r(31, 43, 4, 8, '#fde68a');
        r(16, 25, 34, 17, rim); r(19, 22, 28, 16, '#dc2626'); r(23, 20, 18, 8, '#ef4444');
        r(23, 28, 5, 5, '#f8fafc'); r(35, 31, 6, 5, '#f8fafc'); r(31, 24, 4, 4, '#fee2e2');
    } else if (t === 'GRAVE') {
        shadow(17, 32);
        r(18, 30, 28, 28, rim); r(21, 24, 22, 34, '#64748b'); r(23, 26, 18, 5, '#94a3b8');
        r(30, 33, 4, 18, '#cbd5e1'); r(24, 39, 16, 4, '#cbd5e1'); r(20, 54, 28, 5, '#475569');
        r(23, 48, 3, 3, '#334155'); r(39, 47, 2, 4, '#334155');
    } else if (t === 'BATTERY_GRAVE') {
        shadow(17, 32);
        r(20, 28, 24, 30, rim); r(22, 27, 20, 31, '#475569'); r(27, 23, 10, 5, '#94a3b8');
        r(25, 33, 14, 6, '#a3e635'); r(28, 35, 8, 2, '#1a2e05'); r(25, 45, 14, 3, '#ef4444'); r(20, 54, 24, 5, '#334155');
    } else if (t === 'RUIN') {
        shadow(12, 40);
        r(14, 24, 12, 34, rim); r(16, 21, 8, 37, '#64748b'); r(17, 25, 6, 4, '#94a3b8');
        r(38, 32, 10, 26, rim); r(40, 29, 7, 29, '#64748b'); r(41, 34, 5, 3, '#94a3b8');
        r(22, 50, 20, 7, '#475569'); r(28, 45, 11, 5, '#334155'); p(19, 39, '#cbd5e1'); p(43, 44, '#cbd5e1');
    } else if (t === 'CABLE_ROOTS' || t === 'VINE') {
        shadow(12, 40);
        r(15, 49, 30, 4, '#14532d'); r(19, 45, 4, 8, '#166534'); r(35, 43, 4, 10, '#166534');
        r(25, 47, 4, 6, '#65a30d'); r(13, 53, 10, 3, '#84cc16'); r(40, 52, 10, 3, '#84cc16');
        p(21, 44, '#a3e635'); p(38, 42, '#a3e635');
    } else if (t === 'CRYSTAL' || t === 'ICE_SHARD' || t === 'NULL_CRYSTAL') {
        shadow(16, 34);
        const main = t === 'NULL_CRYSTAL' ? '#7c3aed' : '#06b6d4';
        const light = t === 'NULL_CRYSTAL' ? '#ddd6fe' : '#cffafe';
        drawPixelDiamond(r, 31, 31, 9, 24, rim); drawPixelDiamond(r, 31, 29, 7, 21, main);
        drawPixelDiamond(r, 20, 42, 5, 13, rim); drawPixelDiamond(r, 20, 41, 4, 11, '#67e8f9');
        drawPixelDiamond(r, 43, 45, 5, 11, rim); drawPixelDiamond(r, 43, 44, 4, 9, main);
        r(31, 11, 3, 20, light); p(27, 24, light); p(39, 39, light);
    } else if (t === 'SNOW_TREE') {
        shadow(16, 32);
        r(28, 37, 8, 21, '#334155'); r(30, 38, 5, 20, '#7c4a22');
        drawPixelTriangle(r, 15, 34, 34, 17, rim); drawPixelTriangle(r, 17, 35, 30, 14, '#e0f2fe');
        drawPixelTriangle(r, 18, 23, 28, 18, rim); drawPixelTriangle(r, 20, 24, 24, 15, '#bae6fd');
        drawPixelTriangle(r, 22, 13, 20, 15, rim); drawPixelTriangle(r, 24, 14, 16, 12, '#f8fafc');
    } else if (t === 'MAGMA_ROCK' || t === 'SPIKE_ROCK' || t === 'VOID_ROCK' || t === 'STONE') {
        shadow(13, 38);
        const hot = t === 'MAGMA_ROCK' || t === 'SPIKE_ROCK';
        const voided = t === 'VOID_ROCK';
        const base = hot ? '#3f1d1d' : voided ? '#1e1b4b' : '#57534e';
        const hi = hot ? '#ef4444' : voided ? '#7c3aed' : '#78716c';
        r(11, 43, 42, 13, rim); r(15, 38, 34, 18, base); r(20, 34, 21, 9, base);
        r(18, 40, 14, 4, hi); r(35, 45, 9, 3, hi); r(24, 51, 17, 3, '#292524');
        if (hot) { r(25, 43, 4, 10, '#facc15'); r(39, 39, 3, 6, '#fb923c'); }
        if (voided) { p(27, 40, '#e9d5ff'); p(44, 47, '#a78bfa'); }
    } else if (t === 'LAVA_PILLAR' || t === 'EMBER_VENT') {
        shadow(18, 30);
        r(22, 22, 20, 36, rim); r(24, 20, 16, 38, '#3f1d1d'); r(26, 24, 12, 31, '#7f1d1d');
        r(28, 16, 8, 42, '#ef4444'); r(30, 19, 4, 36, '#facc15'); r(25, 34, 4, 5, '#292524'); r(36, 28, 4, 6, '#292524');
        p(23, 18, '#fb923c'); p(41, 23, '#f97316');
    } else if (t === 'OIL_DRUM' || t === 'TOXIC_BARREL') {
        shadow(19, 27);
        const body = t === 'OIL_DRUM' ? '#1f2937' : '#365314';
        const glow = t === 'OIL_DRUM' ? '#a3e635' : '#bef264';
        r(20, 27, 24, 31, rim); r(22, 26, 20, 32, body); r(21, 28, 22, 4, '#64748b'); r(21, 50, 22, 4, '#64748b');
        r(25, 36, 14, 9, glow); r(29, 38, 3, 5, rim); r(34, 38, 3, 5, rim); p(39, 32, '#86efac');
    } else if (t === 'CACTUS') {
        shadow(18, 30);
        r(27, 18, 12, 40, rim); r(29, 17, 8, 41, '#15803d'); r(31, 20, 3, 36, '#22c55e');
        r(17, 31, 12, 10, rim); r(19, 32, 10, 7, '#15803d'); r(20, 24, 6, 12, rim); r(21, 25, 4, 11, '#22c55e');
        r(37, 28, 12, 10, rim); r(37, 29, 9, 7, '#15803d'); r(42, 20, 6, 13, rim); r(43, 21, 4, 12, '#22c55e');
        p(30, 25, '#f8fafc'); p(35, 39, '#f8fafc'); p(22, 29, '#f8fafc');
    } else if (t === 'PALM') {
        shadow(16, 34);
        r(28, 28, 9, 30, rim); r(30, 29, 6, 29, '#92400e'); r(30, 37, 6, 3, '#78350f'); r(29, 47, 6, 3, '#78350f');
        r(14, 19, 22, 8, '#166534'); r(28, 12, 8, 25, '#22c55e'); r(34, 17, 18, 8, '#15803d'); r(20, 28, 30, 7, '#65a30d');
        p(33, 20, '#facc15');
    } else if (t === 'GLASS_DUNE' || t === 'SILICON_SPIRE') {
        shadow(15, 36);
        const glass = t === 'GLASS_DUNE';
        r(13, 49, 39, 8, rim); r(16, 46, 33, 10, glass ? '#fcd34d' : '#d97706'); r(21, 42, 22, 6, '#fbbf24');
        drawPixelDiamond(r, 33, 33, glass ? 5 : 7, glass ? 12 : 20, rim);
        drawPixelDiamond(r, 33, 32, glass ? 4 : 5, glass ? 10 : 17, glass ? '#cffafe' : '#f59e0b');
        p(31, 26, '#ffffff'); p(37, 40, '#fde68a');
    } else if (t === 'SWAMP_TREE') {
        shadow(13, 38);
        r(25, 26, 15, 32, rim); r(28, 26, 9, 32, '#3f2c1c'); r(31, 27, 4, 28, '#854d0e');
        r(15, 18, 34, 22, '#365314'); r(20, 12, 25, 18, '#4d7c0f'); r(12, 34, 39, 8, '#1a2e05');
        r(21, 41, 4, 12, '#65a30d'); r(41, 38, 4, 14, '#65a30d'); p(35, 20, '#bef264');
    } else if (t === 'SLUDGE_POOL') {
        shadow(11, 42, 0.18);
        r(13, 47, 39, 9, '#1a2e05'); r(16, 45, 32, 10, '#365314'); r(20, 47, 24, 5, '#65a30d');
        p(25, 46, '#bef264'); p(37, 49, '#bef264'); r(29, 42, 6, 5, '#84cc16');
    } else if (t === 'SERVER' || t === 'FROZEN_SERVER' || t === 'SKY_SERVER' || t === 'BURNED_SERVER') {
        shadow(18, 30);
        const frozen = t === 'FROZEN_SERVER';
        const sky = t === 'SKY_SERVER';
        const burned = t === 'BURNED_SERVER';
        const body = burned ? '#292524' : sky ? '#e0f2fe' : frozen ? '#94a3b8' : '#1e293b';
        const light = burned ? '#ef4444' : sky ? '#0ea5e9' : frozen ? '#cffafe' : '#4ade80';
        r(19, 16, 26, 42, rim); r(21, 15, 22, 43, body); r(24, 20, 16, 3, light); r(24, 28, 16, 3, light); r(24, 36, 16, 3, light); r(24, 47, 5, 5, '#64748b'); r(35, 47, 5, 5, '#64748b');
        if (frozen) { r(17, 18, 6, 12, '#cffafe'); r(39, 39, 6, 10, '#e0f2fe'); }
        if (burned) { r(25, 24, 5, 3, '#0f172a'); r(35, 34, 5, 3, '#0f172a'); }
    } else if (t === 'NEON_SIGN' || t === 'BILLBOARD_RUIN') {
        shadow(15, 34);
        const ruined = t === 'BILLBOARD_RUIN';
        r(12, 22, 40, 24, rim); r(15, 24, 34, 18, ruined ? '#334155' : '#111827');
        r(18, 28, 12, 4, ruined ? '#64748b' : '#f0abfc'); r(32, 33, 13, 4, ruined ? '#475569' : '#38bdf8');
        r(28, 44, 6, 14, '#475569'); r(26, 57, 10, 2, '#334155');
        if (!ruined) { p(20, 36, '#fef3c7'); p(43, 28, '#fef08a'); }
    } else if (t === 'CABLE_POST') {
        shadow(19, 28);
        r(28, 20, 8, 38, rim); r(30, 21, 4, 37, '#475569'); r(18, 28, 28, 5, '#334155');
        r(16, 31, 5, 8, '#facc15'); r(43, 31, 5, 8, '#38bdf8'); r(23, 42, 18, 3, '#ef4444'); r(20, 45, 6, 3, '#ef4444');
    } else if (t === 'TRASH_CAN') {
        shadow(19, 28);
        r(20, 29, 24, 29, rim); r(22, 28, 20, 30, '#64748b'); r(18, 24, 28, 6, '#94a3b8'); r(26, 20, 12, 4, '#475569');
        r(25, 36, 14, 3, '#475569'); r(25, 44, 14, 3, '#475569'); p(29, 33, '#f87171'); p(35, 33, '#f87171');
    } else if (t === 'SATELLITE_DISH') {
        shadow(16, 34);
        r(29, 36, 6, 22, '#475569'); r(21, 55, 22, 3, '#334155');
        r(18, 19, 28, 22, rim); r(20, 21, 24, 18, '#e5e7eb'); r(25, 26, 14, 8, '#94a3b8'); r(39, 16, 5, 5, '#38bdf8');
    } else if (t === 'STAR_PILLAR' || t === 'STATIC_RIFT') {
        shadow(18, 30, 0.2);
        r(28, 17, 9, 41, rim); r(30, 18, 5, 39, '#312e81'); r(26, 31, 13, 4, '#7c3aed'); r(25, 43, 15, 3, '#a78bfa');
        drawPixelDiamond(r, 32, 18, 4, 6, '#e9d5ff'); p(23, 26, '#ddd6fe'); p(43, 39, '#c4b5fd');
    } else if (t === 'CLOUD_PILLAR') {
        shadow(17, 32, 0.16);
        r(28, 28, 9, 30, '#cbd5e1'); r(30, 27, 5, 31, '#f8fafc');
        r(15, 20, 34, 14, '#f0f9ff'); r(20, 14, 26, 15, '#ffffff'); r(26, 10, 15, 10, '#f8fafc');
        p(37, 18, '#bae6fd'); p(21, 25, '#bae6fd');
    } else if (t === 'GOLD_GATE') {
        shadow(12, 40);
        r(14, 24, 10, 34, rim); r(40, 24, 10, 34, rim); r(16, 22, 6, 36, '#d97706'); r(42, 22, 6, 36, '#d97706');
        r(18, 18, 28, 8, rim); r(20, 19, 24, 5, '#facc15'); r(23, 31, 18, 4, '#fbbf24'); p(32, 21, '#fef3c7');
    } else if (t === 'HELL_OBELISK') {
        shadow(17, 32);
        drawPixelTriangle(r, 21, 13, 22, 14, rim); r(22, 25, 20, 33, rim); drawPixelTriangle(r, 24, 15, 16, 10, '#7f1d1d'); r(24, 25, 16, 33, '#450a0a');
        r(29, 30, 6, 18, '#ef4444'); r(31, 33, 2, 12, '#facc15'); p(26, 49, '#fb923c'); p(38, 22, '#f97316');
    } else {
        shadow(18, 30);
        r(21, 36, 22, 22, rim); r(24, 34, 16, 24, '#6b7280'); r(27, 38, 10, 16, '#9ca3af'); p(30, 42, '#e5e7eb');
    }
};

const generateTexture = (type: string, color: string, variant: string = '') => {
    const externalSpriteUrl = getEnemySpriteSheetPath(type);
    const cacheKey = externalSpriteUrl ? `external_${externalSpriteUrl}` : `${type}_${color}_${variant}`;
    if (textureCache[cacheKey]) return textureCache[cacheKey];

    if (externalSpriteUrl) {
        const tex = textureLoader.load(externalSpriteUrl, (loadedTexture) => {
            if (type === 'BOSS' || isEnemyRenderType(type)) {
                const image = loadedTexture.image as { width?: number; height?: number } | undefined;
                if (image?.width && image?.height) {
                    const outlineCanvas = document.createElement('canvas');
                    outlineCanvas.width = image.width;
                    outlineCanvas.height = image.height;
                    const outlineCtx = outlineCanvas.getContext('2d');
                    if (outlineCtx) {
                        outlineCtx.clearRect(0, 0, outlineCanvas.width, outlineCanvas.height);
                        outlineCtx.drawImage(loadedTexture.image, 0, 0);
                        bakeAlphaOutline(outlineCtx, outlineCanvas.width, outlineCanvas.height, OUTLINE_HEX);
                        loadedTexture.image = outlineCanvas;
                        loadedTexture.needsUpdate = true;
                    }
                }
            }
        });
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        textureCache[cacheKey] = tex;
        return tex;
    }

    const canvas = document.createElement('canvas');
    if (type === 'BOSS') { canvas.width = 128; canvas.height = 64; }
    else if (isEnemyRenderType(type)) { canvas.width = ENEMY_SHEET_WIDTH; canvas.height = ENEMY_SHEET_HEIGHT; }
    else { canvas.width = 64; canvas.height = 64; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let isProceduralProp = false;

    if (isEnemyRenderType(type)) {
        drawEnemySheet(ctx, type);
    }
    else if (type === 'BOSS') {
        const { r } = createPixelDrawer(ctx, 128, 128);
        const drawBoss = (frame: number) => {
            const ox = frame * 64; const bounce = frame === 1 ? 2 : 0; const y = bounce + 8; const cx = ox + 32; const v = variant ? variant.toUpperCase() : '';
            r(cx - 20, 56, 40, 4, 'rgba(0,0,0,0.3)');
            if (v.includes('OIL') || v.includes('SLUDGE') || v.includes('CRYPT')) { r(cx-22, y+10, 44, 40, '#1e293b'); r(cx-22, y+20, 44, 4, '#334155'); r(cx-22, y+40, 44, 4, '#334155'); r(cx-24, y+4, 48, 10, '#a855f7'); r(cx-14, y+26, 10, 10, '#facc15'); r(cx+4, y+26, 10, 10, '#facc15'); r(cx-10, y+42, 20, 6, 'black'); if(frame===1) r(cx+16, y+14, 6, 16, '#a855f7'); } 
            else if (v.includes('MAGMA') || v.includes('SMOG') || v.includes('FIRE')) { r(cx-18, y+20, 36, 32, '#7f1d1d'); r(cx-18, y+30, 36, 2, '#450a0a'); r(cx-24, y-4, 48, 20, '#525252'); r(cx-12, y+8, 8, 6, '#ef4444'); r(cx+4, y+8, 8, 6, '#ef4444'); r(cx-10, y+42, 20, 8, '#000'); r(cx-6, y+44, 12, 4, '#fbbf24'); } 
            else if (v.includes('FOREST') || v.includes('ENT') || v.includes('NATURE')) { r(cx-22, y+24, 44, 32, '#78350f'); const sawY = y - 8; const bladeColor = frame === 0 ? '#cbd5e1' : '#94a3b8'; r(cx-28, sawY, 56, 28, bladeColor); r(cx-30, sawY+12, 4, 4, bladeColor); r(cx+26, sawY+12, 4, 4, bladeColor); r(cx-2, sawY-2, 4, 4, bladeColor); r(cx-2, sawY+26, 4, 4, bladeColor); r(cx-14, y+36, 10, 8, 'black'); r(cx+4, y+36, 10, 8, 'black'); r(cx-10, y+38, 4, 4, 'red'); r(cx+6, y+38, 4, 4, 'red'); }
            else if (v.includes('ICE') || v.includes('FROST') || v.includes('SNOW')) { r(cx-24, y+16, 48, 36, '#e0f2fe'); r(cx-28, y+24, 8, 20, '#64748b'); r(cx+20, y+10, 8, 12, '#64748b'); r(cx-26, y+44, 4, 8, '#334155'); r(cx-12, y+26, 8, 8, '#1e293b'); r(cx+4, y+26, 8, 8, '#1e293b'); r(cx-12, y+28, 2, 2, 'white'); r(cx+4, y+28, 2, 2, 'white'); r(cx-10, y+40, 20, 4, '#1e293b'); }
            else if (v.includes('MECH') || v.includes('CONSTRUCT') || v.includes('DRONE')) { r(cx-24, y+8, 48, 32, '#e5e5e5'); r(cx-20, y+12, 40, 24, '#0f172a'); if (frame === 0) { r(cx-12, y+18, 24, 12, '#22c55e'); r(cx-8, y+22, 4, 4, 'black'); r(cx+4, y+22, 4, 4, 'black'); } else { r(cx-12, y+18, 24, 12, '#ef4444'); r(cx-8, y+20, 4, 8, 'black'); r(cx+4, y+20, 4, 8, 'black'); } r(cx-16, y+40, 32, 16, '#15803d'); r(cx-20, y+44, 4, 12, 'red'); r(cx+16, y+42, 4, 12, 'blue'); }
            else if (v.includes('VOID') || v.includes('WRAITH')) { const shift = frame === 0 ? 0 : 2; r(cx-26+shift, y+12, 52-shift, 40, '#020617'); r(cx-20, y+16, 40, 32, '#1e1b4b'); r(cx-12, y+20, 8, 8, '#facc15'); r(cx-10, y+22, 2, 4, 'black'); r(cx+8, y+28, 6, 6, '#facc15'); r(cx+10, y+30, 2, 2, 'black'); r(cx, y+40, 10, 4, '#facc15'); }
            else { r(cx-22, y+12, 44, 40, '#f8fafc'); r(cx-14, y-2, 28, 14, '#f8fafc'); r(cx-10, y+16, 12, 20, '#38bdf8'); r(cx-8, y+4, 6, 6, 'black'); r(cx+2, y+4, 6, 6, 'black'); r(cx-6, y+42, 12, 4, 'black'); }
        };
        drawBoss(0); drawBoss(1);
    }
    else if (MOBS.includes(type)) {
        const { r } = createPixelDrawer(ctx, 128, 128); 
        const drawMob = (frame: number) => {
            const ox = frame * 64; const bounce = frame === 1 ? 2 : 0; const y = bounce + 16; const cx = ox + 32;
            r(cx-12, 54, 24, 4, 'rgba(0,0,0,0.3)');
            
            if (type === 'RUSTY_AUTOMATON' || type === 'PLASTIC_BOTTLE') { 
                const mainColor = type === 'RUSTY_AUTOMATON' ? '#78350f' : '#38bdf8';
                const subColor = type === 'RUSTY_AUTOMATON' ? '#451a03' : '#e0f2fe';
                r(cx-8, y+4, 16, 30, mainColor); r(cx-6, y+8, 12, 22, subColor); r(cx-5, y-2, 10, 6, '#ef4444'); r(cx-8, y+14, 16, 10, '#ffffff'); r(cx-5, y+16, 4, 6, 'black'); r(cx+1, y+16, 4, 6, 'black'); 
            }
            else if (type === 'MUTATED_RAT') { 
                const c = '#16a34a'; // Green Rat
                r(cx-14, y+12, 28, 20, 'rgba(0,0,0,0)'); r(cx-16, y+16, 10, 10, c); r(cx-14, y+18, 6, 6, '#14532d'); r(cx-4, y+16, 10, 10, c); r(cx-2, y+18, 6, 6, '#14532d'); r(cx+8, y+16, 10, 10, c); r(cx+10, y+18, 6, 6, '#14532d'); r(cx-10, y+24, 10, 10, c); r(cx-8, y+26, 6, 6, '#14532d'); r(cx+2, y+24, 10, 10, c); r(cx+4, y+26, 6, 6, '#14532d'); r(cx-6, y+20, 6, 6, 'pink'); r(cx+0, y+20, 6, 6, 'pink'); r(cx-4, y+22, 2, 2, 'black'); r(cx+2, y+22, 2, 2, 'black'); 
            }
            else if (type === 'LANDFILL_GOLEM' || type === 'MUD_GOLEM' || type === 'OLD_TIRE') { 
                const rubber = type === 'LANDFILL_GOLEM' ? '#475569' : '#1e293b'; 
                const tread = type === 'LANDFILL_GOLEM' ? '#facc15' : '#0f172a'; // Yellow bits for landfill
                r(cx-14, y+24, 28, 12, rubber); r(cx-12, y+26, 24, 8, tread); r(cx-12, y+14, 24, 10, rubber); r(cx-10, y+16, 20, 6, tread); r(cx-10, y+4, 20, 10, rubber); r(cx-8, y+6, 16, 6, tread); r(cx-6, y+8, 4, 4, '#ef4444'); r(cx+2, y+8, 4, 4, '#ef4444'); 
            }
            else if (type === 'MECH' || type === 'DRONE' || type === 'E_WASTE') { 
                const board = '#15803d'; const chip = '#1e293b'; const wire = '#facc15'; r(cx-12, y+12, 24, 20, board); r(cx-8, y+16, 16, 12, chip); if (frame === 0) { r(cx-18, y+24, 6, 2, wire); r(cx+12, y+24, 6, 2, wire); r(cx-18, y+16, 6, 2, wire); r(cx+12, y+16, 6, 2, wire); } else { r(cx-20, y+20, 8, 2, wire); r(cx+12, y+28, 8, 2, wire); r(cx-20, y+12, 8, 2, wire); r(cx+12, y+20, 8, 2, wire); } r(cx-6, y+20, 4, 4, '#ef4444'); r(cx+2, y+20, 4, 4, '#ef4444'); 
            }
            else if (type === 'SMOG_IMP' || type === 'SCRAP_KNIGHT') { 
                const can = type === 'SCRAP_KNIGHT' ? '#94a3b8' : '#334155'; // Grey/Dark
                const silver = '#cbd5e1'; 
                r(cx-8, y+10, 16, 26, can); r(cx-8, y+6, 16, 4, silver); r(cx-4, y+2, 8, 4, 'white'); r(cx-6, y+16, 12, 12, 'white'); r(cx-4, y+18, 4, 4, 'black'); r(cx+2, y+18, 4, 4, 'black'); r(cx-4, y+24, 10, 2, 'black'); if (frame === 1) r(cx-4, y-4, 8, 6, '#86efac'); 
            }
            else if (type === 'TOXIC_SLIME' || type === 'TOXIC_TOAD' || type === 'OIL_BLOB' || type === 'OIL_BARREL') { 
                const colorMain = (type === 'OIL_BLOB' || type === 'OIL_BARREL') ? '#020617' : (type === 'TOXIC_TOAD' ? '#1e1b4b' : '#15803d'); 
                r(cx-14, y+14, 28, 20, colorMain); r(cx-12, y+10, 24, 6, colorMain); r(cx-10, y+24, 4, 10, colorMain); r(cx+6, y+24, 4, 8, colorMain); r(cx+8, y+6, 6, 6, '#a3e635'); r(cx-8, y+18, 6, 8, 'black'); r(cx+2, y+18, 6, 8, 'black'); r(cx-6, y+19, 2, 3, 'white'); r(cx+4, y+19, 2, 3, 'white'); r(cx-2, y+28, 4, 2, 'black'); 
            }
            else if (type === 'MUTATED_BAT' || type === 'GAS_CLOUD' || type === 'PLASTIC_VULTURE' || type === 'RADIOACTIVE_SPIRIT' || type === 'PLASTIC_BAG') { 
                const flyY = y - 8; 
                let bodyColor = '#ffffff';
                if (type === 'GAS_CLOUD') bodyColor = '#86efac'; // Green gas
                if (type === 'RADIOACTIVE_SPIRIT') bodyColor = '#bef264'; // Glow green
                if (type === 'PLASTIC_VULTURE') bodyColor = '#f472b6'; // Pink plastic
                if (type === 'MUTATED_BAT') bodyColor = '#3f6212'; // Dark green bat

                r(cx-10, flyY+10, 20, 22, bodyColor); 
                if (frame === 0) { r(cx-14, flyY+2, 6, 12, bodyColor); r(cx+8, flyY+2, 6, 12, bodyColor); } 
                else { r(cx-16, flyY-2, 6, 12, bodyColor); r(cx+10, flyY-2, 6, 12, bodyColor); } 
                r(cx-6, flyY+16, 5, 5, 'black'); r(cx+1, flyY+16, 5, 5, 'black'); 
                if (type !== 'GAS_CLOUD') r(cx-4, flyY+24, 8, 2, '#ef4444'); 
            }
            else if (type === 'PAPER_WASTE') {
                r(cx-10, y+8, 20, 32, '#f1f5f9');
                r(cx-10, y+16, 20, 2, '#cbd5e1');
                r(cx-10, y+24, 20, 2, '#cbd5e1');
                r(cx-10, y+32, 20, 2, '#cbd5e1');
                r(cx-6, y+12, 4, 4, 'black'); r(cx+2, y+12, 4, 4, 'black');
                if (frame===1) r(cx+10, y+20, 6, 12, '#f1f5f9'); 
            }
            else if (type === 'SLUDGE_HORROR') {
                const c = '#1e1b4b';
                r(cx-12, y+4, 24, 36, c);
                r(cx-16, y+12, 4, 20, c); r(cx+12, y+12, 4, 20, c);
                r(cx-8, y+16, 6, 6, '#fbbf24'); r(cx+2, y+16, 6, 6, '#fbbf24');
                r(cx-6, y+30, 12, 4, 'black');
                if (frame===1) { r(cx-10, y+36, 4, 8, c); r(cx+6, y+36, 4, 8, c); }
            }
            else if (type === 'MISINFORMATION') {
                // Fake news / misinformation enemy - newspaper/scroll themed in red/purple
                const paper = '#fef3c7'; const ink = '#7c2d12';
                r(cx-12, y+6, 24, 32, paper); // Body (newspaper)
                r(cx-12, y+6, 24, 4, ink); // Header bar
                r(cx-10, y+12, 20, 2, '#dc2626'); // Red "FAKE" line
                r(cx-10, y+16, 16, 2, '#a1a1aa'); // Text line
                r(cx-10, y+20, 18, 2, '#a1a1aa'); // Text line
                r(cx-10, y+24, 14, 2, '#a1a1aa'); // Text line
                r(cx-8, y+28, 6, 6, '#dc2626'); // Left angry eye
                r(cx+2, y+28, 6, 6, '#dc2626'); // Right angry eye
                r(cx-6, y+30, 2, 2, 'black'); // Pupil
                r(cx+4, y+30, 2, 2, 'black'); // Pupil
                r(cx-4, y+34, 8, 2, '#7c2d12'); // Angry mouth
                if (frame === 1) { r(cx-16, y+14, 4, 16, paper); r(cx+12, y+10, 4, 16, paper); } // Flapping pages
                r(cx-6, y+8, 12, 2, '#dc2626'); // "FAKE" text
            }
            else {
                if (type === 'TRASH_CAN' || type === 'LANDFILL_GOLEM') {
                    r(cx-12, y+8, 24, 26, '#94a3b8'); r(cx-12, y+14, 24, 2, '#64748b'); 
                    const lidY = y + (frame === 1 ? -4 : 0); r(cx-14, lidY, 28, 6, '#64748b'); r(cx-4, lidY-2, 8, 2, '#475569'); 
                    r(cx-8, y+12, 6, 6, 'black'); r(cx+2, y+12, 6, 6, 'black'); r(cx-6, y+13, 2, 2, 'red'); r(cx+4, y+13, 2, 2, 'red'); 
                } else { 
                    r(cx-14, y+8, 28, 20, '#64748b'); r(cx-18, y+12, 8, 12, '#475569'); r(cx+10, y+6, 10, 10, '#475569'); 
                    r(cx-8, y+14, 6, 6, '#000'); r(cx+2, y+14, 6, 6, '#000'); r(cx-6, y+16, 2, 2, '#facc15'); r(cx+4, y+16, 2, 2, '#facc15'); 
                    if (frame === 1) { r(cx-20, y+20, 4, 4, '#94a3b8'); r(cx+18, y+4, 4, 4, '#94a3b8'); } 
                } 
            }
        };
        drawMob(0); drawMob(1);
    }
    else if (type === 'CHEST') {
        const { r } = createPixelDrawer(ctx, 64, 64);
        r(14, 56, 36, 4, 'rgba(0,0,0,0.28)');
        r(18, 18, 28, 34, '#14532d');
        r(20, 20, 24, 30, '#22c55e');
        r(14, 14, 36, 8, '#166534');
        r(16, 16, 32, 4, '#4ade80');
        r(27, 11, 10, 3, '#3f3f46');
        r(24, 24, 16, 18, '#dcfce7');
        r(24, 43, 16, 3, '#86efac');
        r(16, 24, 3, 18, '#15803d');
        r(45, 24, 3, 18, '#15803d');
        r(21, 50, 6, 4, '#1f2937');
        r(37, 50, 6, 4, '#1f2937');
        r(22, 51, 4, 2, '#94a3b8');
        r(38, 51, 4, 2, '#94a3b8');
        r(29, 33, 6, 6, '#facc15');
        r(30, 34, 4, 4, '#fde68a');
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.moveTo(30, 28);
        ctx.lineTo(34, 28);
        ctx.lineTo(36, 31);
        ctx.lineTo(34, 31);
        ctx.lineTo(35, 34);
        ctx.lineTo(31, 32);
        ctx.lineTo(32, 30);
        ctx.lineTo(29, 30);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(27, 35);
        ctx.lineTo(30, 33);
        ctx.lineTo(31, 35);
        ctx.lineTo(33, 34);
        ctx.lineTo(31, 38);
        ctx.lineTo(27, 38);
        ctx.lineTo(28, 36);
        ctx.lineTo(26, 35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(35, 39);
        ctx.lineTo(33, 36);
        ctx.lineTo(35, 35);
        ctx.lineTo(34, 33);
        ctx.lineTo(38, 34);
        ctx.lineTo(40, 37);
        ctx.lineTo(38, 37);
        ctx.lineTo(39, 39);
        ctx.closePath();
        ctx.fill();
    }
    else if (type === 'XP_ORB' || type === 'CO2_ORB') {
        const { r } = createPixelDrawer(ctx, 64, 64);
        const cx = 32; const cy = 32;
        const c = (color === 'white' || !color) ? '#22c55e' : color;
        
        ctx.globalAlpha = 0.5;
        r(cx-10, cy-16, 20, 32, c);
        r(cx-16, cy-10, 32, 20, c);
        r(cx-12, cy-12, 24, 24, c);

        ctx.globalAlpha = 1.0;
        const rimColor = '#ffffff';
        r(cx-6, cy-10, 12, 2, rimColor);
        r(cx-6, cy+8, 12, 2, rimColor);
        r(cx-10, cy-6, 2, 12, rimColor);
        r(cx+8, cy-6, 2, 12, rimColor);
        r(cx-8, cy-8, 2, 2, rimColor);
        r(cx+6, cy-8, 2, 2, rimColor);
        r(cx-8, cy+6, 2, 2, rimColor);
        r(cx+6, cy+6, 2, 2, rimColor);

        r(cx-6, cy-8, 12, 16, c);
        r(cx-8, cy-6, 16, 12, c);
        r(cx-4, cy-6, 4, 2, 'rgba(255,255,255,0.9)');
        r(cx-6, cy-4, 2, 4, 'rgba(255,255,255,0.9)');
        r(cx-4, cy-4, 2, 2, 'white');
    }
    else {
        isProceduralProp = true;
        drawProceduralProp(ctx, type);
    }
    if (type === 'BOSS' || isEnemyRenderType(type)) {
        bakeAlphaOutline(ctx, canvas.width, canvas.height, OUTLINE_HEX);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const useNearest = usesPixelEnemyStyle(type);
    tex.minFilter = isEnemyRenderType(type) ? (useNearest ? THREE.NearestFilter : THREE.LinearFilter) : THREE.NearestFilter;
    tex.magFilter = isEnemyRenderType(type) ? (useNearest ? THREE.NearestFilter : THREE.LinearFilter) : THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (isProceduralProp) {
        maybeApplyExternalPropSprite(tex, type);
    }
    textureCache[cacheKey] = tex;
    return tex;
};

const BossHealthBar = ({ entity }: { entity: any }) => {
    const groupRef = useRef<THREE.Group>(null);
    const barRef = useRef<THREE.Mesh>(null);
    const width = 1.2;
    const nameTexture = useMemo(() => {
        const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 64; const ctx = canvas.getContext('2d');
        if (ctx) { ctx.font = 'bold 32px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f0abfc'; ctx.fillText(entity.name || "BOSS", 512, 32, 1000); }
        return new THREE.CanvasTexture(canvas);
    }, [entity.name]);
    useFrame(() => {
        if (barRef.current && entity) { const hpPct = Math.max(0, entity.hp / entity.maxHp); barRef.current.scale.x = hpPct; barRef.current.position.x = - (width / 2) + (width * hpPct / 2); }
    });
    return (
        <group ref={groupRef} position={[0, 1.0, 0]}><mesh position={[0, 0.25, 0]}><planeGeometry args={[2.0, 0.25]} /><meshBasicMaterial map={nameTexture} transparent depthTest={false} /></mesh><mesh position={[0, 0, 0]}><planeGeometry args={[width + 0.04, 0.14]} /><meshBasicMaterial color="black" /></mesh><mesh ref={barRef} position={[0, 0, 0.01]}><planeGeometry args={[width, 0.1]} /><meshBasicMaterial color="#d946ef" /></mesh></group>
    );
};

const BossTauntBubble = ({ entity }: { entity: any }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [visible, setVisible] = useState(true);
    useEffect(() => { const timer = setTimeout(() => setVisible(false), 4000); return () => clearTimeout(timer); }, []);
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128; const ctx = canvas.getContext('2d');
        if (ctx) { ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(10, 10, 492, 108, 20); ctx.fill(); ctx.stroke(); ctx.font = 'bold 30px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; const text = entity.taunt || "DIE MORTAL!"; ctx.fillText(text, 256, 64, 480); }
        return new THREE.CanvasTexture(canvas);
    }, [entity.taunt]);
    useFrame(({camera}) => {
        if (!visible && meshRef.current) { meshRef.current.visible = false; return; }
        if (meshRef.current) { meshRef.current.quaternion.copy(camera.quaternion); meshRef.current.scale.set(2.5, 0.625, 1); }
    });
    if (!visible) return null;
    return <group position={[0, 1.6, 0]}><mesh ref={meshRef}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={texture} transparent depthTest={false} /></mesh></group>;
};

export const ExternalBossSprite: React.FC<ExternalBossSpriteProps> = ({ position, scale = 4.5, entity, opacity, textureUrl }) => {
    const texture = useLoader(THREE.TextureLoader, textureUrl);
    const frameCount = 16;
    const shadowRef = useRef<THREE.Mesh>(null);
    const shadowScale = Math.max(1.2, Math.min(2.4, scale * 0.32));

    useMemo(() => {
        if (!texture) return;
        const imageWidth = (texture.image as { width?: number } | undefined)?.width ?? 1024;
        const frameInset = 0.5 / imageWidth;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.set((1 / frameCount) - frameInset * 2, 1);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
    }, [texture]);

    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock, camera }) => {
        if (!meshRef.current || !materialRef.current || !texture) return;
        meshRef.current.quaternion.copy(camera.quaternion);
        
        if (entity) {
            const yPos = 2.25; 
            let x = entity.x; let z = entity.z;
            if (entity.dashTime && entity.dashTime > 0.5) {
                x += (Math.random() - 0.5) * 0.2;
                z += (Math.random() - 0.5) * 0.2;
            }
            meshRef.current.position.set(x, yPos, z);
            if (shadowRef.current) shadowRef.current.position.set(x, 0.04, z);
            
            meshRef.current.scale.set(scale, scale, 1);
        } else if (shadowRef.current) {
            shadowRef.current.position.set(position[0], 0.04, position[2]);
        }

        const t = clock.elapsedTime;
        const fps = 12; 
        const frame = Math.floor(t * fps) % frameCount;
        const imageWidth = (texture.image as { width?: number } | undefined)?.width ?? 1024;
        const frameInset = 0.5 / imageWidth;
        
        // Horizontal Offset
        texture.offset.x = (frame / frameCount) + frameInset;
        texture.offset.y = 0;

        if (materialRef.current) {
            if (opacity !== undefined) {
                materialRef.current.opacity = opacity;
                materialRef.current.transparent = true;
            } else {
                materialRef.current.opacity = 1.0;
                materialRef.current.transparent = true;
            }

            let hit = false;
            if (entity && entity.lastHit) hit = (clock.elapsedTime - entity.lastHit < 0.1);
            
            // Priority: Flashing Telegraph -> Hit Effect -> Normal
            if (entity && entity.teleportState === 'TELEGRAPH') {
                // Warning Flash logic (White flash)
                const flash = Math.sin(t * 20); // Fast strobe
                if (flash > 0) {
                    materialRef.current.color.setHex(0xffffff); 
                    materialRef.current.emissive.setHex(0xffffff); 
                    materialRef.current.emissiveIntensity = 1.0; 
                } else {
                    materialRef.current.color.setHex(0xffffff); 
                    materialRef.current.emissive.setHex(0x000000); 
                    materialRef.current.emissiveIntensity = 0; 
                }
            } else if (hit) { 
                materialRef.current.color.setHex(0xff0000); 
                materialRef.current.emissive.setHex(0xff0000); 
                materialRef.current.emissiveIntensity = 0.5; 
            } else { 
                materialRef.current.color.setHex(0xffffff); 
                materialRef.current.emissive.setHex(0x000000); 
                materialRef.current.emissiveIntensity = 0; 
            }
        }
    });

    return (
        <>
            <mesh
                ref={shadowRef}
                position={[position[0], 0.04, position[2]]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[shadowScale, shadowScale * 0.72, 1]}
                renderOrder={-2}
            >
                <circleGeometry args={[1, 12]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.24} depthWrite={false} />
            </mesh>
            <mesh ref={meshRef} position={position} scale={[scale, scale, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial ref={materialRef} map={texture} transparent alphaTest={0.01} side={THREE.DoubleSide} />
                {entity && <BossHealthBar entity={entity} />}
                {entity && <BossTauntBubble entity={entity} />}
            </mesh>
        </>
    );
};

export const PlayerSpriteBillboard: React.FC<PlayerSpriteProps> = ({ position, scale = 1.0, facing, action, viewDirection, isHit, slotIndex = 0 }) => {
    const [idleTex, walkSouthTex, walkNorthTex, walkEastTex, walkWestTex] = useLoader(THREE.TextureLoader, [
        ASSET_PATHS.images.player.idle,
        ASSET_PATHS.images.player.walkSouth,
        ASSET_PATHS.images.player.walkNorth,
        ASSET_PATHS.images.player.walkEast,
        ASSET_PATHS.images.player.walkWest,
    ]);

    useMemo(() => {
        [idleTex, walkSouthTex, walkNorthTex, walkEastTex, walkWestTex].forEach(t => { if (t) { t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 0.25); }});
    }, [idleTex, walkSouthTex, walkNorthTex, walkEastTex, walkWestTex]);

    const [slotTextures, setSlotTextures] = useState<Record<string, THREE.Texture> | null>(() => {
        if (slotIndex === 0) return null;
        const cached = getCachedPlayerSlotTextures(slotIndex as 1 | 2 | 3);
        return cached as unknown as Record<string, THREE.Texture> | null;
    });

    useEffect(() => {
        if (slotIndex === 0) { setSlotTextures(null); return; }
        const cached = getCachedPlayerSlotTextures(slotIndex as 1 | 2 | 3);
        if (cached) { setSlotTextures(cached as unknown as Record<string, THREE.Texture>); return; }
        let cancelled = false;
        getPlayerSlotTextures(slotIndex as 1 | 2 | 3).then((textures) => {
            if (!cancelled) setSlotTextures(textures as unknown as Record<string, THREE.Texture>);
        });
        return () => { cancelled = true; };
    }, [slotIndex]);

    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock, camera }) => {
        if (!meshRef.current || !matRef.current) return;
        meshRef.current.quaternion.copy(camera.quaternion);
        let activeTex: THREE.Texture = idleTex;
        if (slotIndex !== 0 && slotTextures) {
            activeTex = slotTextures.idle;
            if (action === 'RUN') {
                if (viewDirection === 'UP') activeTex = slotTextures.walkNorth;
                else if (viewDirection === 'DOWN') activeTex = slotTextures.walkSouth;
                else if (viewDirection === 'SIDE') activeTex = facing === 1 ? slotTextures.walkEast : slotTextures.walkWest;
            }
        } else if (action === 'RUN') {
            if (viewDirection === 'UP') activeTex = walkNorthTex;
            else if (viewDirection === 'DOWN') activeTex = walkSouthTex;
            else if (viewDirection === 'SIDE') { if (facing === 1) activeTex = walkEastTex; else activeTex = walkWestTex; }
        }
        if (matRef.current.map !== activeTex) { matRef.current.map = activeTex; matRef.current.needsUpdate = true; }
        const fps = 10; const t = clock.elapsedTime; const totalFrames = 16; const frame = Math.floor(t * fps) % totalFrames;
        if (activeTex) { const col = frame % 4; const row = Math.floor(frame / 4); activeTex.offset.x = col * 0.25; activeTex.offset.y = 0.75 - (row * 0.25); }
        if (isHit) { matRef.current.color.setHex(0xff0000); matRef.current.emissive.setHex(0xff0000); matRef.current.emissiveIntensity = 0.5; } else { matRef.current.color.setHex(0xffffff); matRef.current.emissive.setHex(0x000000); matRef.current.emissiveIntensity = 0; }
    });

    return <mesh ref={meshRef} position={position} scale={[scale, scale, 1]}><planeGeometry args={[1, 1]} /><meshStandardMaterial ref={matRef} map={idleTex} transparent alphaTest={0.5} side={THREE.DoubleSide} /></mesh>;
};

export const SpriteBillboard: React.FC<SpriteBillboardProps> = ({ position, color, scale = 1, facing = 1, renderOrder = 0, isHit = false, type, entity, action = 'IDLE', viewDirection = 'DOWN', variant }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useMemo(() => generateTexture(type || 'UNKNOWN', color, variant), [type, color, variant]);
  const shouldRenderEnemyShadow = Boolean(type && (type === 'BOSS' || isEnemyRenderType(type)));
  const shadowScale = Math.max(0.75, Math.min(1.5, scale * 0.55));

  useEffect(() => {
      if (type === 'BOSS' || (type && MOBS.includes(type))) { texture.repeat.set(0.5, 1); texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; } else { texture.repeat.set(1, 1); texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; }
      texture.needsUpdate = true;
  }, [texture, type]);

  useFrame(({ camera, clock }) => {
    if (!meshRef.current) return;
    meshRef.current.quaternion.copy(camera.quaternion);
    // Static sprites (props, chest) have no entity — position/opacity/frame-offset
    // are set once at mount and never change, so skip the rest of the per-frame work.
    if (!entity) return;

    const yPos = (entity.type === 'BOSS') ? 2.25 : 0.9;
    let x = entity.x; let z = entity.z;
    if (entity.dashTime && entity.dashTime > 0.3) { x += (Math.random() - 0.5) * 0.2; z += (Math.random() - 0.5) * 0.2; }
    meshRef.current.position.set(x, yPos, z);
    if (shadowRef.current) shadowRef.current.position.set(x, 0.04, z);
    const currentFacing = entity.facing || 1;

    let s = scale;
    if (type === 'XP_ORB' || type === 'CO2_ORB') {
        s = scale * (1.0 + Math.sin(clock.elapsedTime * 4) * 0.15);
    }
    meshRef.current.scale.set(s * Math.sign(currentFacing), s, 1);

    if (materialRef.current) {
        if (entity.opacity !== undefined) {
            materialRef.current.opacity = entity.opacity;
            materialRef.current.transparent = true;
        } else if (type && isGhostEnemyType(type)) {
            materialRef.current.transparent = true;
            materialRef.current.opacity = 0.7 + Math.sin(clock.elapsedTime * 3) * 0.1;
        } else {
            materialRef.current.transparent = true;
            materialRef.current.opacity = 1.0;
        }

        const hit = entity.lastHit ? (clock.elapsedTime - entity.lastHit < 0.1) : isHit;
        if (hit) {
            materialRef.current.color.setHex(0xffffff);
            materialRef.current.emissive.setHex(0xffffff);
            materialRef.current.emissiveIntensity = 1.0;
        } else {
            materialRef.current.color.setHex(0xffffff);
            materialRef.current.emissive.setHex(0x000000);
            materialRef.current.emissiveIntensity = 0;
        }
    }

    if (type === 'BOSS' || (type && MOBS.includes(type))) {
        const t = clock.elapsedTime;
        const speed = (type?.includes('BOSS')) ? 5 : 4;
        const frame = Math.floor(t * speed) % 2;
        texture.offset.x = frame * 0.5;
        texture.offset.y = 0;
    }
  });

  const initPos = position || [0, 0, 0]; const isBoss = type === 'BOSS';
  return (
    <>
      {shouldRenderEnemyShadow && (
        <mesh
          ref={shadowRef}
          position={[initPos[0], 0.04, initPos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[shadowScale, shadowScale * 0.7, 1]}
          renderOrder={renderOrder - 2}
        >
          <circleGeometry args={[1, 12]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.24} depthWrite={false} />
        </mesh>
      )}
      <mesh ref={meshRef} position={initPos as any} scale={[scale * Math.sign(facing), scale, 1]} renderOrder={renderOrder}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial ref={materialRef} map={texture} transparent alphaTest={0.01} side={THREE.DoubleSide} />
        {isBoss && entity && <BossHealthBar entity={entity} />}
        {isBoss && entity && <BossTauntBubble entity={entity} />}
      </mesh>
    </>
  );
};

export const PropSprite: React.FC<PropSpriteProps> = ({ position, type, scale = 1.0 }) => {
    return <SpriteBillboard position={position} color="#ffffff" scale={scale} type={type} />;
};

type PropGroundingStyle = {
    shadowOpacity: number;
    shadowScaleX: number;
    shadowScaleZ: number;
    glowColor: string;
    glowOpacity: number;
    glowScaleX: number;
    glowScaleZ: number;
};

const getPropGroundingStyle = (type: string): PropGroundingStyle => {
    const t = type.toUpperCase();
    const style: PropGroundingStyle = {
        shadowOpacity: 0.24,
        shadowScaleX: 0.34,
        shadowScaleZ: 0.14,
        glowColor: '#ffffff',
        glowOpacity: 0,
        glowScaleX: 0.42,
        glowScaleZ: 0.18,
    };

    if (t.includes('TREE') || t === 'PALM' || t === 'CACTUS') {
        style.shadowOpacity = 0.3;
        style.shadowScaleX = 0.42;
        style.shadowScaleZ = 0.17;
    } else if (t.includes('ROCK') || t === 'STONE' || t === 'RUIN' || t === 'GRAVE') {
        style.shadowOpacity = 0.28;
        style.shadowScaleX = 0.38;
        style.shadowScaleZ = 0.15;
    } else if (t.includes('SERVER') || t === 'NEON_SIGN' || t === 'BILLBOARD_RUIN' || t === 'CABLE_POST') {
        style.shadowOpacity = 0.27;
        style.shadowScaleX = 0.32;
        style.shadowScaleZ = 0.13;
    } else if (t.includes('POOL')) {
        style.shadowOpacity = 0.16;
        style.shadowScaleX = 0.44;
        style.shadowScaleZ = 0.15;
    }

    if (t.includes('CRYSTAL') || t.includes('SHARD')) {
        style.glowColor = t.includes('NULL') || t.includes('VOID') ? '#a78bfa' : '#67e8f9';
        style.glowOpacity = 0.18;
        style.glowScaleX = 0.38;
        style.glowScaleZ = 0.16;
    } else if (t.includes('SERVER') || t === 'NEON_SIGN' || t === 'CABLE_POST') {
        style.glowColor = t.includes('BURNED') ? '#fb7185' : '#38bdf8';
        style.glowOpacity = 0.09;
        style.glowScaleX = 0.4;
        style.glowScaleZ = 0.16;
    } else if (t.includes('MAGMA') || t.includes('LAVA') || t.includes('EMBER') || t === 'HELL_OBELISK') {
        style.glowColor = '#fb923c';
        style.glowOpacity = 0.2;
        style.glowScaleX = 0.42;
        style.glowScaleZ = 0.18;
    } else if (t.includes('VOID') || t.includes('RIFT') || t.includes('STAR')) {
        style.glowColor = '#a78bfa';
        style.glowOpacity = 0.15;
        style.glowScaleX = 0.4;
        style.glowScaleZ = 0.16;
    } else if (t.includes('GATE')) {
        style.glowColor = '#facc15';
        style.glowOpacity = 0.14;
        style.glowScaleX = 0.44;
        style.glowScaleZ = 0.18;
    }

    return style;
};

const PropSpriteInstancedGroup: React.FC<{ type: string; items: PropSpriteBatchItem[] }> = ({ type, items }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const shadowMeshRef = useRef<THREE.InstancedMesh>(null);
    const glowMeshRef = useRef<THREE.InstancedMesh>(null);
    const lastCameraQuaternion = useRef(new THREE.Quaternion());
    const hasCameraQuaternion = useRef(false);
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const texture = useMemo(() => generateTexture(type, '#ffffff'), [type]);
    const grounding = useMemo(() => getPropGroundingStyle(type), [type]);
    const material = useMemo(() => {
        texture.repeat.set(1, 1);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;

        return new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01,
            side: THREE.DoubleSide,
            toneMapped: false,
        });
    }, [texture]);
    const shadowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: grounding.shadowOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), [grounding.shadowOpacity]);
    const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: grounding.glowColor,
        transparent: true,
        opacity: grounding.glowOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    }), [grounding.glowColor, grounding.glowOpacity]);

    useEffect(() => () => {
        material.dispose();
        shadowMaterial.dispose();
        glowMaterial.dispose();
    }, [material, shadowMaterial, glowMaterial]);

    useFrame(({ camera }) => {
        const mesh = meshRef.current;
        const shadowMesh = shadowMeshRef.current;
        const glowMesh = glowMeshRef.current;
        if (!mesh || !shadowMesh) return;
        if (hasCameraQuaternion.current && lastCameraQuaternion.current.angleTo(camera.quaternion) < 0.0001) return;
        hasCameraQuaternion.current = true;
        lastCameraQuaternion.current.copy(camera.quaternion);

        items.forEach((item, index) => {
            const scale = item.scale;
            tempObject.position.set(item.x, 0.062, item.z);
            tempObject.rotation.set(-Math.PI / 2, 0, 0);
            tempObject.scale.set(scale * grounding.shadowScaleX, scale * grounding.shadowScaleZ, 1);
            tempObject.updateMatrix();
            shadowMesh.setMatrixAt(index, tempObject.matrix);

            if (glowMesh && grounding.glowOpacity > 0) {
                tempObject.position.set(item.x, 0.066, item.z);
                tempObject.rotation.set(-Math.PI / 2, 0, 0);
                tempObject.scale.set(scale * grounding.glowScaleX, scale * grounding.glowScaleZ, 1);
                tempObject.updateMatrix();
                glowMesh.setMatrixAt(index, tempObject.matrix);
            }

            tempObject.position.set(item.x, scale * 0.5, item.z);
            tempObject.quaternion.copy(camera.quaternion);
            tempObject.scale.set(scale, scale, 1);
            tempObject.updateMatrix();
            mesh.setMatrixAt(index, tempObject.matrix);
        });

        shadowMesh.instanceMatrix.needsUpdate = true;
        if (glowMesh && grounding.glowOpacity > 0) glowMesh.instanceMatrix.needsUpdate = true;
        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <>
            <instancedMesh
                ref={shadowMeshRef}
                args={[propGroundDiscGeometry, shadowMaterial, items.length]}
                frustumCulled={false}
                renderOrder={-2}
            />
            {grounding.glowOpacity > 0 && (
                <instancedMesh
                    ref={glowMeshRef}
                    args={[propGroundDiscGeometry, glowMaterial, items.length]}
                    frustumCulled={false}
                    renderOrder={-1}
                />
            )}
            <instancedMesh
                ref={meshRef}
                args={[propPlaneGeometry, material, items.length]}
                frustumCulled={false}
            />
        </>
    );
};

export const PropSpriteBatch: React.FC<PropSpriteBatchProps> = React.memo(({ items }) => {
    const groups = useMemo(() => {
        const byType = new Map<string, PropSpriteBatchItem[]>();

        items.forEach((item) => {
            const list = byType.get(item.type);
            if (list) list.push(item);
            else byType.set(item.type, [item]);
        });

        return Array.from(byType.entries());
    }, [items]);

    return (
        <>
            {groups.map(([type, groupItems]) => (
                <PropSpriteInstancedGroup key={type} type={type} items={groupItems} />
            ))}
        </>
    );
});
