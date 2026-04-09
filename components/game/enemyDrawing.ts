import type { EnemyMobType } from '../../types';

type EnemyCategory = 'FAST' | 'MEDIUM' | 'TANK';
type EnemyFamily = 'winged' | 'walker' | 'serpent' | 'orb' | 'cloud' | 'vine' | 'heavy';
export type EnemyRenderType = EnemyMobType | 'MISINFORMATION';

type ArtSpec = {
  family: EnemyFamily;
  variant: string;
  primary: string;
  secondary: string;
  accent: string;
  glow?: string;
};

type GradientStop = [number, string];

const TAU = Math.PI * 2;
const FRAME_SIZE = 256;

export const ENEMY_SPRITE_SIZE = FRAME_SIZE;
export const ENEMY_SHEET_WIDTH = FRAME_SIZE * 2;
export const ENEMY_SHEET_HEIGHT = FRAME_SIZE;

export const STAGE_ENEMY_POOLS = [
  ['BOTTLE_SPRITE', 'WRAPPER_MOTH', 'STRAW_CRAWLER', 'SIXPACK_VINE', 'STYROFOAM_TREANT', 'COMPOST_HULK'],
  ['CIRCUIT_WRAITH', 'WIRE_PHANTOM', 'BATTERY_ZOMBIE', 'MONITOR_GHOUL', 'MOTHERBOARD_GOLEM', 'PRINTER_REVENANT'],
  ['COOLANT_WISP', 'FAN_BLADE_DJINN', 'FROZEN_PHONE', 'FROST_CABLE', 'SERVER_RACK_YETI', 'CRYO_DUMP_BEAST'],
  ['EMBER_BAG', 'ASH_FLIER', 'SLAG_DRUM', 'SMELT_RAT', 'FURNACE_TITAN', 'REFINERY_COLOSSUS'],
  ['GLASS_SCARAB', 'SILICON_WASP', 'SAND_BATTERY', 'DUST_FILTER', 'PYRAMID_JUNK', 'DUNE_COMPACTOR'],
  ['SPORE_AEROSOL', 'SWAMP_DIAPER', 'ALGAE_BARREL', 'FUNGAL_TIRE', 'SLUDGE_TOAD', 'BOG_HEAP'],
  ['NEON_WRAPPER', 'DRONE_LITTER', 'VENDING_HUSK', 'TRAFFIC_CONE_BOT', 'DUMPSTER_MECH', 'BILLBOARD_TANK'],
  ['VOID_PARTICLE', 'NULL_EMISSION', 'ENTROPY_CAN', 'STATIC_WASTE', 'ABYSS_LANDFILL', 'OBLIVION_SLUDGE'],
  ['CLOUD_BAG', 'CONTRAIL_SERPENT', 'SATELLITE_JUNK', 'DATA_SMOG', 'STRATOSPHERE_HEAP', 'OZONE_EATER'],
  ['HELLFIRE_WRAPPER', 'DAMNED_DRONE', 'INFERNAL_BARREL', 'BRIMSTONE_PHONE', 'WASTE_DEMON', 'LANDFILL_ARCHFIEND'],
] as const satisfies readonly (readonly EnemyMobType[])[];

const flattenStageSlice = (start: number, end: number) =>
  STAGE_ENEMY_POOLS.flatMap(stage => stage.slice(start, end)) as EnemyMobType[];

export const ALL_ENEMY_TYPES = STAGE_ENEMY_POOLS.flatMap(stage => [...stage]) as EnemyMobType[];
export const FAST_ENEMY_TYPES = flattenStageSlice(0, 2);
export const MEDIUM_ENEMY_TYPES = flattenStageSlice(2, 4);
export const TANK_ENEMY_TYPES = flattenStageSlice(4, 6);
export const RANGED_ENEMY_TYPES = STAGE_ENEMY_POOLS.flatMap(stage => [stage[0], stage[2]]) as EnemyMobType[];
export const LARGE_ENEMY_TYPES = [...TANK_ENEMY_TYPES];
export const KNOCKBACK_RESISTANT_ENEMY_TYPES = [...TANK_ENEMY_TYPES];
export const GHOST_ENEMY_TYPES = [
  'VOID_PARTICLE',
  'NULL_EMISSION',
  'COOLANT_WISP',
  'SPORE_AEROSOL',
  'CIRCUIT_WRAITH',
  'WIRE_PHANTOM',
  'CLOUD_BAG',
  'CONTRAIL_SERPENT',
] as const satisfies readonly EnemyRenderType[];
export const ENEMY_RENDER_TYPES = [...ALL_ENEMY_TYPES, 'MISINFORMATION'] as const satisfies readonly EnemyRenderType[];
const PIXEL_STAGE_ONE_TYPES = [...STAGE_ENEMY_POOLS[0]] as const;

const ENEMY_CATEGORY_BY_TYPE = Object.fromEntries([
  ...FAST_ENEMY_TYPES.map(type => [type, 'FAST']),
  ...MEDIUM_ENEMY_TYPES.map(type => [type, 'MEDIUM']),
  ...TANK_ENEMY_TYPES.map(type => [type, 'TANK']),
]) as Record<EnemyMobType, EnemyCategory>;

const enemySet = new Set<string>(ALL_ENEMY_TYPES);
const renderSet = new Set<string>(ENEMY_RENDER_TYPES);
const largeSet = new Set<string>(LARGE_ENEMY_TYPES);
const resistSet = new Set<string>(KNOCKBACK_RESISTANT_ENEMY_TYPES);
const ghostSet = new Set<string>(GHOST_ENEMY_TYPES);
const rangedSet = new Set<string>(RANGED_ENEMY_TYPES);
const pixelStageOneSet = new Set<string>(PIXEL_STAGE_ONE_TYPES);

export const isEnemyMobType = (type: string): type is EnemyMobType => enemySet.has(type);
export const isEnemyRenderType = (type: string): type is EnemyRenderType => renderSet.has(type);
export const isLargeEnemyType = (type: string) => largeSet.has(type);
export const isKnockbackResistantEnemyType = (type: string) => resistSet.has(type);
export const isGhostEnemyType = (type: string) => ghostSet.has(type);
export const usesPixelEnemyStyle = (type: string) => pixelStageOneSet.has(type);

export const getEnemyCombatProfile = (type: EnemyMobType) => {
  const category = ENEMY_CATEGORY_BY_TYPE[type];
  if (category === 'FAST') return { category, speed: 4.0, hpMod: 0.6, damageMod: 1.0, attackRange: rangedSet.has(type) ? 6 : 1 };
  if (category === 'TANK') return { category, speed: 1.2, hpMod: 2.5, damageMod: 1.5, attackRange: rangedSet.has(type) ? 6 : 1 };
  return { category: 'MEDIUM' as const, speed: 3.0, hpMod: 0.8, damageMod: 1.0, attackRange: rangedSet.has(type) ? 6 : 1 };
};

const withState = (ctx: CanvasRenderingContext2D, draw: () => void) => {
  ctx.save();
  draw();
  ctx.restore();
};

const gradient = <T extends CanvasGradient>(g: T, stops: GradientStop[]) => {
  stops.forEach(([stop, color]) => g.addColorStop(stop, color));
  return g;
};

const linear = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: GradientStop[]) =>
  gradient(ctx.createLinearGradient(x0, y0, x1, y1), stops);

const radial = (ctx: CanvasRenderingContext2D, x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, stops: GradientStop[]) =>
  gradient(ctx.createRadialGradient(x0, y0, r0, x1, y1, r1), stops);

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const fillRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string) => {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
};

const drawShadow = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.22) => {
  withState(ctx, () => {
    ctx.fillStyle = radial(ctx, cx, cy, 0, cx, cy, Math.max(rx, ry), [[0, `rgba(2,6,23,${alpha})`], [1, 'rgba(2,6,23,0)']]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.fill();
  });
};

const drawEye = (ctx: CanvasRenderingContext2D, x: number, y: number, iris: string, glow?: string, scale = 1) => {
  withState(ctx, () => {
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = radial(ctx, x - 1, y - 1, 0, x, y, 8 * scale, [[0, '#fff'], [0.35, iris], [1, 'rgba(0,0,0,0.95)']]);
    ctx.beginPath();
    ctx.ellipse(x, y, 5.5 * scale, 7 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.beginPath();
    ctx.arc(x + scale, y, 2.3 * scale, 0, TAU);
    ctx.fill();
  });
};

const drawCable = (ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: string, width: number, glow?: string) => {
  if (points.length < 2) return;
  withState(ctx, () => {
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    ctx.stroke();
  });
};

const drawSmoke = (ctx: CanvasRenderingContext2D, blobs: Array<[number, number, number, number, string, number]>) => {
  blobs.forEach(([x, y, rx, ry, color, alpha]) => {
    withState(ctx, () => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.fill();
    });
  });
};

const drawWing = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: number, fill: string | CanvasGradient, stroke: string) => {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(width * 0.2, -height * 0.45, width * 0.95, -height * 0.05, width, height * 0.18);
    ctx.bezierCurveTo(width * 0.6, height * 0.55, width * 0.24, height * 0.52, 0, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
};

const drawSpark = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rotation = 0) => {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(0, size * 0.7);
    ctx.stroke();
  });
};

