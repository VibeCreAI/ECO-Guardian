
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AiStageConfig } from '../../types';
import { getGroundTilePath, getGroundTileVariantPath } from '../../assets';

interface PixelGroundProps {
    width: number;
    height: number;
    themeId: number;
    mode?: 'OVERWORLD' | 'BATTLE';
    aiConfig?: AiStageConfig | null;
}

type ThemeName = 'FOREST' | 'SKULL' | 'ICE' | 'VOLCANO' | 'PYRAMID' | 'MUSHROOM' | 'CYBER' | 'VOID' | 'SKY' | 'HELL';
type AnimatedOverlaySpec = {
    key: string;
    speedX: number;
    speedY: number;
    opacity: number;
    pulse: number;
    pulseSpeed: number;
    randomDrift?: boolean;
};
type OverlayParticle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    stretch: number;
    alpha: number;
    phase: number;
    colorIndex: number;
};

const groundTileAvailabilityCache: Record<string, Promise<boolean>> = {};
const groundTileImageCache: Record<string, Promise<HTMLImageElement | null>> = {};
const EXTERNAL_GROUND_VARIANT_COUNT = 4;
const EXTERNAL_GROUND_TILE_PIXELS = 1024;
const PROCEDURAL_OVERLAY_TILE_PIXELS = 128;
const EXTERNAL_GROUND_ASSET_VERSION = 'stage-ground-1024-v13';

const usesExternalOverlayTile = (themeType: ThemeName) =>
    themeType === 'VOLCANO' || themeType === 'CYBER' || themeType === 'HELL';

const THEME_SIDE_COLORS: Record<ThemeName, { side: string; bottom: string }> = {
    FOREST:   { side: '#7AA64B', bottom: '#4E7130' },
    SKULL:    { side: '#64748B', bottom: '#334155' },
    ICE:      { side: '#93C5FD', bottom: '#6BA0D6' },
    VOLCANO:  { side: '#8B3434', bottom: '#572020' },
    PYRAMID:  { side: '#B8860B', bottom: '#8B6508' },
    MUSHROOM: { side: '#658C38', bottom: '#425C27' },
    CYBER:    { side: '#1D4E6F', bottom: '#102B42' },
    VOID:     { side: '#46306F', bottom: '#2F1B4F' },
    SKY:      { side: '#93C5FD', bottom: '#60A5FA' },
    HELL:     { side: '#9F3A35', bottom: '#63211F' },
};

const resolveThemeType = (themeId: number, aiConfig?: AiStageConfig | null): ThemeName => {
    if (aiConfig?.theme?.landmarkType) {
        return aiConfig.theme.landmarkType as ThemeName;
    }

    const cycle = ((themeId - 1) % 10) + 1;
    switch(cycle) {
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

const createSeededRandom = (seedInput: string) => {
    let seed = 2166136261;
    for (let i = 0; i < seedInput.length; i += 1) {
        seed ^= seedInput.charCodeAt(i);
        seed = Math.imul(seed, 16777619);
    }

    return () => {
        seed += 0x6D2B79F5;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const versionGroundTileUrl = (url: string) =>
    `${url}${url.includes('?') ? '&' : '?'}v=${EXTERNAL_GROUND_ASSET_VERSION}`;

const getExternalGroundTileUrls = (themeType: ThemeName, mode: 'OVERWORLD' | 'BATTLE') =>
    Array.from({ length: EXTERNAL_GROUND_VARIANT_COUNT }, (_, index) =>
        versionGroundTileUrl(index === 0 ? getGroundTilePath(themeType, mode) : getGroundTileVariantPath(themeType, mode, index))
    );

const checkGroundTileAvailable = (url: string) => {
    if (!groundTileAvailabilityCache[url]) {
        groundTileAvailabilityCache[url] = fetch(url, { method: 'HEAD', cache: 'force-cache' })
            .then((response) => {
                const contentType = response.headers.get('content-type') ?? '';
                return response.ok && contentType.toLowerCase().startsWith('image/');
            })
            .catch(() => false);
    }

    return groundTileAvailabilityCache[url];
};

const loadGroundTileImage = (url: string) => {
    if (!groundTileImageCache[url]) {
        groundTileImageCache[url] = new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = url;
        });
    }

    return groundTileImageCache[url];
};

const createGroundTileMosaic = (
    images: HTMLImageElement[],
    width: number,
    height: number,
    tileWorldSize: number,
    seed: string,
) => {
    const columns = Math.max(1, Math.ceil(width / tileWorldSize));
    const rows = Math.max(1, Math.ceil(height / tileWorldSize));
    const canvas = document.createElement('canvas');
    canvas.width = columns * EXTERNAL_GROUND_TILE_PIXELS;
    canvas.height = rows * EXTERNAL_GROUND_TILE_PIXELS;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const rand = createSeededRandom(seed);
    const placed: number[] = [];
    ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            let imageIndex = Math.floor(rand() * images.length);
            const leftIndex = column > 0 ? placed[row * columns + column - 1] : -1;
            const topIndex = row > 0 ? placed[(row - 1) * columns + column] : -1;

            if (images.length > 1 && (imageIndex === leftIndex || imageIndex === topIndex)) {
                imageIndex = (imageIndex + 1 + Math.floor(rand() * (images.length - 1))) % images.length;
            }

            placed[row * columns + column] = imageIndex;

            const x = column * EXTERNAL_GROUND_TILE_PIXELS;
            const y = row * EXTERNAL_GROUND_TILE_PIXELS;
            ctx.drawImage(
                images[imageIndex],
                x,
                y,
                EXTERNAL_GROUND_TILE_PIXELS,
                EXTERNAL_GROUND_TILE_PIXELS,
            );
        }
    }

    return canvas;
};

