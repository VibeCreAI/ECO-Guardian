
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { ASSET_PATHS, getEnemySpriteSheetPath } from '../../assets';
import { drawEnemySheet, ENEMY_RENDER_TYPES, ENEMY_SHEET_HEIGHT, ENEMY_SHEET_WIDTH, isEnemyRenderType, isGhostEnemyType, usesPixelEnemyStyle } from './enemyDrawing';

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

interface PlayerSpriteProps {
    position: [number, number, number];
    scale?: number;
    facing: number;
    action: 'IDLE' | 'RUN';
    viewDirection: 'DOWN' | 'UP' | 'SIDE';
    isHit: boolean;
}

interface ExternalBossSpriteProps {
    position: [number, number, number];
    scale?: number;
    entity: any;
    opacity?: number;
    textureUrl: string;
}

const textureCache: Record<string, THREE.Texture> = {};
const MOBS: readonly string[] = ENEMY_RENDER_TYPES;
const textureLoader = new THREE.TextureLoader();

const createPixelDrawer = (ctx: CanvasRenderingContext2D, size: number, gridSize: number) => {
    const s = Math.floor(size / gridSize); 
    const p = (x: number, y: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.floor(x) * s, Math.floor(y) * s, s, s); };
    const r = (x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.floor(x) * s, Math.floor(y) * s, Math.ceil(w) * s, Math.ceil(h) * s); };
    return { p, r };
};

const generateTexture = (type: string, color: string, variant: string = '') => {
    const externalSpriteUrl = getEnemySpriteSheetPath(type);
    const cacheKey = externalSpriteUrl ? `external_${externalSpriteUrl}` : `${type}_${color}_${variant}`;
    if (textureCache[cacheKey]) return textureCache[cacheKey];

    if (externalSpriteUrl) {
        const tex = textureLoader.load(externalSpriteUrl);
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
        const { r } = createPixelDrawer(ctx, 64, 64); r(16, 56, 32, 4, 'rgba(0,0,0,0.2)');
        if (type.includes('TREE') || type === 'PALM' || type.includes('PILLAR') || type === 'SERVER') {
             const cTrunk = type.includes('MAGMA') ? '#7f1d1d' : (type === 'SERVER' ? '#1e293b' : '#5d4037'); const cTop = type.includes('MAGMA') ? '#ef4444' : (type === 'SERVER' ? '#22c55e' : '#15803d');
             if (type === 'PALM') { r(28, 30, 8, 34, '#78350f'); r(16, 12, 32, 24, '#65a30d'); } else if (type === 'SERVER') { r(20, 20, 24, 44, '#1e293b'); r(24, 24, 16, 2, '#4ade80'); r(24, 30, 16, 2, '#4ade80'); r(24, 36, 16, 2, '#4ade80'); } else { r(26, 44, 12, 20, cTrunk); r(16, 12, 32, 32, cTop); if(!type.includes('MAGMA')) r(20, 16, 10, 8, '#4ade80'); }
        } else if (type.includes('STONE') || type.includes('ROCK') || type === 'GRAVE' || type === 'RUIN') {
             const cMain = type.includes('MAGMA') ? '#7f1d1d' : (type === 'GRAVE' ? '#94a3b8' : '#57534e');
             if (type === 'GRAVE') { r(20, 32, 24, 32, cMain); r(16, 60, 32, 4, '#475569'); r(28, 36, 8, 20, '#cbd5e1'); r(22, 40, 20, 6, '#cbd5e1'); } else { r(12, 44, 40, 20, cMain); r(16, 40, 32, 4, type.includes('MAGMA') ? '#b91c1c' : '#78716c'); }
        } else if (type === 'MUSHROOM' || type === 'CRYSTAL' || type === 'NEON_SIGN' || type.includes('GATE') || type === 'CACTUS') {
             if (type === 'CRYSTAL') { r(28, 32, 8, 32, '#06b6d4'); r(20, 44, 8, 20, '#67e8f9'); r(36, 44, 8, 20, '#67e8f9'); } else if (type === 'CACTUS') { r(28, 24, 10, 40, '#15803d'); r(18, 32, 10, 10, '#15803d'); r(18, 24, 6, 8, '#15803d'); r(38, 28, 10, 10, '#15803d'); r(42, 20, 6, 8, '#15803d'); } else if (type === 'NEON_SIGN') { r(12, 24, 40, 24, '#1e293b'); r(16, 28, 32, 16, '#f0abfc'); r(30, 48, 4, 16, '#475569'); } else if (type === 'MUSHROOM') { r(28, 44, 8, 20, '#fef3c7'); r(20, 28, 24, 16, '#dc2626'); r(24, 32, 4, 4, 'white'); r(36, 36, 4, 4, 'white'); } else { r(24, 40, 16, 24, '#eab308'); }
        } else { r(24, 40, 16, 24, '#888'); }
    }
    const tex = new THREE.CanvasTexture(canvas);
    const useNearest = usesPixelEnemyStyle(type);
    tex.minFilter = isEnemyRenderType(type) ? (useNearest ? THREE.NearestFilter : THREE.LinearFilter) : THREE.NearestFilter;
    tex.magFilter = isEnemyRenderType(type) ? (useNearest ? THREE.NearestFilter : THREE.LinearFilter) : THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
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
    
    useMemo(() => {
        if (!texture) return;
        const imageWidth = (texture.image as { width?: number } | undefined)?.width ?? 1024;
        const frameInset = 0.5 / imageWidth;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
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
            if (entity.dashTime && entity.dashTime > 0.3) { 
                x += (Math.random() - 0.5) * 0.2; 
                z += (Math.random() - 0.5) * 0.2; 
            }
            meshRef.current.position.set(x, yPos, z);
            
            meshRef.current.scale.set(scale, scale, 1);
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
        <mesh ref={meshRef} position={position} scale={[scale, scale, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial ref={materialRef} map={texture} transparent alphaTest={0.01} side={THREE.DoubleSide} />
            {entity && <BossHealthBar entity={entity} />}
            {entity && <BossTauntBubble entity={entity} />}
        </mesh>
    );
};

export const PlayerSpriteBillboard: React.FC<PlayerSpriteProps> = ({ position, scale = 1.0, facing, action, viewDirection, isHit }) => {
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

    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock, camera }) => {
        if (!meshRef.current || !matRef.current) return;
        meshRef.current.quaternion.copy(camera.quaternion);
        let activeTex = idleTex;
        if (action === 'RUN') { if (viewDirection === 'UP') activeTex = walkNorthTex; else if (viewDirection === 'DOWN') activeTex = walkSouthTex; else if (viewDirection === 'SIDE') { if (facing === 1) activeTex = walkEastTex; else activeTex = walkWestTex; } }
        if (matRef.current.map !== activeTex) { matRef.current.map = activeTex; matRef.current.needsUpdate = true; }
        const fps = 8; const t = clock.elapsedTime; const totalFrames = 16; const frame = Math.floor(t * fps) % totalFrames;
        if (activeTex) { const col = frame % 4; const row = Math.floor(frame / 4); activeTex.offset.x = col * 0.25; activeTex.offset.y = 0.75 - (row * 0.25); }
        if (isHit) { matRef.current.color.setHex(0xff0000); matRef.current.emissive.setHex(0xff0000); matRef.current.emissiveIntensity = 0.5; } else { matRef.current.color.setHex(0xffffff); matRef.current.emissive.setHex(0x000000); matRef.current.emissiveIntensity = 0; }
    });

    return <mesh ref={meshRef} position={position} scale={[scale, scale, 1]}><planeGeometry args={[1, 1]} /><meshStandardMaterial ref={matRef} map={idleTex} transparent alphaTest={0.5} side={THREE.DoubleSide} /></mesh>;
};