const drawMushroom = (ctx: CanvasRenderingContext2D, x: number, y: number, cap: string, glow?: string) => {
  withState(ctx, () => {
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 8;
    }
    fillRoundRect(ctx, x - 4, y, 8, 16, 4, '#e7e5e4');
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.arc(x, y, 10, Math.PI, TAU);
    ctx.fill();
  });
};

const createPixelPainter = (ctx: CanvasRenderingContext2D, cx: number, y: number) => {
  const px = 7;
  const ox = Math.round(cx - 16 * px);
  const oy = Math.round(y - 14 * px);
  const block = (x: number, yy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * px, oy + yy * px, w * px, h * px);
  };
  const outlined = (x: number, yy: number, w: number, h: number, fill: string, outline = '#1f2937') => {
    block(x, yy, w, h, outline);
    block(x + 1, yy + 1, Math.max(0, w - 2), Math.max(0, h - 2), fill);
  };
  const eye = (x: number, yy: number, blink = false, iris = '#60a5fa') => {
    if (blink) {
      block(x, yy + 2, 4, 1, '#111827');
      block(x, yy + 3, 4, 1, '#60a5fa');
      return;
    }
    outlined(x, yy, 4, 5, '#f8fafc', '#111827');
    block(x + 1, yy + 1, 2, 3, iris);
    block(x + 2, yy + 1, 1, 1, '#1d4ed8');
    block(x + 1, yy, 1, 1, '#ffffff');
  };
  const bigEye = (x: number, yy: number, blink = false, iris = '#60a5fa') => {
    if (blink) {
      block(x, yy + 3, 5, 1, '#111827');
      block(x, yy + 4, 5, 1, iris);
      return;
    }
    outlined(x, yy, 5, 6, '#f8fafc', '#111827');
    block(x + 1, yy + 1, 3, 4, iris);
    block(x + 2, yy + 1, 1, 2, '#1d4ed8');
    block(x + 1, yy, 1, 1, '#ffffff');
  };
  const shadow = (x: number, yy: number, w: number) => {
    withState(ctx, () => {
      ctx.globalAlpha = 0.2;
      block(x, yy, w, 2, '#020617');
    });
  };
  return { px, ox, oy, block, outlined, eye, bigEye, shadow };
};

const drawStageOnePixelEnemy = (ctx: CanvasRenderingContext2D, type: EnemyRenderType, frame: number, cx: number, y: number) => {
  const p = createPixelPainter(ctx, cx, y);
  const blink = frame === 1;

  switch (type) {
    case 'BOTTLE_SPRITE':
      p.shadow(7, 28, 18);
      p.outlined(11, 4, 10, 3, '#4b5563', '#111827');
      p.block(13, 3, 6, 1, '#94a3b8');
      p.outlined(13, 7, 6, 2, '#86efac', '#111827');
      p.outlined(8, 8, 16, 15, '#6ee7b7', '#111827');
      p.block(9, 9, 3, 12, '#bbf7d0');
      p.block(12, 14, 8, 5, '#fef3c7');
      p.block(13, 15, 6, 1, '#65a30d');
      p.block(13, 17, 6, 1, '#b45309');
      p.block(20, 15, 2, 2, '#eab308');
      p.block(7, 14, 1, 5, '#14532d');
      p.block(24, 15, 1, 4, '#14532d');
      p.block(frame === 0 ? 6 : 5, 18, 3, 2, '#365314');
      p.block(frame === 0 ? 24 : 25, 19, 3, 2, '#365314');
      p.block(10, 22, 3, 3, '#166534');
      p.block(19, 22, 3, 3, '#166534');
      p.bigEye(10, 10, blink, '#60a5fa');
      p.bigEye(17, 10, blink, '#60a5fa');
      p.block(14, 18, 4, 1, '#14532d');
      break;
    case 'WRAPPER_MOTH':
      p.shadow(7, 28, 18);
      p.outlined(5, 10, 3, 5, '#ef4444', '#111827');
      p.outlined(24, 10, 3, 5, '#f59e0b', '#111827');
      p.outlined(8, 8, 16, 15, '#d6b37a', '#111827');
      p.block(10, 7, 12, 2, '#fef3c7');
      p.block(10, 13, 12, 2, '#fef3c7');
      p.block(10, 15, 12, 2, '#b91c1c');
      p.block(10, 17, 12, 2, '#92400e');
      p.block(11, 19, 10, 1, '#78716c');
      p.block(7, 16, 1, 4, '#7c2d12');
      p.block(24, 16, 1, 4, '#7c2d12');
      p.block(frame === 0 ? 9 : 8, 22, 3, 3, '#7c2d12');
      p.block(frame === 0 ? 20 : 21, 22, 3, 3, '#7c2d12');
      p.bigEye(10, 10, blink, '#60a5fa');
      p.bigEye(17, 10, blink, '#60a5fa');
      p.block(14, 18, 4, 1, '#7c2d12');
      break;
    case 'STRAW_CRAWLER':
      p.shadow(7, 28, 18);
      p.block(10, 6, 2, 4, '#ef4444');
      p.block(15, 5, 2, 5, '#facc15');
      p.block(20, 6, 2, 4, '#38bdf8');
      p.outlined(8, 10, 16, 12, '#c4a16d', '#111827');
      p.block(10, 12, 3, 8, '#ef4444');
      p.block(14, 12, 2, 8, '#fef08a');
      p.block(17, 12, 2, 8, '#38bdf8');
      p.block(20, 12, 2, 8, '#fb7185');
      p.block(9, 21, 14, 1, '#44403c');
      p.block(7, 14, 1, 5, '#7c2d12');
      p.block(24, 15, 1, 4, '#7c2d12');
      p.bigEye(10, 10, blink, '#60a5fa');
      p.bigEye(17, 10, blink, '#60a5fa');
      p.block(14, 18, 4, 1, '#111827');
      p.block(frame === 0 ? 9 : 8, 22, 3, 3, '#a16207');
      p.block(frame === 0 ? 20 : 21, 22, 3, 3, '#a16207');
      break;
    case 'SIXPACK_VINE':
      p.shadow(7, 28, 18);
      p.block(11, 5, 2, 3, '#65a30d');
      p.block(15, 4, 2, 4, '#84cc16');
      p.block(19, 5, 2, 3, '#65a30d');
      p.outlined(8, 8, 16, 15, '#d9f99d', '#166534');
      [[10, 14], [15, 14], [20, 14], [10, 19], [15, 19], [20, 19]].forEach(([x, yy]) => {
        p.block(x, yy, 3, 3, '#166534');
        p.block(x + 1, yy + 1, 1, 1, '#020617');
      });
      p.block(7, 13, 1, 6, '#166534');
      p.block(24, 13, 1, 6, '#166534');
      p.block(frame === 0 ? 6 : 5, 18, 3, 2, '#65a30d');
      p.block(frame === 0 ? 24 : 25, 18, 3, 2, '#65a30d');
      p.block(10, 22, 3, 3, '#166534');
      p.block(19, 22, 3, 3, '#166534');
      p.bigEye(10, 9, blink, '#60a5fa');
      p.bigEye(17, 9, blink, '#60a5fa');
      p.block(14, 18, 4, 1, '#166534');
      break;
    case 'STYROFOAM_TREANT':
      p.shadow(6, 28, 20);
      p.block(9, 6, 14, 2, '#bbf7d0');
      p.outlined(7, 8, 18, 15, '#f5f5f4', '#374151');
      p.block(9, 10, 14, 2, '#d6d3d1');
      p.block(10, 14, 12, 1, '#a8a29e');
      p.block(9, 18, 14, 1, '#a8a29e');
      p.block(10, 20, 8, 2, '#84cc16');
      p.block(18, 20, 4, 2, '#65a30d');
      p.block(5, 12, 2, 7, '#78716c');
      p.block(25, 12, 2, 7, '#78716c');
      p.block(frame === 0 ? 8 : 7, 22, 3, 4, '#57534e');
      p.block(frame === 0 ? 21 : 22, 22, 3, 4, '#57534e');
      p.bigEye(9, 10, blink, '#60a5fa');
      p.bigEye(17, 10, blink, '#60a5fa');
      p.block(13, 18, 6, 1, '#374151');
      p.block(6, 9, 2, 2, '#84cc16');
      p.block(24, 8, 2, 2, '#84cc16');
      break;
    case 'COMPOST_HULK':
      p.shadow(6, 29, 20);
      p.block(8, 6, 4, 3, '#38bdf8');
      p.block(20, 7, 3, 4, '#fde68a');
      p.block(15, 5, 3, 2, '#f97316');
      p.outlined(5, 9, 22, 16, '#65a30d', '#1f2937');
      p.block(7, 10, 18, 4, '#84cc16');
      p.block(8, 15, 16, 4, '#4d7c0f');
      p.block(9, 19, 14, 3, '#365314');
      p.block(4, 16, 2, 6, '#14532d');
      p.block(26, 16, 2, 6, '#14532d');
      p.block(frame === 0 ? 8 : 7, 23, 4, 4, '#365314');
      p.block(frame === 0 ? 20 : 21, 23, 4, 4, '#365314');
      p.bigEye(8, 11, blink, '#86efac');
      p.bigEye(17, 11, blink, '#86efac');
      p.block(13, 19, 6, 1, '#111827');
      p.block(10, 16, 2, 2, '#9ca3af');
      p.block(19, 17, 3, 2, '#b45309');
      drawSmoke(ctx, [
        [p.ox + 54, p.oy + 20, 10, 7, '#86efac', 0.22],
        [p.ox + 96, p.oy + 10, 14, 9, '#bef264', 0.16],
      ]);
      break;
  }
};