const getExternalGroundTileRepeat = (width: number, height: number, tileWorldSize: number) =>
    new THREE.Vector2(
        Math.max(1, Math.ceil(width / tileWorldSize)),
        Math.max(1, Math.ceil(height / tileWorldSize)),
    );

const maybeApplyExternalGroundTile = (
    texture: THREE.Texture,
    themeType: ThemeName,
    mode: 'OVERWORLD' | 'BATTLE',
    width: number,
    height: number,
    tileWorldSize: number,
) => {
    if (typeof window === 'undefined' || typeof fetch !== 'function' || typeof Image === 'undefined') return;

    const tileUrls = getExternalGroundTileUrls(themeType, mode);
    Promise.all(tileUrls.map(async (url) => {
        const available = await checkGroundTileAvailable(url);
        if (!available) return null;
        return loadGroundTileImage(url);
    })).then((loadedImages) => {
        const images = loadedImages.filter((image): image is HTMLImageElement => Boolean(image));
        if (images.length === 0) return;

        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.set(1, 1);

        if (images.length === 1) {
            texture.image = images[0];
        } else {
            const mosaic = createGroundTileMosaic(
                images,
                width,
                height,
                tileWorldSize,
                `external-ground:${themeType}:${mode}:${width}x${height}`,
            );
            if (!mosaic) return;
            texture.image = mosaic;
        }

        texture.needsUpdate = true;
    });
};