export const SpriteBillboard: React.FC<SpriteBillboardProps> = ({ position, color, scale = 1, facing = 1, renderOrder = 0, isHit = false, type, entity, action = 'IDLE', viewDirection = 'DOWN', variant }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useMemo(() => generateTexture(type || 'UNKNOWN', color, variant), [type, color, variant]);

  useEffect(() => {
      if (type === 'BOSS' || (type && MOBS.includes(type))) { texture.repeat.set(0.5, 1); texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; } else { texture.repeat.set(1, 1); texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; }
      texture.needsUpdate = true;
  }, [texture, type]);

  useFrame(({ camera, clock }) => {
    if (!meshRef.current) return;
    meshRef.current.quaternion.copy(camera.quaternion);
    if (entity) {
        const yPos = (entity.type === 'BOSS') ? 2.25 : 0.9; let x = entity.x; let z = entity.z;
        if (entity.dashTime && entity.dashTime > 0.3) { x += (Math.random() - 0.5) * 0.2; z += (Math.random() - 0.5) * 0.2; }
        meshRef.current.position.set(x, yPos, z); 
        const currentFacing = entity.facing || 1; 
        
        let s = scale;
        // Pulse animation for XP_ORB and CO2_ORB to increase visibility
        if (type === 'XP_ORB' || type === 'CO2_ORB') {
            s = scale * (1.0 + Math.sin(clock.elapsedTime * 4) * 0.15);
        }

        meshRef.current.scale.set(s * Math.sign(currentFacing), s, 1);
    } 
    if (materialRef.current) {
        // Priority to explicit opacity (Boss Fading)
        if (entity && entity.opacity !== undefined) {
            materialRef.current.opacity = entity.opacity;
            materialRef.current.transparent = true;
        } else {
            // Standard Mobs logic
            if (type && isGhostEnemyType(type)) { 
                materialRef.current.transparent = true; 
                materialRef.current.opacity = 0.7 + Math.sin(clock.elapsedTime * 3) * 0.1; 
            } else { 
                materialRef.current.transparent = true; 
                materialRef.current.opacity = 1.0; 
            }
        }

        let hit = isHit; if (entity && entity.lastHit) hit = (clock.elapsedTime - entity.lastHit < 0.1);
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
    const t = clock.elapsedTime;
    if (type === 'BOSS' || (type && MOBS.includes(type))) { const speed = (type?.includes('BOSS')) ? 5 : 4; const frame = Math.floor(t * speed) % 2; texture.offset.x = frame * 0.5; texture.offset.y = 0; } else { texture.offset.x = 0; texture.offset.y = 0; }
  });

  const initPos = position || [0, 0, 0]; const isBoss = type === 'BOSS';
  return (
    <mesh ref={meshRef} position={initPos as any} scale={[scale * Math.sign(facing), scale, 1]} renderOrder={renderOrder}><planeGeometry args={[1, 1]} /><meshStandardMaterial ref={materialRef} map={texture} transparent alphaTest={0.01} side={THREE.DoubleSide} />{isBoss && entity && <BossHealthBar entity={entity} />}{isBoss && entity && <BossTauntBubble entity={entity} />}</mesh>
  );
};

export const PropSprite: React.FC<PropSpriteProps> = ({ position, type, scale = 1.0 }) => {
    return <SpriteBillboard position={position} color="#ffffff" scale={scale} type={type} />;
};
