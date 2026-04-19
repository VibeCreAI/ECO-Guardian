
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AiStageConfig } from '../../types';
import { getGroundTilePath } from '../../assets';

interface PixelGroundProps {
    width: number;
    height: number;
    themeId: number;
    mode?: 'OVERWORLD' | 'BATTLE';
    aiConfig?: AiStageConfig | null;
}

type ThemeName = 'FOREST' | 'SKULL' | 'ICE' | 'VOLCANO' | 'PYRAMID' | 'MUSHROOM' | 'CYBER' | 'VOID' | 'SKY' | 'HELL';

const groundTileAvailabilityCache: Record<string, Promise<boolean>> = {};

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

const maybeApplyExternalGroundTile = (texture: THREE.Texture, themeType: ThemeName, mode: 'OVERWORLD' | 'BATTLE') => {
    const tileUrl = getGroundTilePath(themeType, mode);
    if (!tileUrl || typeof window === 'undefined' || typeof fetch !== 'function' || typeof Image === 'undefined') return;

    if (!groundTileAvailabilityCache[tileUrl]) {
        groundTileAvailabilityCache[tileUrl] = fetch(tileUrl, { method: 'HEAD', cache: 'force-cache' })
            .then((response) => {
                const contentType = response.headers.get('content-type') ?? '';
                return response.ok && contentType.toLowerCase().startsWith('image/');
            })
            .catch(() => false);
    }

    groundTileAvailabilityCache[tileUrl].then((available) => {
        if (!available) return;
        const image = new Image();
        image.onload = () => {
            texture.image = image;
            texture.needsUpdate = true;
        };
        image.src = tileUrl;
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

export const PixelGround: React.FC<PixelGroundProps> = ({ width, height, themeId, mode = 'OVERWORLD', aiConfig }) => {
    const themeType = useMemo(() => resolveThemeType(themeId, aiConfig), [themeId, aiConfig]);
    const tileWorldSize = mode === 'BATTLE' ? 4 : 5;
    const uvScale = useMemo(() => new THREE.Vector2(width / tileWorldSize, height / tileWorldSize), [width, height, tileWorldSize]);

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
        maybeApplyExternalGroundTile(tex, themeType, mode);
        
        return tex;
    }, [themeType, width, height, mode, uvScale]);

    const boxDepth = mode === 'BATTLE' ? 2.0 : 3.0;
    const sideColors = THEME_SIDE_COLORS[themeType] || THEME_SIDE_COLORS.FOREST;

    const sideMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: sideColors.side, roughness: 0.95, metalness: 0.05 }), [sideColors.side]);
    const bottomMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: sideColors.bottom, roughness: 1.0, metalness: 0.0 }), [sideColors.bottom]);

    // Box material order: +X, -X, +Y (top), -Y (bottom), +Z, -Z
    const topMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.1 });
    }, [texture]);

    const boxMaterials = useMemo(() => {
        return [sideMaterial, sideMaterial, topMaterial, bottomMaterial, sideMaterial, sideMaterial];
    }, [sideMaterial, bottomMaterial, topMaterial]);

    return (
        <group position={[0, -boxDepth / 2, 0]}>
            <mesh receiveShadow material={boxMaterials}>
                <boxGeometry args={[width, boxDepth, height]} />
            </mesh>
        </group>
    );
};