const drawGroundTile = (
    ctx: CanvasRenderingContext2D,
    themeType: ThemeName,
    mode: 'OVERWORLD' | 'BATTLE',
) => {
    const size = 128;
    const grid = 32;
    const px = size / grid;
    const rand = createSeededRandom(`${themeType}:${mode}`);

    const fill = (color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size, size);
    };

    const rect = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x) * px, Math.floor(y) * px, Math.ceil(w) * px, Math.ceil(h) * px);
    };

    const scatter = (count: number, palette: string[], minSize = 1, maxSize = 1) => {
        for (let i = 0; i < count; i += 1) {
            const w = minSize + Math.floor(rand() * (maxSize - minSize + 1));
            const h = minSize + Math.floor(rand() * (maxSize - minSize + 1));
            const x = Math.floor(rand() * (grid - w));
            const y = Math.floor(rand() * (grid - h));
            rect(x, y, w, h, palette[Math.floor(rand() * palette.length)]);
        }
    };

    const tuft = (x: number, y: number, color: string, highlight?: string) => {
        rect(x, y + 1, 1, 2, color);
        rect(x + 1, y, 1, 3, color);
        rect(x + 2, y + 1, 1, 2, color);
        if (highlight) rect(x + 1, y, 1, 1, highlight);
    };

    const pebble = (x: number, y: number, color: string, highlight: string) => {
        rect(x, y + 1, 4, 2, color);
        rect(x + 1, y, 2, 1, highlight);
    };

    if (themeType === 'FOREST') {
        fill('#4fca68');
        rect(0, 0, 16, 16, '#5ed978');
        rect(16, 16, 16, 16, '#45bb5c');
        rect(1, 23, 8, 6, '#3faa55');
        rect(23, 1, 8, 6, '#6ee181');
        scatter(10, ['#6ee181', '#3faa55'], 2, 3);
        tuft(6, 8, '#238943', '#a7f3b8');
        tuft(24, 23, '#238943', '#a7f3b8');
        rect(8, 23, 1, 1, '#facc15'); rect(7, 23, 1, 1, '#ffffff'); rect(9, 23, 1, 1, '#ffffff'); rect(8, 22, 1, 1, '#ffffff'); rect(8, 24, 1, 1, '#ffffff');
    } else if (themeType === 'SKULL') {
        fill('#53677e');
        rect(0, 0, 16, 16, '#64758c');
        rect(16, 16, 16, 16, '#708196');
        rect(0, 15, 32, 1, '#44556a');
        rect(15, 0, 1, 32, '#44556a');
        rect(6, 5, 1, 4, '#334155'); rect(7, 8, 4, 1, '#334155');
        rect(21, 20, 5, 1, '#334155'); rect(25, 16, 1, 5, '#334155');
        scatter(6, ['#8fa1b5', '#475569'], 1, 2);
    } else if (themeType === 'ICE') {
        fill('#c7eaff');
        rect(0, 0, 16, 16, '#dff7ff');
        rect(16, 16, 16, 16, '#b8ddf5');
        rect(0, 15, 32, 1, '#8ecae6');
        rect(15, 0, 1, 32, '#8ecae6');
        rect(4, 5, 9, 1, '#93c5fd'); rect(12, 6, 1, 4, '#93c5fd');
        rect(20, 20, 7, 1, '#93c5fd'); rect(20, 21, 1, 4, '#93c5fd');
        scatter(20, ['#ffffff', '#e0f2fe', '#bae6fd'], 1, 1);
        rect(8, 9, 2, 1, '#ffffff'); rect(9, 8, 1, 3, '#ffffff');
        rect(24, 6, 2, 1, '#ffffff'); rect(25, 5, 1, 3, '#ffffff');
    } else if (themeType === 'VOLCANO') {
        fill('#7c2f2f');
        rect(0, 0, 16, 16, '#8f3a34');
        rect(16, 16, 16, 16, '#6f2828');
        rect(9, 0, 3, 32, '#b33b2f'); rect(10, 0, 1, 32, '#fb923c');
        rect(0, 20, 32, 3, '#b33b2f'); rect(0, 21, 32, 1, '#facc15');
        rect(9, 20, 3, 3, '#fde047');
        scatter(8, ['#9f3a35', '#6b3430'], 2, 3);
        pebble(22, 7, '#4b3330', '#9a6a5f');
    } else if (themeType === 'PYRAMID') {
        fill('#f2c35b');
        for (let y = 3; y < grid; y += 7) {
            rect(0, y, 18, 1, '#e8aa32');
            rect(18, y + 2, 14, 1, '#ffd66b');
        }
        rect(0, 0, 16, 16, 'rgba(255,255,255,0.08)');
        rect(16, 16, 16, 16, 'rgba(120,53,15,0.1)');
        scatter(24, ['#b45309', '#d97706', '#fbbf24'], 1, 2);
        rect(22, 18, 4, 2, '#c08428'); rect(23, 17, 2, 1, '#fde68a');
        rect(7, 10, 2, 2, '#cffafe');
    } else if (themeType === 'MUSHROOM') {
        fill('#638f35');
        rect(0, 0, 16, 16, '#70a33d');
        rect(16, 16, 16, 16, '#547b2b');
        rect(4, 4, 8, 7, '#78ad43'); rect(5, 5, 6, 5, '#8bc34a'); rect(7, 6, 2, 1, '#d9f99d');
        rect(19, 17, 9, 8, '#5f8f2f'); rect(20, 18, 7, 6, '#78ad43'); rect(22, 19, 2, 1, '#d9f99d');
        scatter(8, ['#82b84a', '#4f7429'], 2, 3);
        rect(13, 23, 2, 2, '#dc2626'); rect(14, 23, 1, 1, '#ffffff');
        rect(27, 7, 2, 2, '#f0abfc'); rect(28, 7, 1, 1, '#ffffff');
    } else if (themeType === 'CYBER') {
        fill('#153653');
        for (let i = 0; i <= grid; i += 8) {
            rect(i, 0, 1, 32, '#246a8d');
            rect(0, i, 32, 1, '#246a8d');
        }
        rect(4, 4, 1, 11, '#38bdf8'); rect(4, 4, 8, 1, '#38bdf8'); rect(12, 4, 2, 2, '#67e8f9');
        rect(21, 17, 1, 8, '#38bdf8'); rect(17, 24, 5, 1, '#38bdf8'); rect(16, 23, 2, 2, '#7dd3fc');
        rect(27, 6, 3, 1, '#c4b5fd'); rect(5, 26, 5, 1, '#86efac');
        scatter(6, ['#1e4f72', '#215d82'], 2, 3);
    } else if (themeType === 'VOID') {
        fill('#402760');
        rect(0, 0, 16, 16, '#4d3472');
        rect(16, 16, 16, 16, '#382354');
        rect(2, 17, 8, 1, '#7c5bb0'); rect(9, 17, 1, 6, '#7c5bb0');
        rect(20, 6, 9, 1, '#8b5cf6'); rect(20, 7, 1, 5, '#8b5cf6');
        scatter(8, ['#c4b5fd', '#e9d5ff'], 1, 1);
        rect(14, 14, 4, 4, '#2b1744'); rect(15, 15, 2, 2, '#241238');
    } else if (themeType === 'SKY') {
        fill('#8bd3ff');
        rect(0, 0, 16, 16, '#a7ddff');
        rect(16, 16, 16, 16, '#74c7f6');
        rect(3, 7, 10, 4, '#ffffff'); rect(5, 5, 5, 7, '#ffffff'); rect(2, 10, 12, 2, '#e0f2fe');
        rect(18, 20, 11, 4, '#ffffff'); rect(21, 18, 5, 7, '#ffffff'); rect(17, 23, 13, 2, '#e0f2fe');
        rect(24, 7, 4, 1, '#facc15'); rect(26, 5, 1, 4, '#facc15');
        scatter(14, ['#bae6fd', '#e0f2fe', '#0ea5e9'], 1, 2);
    } else if (themeType === 'HELL') {
        fill('#a23a36');
        rect(0, 0, 8, 8, '#8d2f2d'); rect(24, 0, 8, 8, '#8d2f2d');
        rect(0, 24, 8, 8, '#8d2f2d'); rect(24, 24, 8, 8, '#8d2f2d');
        rect(12, 12, 8, 8, '#b6483f');
        rect(8, 0, 2, 32, '#7e2a28'); rect(0, 18, 32, 2, '#7e2a28');
        rect(9, 18, 1, 10, '#fb923c'); rect(0, 19, 12, 1, '#facc15');
        scatter(8, ['#b6483f', '#c65345'], 2, 3);
    } else {
        fill('#555555');
        rect(0, 0, 16, 16, '#666666');
        rect(16, 16, 16, 16, '#666666');
    }

    if (mode === 'BATTLE') {
        rect(0, 0, 32, 1, 'rgba(0,0,0,0.26)');
        rect(0, 31, 32, 1, 'rgba(255,255,255,0.12)');
        rect(0, 0, 1, 32, 'rgba(0,0,0,0.26)');
        rect(31, 0, 1, 32, 'rgba(255,255,255,0.12)');
        rect(15, 0, 1, 32, 'rgba(0,0,0,0.12)');
        rect(0, 15, 32, 1, 'rgba(0,0,0,0.12)');
    }
};