const ART: Record<EnemyRenderType, ArtSpec> = {
  BOTTLE_SPRITE: { family: 'winged', variant: 'bottle', primary: '#93c5fd', secondary: '#14b8a6', accent: '#14532d', glow: '#86efac' },
  WRAPPER_MOTH: { family: 'winged', variant: 'moth', primary: '#fef08a', secondary: '#f9a8d4', accent: '#7c3aed', glow: '#fde68a' },
  STRAW_CRAWLER: { family: 'walker', variant: 'straw', primary: '#fb7185', secondary: '#38bdf8', accent: '#0f172a' },
  SIXPACK_VINE: { family: 'vine', variant: 'rings', primary: '#d1fae5', secondary: '#84cc16', accent: '#166534', glow: '#86efac' },
  STYROFOAM_TREANT: { family: 'heavy', variant: 'treant', primary: '#fafaf9', secondary: '#d6d3d1', accent: '#65a30d', glow: '#bef264' },
  COMPOST_HULK: { family: 'heavy', variant: 'compost', primary: '#84cc16', secondary: '#365314', accent: '#38bdf8', glow: '#bef264' },
  CIRCUIT_WRAITH: { family: 'winged', variant: 'circuit', primary: '#166534', secondary: '#0f172a', accent: '#4ade80', glow: '#4ade80' },
  WIRE_PHANTOM: { family: 'winged', variant: 'wire', primary: '#f97316', secondary: '#f59e0b', accent: '#86efac', glow: '#fb923c' },
  BATTERY_ZOMBIE: { family: 'walker', variant: 'battery', primary: '#9ca3af', secondary: '#334155', accent: '#84cc16', glow: '#bef264' },
  MONITOR_GHOUL: { family: 'walker', variant: 'monitor', primary: '#94a3b8', secondary: '#38bdf8', accent: '#ef4444', glow: '#38bdf8' },
  MOTHERBOARD_GOLEM: { family: 'heavy', variant: 'motherboard', primary: '#166534', secondary: '#052e16', accent: '#34d399', glow: '#86efac' },
  PRINTER_REVENANT: { family: 'heavy', variant: 'printer', primary: '#e5e7eb', secondary: '#475569', accent: '#fca5a5', glow: '#93c5fd' },
  COOLANT_WISP: { family: 'orb', variant: 'coolant', primary: '#bfdbfe', secondary: '#60a5fa', accent: '#0ea5e9', glow: '#93c5fd' },
  FAN_BLADE_DJINN: { family: 'orb', variant: 'fan', primary: '#e2e8f0', secondary: '#7dd3fc', accent: '#1e293b', glow: '#bfdbfe' },
  FROZEN_PHONE: { family: 'walker', variant: 'phone', primary: '#111827', secondary: '#93c5fd', accent: '#e0f2fe', glow: '#bfdbfe' },
  FROST_CABLE: { family: 'serpent', variant: 'frostCable', primary: '#60a5fa', secondary: '#dbeafe', accent: '#e0f2fe', glow: '#93c5fd' },
  SERVER_RACK_YETI: { family: 'heavy', variant: 'server', primary: '#111827', secondary: '#334155', accent: '#e0f2fe', glow: '#ef4444' },
  CRYO_DUMP_BEAST: { family: 'heavy', variant: 'cryo', primary: '#dbeafe', secondary: '#475569', accent: '#38bdf8', glow: '#e0f2fe' },
  EMBER_BAG: { family: 'winged', variant: 'ember', primary: '#fde68a', secondary: '#fb923c', accent: '#ef4444', glow: '#fb923c' },
  ASH_FLIER: { family: 'winged', variant: 'ash', primary: '#6b7280', secondary: '#fb923c', accent: '#f59e0b', glow: '#fb923c' },
  SLAG_DRUM: { family: 'walker', variant: 'drum', primary: '#9a3412', secondary: '#450a0a', accent: '#fbbf24', glow: '#fb923c' },
  SMELT_RAT: { family: 'walker', variant: 'rat', primary: '#7f1d1d', secondary: '#f97316', accent: '#ef4444', glow: '#fb923c' },
  FURNACE_TITAN: { family: 'heavy', variant: 'furnace', primary: '#57534e', secondary: '#1c1917', accent: '#f97316', glow: '#fbbf24' },
  REFINERY_COLOSSUS: { family: 'heavy', variant: 'refinery', primary: '#525252', secondary: '#111827', accent: '#ef4444', glow: '#f97316' },
  GLASS_SCARAB: { family: 'winged', variant: 'scarab', primary: '#f8fafc', secondary: '#93c5fd', accent: '#f9a8d4', glow: '#fde68a' },
  SILICON_WASP: { family: 'winged', variant: 'wasp', primary: '#fde68a', secondary: '#f59e0b', accent: '#fef08a', glow: '#fef3c7' },
  SAND_BATTERY: { family: 'walker', variant: 'sandBattery', primary: '#fef3c7', secondary: '#ca8a04', accent: '#f59e0b', glow: '#fef08a' },
  DUST_FILTER: { family: 'walker', variant: 'filter', primary: '#f3f4f6', secondary: '#a8a29e', accent: '#78350f' },
  PYRAMID_JUNK: { family: 'heavy', variant: 'pyramid', primary: '#fde68a', secondary: '#a16207', accent: '#fef08a', glow: '#fcd34d' },
  DUNE_COMPACTOR: { family: 'heavy', variant: 'compactor', primary: '#d6d3d1', secondary: '#292524', accent: '#fcd34d', glow: '#fde68a' },
  SPORE_AEROSOL: { family: 'winged', variant: 'aerosol', primary: '#d1d5db', secondary: '#4b5563', accent: '#84cc16', glow: '#d8b4fe' },
  SWAMP_DIAPER: { family: 'winged', variant: 'diaper', primary: '#fef9c3', secondary: '#84cc16', accent: '#65a30d', glow: '#bef264' },
  ALGAE_BARREL: { family: 'walker', variant: 'algaeBarrel', primary: '#4b5563', secondary: '#1f2937', accent: '#22c55e', glow: '#84cc16' },
  FUNGAL_TIRE: { family: 'walker', variant: 'fungalTire', primary: '#111827', secondary: '#374151', accent: '#84cc16', glow: '#22c55e' },
  SLUDGE_TOAD: { family: 'heavy', variant: 'toad', primary: '#84cc16', secondary: '#14532d', accent: '#bef264', glow: '#bef264' },
  BOG_HEAP: { family: 'heavy', variant: 'bog', primary: '#365314', secondary: '#052e16', accent: '#84cc16', glow: '#4ade80' },
  NEON_WRAPPER: { family: 'winged', variant: 'neon', primary: '#1d4ed8', secondary: '#0ea5e9', accent: '#f472b6', glow: '#67e8f9' },
  DRONE_LITTER: { family: 'winged', variant: 'drone', primary: '#cbd5e1', secondary: '#0f172a', accent: '#fde68a', glow: '#22d3ee' },
  VENDING_HUSK: { family: 'walker', variant: 'vending', primary: '#334155', secondary: '#0f172a', accent: '#38bdf8', glow: '#f472b6' },
  TRAFFIC_CONE_BOT: { family: 'walker', variant: 'cone', primary: '#fdba74', secondary: '#9a3412', accent: '#38bdf8', glow: '#60a5fa' },
  DUMPSTER_MECH: { family: 'heavy', variant: 'dumpster', primary: '#166534', secondary: '#020617', accent: '#38bdf8', glow: '#60a5fa' },
  BILLBOARD_TANK: { family: 'heavy', variant: 'billboard', primary: '#0f172a', secondary: '#1d4ed8', accent: '#38bdf8', glow: '#f472b6' },
  VOID_PARTICLE: { family: 'orb', variant: 'void', primary: '#d8b4fe', secondary: '#1e1b4b', accent: '#7c3aed', glow: '#c084fc' },
  NULL_EMISSION: { family: 'cloud', variant: 'null', primary: '#7c3aed', secondary: '#1e1b4b', accent: '#e9d5ff', glow: '#c084fc' },
  ENTROPY_CAN: { family: 'walker', variant: 'entropyCan', primary: '#d1d5db', secondary: '#6d28d9', accent: '#d8b4fe', glow: '#c084fc' },
  STATIC_WASTE: { family: 'walker', variant: 'staticWaste', primary: '#111827', secondary: '#312e81', accent: '#e9d5ff', glow: '#a855f7' },
  ABYSS_LANDFILL: { family: 'heavy', variant: 'abyss', primary: '#374151', secondary: '#020617', accent: '#c084fc', glow: '#c084fc' },
  OBLIVION_SLUDGE: { family: 'heavy', variant: 'oblivion', primary: '#7c3aed', secondary: '#020617', accent: '#d8b4fe', glow: '#c084fc' },
  CLOUD_BAG: { family: 'winged', variant: 'cloudBag', primary: '#ffffff', secondary: '#bfdbfe', accent: '#38bdf8', glow: '#e0f2fe' },
  CONTRAIL_SERPENT: { family: 'serpent', variant: 'contrail', primary: '#f8fafc', secondary: '#e2e8f0', accent: '#94a3b8', glow: '#ffffff' },
  SATELLITE_JUNK: { family: 'walker', variant: 'satellite', primary: '#cbd5e1', secondary: '#38bdf8', accent: '#f8fafc', glow: '#93c5fd' },
  DATA_SMOG: { family: 'cloud', variant: 'dataSmog', primary: '#d1d5db', secondary: '#94a3b8', accent: '#f59e0b', glow: '#bfdbfe' },
  STRATOSPHERE_HEAP: { family: 'heavy', variant: 'stratosphere', primary: '#f8fafc', secondary: '#475569', accent: '#38bdf8', glow: '#bfdbfe' },
  OZONE_EATER: { family: 'heavy', variant: 'ozone', primary: '#ffffff', secondary: '#f9a8d4', accent: '#67e8f9', glow: '#67e8f9' },
  HELLFIRE_WRAPPER: { family: 'winged', variant: 'hellfire', primary: '#fef2f2', secondary: '#f97316', accent: '#ef4444', glow: '#ef4444' },
  DAMNED_DRONE: { family: 'winged', variant: 'damnedDrone', primary: '#d1d5db', secondary: '#7f1d1d', accent: '#fbbf24', glow: '#ef4444' },
  INFERNAL_BARREL: { family: 'walker', variant: 'infernalBarrel', primary: '#9a3412', secondary: '#450a0a', accent: '#fbbf24', glow: '#ef4444' },
  BRIMSTONE_PHONE: { family: 'walker', variant: 'brimstonePhone', primary: '#d1d5db', secondary: '#7f1d1d', accent: '#fbbf24', glow: '#ef4444' },
  WASTE_DEMON: { family: 'heavy', variant: 'wasteDemon', primary: '#6b7280', secondary: '#111827', accent: '#fbbf24', glow: '#ef4444' },
  LANDFILL_ARCHFIEND: { family: 'heavy', variant: 'archfiend', primary: '#6b7280', secondary: '#111827', accent: '#f97316', glow: '#ef4444' },
  MISINFORMATION: { family: 'walker', variant: 'misinformation', primary: '#fef3c7', secondary: '#dc2626', accent: '#7c2d12', glow: '#ef4444' },
};

