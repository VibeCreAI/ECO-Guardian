
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AiStageConfig } from '../../types';

interface PixelGroundProps {
    width: number;
    height: number;
    themeId: number;
    mode?: 'OVERWORLD' | 'BATTLE';
    aiConfig?: AiStageConfig | null;
}

export const PixelGround: React.FC<PixelGroundProps> = ({ width, height, themeId, mode = 'OVERWORLD', aiConfig }) => {
    const texture = useMemo(() => {
        // We generate a 64x64 texture, but we treat it as a 16x16 grid of 4x4 "big pixels"
        // This creates a chunky, retro, clean look.
        const size = 64; 
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const PX = 4; // Size of our "big pixel"
        
        if (ctx) {
            // --- DRAWING HELPERS ---
            const fill = (c: string) => {
                ctx.fillStyle = c;
                ctx.fillRect(0, 0, size, size);
            };

            const rect = (x: number, y: number, w: number, h: number, c: string) => {
                ctx.fillStyle = c;
                ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
            };
            
            // Draws a scattered pattern of big pixels
            const scatter = (count: number, color: string) => {
                for(let i=0; i<count; i++) {
                    const x = Math.floor(Math.random() * 16);
                    const y = Math.floor(Math.random() * 16);
                    rect(x, y, 1, 1, color);
                }
            };

            // --- THEME SELECTION ---
            let themeType = 'FOREST';
            const cycle = ((themeId - 1) % 10) + 1;
            
            if (aiConfig?.theme?.landmarkType) {
                themeType = aiConfig.theme.landmarkType;
            } else {
                switch(cycle) {
                    case 2: themeType = 'SKULL'; break; // Graveyard
                    case 3: themeType = 'ICE'; break;
                    case 4: themeType = 'VOLCANO'; break;
                    case 5: themeType = 'PYRAMID'; break; // Desert
                    case 6: themeType = 'MUSHROOM'; break; // Swamp
                    case 7: themeType = 'CYBER'; break;
                    case 8: themeType = 'VOID'; break;
                    case 9: themeType = 'SKY'; break;
                    case 10: themeType = 'HELL'; break;
                    default: themeType = 'FOREST'; break;
                }
            }

            // --- CHUNKY PROCEDURAL GENERATION ---
            
            if (themeType === 'FOREST') {
                fill('#4ade80'); // Bright Green Base
                // Large Checkerboard (8x8 "big pixels" = 32x32 real pixels)
                rect(0, 0, 8, 8, '#22c55e');
                rect(8, 8, 8, 8, '#22c55e');
                
                // Cute details
                rect(2, 2, 1, 1, '#16a34a'); // Grass tuft
                rect(2, 3, 1, 1, '#16a34a');
                rect(10, 12, 1, 1, '#facc15'); // Flower center
                rect(10, 11, 1, 1, '#ffffff'); // Petal
                rect(10, 13, 1, 1, '#ffffff');
                rect(9, 12, 1, 1, '#ffffff');
                rect(11, 12, 1, 1, '#ffffff');
            }
            else if (themeType === 'SKULL') { // Graveyard
                fill('#334155'); // Slate
                // Big Stone Tiles
                rect(1, 1, 6, 6, '#475569');
                rect(9, 1, 6, 6, '#475569');
                rect(1, 9, 6, 6, '#475569');
                rect(9, 9, 6, 6, '#475569');
                // Cracks
                rect(2, 2, 1, 2, '#1e293b');
                rect(12, 10, 2, 1, '#1e293b');
            }
            else if (themeType === 'ICE') {
                fill('#e0f2fe'); // Ice White
                // Glints / Reflections
                rect(2, 2, 1, 1, '#ffffff');
                rect(3, 3, 1, 1, '#ffffff');
                rect(8, 10, 1, 1, '#ffffff');
                rect(9, 11, 1, 1, '#ffffff');
                // Subtle blue shading
                rect(0, 15, 16, 1, '#bae6fd');
                rect(15, 0, 1, 16, '#bae6fd');
            }
            else if (themeType === 'VOLCANO') {
                fill('#450a0a'); // Dark Rock
                // Lava Veins (Grid pattern)
                rect(4, 0, 2, 16, '#ef4444');
                rect(0, 10, 16, 2, '#ef4444');
                // Hot spots
                rect(4, 10, 2, 2, '#facc15'); // Intersection glow
                scatter(3, '#7f1d1d');
            }
            else if (themeType === 'PYRAMID') { // Desert
                fill('#fcd34d'); // Sand
                // Dunes (Horizontal stripes)
                rect(0, 4, 16, 2, '#fbbf24');
                rect(0, 12, 16, 2, '#fbbf24');
                // Pebbles
                rect(3, 2, 1, 1, '#d97706');
                rect(12, 10, 1, 1, '#d97706');
            }
            else if (themeType === 'MUSHROOM') { // Swamp
                fill('#3f6212'); // Dark Green
                // Bubbles (2x2 squares)
                rect(2, 2, 3, 3, '#65a30d');
                rect(3, 3, 1, 1, '#bef264'); // Highlight
                
                rect(10, 8, 4, 4, '#65a30d');
                rect(11, 9, 1, 1, '#bef264');
            }
            else if (themeType === 'CYBER') {
                fill('#020617'); // Black
                // Neon Grid
                ctx.strokeStyle = '#0ea5e9';
                ctx.lineWidth = PX; 
                ctx.strokeRect(0, 0, size, size); // Border
                
                // Circuit Trace
                rect(4, 4, 1, 8, '#0369a1');
                rect(4, 4, 8, 1, '#0369a1');
                rect(12, 4, 1, 1, '#0ea5e9'); // Node
            }
            else if (themeType === 'VOID') {
                fill('#2e1065'); // Purple
                // Checkerboard variant
                rect(0, 0, 8, 8, '#3b0764');
                rect(8, 8, 8, 8, '#3b0764');
                // Stars
                rect(4, 4, 1, 1, '#e9d5ff');
                rect(12, 12, 1, 1, '#e9d5ff');
                rect(10, 2, 1, 1, '#a855f7');
            }
            else if (themeType === 'SKY') {
                fill('#bae6fd'); // Sky Blue
                // Cloud Blobs (White)
                rect(2, 4, 4, 2, '#ffffff');
                rect(3, 3, 2, 4, '#ffffff');
                
                rect(10, 10, 4, 2, '#ffffff');
                rect(11, 9, 2, 4, '#ffffff');
            }
            else if (themeType === 'HELL') {
                fill('#7f1d1d'); // Red Rock
                // Dark Patches
                rect(0, 0, 4, 4, '#450a0a');
                rect(12, 0, 4, 4, '#450a0a');
                rect(0, 12, 4, 4, '#450a0a');
                rect(12, 12, 4, 4, '#450a0a');
                rect(6, 6, 4, 4, '#991b1b');
            }
            else {
                // Fallback Checkerboard
                fill('#555');
                rect(0, 0, 8, 8, '#666');
                rect(8, 8, 8, 8, '#666');
            }

            // BATTLE MODE: Add a clear boundary or grid feel
            if (mode === 'BATTLE') {
               ctx.strokeStyle = 'rgba(0,0,0,0.2)';
               ctx.lineWidth = 2; // Thin line relative to canvas
               ctx.strokeRect(0, 0, size, size);
            }
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        
        // REPEAT SCALE
        // Since the tile is now bolder/simpler, we can repeat it a bit more often without it looking noisy.
        // Or keep it large for a "Mario Kart" floor vibe.
        // Current width is 100.
        // If we want the tile (64 units visual) to appear roughly 4 units in world space:
        // 100 / 4 = 25 repeats.
        
        const tileWorldSize = mode === 'BATTLE' ? 4 : 5; 
        tex.repeat.set(width / tileWorldSize, height / tileWorldSize);
        
        return tex;
    }, [themeId, width, height, mode, aiConfig]);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial map={texture} roughness={0.9} metalness={0.1} />
        </mesh>
    );
};