const getAnimatedOverlaySpecs = (themeType: ThemeName, mode: 'OVERWORLD' | 'BATTLE'): AnimatedOverlaySpec[] => {
    const combatFade = mode === 'BATTLE' ? 0.72 : 1;

    if (themeType === 'FOREST') {
        return [
            { key: 'forest-drift', speedX: 0, speedY: 0, opacity: 0.11 * combatFade, pulse: 0.03 * combatFade, pulseSpeed: 1.4, randomDrift: true },
        ];
    }

    if (themeType === 'SKULL') {
        return [
            { key: 'skull-mist', speedX: 0, speedY: 0, opacity: 0.12 * combatFade, pulse: 0.035 * combatFade, pulseSpeed: 1.25, randomDrift: true },
        ];
    }

    if (themeType === 'ICE') {
        return [
            { key: 'ice-sparkle', speedX: 0, speedY: 0, opacity: 0.14 * combatFade, pulse: 0.05 * combatFade, pulseSpeed: 1.9, randomDrift: true },
        ];
    }

    if (themeType === 'VOLCANO') {
        const volcanoSpeedScale = mode === 'BATTLE' ? 4 / 14 : 5 / 16;
        return [
            { key: 'volcano-vertical', speedX: 0, speedY: -0.08 * volcanoSpeedScale, opacity: 0.24 * combatFade, pulse: 0.08 * combatFade, pulseSpeed: 1.8 },
            { key: 'volcano-horizontal', speedX: 0.1 * volcanoSpeedScale, speedY: 0, opacity: 0.18 * combatFade, pulse: 0.06 * combatFade, pulseSpeed: 2.2 },
        ];
    }

    if (themeType === 'PYRAMID') {
        return [
            { key: 'pyramid-dust', speedX: 0, speedY: 0, opacity: 0.12 * combatFade, pulse: 0.03 * combatFade, pulseSpeed: 1.15, randomDrift: true },
        ];
    }

    if (themeType === 'MUSHROOM') {
        return [
            { key: 'mushroom-spores', speedX: 0, speedY: 0, opacity: 0.13 * combatFade, pulse: 0.04 * combatFade, pulseSpeed: 1.6, randomDrift: true },
        ];
    }

    if (themeType === 'CYBER') {
        return [
            { key: 'cyber-vertical', speedX: 0, speedY: -0.16, opacity: 0.15 * combatFade, pulse: 0.05 * combatFade, pulseSpeed: 2.6 },
            { key: 'cyber-horizontal', speedX: 0.18, speedY: 0, opacity: 0.13 * combatFade, pulse: 0.04 * combatFade, pulseSpeed: 3 },
        ];
    }

    if (themeType === 'VOID') {
        return [
            { key: 'void-drift', speedX: 0, speedY: 0, opacity: 0.2 * combatFade, pulse: 0.07 * combatFade, pulseSpeed: 1.5, randomDrift: true },
        ];
    }

    if (themeType === 'SKY') {
        return [
            { key: 'sky-breeze', speedX: 0, speedY: 0, opacity: 0.13 * combatFade, pulse: 0.035 * combatFade, pulseSpeed: 1.2, randomDrift: true },
        ];
    }

    if (themeType === 'HELL') {
        const hellSpeedScale = mode === 'BATTLE' ? 4 / 14 : 5 / 16;
        return [
            { key: 'hell-vertical', speedX: 0, speedY: -0.12 * hellSpeedScale, opacity: 0.28 * combatFade, pulse: 0.1 * combatFade, pulseSpeed: 2.1 },
            { key: 'hell-horizontal', speedX: 0.14 * hellSpeedScale, speedY: 0, opacity: 0.22 * combatFade, pulse: 0.08 * combatFade, pulseSpeed: 2.5 },
        ];
    }

    return [];
};