const drawWinged = (ctx: CanvasRenderingContext2D, spec: ArtSpec, cx: number, y: number, frame: number) => {
  const open = frame === 0 ? 0.18 : -0.18;
  drawShadow(ctx, cx, y + 84, 46, 12, 0.18);
  if (spec.variant === 'drone' || spec.variant === 'damnedDrone') {
    withState(ctx, () => {
      ctx.translate(cx, y - 6);
      ctx.rotate(frame === 0 ? 0 : Math.PI / 5);
      for (let i = 0; i < 4; i += 1) {
        withState(ctx, () => {
          ctx.rotate((TAU / 4) * i);
          drawCable(ctx, [[0, 0], [30, 0], [50, 10]], spec.accent, 6, spec.glow);
          ctx.strokeStyle = spec.secondary;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(58, 10, 18, 0, TAU);
          ctx.stroke();
        });
      }
    });
  } else {
    const leftFill = linear(ctx, cx - 70, y - 32, cx - 8, y + 36, [[0, spec.primary], [1, spec.secondary]]);
    const rightFill = linear(ctx, cx + 8, y - 32, cx + 70, y + 36, [[0, spec.secondary], [1, spec.primary]]);
    drawWing(ctx, cx - 18, y - 6, -58, 68, -0.36 + open, leftFill, spec.accent);
    drawWing(ctx, cx + 18, y - 6, 58, 68, 0.36 - open, rightFill, spec.accent);
  }

  switch (spec.variant) {
    case 'bottle':
      fillRoundRect(ctx, cx - 28, y - 38, 56, 110, 18, linear(ctx, cx - 28, y - 38, cx + 28, y + 72, [[0, spec.primary], [0.5, spec.secondary], [1, '#14b8a6']]), spec.accent);
      fillRoundRect(ctx, cx - 10, y - 64, 20, 30, 8, '#38bdf8', spec.accent);
      fillRoundRect(ctx, cx - 14, y - 74, 28, 10, 4, '#1d4ed8', '#0f172a');
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(cx - 14, y - 22, 10, 76);
      break;
    case 'moth':
    case 'neon':
    case 'hellfire':
      withState(ctx, () => {
        ctx.fillStyle = linear(ctx, cx - 36, y - 42, cx + 36, y + 46, [[0, spec.primary], [0.45, spec.secondary], [1, spec.accent]]);
        ctx.beginPath();
        ctx.moveTo(cx - 30, y - 24);
        ctx.lineTo(cx - 40, y + 46);
        ctx.lineTo(cx + 26, y + 40);
        ctx.lineTo(cx + 34, y - 36);
        ctx.closePath();
        ctx.fill();
      });
      break;
    case 'circuit':
      withState(ctx, () => {
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = linear(ctx, cx - 36, y - 40, cx + 36, y + 48, [[0, spec.secondary], [0.5, spec.primary], [1, 'rgba(74,222,128,0.18)']]);
        ctx.beginPath();
        ctx.moveTo(cx - 34, y - 22);
        ctx.lineTo(cx + 26, y - 40);
        ctx.lineTo(cx + 40, y + 16);
        ctx.lineTo(cx - 12, y + 44);
        ctx.closePath();
        ctx.fill();
      });
      break;
    case 'wire':
      drawCable(ctx, [[cx - 36, y - 22], [cx - 58, y], [cx - 42, y + 30], [cx - 6, y + 40]], spec.primary, 7, spec.glow);
      drawCable(ctx, [[cx + 12, y - 30], [cx + 54, y - 10], [cx + 42, y + 30], [cx + 10, y + 38]], spec.secondary, 7, spec.glow);
      break;
    case 'ember':
    case 'ash':
    case 'cloudBag':
      drawSmoke(ctx, [
        [cx - 18, y - 16, 28, 18, spec.primary, 0.48],
        [cx + 8, y - 20, 24, 18, spec.secondary, 0.36],
        [cx + 28, y + 8, 18, 14, spec.primary, 0.24],
      ]);
      break;
    case 'scarab':
    case 'wasp':
      fillRoundRect(ctx, cx - 18, y - 28, 36, 70, 18, linear(ctx, cx - 18, y - 28, cx + 18, y + 42, [[0, spec.primary], [0.4, spec.secondary], [1, spec.accent]]), spec.accent);
      break;
    case 'aerosol':
      fillRoundRect(ctx, cx - 16, y - 48, 32, 96, 12, linear(ctx, cx - 16, y - 48, cx + 16, y + 48, [[0, spec.primary], [0.3, spec.secondary], [1, '#1f2937']]), spec.accent);
      fillRoundRect(ctx, cx - 8, y - 66, 16, 18, 6, '#e5e7eb', spec.secondary);
      drawSmoke(ctx, [
        [cx + 38 + (frame === 0 ? 0 : 12), y - 22, 24, 16, spec.accent, 0.24],
        [cx + 66 + (frame === 0 ? 0 : 10), y - 2, 28, 18, spec.primary, 0.18],
      ]);
      break;
    case 'diaper':
      withState(ctx, () => {
        ctx.fillStyle = linear(ctx, cx - 34, y - 38, cx + 34, y + 46, [[0, spec.primary], [0.45, spec.secondary], [1, spec.accent]]);
        ctx.beginPath();
        ctx.moveTo(cx - 32, y - 18);
        ctx.quadraticCurveTo(cx - 44, y + 20, cx - 10, y + 50);
        ctx.lineTo(cx + 10, y + 50);
        ctx.quadraticCurveTo(cx + 42, y + 18, cx + 30, y - 18);
        ctx.quadraticCurveTo(cx, y - 50, cx - 32, y - 18);
        ctx.closePath();
        ctx.fill();
      });
      drawMushroom(ctx, cx - 22, y + 18, '#84cc16', spec.glow);
      drawMushroom(ctx, cx + 20, y + 12, '#65a30d', spec.glow);
      break;
    case 'drone':
    case 'damnedDrone':
      fillRoundRect(ctx, cx - 28, y - 20, 56, 46, 12, linear(ctx, cx - 28, y - 20, cx + 28, y + 26, [[0, spec.primary], [0.4, spec.secondary], [1, '#111827']]), spec.accent);
      break;
  }

  if (spec.variant === 'moth' || spec.variant === 'neon' || spec.variant === 'hellfire') {
    ctx.fillStyle = spec.accent;
    for (let i = 0; i < 3; i += 1) ctx.fillRect(cx - 22, y - 10 + i * 14, 44 - i * 6, 3);
  }
  if (spec.variant === 'circuit' || spec.variant === 'neon') drawCable(ctx, [[cx - 22, y - 10], [cx - 2, y - 10], [cx - 2, y + 10], [cx + 22, y + 10]], spec.accent, 4, spec.glow);
  if (spec.variant === 'wire' || spec.variant === 'damnedDrone') drawSpark(ctx, cx + 38, y + 16, 8, spec.accent, frame === 0 ? 0.2 : -0.2);
  if (spec.variant === 'scarab' || spec.variant === 'wasp') {
    drawCable(ctx, [[cx - 10, y + 20], [cx - 24, y + 48], [cx - 34, y + 74]], spec.accent, 4);
    drawCable(ctx, [[cx + 10, y + 20], [cx + 24, y + 48], [cx + 34, y + 74]], spec.accent, 4);
  }

  drawEye(ctx, cx - 8, y - 2, spec.accent, spec.glow);
  drawEye(ctx, cx + 10, y - 2, spec.accent, spec.glow);
};
const drawWalker = (ctx: CanvasRenderingContext2D, spec: ArtSpec, cx: number, y: number, frame: number) => {
  const step = frame === 0 ? -8 : 8;
  drawShadow(ctx, cx, y + 94, 48, 14);

  switch (spec.variant) {
    case 'straw':
      for (let i = 0; i < 4; i += 1) {
        withState(ctx, () => {
          ctx.translate(cx + (i - 1.5) * 12, y - 4 + i * 4);
          ctx.rotate((i - 1.5) * 0.24 + (frame === 0 ? 0.12 : -0.12));
          fillRoundRect(ctx, -5, -28, 10, 58, 5, linear(ctx, -5, -28, 5, 30, [[0, '#fff'], [0.4, spec.primary], [1, spec.secondary]]), spec.accent);
        });
      }
      for (let i = 0; i < 4; i += 1) {
        drawCable(ctx, [[cx - 18, y + 18], [cx - 56, y + 30], [cx - 74, y + 48 + step * 0.15 + i * 3]], spec.primary, 5);
        drawCable(ctx, [[cx + 18, y + 18], [cx + 56, y + 30], [cx + 74, y + 48 - step * 0.15 + i * 3]], spec.primary, 5);
      }
      break;
    case 'battery':
    case 'sandBattery':
      fillRoundRect(ctx, cx - 32, y - 42, 64, 94, 14, linear(ctx, cx - 32, y - 42, cx + 32, y + 52, [[0, spec.primary], [0.25, spec.secondary], [0.7, '#334155'], [1, '#1f2937']]), spec.accent);
      fillRoundRect(ctx, cx - 20, y - 58, 14, 16, 5, '#d6d3d1', '#57534e');
      fillRoundRect(ctx, cx + 6, y - 58, 14, 16, 5, '#d6d3d1', '#57534e');
      if (spec.variant === 'battery') {
        fillRoundRect(ctx, cx - 22, y - 6, 44, 22, 8, '#84cc16', '#3f6212');
        ctx.fillStyle = '#bef264';
        ctx.fillRect(cx - 2, y - 2, 4, 10);
        ctx.fillRect(cx - 8, y + 2, 16, 4);
      } else {
        ctx.fillStyle = 'rgba(217,119,6,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, y + 58, 54, 20, 0, 0, TAU);
        ctx.fill();
      }
      break;
    case 'monitor':
    case 'vending':
      fillRoundRect(ctx, cx - 40, y - 54, 80, 124, 14, linear(ctx, cx - 40, y - 54, cx + 40, y + 70, [[0, spec.primary], [0.3, spec.secondary], [1, '#020617']]), spec.accent);
      fillRoundRect(ctx, cx - 22, y - 34, 44, 60, 10, linear(ctx, cx - 22, y - 34, cx + 22, y + 26, [[0, spec.accent], [0.5, spec.secondary], [1, '#312e81']]), spec.glow || spec.accent);
      for (let i = 0; i < (spec.variant === 'vending' ? 3 : 1); i += 1) fillRoundRect(ctx, cx - 26, y + 32 + i * 10, 52, 6, 3, i === 1 ? '#f59e0b' : '#475569', '#1f2937');
      break;
    case 'phone':
    case 'brimstonePhone':
      fillRoundRect(ctx, cx - 36, y - 58, 72, 128, 18, linear(ctx, cx - 36, y - 58, cx + 36, y + 70, [[0, spec.primary], [0.18, '#1f2937'], [0.6, spec.secondary], [1, '#111827']]), spec.accent);
      fillRoundRect(ctx, cx - 26, y - 40, 52, 86, 12, linear(ctx, cx - 26, y - 40, cx + 26, y + 46, [[0, '#dbeafe'], [0.5, spec.secondary], [1, '#1c1917']]), spec.glow || spec.accent);
      if (spec.variant === 'phone') {
        drawCable(ctx, [[cx - 16, y + 58], [cx - 30, y + 76], [cx - 24, y + 98]], '#bae6fd', 8);
        drawCable(ctx, [[cx + 16, y + 58], [cx + 30, y + 76], [cx + 38, y + 98]], '#bae6fd', 8);
      }
      break;
    case 'drum':
    case 'algaeBarrel':
    case 'infernalBarrel':
    case 'entropyCan':
      fillRoundRect(ctx, cx - 32, y - 46, 64, 108, 16, linear(ctx, cx - 32, y - 46, cx + 32, y + 62, [[0, spec.primary], [0.3, spec.secondary], [0.7, '#450a0a'], [1, '#111827']]), spec.accent);
      if (spec.variant === 'algaeBarrel') drawCable(ctx, [[cx - 28, y - 8], [cx - 54, y - 22], [cx - 60, y - 50]], spec.accent, 7, spec.glow);
      if (spec.variant === 'entropyCan') {
        withState(ctx, () => {
          ctx.globalAlpha = frame === 0 ? 0.82 : 0.55;
          ctx.fillStyle = linear(ctx, cx + 4, y - 40, cx + 34, y + 60, [[0, spec.secondary], [1, 'rgba(15,23,42,0)']]);
          ctx.fillRect(cx + 4, y - 38, 24, 88);
        });
      }
      break;
    case 'filter':
      withState(ctx, () => {
        ctx.translate(cx, y + 8);
        ctx.rotate(frame === 0 ? -0.12 : 0.12);
        fillRoundRect(ctx, -42, -52, 84, 104, 14, linear(ctx, -42, -52, 42, 52, [[0, spec.primary], [0.3, spec.secondary], [1, '#78716c']]), '#57534e');
        ctx.fillStyle = '#d6d3d1';
        for (let i = 0; i < 6; i += 1) ctx.fillRect(-30 + i * 10, -40, 6, 80);
      });
      break;
    case 'fungalTire':
      withState(ctx, () => {
        ctx.strokeStyle = spec.primary;
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.arc(cx, y + 10, 48, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = spec.secondary;
        ctx.lineWidth = 12;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(cx, y + 10, 48, 0, TAU);
        ctx.stroke();
      });
      drawMushroom(ctx, cx - 34, y - 8, spec.accent, spec.glow);
      drawMushroom(ctx, cx + 28, y + 18, spec.secondary, spec.glow);
      break;
    case 'cone':
      withState(ctx, () => {
        ctx.fillStyle = linear(ctx, cx - 34, y - 54, cx + 34, y + 52, [[0, spec.primary], [0.45, spec.secondary], [1, '#7c2d12']]);
        ctx.beginPath();
        ctx.moveTo(cx, y - 60);
        ctx.lineTo(cx + 34, y + 48);
        ctx.lineTo(cx - 34, y + 48);
        ctx.closePath();
        ctx.fill();
      });
      fillRoundRect(ctx, cx - 42, y + 48, 84, 12, 6, '#1f2937', spec.accent);
      break;
    case 'satellite':
      withState(ctx, () => {
        ctx.translate(cx - 34, y - 10);
        ctx.rotate(frame === 0 ? 0.18 : -0.18);
        fillRoundRect(ctx, -40, -18, 52, 36, 6, linear(ctx, -40, -18, 12, 18, [[0, '#0f172a'], [0.5, spec.secondary], [1, spec.accent]]), '#93c5fd');
      });
      withState(ctx, () => {
        ctx.translate(cx + 34, y - 6);
        ctx.rotate(frame === 0 ? -0.18 : 0.18);
        fillRoundRect(ctx, -12, -18, 52, 36, 6, linear(ctx, -12, -18, 40, 18, [[0, '#0f172a'], [0.5, spec.secondary], [1, spec.accent]]), '#93c5fd');
      });
      fillRoundRect(ctx, cx - 24, y - 28, 48, 56, 12, linear(ctx, cx - 24, y - 28, cx + 24, y + 28, [[0, spec.primary], [0.4, '#64748b'], [1, '#1f2937']]), '#e2e8f0');
      break;
    case 'staticWaste':
      withState(ctx, () => {
        ctx.globalAlpha = 0.86;
        ctx.fillStyle = linear(ctx, cx - 36, y - 42, cx + 36, y + 52, [[0, spec.primary], [0.5, spec.secondary], [1, '#312e81']]);
        ctx.beginPath();
        ctx.moveTo(cx - 34, y - 18);
        ctx.lineTo(cx - 48, y + 44);
        ctx.lineTo(cx - 10, y + 62);
        ctx.lineTo(cx + 42, y + 38);
        ctx.lineTo(cx + 30, y - 38);
        ctx.closePath();
        ctx.fill();
      });
      break;
    case 'misinformation':
      fillRoundRect(ctx, cx - 34, y - 42, 68, 98, 10, linear(ctx, cx - 34, y - 42, cx + 34, y + 56, [[0, spec.primary], [0.5, '#fde68a'], [1, '#fca5a5']]), spec.accent);
      fillRoundRect(ctx, cx - 28, y - 30, 56, 12, 4, spec.secondary, '#7f1d1d');
      ctx.fillStyle = '#78716c';
      for (let i = 0; i < 4; i += 1) ctx.fillRect(cx - 26, y - 8 + i * 14, 52 - i * 4, 4);
      break;
    case 'rat':
      withState(ctx, () => {
        ctx.fillStyle = linear(ctx, cx - 48, y - 18, cx + 34, y + 34, [[0, spec.primary], [0.5, spec.secondary], [1, '#451a03']]);
        ctx.beginPath();
        ctx.moveTo(cx - 42, y + 18);
        ctx.bezierCurveTo(cx - 56, y - 18, cx - 18, y - 42, cx + 22, y - 10);
        ctx.quadraticCurveTo(cx + 48, y + 12, cx + 18, y + 36);
        ctx.closePath();
        ctx.fill();
      });
      drawCable(ctx, [[cx + 22, y + 18], [cx + 58, y + 6 - step * 0.2], [cx + 90, y - 18]], spec.secondary, 6, spec.glow);
      break;
  }

  if (!['straw', 'fungalTire', 'satellite', 'rat'].includes(spec.variant)) {
    drawCable(ctx, [[cx - 18, y + 48], [cx - 32, y + 72], [cx - 28, y + 96]], spec.accent, 8);
    drawCable(ctx, [[cx + 18, y + 46], [cx + 32, y + 72], [cx + 40, y + 96]], spec.accent, 8);
  }
  if (spec.variant === 'algaeBarrel' || spec.variant === 'infernalBarrel' || spec.variant === 'brimstonePhone') {
    drawSmoke(ctx, [
      [cx - 8, y - 60, 12, 10, spec.accent, 0.28],
      [cx + 12, y - 54, 16, 12, spec.secondary, 0.24],
    ]);
  }
  if (spec.variant === 'staticWaste') {
    withState(ctx, () => {
      ctx.strokeStyle = frame === 0 ? '#a855f7' : '#38bdf8';
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - 24 + i * 8, y - 22 + (i % 2) * 10);
        ctx.lineTo(cx - 12 + i * 8, y - 10 + ((i + 1) % 2) * 10);
        ctx.stroke();
      }
    });
  }

  drawEye(ctx, cx - 10, y - 8, spec.accent, spec.glow);
  drawEye(ctx, cx + 10, y - 8, spec.accent, spec.glow);
};
const drawSerpent = (ctx: CanvasRenderingContext2D, spec: ArtSpec, cx: number, y: number, frame: number) => {
  drawShadow(ctx, cx, y + 90, 56, 12, 0.16);
  if (spec.variant === 'frostCable') {
    drawCable(ctx, [[cx - 58, y + 24], [cx - 20, y + 40], [cx + 20, y + 24], [cx + 46, y - 4], [cx + 18, y + (frame === 0 ? -18 : -32)]], spec.primary, 14, spec.glow);
    drawCable(ctx, [[cx - 58, y + 24], [cx - 20, y + 40], [cx + 20, y + 24], [cx + 46, y - 4], [cx + 18, y + (frame === 0 ? -18 : -32)]], spec.secondary, 6);
    for (let i = 0; i < 5; i += 1) fillRoundRect(ctx, cx - 40 + i * 18, y + 16 + (i % 2) * 4, 10, 16, 4, '#e0f2fe');
    drawEye(ctx, cx + 10, y + (frame === 0 ? -20 : -34), spec.accent, spec.glow);
    drawEye(ctx, cx + 22, y + (frame === 0 ? -20 : -34), spec.accent, spec.glow);
  } else {
    drawCable(ctx, [[cx - 68, y + 20], [cx - 18, y + 28], [cx + 24, y + 10], [cx + 56, y - 16], [cx + 20, y + (frame === 0 ? -44 : -52)]], spec.primary, 16, spec.glow);
    drawCable(ctx, [[cx - 68, y + 20], [cx - 18, y + 28], [cx + 24, y + 10], [cx + 56, y - 16], [cx + 20, y + (frame === 0 ? -44 : -52)]], spec.secondary, 6);
    drawSmoke(ctx, [[cx - 40, y + 20, 16, 10, spec.primary, 0.4], [cx - 12, y + 28, 18, 10, spec.secondary, 0.28]]);
    drawEye(ctx, cx + 14, y + (frame === 0 ? -30 : -38), spec.accent, spec.glow);
    drawEye(ctx, cx + 28, y + (frame === 0 ? -30 : -38), spec.accent, spec.glow);
  }
};

