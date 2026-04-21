import * as THREE from 'three';

export const PROJECTILE_SCALE: Record<string, [number, number]> = {
  FIREBALL: [1.2, 1.2],
  ORBITAL: [1.0, 1.0],
  AXE: [1.0, 1.0],
  DAGGER: [0.6, 0.6],
  MAGIC_MISSILE: [0.7, 0.7],
  MAGIC_ARROW: [1.2, 1.2],
  FLAMETHROWER: [0.6, 0.6],
  JAVELIN: [1.5, 1.5],
  SPEAR: [1.2, 2.4],
  SLIME_BALL: [1.0, 1.0],
  SHURIKEN: [0.8, 0.8],
  KATANA: [4.0, 4.0],
  TOXIN_GUN: [0.5, 0.5],
};

export const SPIN_VARIANTS = new Set<string>(['AXE', 'CROSS', 'SHURIKEN']);
export const ALIGN_VARIANTS = new Set<string>(['DAGGER', 'ICE_SHARD', 'MAGIC_ARROW', 'JAVELIN', 'SPEAR', 'KATANA']);
export const DEFAULT_SCALE: [number, number] = [0.8, 0.8];

export const textureCache: Record<string, THREE.Texture> = {};

export const getProjectileTexture = (variant: string, type: string, color: string): THREE.Texture => {
    const key = `${variant}_${type}_${color}_v6`;
    if (textureCache[key]) return textureCache[key];
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    const drawRect = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x,y,w,h); };
    ctx.clearRect(0, 0, 64, 64);
    if (type === 'ORBITAL') { if (variant === 'BIBLE') { ctx.fillStyle = '#78350f'; ctx.fillRect(12, 8, 40, 48); ctx.fillStyle = '#fef3c7'; ctx.fillRect(16, 12, 32, 40); ctx.fillStyle = '#fbbf24'; ctx.fillRect(28, 24, 8, 16); ctx.fillRect(24, 28, 16, 8); } else { ctx.fillStyle = '#94a3b8'; ctx.fillRect(16, 12, 32, 28); ctx.fillRect(18, 40, 28, 4); ctx.fillRect(20, 44, 24, 4); ctx.fillRect(24, 48, 16, 4); ctx.fillRect(28, 52, 8, 4); ctx.fillStyle = '#1d4ed8'; ctx.fillRect(20, 16, 24, 24); ctx.fillRect(22, 40, 20, 4); ctx.fillRect(24, 44, 16, 4); ctx.fillRect(28, 48, 8, 4); ctx.fillStyle = '#f8fafc'; ctx.fillRect(28, 16, 8, 36); ctx.fillRect(20, 24, 24, 8); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(20, 16, 4, 12); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(40, 28, 4, 12); } }
    else if (variant === 'AXE') { drawRect(30, 4, 4, 56, '#451a03'); drawRect(28, 56, 8, 4, '#78350f'); drawRect(26, 12, 12, 16, '#64748b'); drawRect(14, 12, 12, 16, '#94a3b8'); drawRect(10, 8, 4, 24, '#cbd5e1'); drawRect(38, 12, 12, 16, '#94a3b8'); drawRect(50, 8, 4, 24, '#cbd5e1'); drawRect(12, 10, 2, 6, '#ffffff'); }
    else if (variant === 'CROSS') { const gold = '#fbbf24'; const blue = '#3b82f6'; const lightBlue = '#93c5fd'; drawRect(24, 4, 16, 56, blue); drawRect(28, 8, 8, 48, lightBlue); drawRect(4, 24, 56, 16, blue); drawRect(8, 28, 48, 8, lightBlue); drawRect(24, 24, 16, 16, gold); drawRect(28, 28, 8, 8, '#fffbeb'); }
    else if (variant === 'DAGGER') { drawRect(28, 44, 8, 12, '#713f12'); drawRect(24, 40, 16, 4, '#eab308'); drawRect(28, 56, 8, 4, '#eab308'); drawRect(28, 8, 8, 32, '#cbd5e1'); drawRect(30, 8, 4, 32, '#f1f5f9'); drawRect(28, 4, 8, 4, '#cbd5e1'); }
    else if (variant === 'SPEAR') { drawRect(30, 8, 4, 48, '#94a3b8'); drawRect(28, 4, 8, 12, '#cbd5e1'); drawRect(30, 0, 4, 4, '#ffffff'); }
    else if (variant === 'KATANA') { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 10; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(32, 64, 48, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#93c5fd'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(32, 64, 48, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); }
    else if (variant === 'SLIME_BALL') { ctx.fillStyle = '#bef264'; ctx.beginPath(); ctx.arc(32, 32, 20, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#f7fee7'; ctx.beginPath(); ctx.arc(24, 24, 6, 0, Math.PI*2); ctx.fill(); }
    else if (variant === 'SHURIKEN') { ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(32, 4); ctx.lineTo(40, 24); ctx.lineTo(60, 32); ctx.lineTo(40, 40); ctx.lineTo(32, 60); ctx.lineTo(24, 40); ctx.lineTo(4, 32); ctx.lineTo(24, 24); ctx.fill(); ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(32, 32, 6, 0, Math.PI*2); ctx.fill(); }
    else if (variant === 'JAVELIN') { drawRect(30, 12, 4, 48, '#fbbf24'); ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(38, 16); ctx.lineTo(26, 16); ctx.fill(); drawRect(28, 16, 8, 4, '#22d3ee'); drawRect(28, 60, 8, 4, '#22d3ee'); }
    else if (variant === 'TOXIN_GUN') { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(32, 32, 8, 0, Math.PI*2); ctx.fill(); }
    else if (variant === 'TOXIC_FLASK') { ctx.fillStyle = '#a3e635'; ctx.beginPath(); ctx.arc(32, 40, 14, 0, Math.PI*2); ctx.fill(); drawRect(26, 16, 12, 14, '#fafafa'); drawRect(24, 12, 16, 6, '#713f12'); drawRect(36, 36, 4, 4, 'white'); drawRect(38, 32, 2, 2, 'white'); }
    else if (variant === 'POISON_CLOUD' || variant === 'PLAGUE_SPREADER') { ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,64,64); const g = ctx.createRadialGradient(32,32, 8, 32,32, 32); g.addColorStop(0, '#84cc16'); g.addColorStop(0.6, '#3f6212'); g.addColorStop(1, 'rgba(63, 98, 18, 0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#bef264'; ctx.beginPath(); ctx.arc(20, 20, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(44, 40, 4, 0, Math.PI*2); ctx.fill(); }
    else if (variant === 'MAGIC_ARROW') { ctx.fillStyle = '#d8b4fe'; ctx.beginPath(); ctx.moveTo(32, 4); ctx.lineTo(48, 28); ctx.lineTo(32, 24); ctx.lineTo(16, 28); ctx.fill(); ctx.fillStyle = '#a855f7'; ctx.fillRect(28, 24, 8, 32); ctx.fillStyle = '#e9d5ff'; ctx.beginPath(); ctx.moveTo(28, 56); ctx.lineTo(20, 60); ctx.lineTo(28, 60); ctx.fill(); ctx.beginPath(); ctx.moveTo(36, 56); ctx.lineTo(44, 60); ctx.lineTo(36, 60); ctx.fill(); }
    else if (variant === 'FIREBALL') { ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI*2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.beginPath(); ctx.arc(32, 32, 20, 0, Math.PI*2); ctx.fillStyle = 'rgba(255, 200, 0, 0.8)'; ctx.fill(); drawRect(28, 4, 8, 12, '#ef4444'); drawRect(28, 48, 8, 12, '#ef4444'); drawRect(4, 28, 12, 8, '#ef4444'); drawRect(48, 28, 12, 8, '#ef4444'); }
    else if (variant === 'FLAMETHROWER') { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(32, 32, 16, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(32, 32, 8, 0, Math.PI*2); ctx.fill(); drawRect(10, 10, 6, 6, '#fdba74'); drawRect(48, 48, 6, 6, '#fdba74'); drawRect(48, 10, 6, 6, '#fdba74'); }
    else if (variant === 'LAVA_POOL') { ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,64,64); const g = ctx.createRadialGradient(32,32, 10, 32,32, 32); g.addColorStop(0, '#facc15'); g.addColorStop(0.4, '#ef4444'); g.addColorStop(0.8, '#991b1b'); g.addColorStop(1, 'rgba(69, 10, 10, 0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(20, 24, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(44, 36, 3, 0, Math.PI*2); ctx.fill(); }
    else if (variant === 'ICE_SHARD') { ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.moveTo(32, 4); ctx.lineTo(48, 32); ctx.lineTo(32, 60); ctx.lineTo(16, 32); ctx.fill(); ctx.fillStyle = '#cffafe'; ctx.beginPath(); ctx.moveTo(32, 4); ctx.lineTo(40, 32); ctx.lineTo(32, 60); ctx.fill(); }
    else if (variant === 'MAGIC_MISSILE') { drawRect(28, 8, 8, 48, '#22d3ee'); drawRect(8, 28, 48, 8, '#22d3ee'); drawRect(24, 24, 16, 16, '#ffffff'); drawRect(20, 20, 4, 4, '#06b6d4'); drawRect(40, 20, 4, 4, '#06b6d4'); drawRect(20, 40, 4, 4, '#06b6d4'); drawRect(40, 40, 4, 4, '#06b6d4'); }
    else { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(32,32, 24, 0, Math.PI*2); ctx.fill(); }
    const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter; textureCache[key] = tex; return tex;
};

export const projectileTextureKey = (variant: string, type: string, color: string): string =>
    `${variant}_${type}_${color}_v6`;