const drawGroundOverlayLayer = (
    ctx: CanvasRenderingContext2D,
    themeType: ThemeName,
    layerKey: string,
) => {
    const size = usesExternalOverlayTile(themeType) ? EXTERNAL_GROUND_TILE_PIXELS : PROCEDURAL_OVERLAY_TILE_PIXELS;
    const grid = 32;
    const px = size / grid;
    ctx.clearRect(0, 0, size, size);

    const rawRect = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
    };

    const rect = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x) * px, Math.floor(y) * px, Math.ceil(w) * px, Math.ceil(h) * px);
    };

    const drawVolcanoConduitPulse = (orientation: 'vertical' | 'horizontal') => {
        const blockStep = size / 5;
        const lineThickness = Math.max(4, Math.round(size / 160));
        const hotCore = Math.max(2, Math.round(lineThickness * 0.34));
        const segmentLength = Math.round(blockStep * 0.2);
        const segmentGap = Math.round(blockStep * 0.42);
        const lineCount = 5;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const lineCenter = lineIndex * blockStep;
            const lineStart = lineIndex === 0 ? 0 : Math.round(lineCenter - lineThickness / 2);

            for (let offset = -segmentGap; offset < size + segmentGap; offset += segmentGap) {
                if (orientation === 'vertical') {
                    rawRect(lineStart, offset, lineThickness, segmentLength, 'rgba(249,115,22,0.58)');
                    rawRect(lineStart + Math.floor((lineThickness - hotCore) / 2), offset + Math.round(segmentLength * 0.18), hotCore, segmentLength * 0.58, 'rgba(253,224,71,0.72)');
                } else {
                    rawRect(offset, lineStart, segmentLength, lineThickness, 'rgba(249,115,22,0.54)');
                    rawRect(offset + Math.round(segmentLength * 0.18), lineStart + Math.floor((lineThickness - hotCore) / 2), segmentLength * 0.58, hotCore, 'rgba(253,224,71,0.68)');
                }
            }
        }
    };

    const drawCyberGridPulse = (orientation: 'vertical' | 'horizontal') => {
        const blockStep = size / 5;
        const lineThickness = Math.max(4, Math.round(size / 170));
        const nodeSize = Math.max(3, Math.round(lineThickness * 0.8));
        const segmentLength = Math.round(blockStep * 0.2);
        const segmentGap = Math.round(blockStep * 0.42);
        const lineCount = 5;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const lineCenter = lineIndex * blockStep;
            const lineStart = lineIndex === 0 ? 0 : Math.round(lineCenter - lineThickness / 2);

            for (let offset = -segmentGap; offset < size + segmentGap; offset += segmentGap) {
                if (orientation === 'vertical') {
                    rawRect(lineStart, offset, lineThickness, segmentLength, '#67e8f9');
                    rawRect(lineStart + Math.floor((lineThickness - nodeSize) / 2), offset + segmentLength, nodeSize, nodeSize, '#86efac');
                } else {
                    rawRect(offset, lineStart, segmentLength, lineThickness, '#38bdf8');
                    rawRect(offset + segmentLength, lineStart + Math.floor((lineThickness - nodeSize) / 2), nodeSize, nodeSize, '#c4b5fd');
                }
            }
        }
    };

    const drawHellGridPulse = (orientation: 'vertical' | 'horizontal') => {
        const blockStep = size / 5;
        const lineThickness = Math.max(4, Math.round(size / 160));
        const segmentLength = Math.round(blockStep * 0.2);
        const segmentGap = Math.round(blockStep * 0.42);
        const lineCount = 5;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const lineCenter = lineIndex * blockStep;
            const lineStart = lineIndex === 0 ? 0 : Math.round(lineCenter - lineThickness / 2);

            for (let offset = -segmentGap; offset < size + segmentGap; offset += segmentGap) {
                if (orientation === 'vertical') {
                    rawRect(lineStart, offset, lineThickness, segmentLength, '#facc15');
                    rawRect(lineStart - lineThickness, offset + Math.round(segmentLength * 0.25), lineThickness * 3, segmentLength * 0.45, 'rgba(251,146,60,0.78)');
                    rawRect(lineStart + lineThickness * 2, offset + Math.round(segmentLength * 0.65), lineThickness, segmentLength * 0.45, 'rgba(239,68,68,0.74)');
                } else {
                    rawRect(offset, lineStart, segmentLength, lineThickness, '#fde047');
                    rawRect(offset + Math.round(segmentLength * 0.2), lineStart - lineThickness, segmentLength * 0.6, lineThickness * 3, 'rgba(251,146,60,0.72)');
                    rawRect(offset + Math.round(segmentLength * 0.8), lineStart + lineThickness * 2, segmentLength * 0.45, lineThickness, 'rgba(239,68,68,0.6)');
                }
            }
        }
    };

    if (themeType === 'FOREST') {
        rect(7, 9, 1, 1, 'rgba(254,240,138,0.8)');
        rect(19, 6, 1, 1, 'rgba(187,247,208,0.8)');
        rect(27, 21, 1, 1, 'rgba(254,240,138,0.75)');
        rect(12, 25, 2, 1, 'rgba(134,239,172,0.55)');
        rect(23, 14, 1, 2, 'rgba(187,247,208,0.5)');
    } else if (themeType === 'SKULL') {
        rect(2, 18, 6, 1, 'rgba(203,213,225,0.34)');
        rect(9, 19, 3, 1, 'rgba(226,232,240,0.28)');
        rect(18, 7, 7, 1, 'rgba(203,213,225,0.32)');
        rect(25, 8, 4, 1, 'rgba(148,163,184,0.28)');
        rect(14, 27, 5, 1, 'rgba(190,242,100,0.2)');
    } else if (themeType === 'ICE') {
        rect(7, 8, 2, 1, 'rgba(255,255,255,0.78)'); rect(8, 7, 1, 3, 'rgba(255,255,255,0.72)');
        rect(23, 5, 2, 1, 'rgba(255,255,255,0.65)'); rect(24, 4, 1, 3, 'rgba(255,255,255,0.58)');
        rect(18, 24, 2, 1, 'rgba(224,242,254,0.72)'); rect(19, 23, 1, 3, 'rgba(224,242,254,0.65)');
        rect(4, 19, 4, 1, 'rgba(186,230,253,0.38)');
    } else if (themeType === 'VOLCANO') {
        if (layerKey === 'volcano-vertical') {
            drawVolcanoConduitPulse('vertical');
        } else {
            drawVolcanoConduitPulse('horizontal');
        }
    } else if (themeType === 'PYRAMID') {
        rect(0, 7, 8, 1, 'rgba(254,243,199,0.34)');
        rect(12, 11, 9, 1, 'rgba(253,230,138,0.32)');
        rect(23, 21, 7, 1, 'rgba(254,243,199,0.3)');
        rect(6, 25, 2, 1, 'rgba(255,255,255,0.28)');
        rect(27, 5, 1, 1, 'rgba(254,240,138,0.62)');
    } else if (themeType === 'MUSHROOM') {
        rect(5, 7, 1, 1, 'rgba(217,249,157,0.7)');
        rect(17, 12, 1, 1, 'rgba(240,171,252,0.58)');
        rect(26, 24, 1, 1, 'rgba(217,249,157,0.65)');
        rect(12, 27, 2, 1, 'rgba(190,242,100,0.45)');
        rect(23, 5, 1, 2, 'rgba(240,171,252,0.36)');
    } else if (themeType === 'CYBER') {
        if (layerKey === 'cyber-vertical') {
            drawCyberGridPulse('vertical');
        } else {
            drawCyberGridPulse('horizontal');
        }
    } else if (themeType === 'VOID') {
        rect(5, 8, 1, 1, '#e9d5ff');
        rect(17, 4, 1, 1, '#c4b5fd');
        rect(27, 14, 1, 1, '#ddd6fe');
        rect(10, 25, 2, 1, 'rgba(196,181,253,0.78)');
        rect(22, 21, 1, 2, 'rgba(233,213,255,0.78)');
        rect(2, 17, 4, 1, 'rgba(167,139,250,0.5)');
        rect(20, 6, 5, 1, 'rgba(196,181,253,0.5)');
    } else if (themeType === 'SKY') {
        rect(2, 9, 8, 1, 'rgba(255,255,255,0.32)');
        rect(14, 18, 7, 1, 'rgba(255,255,255,0.3)');
        rect(24, 7, 5, 1, 'rgba(224,242,254,0.38)');
        rect(7, 24, 1, 1, 'rgba(254,240,138,0.6)');
        rect(28, 19, 1, 1, 'rgba(255,255,255,0.58)');
    } else if (themeType === 'HELL') {
        if (layerKey === 'hell-vertical') {
            drawHellGridPulse('vertical');
        } else {
            drawHellGridPulse('horizontal');
        }
    }
};