const drawOrb = (ctx: CanvasRenderingContext2D, spec: ArtSpec, cx: number, y: number, frame: number) => {
  drawShadow(ctx, cx, y + 82, 42, 10, 0.16);
  if (spec.variant === 'fan') {
    withState(ctx, () => {
      ctx.translate(cx, y);
      ctx.rotate(frame === 0 ? 0 : Math.PI / 4);
      for (let i = 0; i < 4; i += 1) {
        withState(ctx, () => {
          ctx.rotate((TAU / 4) * i);
          ctx.fillStyle = linear(ctx, 0, -10, 72, 12, [[0, 'rgba(224,242,254,0.2)'], [0.55, spec.primary], [1, spec.secondary]]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(36, -20, 74, 0);
          ctx.quadraticCurveTo(32, 16, 0, 0);
          ctx.fill();
        });
      }
    });
    fillRoundRect(ctx, cx - 18, y - 18, 36, 36, 16, linear(ctx, cx - 18, y - 18, cx + 18, y + 18, [[0, spec.primary], [0.5, spec.secondary], [1, spec.accent]]), '#0f172a');
    drawEye(ctx, cx, y, spec.accent, spec.glow, 0.8);
  } else {
    withState(ctx, () => {
      ctx.shadowColor = spec.glow || spec.secondary;
      ctx.shadowBlur = 18;
      ctx.fillStyle = radial(ctx, cx - 8, y - 18, 4, cx, y, 64, [[0, '#fff'], [0.32, spec.primary], [0.65, spec.secondary], [1, 'rgba(2,6,23,0.08)']]);
      ctx.beginPath();
      if (spec.variant === 'coolant') {
        ctx.moveTo(cx, y - 54);
        ctx.bezierCurveTo(cx + 34, y - 16, cx + 24, y + 28, cx, y + 54);
        ctx.bezierCurveTo(cx - 34, y + 20, cx - 40, y - 18, cx, y - 54);
      } else {
        ctx.moveTo(cx - 18, y - 28);
        ctx.lineTo(cx + 16 + (frame === 0 ? -4 : 6), y - 34);
        ctx.lineTo(cx + 30, y);
        ctx.lineTo(cx - 4, y + 38);
        ctx.lineTo(cx - 30, y + 8);
      }
      ctx.closePath();
      ctx.fill();
    });
    drawEye(ctx, cx - 6, y - 2, spec.accent, spec.glow);
    drawEye(ctx, cx + 8, y + 4, spec.accent, spec.glow);
  }
};

const drawCloud = (ctx: CanvasRenderingContext2D, spec: ArtSpec, cx: number, y: number, frame: number) => {
  drawShadow(ctx, cx, y + 84, 48, 10, 0.14);
  drawSmoke(ctx, [
    [cx - 24, y - 8, 28 + (frame === 0 ? 0 : 4), 18, spec.primary, 0.28],
    [cx + 8, y + 4, 36, 24, spec.secondary, 0.22],
    [cx + 34, y + 18, 24, 16, spec.primary, 0.18],
  ]);
  if (spec.variant === 'null') {
    withState(ctx, () => {
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, y + 4, 28 + (frame === 0 ? 0 : 4), 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, y + 14, 40, 0.4, Math.PI - 0.4);
      ctx.stroke();
    });
  } else {
    withState(ctx, () => {
      ctx.fillStyle = 'rgba(191,219,254,0.18)';
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          ctx.fillRect(cx - 40 + col * 18 + (row % 2 === 0 ? (frame === 0 ? -2 : 2) : 0), y - 20 + row * 14, 12, 8);
        }
      }
    });
  }
  drawEye(ctx, cx - 10, y - 2, spec.accent, spec.glow);
  drawEye(ctx, cx + 10, y - 2, spec.accent, spec.glow);
};