const PARTICLE_PALETTES: Record<ThemeName, Array<[number, number, number]>> = {
    FOREST: [[254, 240, 138], [187, 247, 208], [134, 239, 172]],
    SKULL: [[203, 213, 225], [226, 232, 240], [190, 242, 100]],
    ICE: [[255, 255, 255], [224, 242, 254], [186, 230, 253]],
    VOLCANO: [[253, 224, 71], [251, 146, 60], [249, 115, 22]],
    PYRAMID: [[254, 243, 199], [253, 230, 138], [255, 255, 255]],
    MUSHROOM: [[217, 249, 157], [240, 171, 252], [190, 242, 100]],
    CYBER: [[103, 232, 249], [134, 239, 172], [196, 181, 253]],
    VOID: [[233, 213, 255], [196, 181, 253], [167, 139, 250]],
    SKY: [[255, 255, 255], [224, 242, 254], [254, 240, 138]],
    HELL: [[253, 224, 71], [251, 146, 60], [239, 68, 68]],
};

const createRandomOverlayParticles = (themeType: ThemeName, layerKey: string): OverlayParticle[] => {
    const rand = createSeededRandom(`overlay-particles:${themeType}:${layerKey}`);
    const config = {
        FOREST: { count: 7, minSpeed: 0.16, maxSpeed: 0.42, minSize: 1, maxSize: 1, maxStretch: 2 },
        SKULL: { count: 6, minSpeed: 0.08, maxSpeed: 0.22, minSize: 1, maxSize: 1, maxStretch: 5 },
        ICE: { count: 6, minSpeed: 0.08, maxSpeed: 0.2, minSize: 1, maxSize: 1, maxStretch: 2 },
        PYRAMID: { count: 7, minSpeed: 0.14, maxSpeed: 0.34, minSize: 1, maxSize: 1, maxStretch: 6 },
        MUSHROOM: { count: 8, minSpeed: 0.12, maxSpeed: 0.32, minSize: 1, maxSize: 1, maxStretch: 2 },
        VOID: { count: 8, minSpeed: 0.1, maxSpeed: 0.26, minSize: 1, maxSize: 1, maxStretch: 4 },
        SKY: { count: 7, minSpeed: 0.12, maxSpeed: 0.3, minSize: 1, maxSize: 1, maxStretch: 7 },
    }[themeType] ?? { count: 6, minSpeed: 0.1, maxSpeed: 0.24, minSize: 1, maxSize: 1, maxStretch: 3 };

    return Array.from({ length: config.count }, (_, index) => {
        const angle = rand() * Math.PI * 2;
        const speed = config.minSpeed + rand() * (config.maxSpeed - config.minSpeed);
        return {
            x: rand() * 32,
            y: rand() * 32,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: config.minSize + Math.floor(rand() * (config.maxSize - config.minSize + 1)),
            stretch: 1 + Math.floor(rand() * config.maxStretch),
            alpha: 0.42 + rand() * 0.34,
            phase: rand() * Math.PI * 2 + index,
            colorIndex: Math.floor(rand() * PARTICLE_PALETTES[themeType].length),
        };
    });
};

const drawRandomOverlayParticles = (
    ctx: CanvasRenderingContext2D,
    themeType: ThemeName,
    particles: OverlayParticle[],
    elapsed: number,
) => {
    const size = 128;
    const grid = 32;
    const px = size / grid;
    const palette = PARTICLE_PALETTES[themeType];
    ctx.clearRect(0, 0, size, size);

    const rect = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x) * px, Math.floor(y) * px, Math.ceil(w) * px, Math.ceil(h) * px);
    };

    particles.forEach((particle, index) => {
        const [r, g, b] = palette[particle.colorIndex % palette.length];
        const shimmer = 0.62 + Math.sin(elapsed * 1.35 + particle.phase) * 0.38;
        const alpha = Math.max(0, Math.min(1, particle.alpha * shimmer));
        const color = `rgba(${r},${g},${b},${alpha})`;
        const x = Math.floor(particle.x);
        const y = Math.floor(particle.y);

        if (themeType === 'ICE') {
            rect(x, y, particle.size + 1, 1, color);
            rect(x + 1, y - 1, 1, particle.size + 2, color);
        } else if (themeType === 'SKULL' || themeType === 'PYRAMID' || themeType === 'SKY') {
            const horizontal = Math.abs(particle.vx) >= Math.abs(particle.vy);
            if (horizontal) rect(x, y, particle.stretch, 1, color);
            else rect(x, y, 1, Math.min(3, particle.stretch), color);
        } else if (themeType === 'VOID') {
            rect(x, y, Math.min(2, particle.stretch), 1, color);
            if (index % 3 === 0) rect(x + 1, y + 1, 1, 1, color);
        } else {
            rect(x, y, particle.size, particle.size, color);
            if (index % 2 === 0) rect(x + 1, y, 1, 1, `rgba(${r},${g},${b},${alpha * 0.5})`);
        }
    });
};

const createAnimatedOverlayTexture = (themeType: ThemeName, spec: AnimatedOverlaySpec, repeat: THREE.Vector2) => {
    const size = usesExternalOverlayTile(themeType) ? EXTERNAL_GROUND_TILE_PIXELS : PROCEDURAL_OVERLAY_TILE_PIXELS;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) drawGroundOverlayLayer(ctx, themeType, spec.key);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(repeat.x, repeat.y);
    return texture;
};