const drawVine = (ctx: CanvasRenderingContext2D, spec: ArtSpec, cx: number, y: number, frame: number) => {
  drawShadow(ctx, cx, y + 90, 54, 14);
  withState(ctx, () => {
    ctx.strokeStyle = spec.primary;
    ctx.lineWidth = 10;
    ctx.shadowColor = spec.glow || spec.secondary;
    ctx.shadowBlur = 14;
    [[-26, -12], [0, -12], [26, -12], [-26, 20], [0, 20], [26, 20]].forEach(([x, yy]) => {
      ctx.beginPath();
      ctx.ellipse(cx + x, y + yy, 16 * (frame === 0 ? 1 : 1.08), 18 * (frame === 0 ? 1 : 1.08), 0, 0, TAU);
      ctx.stroke();
    });
  });
  drawCable(ctx, [[cx - 44, y - 16], [cx - 72, y - 52], [cx - 60, y - 86]], spec.accent, 7, spec.glow);
  drawCable(ctx, [[cx + 42, y + 4], [cx + 78, y - 14], [cx + 92, y - 50]], spec.accent, 7, spec.glow);
  drawCable(ctx, [[cx - 10, y + 26], [cx - 20, y + 60], [cx - 6, y + 88]], spec.accent, 7, spec.glow);
  drawEye(ctx, cx - 10, y + 10, spec.secondary, spec.glow);
  drawEye(ctx, cx + 10, y + 10, spec.secondary, spec.glow);
};
const drawHeavy = (ctx: CanvasRenderingContext2D, spec: ArtSpec, cx: number, y: number, frame: number) => {
  drawShadow(ctx, cx, y + 100, 74, 18);
  if (['treant', 'compost', 'toad', 'bog', 'abyss', 'oblivion', 'ozone', 'wasteDemon', 'archfiend', 'stratosphere', 'cryo'].includes(spec.variant)) {
    withState(ctx, () => {
      ctx.fillStyle = radial(ctx, cx - 12, y, 10, cx, y + 12, 88, [[0, spec.primary], [0.35, spec.secondary], [1, '#052e16']]);
      ctx.beginPath();
      ctx.moveTo(cx - 58, y + 28);
      ctx.bezierCurveTo(cx - 78, y - 12, cx - 42, y - 58, cx + 4, y - 46);
      ctx.bezierCurveTo(cx + 60, y - 38, cx + 82, y + 12, cx + 58, y + 66);
      ctx.quadraticCurveTo(cx + 2, y + 94, cx - 52, y + 68);
      ctx.closePath();
      ctx.fill();
    });
  } else if (spec.variant === 'pyramid') {
    withState(ctx, () => {
      ctx.fillStyle = linear(ctx, cx - 62, y - 44, cx + 62, y + 76, [[0, spec.primary], [0.35, spec.secondary], [1, '#78350f']]);
      ctx.beginPath();
      ctx.moveTo(cx, y - 58);
      ctx.lineTo(cx + 62, y + 62);
      ctx.lineTo(cx - 62, y + 62);
      ctx.closePath();
      ctx.fill();
    });
  } else if (spec.variant === 'refinery') {
    fillRoundRect(ctx, cx - 44, y - 60, 34, 132, 14, linear(ctx, cx - 44, y - 60, cx - 10, y + 72, [[0, spec.primary], [0.6, spec.secondary], [1, '#111827']]), spec.accent);
    fillRoundRect(ctx, cx + 10, y - 42, 34, 114, 14, linear(ctx, cx + 10, y - 42, cx + 44, y + 72, [[0, spec.primary], [0.6, spec.secondary], [1, '#111827']]), spec.accent);
  } else {
    fillRoundRect(ctx, cx - 58, y - 54, 116, 124, 18, linear(ctx, cx - 58, y - 54, cx + 58, y + 70, [[0, spec.primary], [0.32, spec.secondary], [1, '#111827']]), spec.accent);
  }

  if (['motherboard', 'server', 'dumpster', 'billboard', 'compactor', 'printer', 'furnace'].includes(spec.variant)) {
    drawCable(ctx, [[cx - 34, y + 50], [cx - 54, y + 78], [cx - 60, y + 100]], '#1f2937', 10);
    drawCable(ctx, [[cx + 34, y + 50], [cx + 54, y + 78], [cx + 60, y + 100]], '#1f2937', 10);
  }
  if (spec.variant === 'treant') {
    fillRoundRect(ctx, cx - 46, y - 20, 18, 16, 5, '#e7e5e4', '#a8a29e');
    fillRoundRect(ctx, cx + 6, y - 2, 18, 16, 5, '#e7e5e4', '#a8a29e');
    drawCable(ctx, [[cx - 18, y - 8], [cx - 40, y - 26], [cx - 58, y - 54]], spec.accent, 6, spec.glow);
  } else if (spec.variant === 'compost') {
    fillRoundRect(ctx, cx - 34, y + 8, 18, 10, 4, '#38bdf8', '#0f766e');
    fillRoundRect(ctx, cx + 12, y - 10, 16, 24, 6, '#fde68a', '#92400e');
    drawSmoke(ctx, [[cx - 22, y - 56, 16, 10, spec.glow || spec.primary, 0.22], [cx + 14, y - 62, 20, 12, spec.glow || spec.primary, 0.18]]);
  } else if (spec.variant === 'motherboard') {
    for (let i = 0; i < 4; i += 1) fillRoundRect(ctx, cx - 34 + i * 20, y + 10, 12, 22, 4, i % 2 === 0 ? '#facc15' : '#93c5fd', '#0f172a');
    drawCable(ctx, [[cx - 40, y - 18], [cx - 10, y - 18], [cx - 10, y + 12], [cx + 26, y + 12]], spec.accent, 4, spec.glow);
  } else if (spec.variant === 'printer') {
    fillRoundRect(ctx, cx - 32, y - 18, 64, 56, 12, '#f8fafc', '#0f172a');
    withState(ctx, () => {
      ctx.fillStyle = linear(ctx, cx - 12, y + 8, cx + 12, y + 56, [[0, '#f8fafc'], [0.6, '#fca5a5'], [1, '#7f1d1d']]);
      ctx.beginPath();
      ctx.moveTo(cx - 12, y + 8);
      ctx.quadraticCurveTo(cx - 6, y + 40, cx - 2, y + (frame === 0 ? 40 : 56));
      ctx.lineTo(cx + 8, y + (frame === 0 ? 44 : 62));
      ctx.quadraticCurveTo(cx + 16, y + 32, cx + 10, y + 8);
      ctx.closePath();
      ctx.fill();
    });
  } else if (spec.variant === 'server') {
    for (let i = 0; i < 5; i += 1) {
      fillRoundRect(ctx, cx - 38, y - 38 + i * 22, 76, 12, 5, '#0f172a', '#475569');
      ctx.fillStyle = i % 2 === 0 ? `rgba(248,113,113,${frame === 0 ? 0.55 : 1})` : `rgba(96,165,250,${frame === 0 ? 0.55 : 1})`;
      ctx.fillRect(cx - 28, y - 35 + i * 22, 12, 6);
      ctx.fillRect(cx + 16, y - 35 + i * 22, 8, 6);
    }
  } else if (spec.variant === 'cryo') {
    fillRoundRect(ctx, cx - 34, y + 2, 18, 10, 4, '#38bdf8', '#0f766e');
    fillRoundRect(ctx, cx + 4, y - 8, 18, 24, 6, '#e5e7eb', '#64748b');
    for (let i = 0; i < 4; i += 1) fillRoundRect(ctx, cx - 36 + i * 18, y + 50, 12, 18 + (i % 2) * 8, 4, '#e0f2fe');
  } else if (spec.variant === 'furnace') {
    fillRoundRect(ctx, cx - 32, y - 18, 64, 56, 12, linear(ctx, cx - 32, y - 18, cx + 32, y + 38, [[0, '#fef08a'], [0.3, '#f97316'], [0.7, '#dc2626'], [1, '#450a0a']]), '#fb923c');
  } else if (spec.variant === 'refinery') {
    drawCable(ctx, [[cx - 10, y - 8], [cx - 54, y + 10], [cx - 74, y + 44], [cx - 64, y + 78]], '#6b7280', 10);
    drawCable(ctx, [[cx + 10, y + 6], [cx + 50, y + 10], [cx + 78, y + 38], [cx + 86, y + 76]], '#6b7280', 10);
    drawSmoke(ctx, [[cx - 28 + (frame === 0 ? -6 : 6), y - 76, 24, 18, '#374151', 0.32], [cx + 24 - (frame === 0 ? -6 : 6), y - 62, 28, 20, '#111827', 0.28]]);
  } else if (spec.variant === 'pyramid') {
    fillRoundRect(ctx, cx - 32, y + 10, 18, 12, 4, '#94a3b8', '#0f172a');
    fillRoundRect(ctx, cx + 12, y - 6, 16, 24, 4, '#22c55e', '#14532d');
  } else if (spec.variant === 'compactor') {
    fillRoundRect(ctx, cx - 22, y - 50, 44, 30, 10, '#1e293b', '#fef3c7');
    drawCable(ctx, [[cx - 54, y + 34], [cx - 82, y + 48], [cx - 90, y + 84]], '#3f3f46', 14);
    drawCable(ctx, [[cx + 54, y + 34], [cx + 82, y + 48], [cx + 90, y + 84]], '#3f3f46', 14);
  } else if (spec.variant === 'toad') {
    ctx.fillStyle = spec.primary;
    ctx.beginPath();
    ctx.arc(cx - 24, y - 24, 18, 0, TAU);
    ctx.arc(cx + 24, y - 24, 18, 0, TAU);
    ctx.fill();
  } else if (spec.variant === 'bog') {
    fillRoundRect(ctx, cx - 42, y + 2, 16, 10, 4, '#f97316', '#78350f');
    fillRoundRect(ctx, cx - 8, y - 10, 18, 24, 6, '#94a3b8', '#0f172a');
    drawMushroom(ctx, cx + 24, y, spec.accent, spec.glow);
  } else if (spec.variant === 'dumpster') {
    fillRoundRect(ctx, cx - 62, y - 36, 124, 84, 16, linear(ctx, cx - 62, y - 36, cx + 62, y + 48, [[0, spec.primary], [0.35, spec.secondary], [1, '#020617']]), spec.accent);
  } else if (spec.variant === 'billboard') {
    fillRoundRect(ctx, cx - 70, y - 54, 140, 80, 14, linear(ctx, cx - 70, y - 54, cx + 70, y + 26, [[0, spec.primary], [0.35, spec.secondary], [1, '#020617']]), spec.accent);
    fillRoundRect(ctx, cx - 58, y - 42, 116, 54, 10, linear(ctx, cx - 58, y - 42, cx + 58, y + 12, [[0, spec.accent], [0.5, spec.secondary], [1, '#312e81']]), spec.glow || spec.accent);
  } else if (spec.variant === 'abyss') {
    withState(ctx, () => {
      ctx.strokeStyle = 'rgba(192,132,252,0.6)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(cx, y + 62, 68 * (frame === 0 ? 1 : 1.12), 18 * (frame === 0 ? 1 : 1.12), 0, 0, TAU);
      ctx.stroke();
    });
  } else if (spec.variant === 'oblivion') {
    drawCable(ctx, [[cx - 20, y + 32], [cx - 44, y + 54], [cx - 62, y + 84 + (frame === 0 ? -2 : 2)]], spec.secondary, 10, spec.glow);
    drawCable(ctx, [[cx + 22, y + 30], [cx + 48, y + 54], [cx + 72, y + 84 - (frame === 0 ? -2 : 2)]], spec.secondary, 10, spec.glow);
  } else if (spec.variant === 'stratosphere') {
    fillRoundRect(ctx, cx - 34, y - 4, 18, 12, 4, '#22c55e', '#14532d');
    fillRoundRect(ctx, cx + 6, y - 16, 16, 24, 6, '#fde68a', '#92400e');
    drawSmoke(ctx, [[cx - 18 + (frame === 0 ? -6 : 6), y + 56, 20, 10, '#ffffff', 0.28], [cx + 28 + (frame === 0 ? -6 : 6), y + 64, 26, 12, '#bfdbfe', 0.24]]);
  } else if (spec.variant === 'ozone') {
    withState(ctx, () => {
      ctx.shadowColor = spec.glow || spec.accent;
      ctx.shadowBlur = 16;
      ctx.fillStyle = radial(ctx, cx - 10, y - 2, 10, cx, y + 12, 86, [[0, '#fff'], [0.2, spec.primary], [0.46, spec.accent], [0.7, spec.secondary], [1, '#1e293b']]);
      ctx.beginPath();
      ctx.ellipse(cx, y + 10, 58 * (frame === 0 ? 1 : 1.06), 72 * (frame === 0 ? 1 : 1.06), 0, 0, TAU);
      ctx.fill();
    });
  } else if (spec.variant === 'wasteDemon' || spec.variant === 'archfiend') {
    fillRoundRect(ctx, cx - 40, y - 6, 18, 12, 4, '#22c55e', '#14532d');
    fillRoundRect(ctx, cx - 8, y - 20, 16, 24, 6, '#fde68a', '#92400e');
    fillRoundRect(ctx, cx + 20, y - 2, 18, 14, 4, '#94a3b8', '#111827');
    drawSmoke(ctx, [[cx - 24, y - 70, 18, 12, spec.accent, 0.22], [cx + 12, y - 84, 22, 14, spec.glow || spec.accent, 0.2]]);
  }

  drawEye(ctx, cx - 14, y - 10, spec.accent, spec.glow);
  drawEye(ctx, cx + 14, y - 10, spec.accent, spec.glow);
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, type: EnemyRenderType, frame: number, cx: number, y: number) => {
  if (usesPixelEnemyStyle(type)) {
    drawStageOnePixelEnemy(ctx, type, frame, cx, y);
    return;
  }
  const spec = ART[type];
  if (!spec) return;
  switch (spec.family) {
    case 'winged': return drawWinged(ctx, spec, cx, y, frame);
    case 'walker': return drawWalker(ctx, spec, cx, y, frame);
    case 'serpent': return drawSerpent(ctx, spec, cx, y, frame);
    case 'orb': return drawOrb(ctx, spec, cx, y, frame);
    case 'cloud': return drawCloud(ctx, spec, cx, y, frame);
    case 'vine': return drawVine(ctx, spec, cx, y, frame);
    case 'heavy': return drawHeavy(ctx, spec, cx, y, frame);
  }
};

export const drawEnemySheet = (ctx: CanvasRenderingContext2D, type: EnemyRenderType) => {
  ctx.clearRect(0, 0, ENEMY_SHEET_WIDTH, ENEMY_SHEET_HEIGHT);
  drawEnemy(ctx, type, 0, FRAME_SIZE * 0.5, 126);
  drawEnemy(ctx, type, 1, FRAME_SIZE * 1.5, 126);
};