const AnimatedGroundOverlay: React.FC<{
    width: number;
    height: number;
    boxDepth: number;
    themeType: ThemeName;
    mode: 'OVERWORLD' | 'BATTLE';
    uvScale: THREE.Vector2;
}> = ({ width, height, boxDepth, themeType, mode, uvScale }) => {
    const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
    const specs = useMemo(() => getAnimatedOverlaySpecs(themeType, mode), [themeType, mode]);
    const layers = useMemo(() => specs.map((spec) => {
        const texture = createAnimatedOverlayTexture(themeType, spec, uvScale);
        const canvas = texture.image as HTMLCanvasElement;

        return {
            spec,
            texture,
            ctx: spec.randomDrift ? canvas.getContext('2d') : null,
            particles: spec.randomDrift ? createRandomOverlayParticles(themeType, spec.key) : null,
        };
    }), [specs, themeType, uvScale]);

    useEffect(() => () => {
        layers.forEach((layer) => layer.texture.dispose());
    }, [layers]);

    useFrame(({ clock }, delta) => {
        layers.forEach((layer, index) => {
            const { spec, texture } = layer;
            if (spec.randomDrift && layer.ctx && layer.particles) {
                layer.particles.forEach((particle) => {
                    particle.x = (particle.x + particle.vx * delta + 32) % 32;
                    particle.y = (particle.y + particle.vy * delta + 32) % 32;
                });
                drawRandomOverlayParticles(layer.ctx, themeType, layer.particles, clock.elapsedTime);
                texture.needsUpdate = true;
            } else {
                texture.offset.x = (texture.offset.x + spec.speedX * delta) % 1;
                texture.offset.y = (texture.offset.y + spec.speedY * delta) % 1;
            }

            const material = materialRefs.current[index];
            if (material) {
                material.opacity = Math.max(0, spec.opacity + Math.sin(clock.elapsedTime * spec.pulseSpeed + index) * spec.pulse);
            }
        });
    });

    if (layers.length === 0) return null;

    return (
        <>
            {layers.map(({ spec, texture }, index) => (
                <mesh
                    key={spec.key}
                    position={[0, boxDepth / 2 + 0.018 + index * 0.004, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    renderOrder={1 + index}
                >
                    <planeGeometry args={[width, height]} />
                    <meshBasicMaterial
                        ref={(material) => {
                            materialRefs.current[index] = material;
                        }}
                        map={texture}
                        transparent
                        opacity={spec.opacity}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </>
    );
};

export const PixelGround: React.FC<PixelGroundProps> = ({ width, height, themeId, mode = 'OVERWORLD', aiConfig }) => {
    const themeType = useMemo(() => resolveThemeType(themeId, aiConfig), [themeId, aiConfig]);
    const tileWorldSize = mode === 'BATTLE' ? 4 : 5;
    const externalTileWorldSize = mode === 'BATTLE' ? 14 : 16;
    const uvScale = useMemo(() => new THREE.Vector2(width / tileWorldSize, height / tileWorldSize), [width, height, tileWorldSize]);
    const overlayUvScale = useMemo(
        () => usesExternalOverlayTile(themeType)
            ? getExternalGroundTileRepeat(width, height, externalTileWorldSize)
            : new THREE.Vector2(width / tileWorldSize, height / tileWorldSize),
        [themeType, width, height, externalTileWorldSize, tileWorldSize],
    );

    const texture = useMemo(() => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) drawGroundTile(ctx, themeType, mode);
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        
        tex.repeat.set(uvScale.x, uvScale.y);
        maybeApplyExternalGroundTile(tex, themeType, mode, width, height, externalTileWorldSize);
        
        return tex;
    }, [themeType, width, height, mode, uvScale, externalTileWorldSize]);

    const boxDepth = mode === 'BATTLE' ? 2.0 : 3.0;
    const sideColors = THEME_SIDE_COLORS[themeType] || THEME_SIDE_COLORS.FOREST;

    const sideMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: sideColors.side, roughness: 0.95, metalness: 0.05 }), [sideColors.side]);
    const bottomMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: sideColors.bottom, roughness: 1.0, metalness: 0.0 }), [sideColors.bottom]);

    // Box material order: +X, -X, +Y (top), -Y (bottom), +Z, -Z.
    // Keep generated ground art unlit so scene lighting does not darken the grass.
    const topMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    }, [texture]);

    const boxMaterials = useMemo(() => {
        return [sideMaterial, sideMaterial, topMaterial, bottomMaterial, sideMaterial, sideMaterial];
    }, [sideMaterial, bottomMaterial, topMaterial]);

    return (
        <group position={[0, -boxDepth / 2, 0]}>
            <mesh receiveShadow material={boxMaterials}>
                <boxGeometry args={[width, boxDepth, height]} />
            </mesh>
            <AnimatedGroundOverlay
                width={width}
                height={height}
                boxDepth={boxDepth}
                themeType={themeType}
                mode={mode}
                uvScale={overlayUvScale}
            />
        </group>
    );
};
