
import React, { useRef, useEffect, useState, Suspense, useMemo, useLayoutEffect } from 'react';
import { Cloud, Clouds, Sky, Stars, Text } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore'; 
import { GameMode, Vector2, AiStageConfig } from '../../types';
import { ASSET_PATHS } from '../../assets';
import { PropSpriteBatch, PlayerSpriteBillboard } from './SpriteBillboard';
import { RemotePlayer } from './RemotePlayer';
import { BattleManager } from './BattleManager';
import { broadcastMultiplayer } from '../../multiplayer/service';
import { POSITION_BROADCAST_HZ, PORTAL_VOTE_PROXIMITY } from '../../multiplayer/config';
import { setLocalPortalVote } from '../../multiplayer/portalVote';
import { PixelGround } from './PixelGround';
import { VoxelPortal } from './VoxelPortal';
import { VoxelLandmark } from './VoxelLandmark';
import { VoxelShop } from './VoxelShop';
import { QuestArrow } from './QuestArrow';
import {
  InWorldText,
  BOSS_GROUND_TEXT_PANEL,
  QUIZ_GROUND_TEXT_PANEL,
  SHOP_GROUND_TEXT_PANEL,
  STAGE_INTRO_GROUND_TEXT_PANEL,
  VIBEJAM_GROUND_TEXT_PANEL,
} from './InWorldText';
import type { GroundTextHighlights } from './InWorldText';
import { requestGaiaNarration, requestQuizNarration } from './AudioManager';
import kenpixelFontUrl from 'three/examples/fonts/ttf/kenpixel.ttf?url';

interface SceneProps {
  inputVector: React.MutableRefObject<Vector2>;
  dashTrigger: React.MutableRefObject<boolean>;
}

type ThemeName = 'FOREST' | 'SKULL' | 'ICE' | 'VOLCANO' | 'PYRAMID' | 'MUSHROOM' | 'CYBER' | 'VOID' | 'SKY' | 'HELL';

const isInsideGroundTextPanel = (
  x: number,
  z: number,
  center: { x: number; z: number },
  panel: { width: number; height: number },
) =>
  Math.abs(x - center.x) <= panel.width / 2 &&
  Math.abs(z - center.z) <= panel.height / 2;

const areGroundTextHighlightsEqual = (a: GroundTextHighlights, b: GroundTextHighlights) =>
  Boolean(a.stageIntro) === Boolean(b.stageIntro) &&
  Boolean(a.quiz) === Boolean(b.quiz) &&
  Boolean(a.boss) === Boolean(b.boss) &&
  Boolean(a.shop) === Boolean(b.shop) &&
  Boolean(a.vibeJamNext) === Boolean(b.vibeJamNext) &&
  Boolean(a.vibeJamReturn) === Boolean(b.vibeJamReturn);

const THEME_FOG_COLORS: Record<ThemeName, string> = {
  FOREST: '#87CEEB',
  SKULL: '#1e293b',
  ICE: '#e0f2fe',
  VOLCANO: '#450a0a',
  PYRAMID: '#92400e',
  MUSHROOM: '#3f6212',
  CYBER: '#020617',
  VOID: '#2e1065',
  SKY: '#bae6fd',
  HELL: '#7f1d1d',
};

const THEME_BACKGROUND_COLORS: Record<ThemeName, string> = {
  FOREST: '#87CEEB',
  SKULL: '#020617',
  ICE: '#dbeafe',
  VOLCANO: '#2b0808',
  PYRAMID: '#b45309',
  MUSHROOM: '#365314',
  CYBER: '#020617',
  VOID: '#0f0624',
  SKY: '#bae6fd',
  HELL: '#3f0a0a',
};

const THEME_HEMISPHERE_COLORS: Record<ThemeName, { sky: string; ground: string }> = {
  FOREST: { sky: '#86efac', ground: '#451a03' },
  SKULL: { sky: '#94a3b8', ground: '#111827' },
  ICE: { sky: '#e0f2fe', ground: '#67e8f9' },
  VOLCANO: { sky: '#ef4444', ground: '#292524' },
  PYRAMID: { sky: '#fdba74', ground: '#78350f' },
  MUSHROOM: { sky: '#84cc16', ground: '#1a2e05' },
  CYBER: { sky: '#38bdf8', ground: '#020617' },
  VOID: { sky: '#8b5cf6', ground: '#1e1b4b' },
  SKY: { sky: '#e0f2fe', ground: '#7dd3fc' },
  HELL: { sky: '#f87171', ground: '#450a0a' },
};

const PORTRAIT_CAMERA_BOOST = 14;
const PORTRAIT_ZOOM_RANGE_SCALE = 1.45;

const CLOUD_CONFIGS = [
  { x: -28, y: 14.2, z: -36, drift: 0.55, scale: 1.2, seed: 101, segments: 22, bounds: [7.2, 1.9, 1.5] as [number, number, number], volume: 1.95, opacity: 0.52 },
  { x:   8, y: 14.7, z: -32, drift: 0.45, scale: 1.35, seed: 203, segments: 24, bounds: [7.8, 2.0, 1.6] as [number, number, number], volume: 2.05, opacity: 0.5 },
  { x:  34, y: 13.6, z: -24, drift: 0.95, scale: 0.95, seed: 307, segments: 16, bounds: [5.8, 1.6, 1.25] as [number, number, number], volume: 1.55, opacity: 0.56 },
  { x: -42, y: 12.9, z: -15, drift: 0.7, scale: 1.1, seed: 409, segments: 18, bounds: [6.2, 1.7, 1.3] as [number, number, number], volume: 1.7, opacity: 0.54 },
  { x: -12, y: 12.4, z: -10, drift: 0.9, scale: 1.0, seed: 503, segments: 18, bounds: [6.0, 1.6, 1.25] as [number, number, number], volume: 1.6, opacity: 0.5, hideInBattle: true },
  { x:  24, y: 11.8, z: -7,  drift: 1.1, scale: 0.92, seed: 601, segments: 16, bounds: [5.6, 1.45, 1.15] as [number, number, number], volume: 1.45, opacity: 0.5, hideInBattle: true },
  { x: -36, y: 11.6, z: -5,  drift: 0.75, scale: 0.95, seed: 701, segments: 16, bounds: [5.8, 1.5, 1.2] as [number, number, number], volume: 1.5, opacity: 0.48, hideInBattle: true },
  { x:  12, y: 12.1, z: -3,  drift: 0.65, scale: 1.0, seed: 809, segments: 18, bounds: [6.2, 1.55, 1.2] as [number, number, number], volume: 1.55, opacity: 0.46, hideInBattle: true },
  { x:  38, y: 11.9, z: -4,  drift: 0.85, scale: 0.92, seed: 907, segments: 14, bounds: [5.4, 1.35, 1.05] as [number, number, number], volume: 1.35, opacity: 0.48, hideInBattle: true },
];

const createCloudTextureDataUrl = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const puffs = [
      { x: 40, y: 72, r: 24 },
      { x: 66, y: 56, r: 32 },
      { x: 92, y: 72, r: 22 },
      { x: 66, y: 82, r: 28 },
    ];

    puffs.forEach(({ x, y, r }) => {
      const gradient = ctx.createRadialGradient(x, y, r * 0.22, x, y, r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.98)');
      gradient.addColorStop(0.55, 'rgba(248,251,255,0.92)');
      gradient.addColorStop(0.82, 'rgba(236,243,248,0.55)');
      gradient.addColorStop(1, 'rgba(236,243,248,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    const bottomShade = ctx.createLinearGradient(0, 70, 0, 124);
    bottomShade.addColorStop(0, 'rgba(210,220,232,0)');
    bottomShade.addColorStop(1, 'rgba(210,220,232,0.18)');
    ctx.fillStyle = bottomShade;
    ctx.fillRect(18, 54, 92, 56);
  }

  return canvas.toDataURL('image/png');
};

const AnimatedClouds = ({ hideLowerClouds = false }: { hideLowerClouds?: boolean }) => {
  const cloudLayerRef = useRef<THREE.Group>(null);
  const cloudRefs = useRef<Record<number, THREE.Group | null>>({});
  const positions = useRef<Record<number, number>>(
    Object.fromEntries(CLOUD_CONFIGS.map(cloud => [cloud.seed, cloud.x]))
  );
  const cloudTexture = useMemo(() => createCloudTextureDataUrl(), []);
  const visibleClouds = useMemo(
    () => CLOUD_CONFIGS.filter(cloud => !hideLowerClouds || !cloud.hideInBattle),
    [hideLowerClouds]
  );
  const visibleSegmentLimit = useMemo(
    () => visibleClouds.reduce((total, cloud) => total + cloud.segments, 0),
    [visibleClouds]
  );

  useLayoutEffect(() => {
    const layer = cloudLayerRef.current;
    if (!layer) return;

    layer.traverse((child) => {
      child.renderOrder = 20;
      const material = (child as THREE.Mesh).material;
      if (!material) return;

      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((mat) => {
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.needsUpdate = true;
      });
    });
  }, [visibleSegmentLimit]);

  useFrame((_, delta) => {
    visibleClouds.forEach((cfg) => {
      const cloud = cloudRefs.current[cfg.seed];
      if (!cloud) return;
      positions.current[cfg.seed] += cfg.drift * delta;
      if (positions.current[cfg.seed] > 58) positions.current[cfg.seed] = -58;
      cloud.position.x = positions.current[cfg.seed];
    });
  });

  return (
    <Clouds
      ref={cloudLayerRef}
      texture={cloudTexture}
      material={THREE.MeshBasicMaterial}
      limit={visibleSegmentLimit}
      range={visibleSegmentLimit}
      frustumCulled={false}
      renderOrder={20}
    >
      {visibleClouds.map((cfg) => (
        <Cloud
          key={cfg.seed}
          ref={el => { cloudRefs.current[cfg.seed] = el; }}
          position={[cfg.x, cfg.y, cfg.z]}
          scale={cfg.scale}
          seed={cfg.seed}
          segments={cfg.segments}
          bounds={cfg.bounds}
          volume={cfg.volume}
          smallestVolume={0.28}
          fade={0}
          opacity={cfg.opacity}
          color="#f8fbff"
          speed={0}
        />
      ))}
    </Clouds>
  );
};

type TrailData = { id: string; x: number; z: number; life: number };

// Self-animating trail particle — reads t.life via useFrame so the parent only
// re-renders on add/remove, not every frame while a dash trail fades.
const TrailParticle: React.FC<{ trail: TrailData }> = ({ trail }) => {
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    useFrame(() => { if (matRef.current) matRef.current.opacity = Math.max(0, trail.life); });
    return (
        <mesh position={[trail.x, 0.8, trail.z]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial ref={matRef} color="#bae6fd" transparent opacity={trail.life} />
        </mesh>
    );
};

const PlayerTrailRenderer = ({ playerRef, dashTimer }: { playerRef: React.RefObject<THREE.Group>, dashTimer: React.MutableRefObject<number> }) => {
    const trails = useRef<TrailData[]>([]);
    const [renderTrails, setRenderTrails] = useState<TrailData[]>([]);
    useFrame((state, delta) => {
        if (useGameStore.getState().mode === GameMode.PAUSED) return;
        const prevLen = trails.current.length;
        if (dashTimer.current > 0 && playerRef.current && Math.random() < 0.6) {
            trails.current.push({ id: Math.random().toString(), x: playerRef.current.position.x, z: playerRef.current.position.z, life: 0.3 });
        }
        if (trails.current.length > 0) {
            trails.current = trails.current.filter(t => { t.life -= delta; return t.life > 0; });
        }
        if (trails.current.length !== prevLen) setRenderTrails([...trails.current]);
    });
    return (
        <group>{renderTrails.map(t => <TrailParticle key={t.id} trail={t} />)}</group>
    );
};

const getLandmarkType = (stage: number, config: AiStageConfig | null) => {
    if (config?.theme?.landmarkType) return config.theme.landmarkType;
    const cycle = ((stage - 1) % 10) + 1;
    switch(cycle) { case 1: return 'FOREST'; case 2: return 'SKULL'; case 3: return 'ICE'; case 4: return 'VOLCANO'; case 5: return 'PYRAMID'; case 6: return 'MUSHROOM'; case 7: return 'CYBER'; case 8: return 'VOID'; case 9: return 'SKY'; case 10: return 'HELL'; default: return 'FOREST'; }
}

const THEME_PROP_POOLS: Record<ThemeName, string[]> = {
  FOREST: ['TREE', 'TREE_STUMP', 'PLASTIC_BAG_SHRUB', 'BOTTLE_PILE', 'MUSHROOM', 'STONE'],
  SKULL: ['GRAVE', 'RUIN', 'BATTERY_GRAVE', 'CABLE_ROOTS', 'STONE'],
  ICE: ['SNOW_TREE', 'CRYSTAL', 'FROZEN_SERVER', 'ICE_SHARD', 'STONE'],
  VOLCANO: ['MAGMA_ROCK', 'LAVA_PILLAR', 'OIL_DRUM', 'EMBER_VENT', 'SPIKE_ROCK'],
  PYRAMID: ['CACTUS', 'PALM', 'GLASS_DUNE', 'SILICON_SPIRE', 'STONE'],
  MUSHROOM: ['SWAMP_TREE', 'VINE', 'MUSHROOM', 'TOXIC_BARREL', 'SLUDGE_POOL'],
  CYBER: ['SERVER', 'NEON_SIGN', 'CABLE_POST', 'TRASH_CAN', 'BILLBOARD_RUIN'],
  VOID: ['VOID_ROCK', 'STAR_PILLAR', 'NULL_CRYSTAL', 'STATIC_RIFT'],
  SKY: ['CLOUD_PILLAR', 'GOLD_GATE', 'SKY_SERVER', 'SATELLITE_DISH', 'SERVER'],
  HELL: ['SPIKE_ROCK', 'LAVA_PILLAR', 'HELL_OBELISK', 'BURNED_SERVER', 'MAGMA_ROCK'],
};

const getThemePropPool = (theme: ThemeName, primaryProp?: string) => {
  const pool = THEME_PROP_POOLS[theme] ?? THEME_PROP_POOLS.FOREST;
  return primaryProp ? Array.from(new Set([primaryProp, ...pool])) : pool;
};

const getPropScale = (type: string) => {
    if (type === 'TREE' || type === 'PALM' || type === 'SWAMP_TREE' || type === 'SNOW_TREE') return 3.5;
    if (type.includes('PILLAR') || type === 'RUIN' || type.includes('SERVER') || type.includes('GATE') || type === 'NEON_SIGN' || type === 'BILLBOARD_RUIN' || type === 'HELL_OBELISK') return 3.0;
    if (type === 'SATELLITE_DISH' || type === 'SILICON_SPIRE' || type === 'STATIC_RIFT') return 2.7;
    if (type === 'MUSHROOM' || type.includes('CRYSTAL') || type === 'CACTUS' || type.includes('GRAVE') || type === 'TRASH_CAN' || type.includes('BARREL') || type === 'OIL_DRUM') return 2.2;
    if (type.includes('STONE') || type.includes('ROCK') || type === 'VINE' || type === 'BOTTLE_PILE' || type === 'CABLE_ROOTS' || type === 'SLUDGE_POOL' || type === 'EMBER_VENT') return 1.8;
    return 2.0;
};

type AtmosphereParticle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scaleX: number;
  scaleY: number;
  phase: number;
  color: string;
};

type AtmosphereConfig = {
  count: number;
  colors: string[];
  opacity: number;
  area: number;
  yMin: number;
  yMax: number;
  speed: number;
  sizeMin: number;
  sizeMax: number;
  stretchMin: number;
  stretchMax: number;
  verticalBias?: number;
  additive?: boolean;
};

const atmosphereParticleGeometry = new THREE.PlaneGeometry(1, 1);

const createSceneSeededRandom = (seedInput: string) => {
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

const ATMOSPHERE_CONFIGS: Record<ThemeName, AtmosphereConfig> = {
  FOREST: { count: 26, colors: ['#fef08a', '#bbf7d0', '#86efac'], opacity: 0.2, area: 58, yMin: 1.1, yMax: 5.2, speed: 0.34, sizeMin: 0.09, sizeMax: 0.18, stretchMin: 1, stretchMax: 1.6, additive: true },
  SKULL: { count: 18, colors: ['#cbd5e1', '#e2e8f0', '#bef264'], opacity: 0.13, area: 58, yMin: 0.35, yMax: 2.2, speed: 0.18, sizeMin: 0.14, sizeMax: 0.28, stretchMin: 3, stretchMax: 7 },
  ICE: { count: 20, colors: ['#ffffff', '#e0f2fe', '#bae6fd'], opacity: 0.18, area: 58, yMin: 0.8, yMax: 4.5, speed: 0.2, sizeMin: 0.08, sizeMax: 0.15, stretchMin: 1, stretchMax: 1.8, additive: true },
  VOLCANO: { count: 24, colors: ['#facc15', '#fb923c', '#ef4444'], opacity: 0.24, area: 56, yMin: 0.5, yMax: 6.2, speed: 0.42, sizeMin: 0.08, sizeMax: 0.18, stretchMin: 1, stretchMax: 2.2, verticalBias: 0.35, additive: true },
  PYRAMID: { count: 20, colors: ['#fef3c7', '#fde68a', '#ffffff'], opacity: 0.13, area: 58, yMin: 0.35, yMax: 2.6, speed: 0.24, sizeMin: 0.12, sizeMax: 0.24, stretchMin: 3, stretchMax: 8 },
  MUSHROOM: { count: 28, colors: ['#d9f99d', '#f0abfc', '#bef264'], opacity: 0.18, area: 58, yMin: 0.65, yMax: 4.6, speed: 0.28, sizeMin: 0.08, sizeMax: 0.18, stretchMin: 1, stretchMax: 1.8, additive: true },
  CYBER: { count: 18, colors: ['#67e8f9', '#86efac', '#c4b5fd'], opacity: 0.16, area: 58, yMin: 0.8, yMax: 4.2, speed: 0.38, sizeMin: 0.08, sizeMax: 0.16, stretchMin: 1, stretchMax: 2.4, additive: true },
  VOID: { count: 24, colors: ['#e9d5ff', '#c4b5fd', '#a78bfa'], opacity: 0.2, area: 58, yMin: 0.75, yMax: 5.2, speed: 0.25, sizeMin: 0.08, sizeMax: 0.2, stretchMin: 1, stretchMax: 2.6, additive: true },
  SKY: { count: 20, colors: ['#ffffff', '#e0f2fe', '#fef08a'], opacity: 0.16, area: 58, yMin: 1.5, yMax: 6.5, speed: 0.26, sizeMin: 0.12, sizeMax: 0.24, stretchMin: 3, stretchMax: 8 },
  HELL: { count: 28, colors: ['#facc15', '#fb923c', '#ef4444'], opacity: 0.25, area: 56, yMin: 0.45, yMax: 6.4, speed: 0.48, sizeMin: 0.08, sizeMax: 0.2, stretchMin: 1, stretchMax: 2.4, verticalBias: 0.45, additive: true },
};

const BiomeAtmosphere: React.FC<{ theme: ThemeName }> = ({ theme }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const config = ATMOSPHERE_CONFIGS[theme] ?? ATMOSPHERE_CONFIGS.FOREST;
  const particles = useMemo<AtmosphereParticle[]>(() => {
    const rand = createSceneSeededRandom(`biome-atmosphere:${theme}`);
    const halfArea = config.area / 2;
    const yRange = config.yMax - config.yMin;

    return Array.from({ length: config.count }, (_, index) => {
      const angle = rand() * Math.PI * 2;
      const speed = config.speed * (0.45 + rand() * 0.75);
      const baseSize = config.sizeMin + rand() * (config.sizeMax - config.sizeMin);
      const stretch = config.stretchMin + rand() * (config.stretchMax - config.stretchMin);
      const horizontalStretch = theme === 'SKULL' || theme === 'PYRAMID' || theme === 'SKY';

      return {
        x: rand() * config.area - halfArea,
        y: config.yMin + rand() * yRange,
        z: rand() * config.area - halfArea,
        vx: Math.cos(angle) * speed,
        vy: (rand() - 0.5) * speed * 0.35 + (config.verticalBias ?? 0),
        vz: Math.sin(angle) * speed,
        scaleX: horizontalStretch ? baseSize * stretch : baseSize,
        scaleY: horizontalStretch ? baseSize : baseSize * (1 + rand() * 0.35),
        phase: rand() * Math.PI * 2 + index,
        color: config.colors[Math.floor(rand() * config.colors.length)],
      };
    });
  }, [config, theme]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: config.opacity,
    depthWrite: false,
    vertexColors: true,
    blending: config.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  }), [config.additive, config.opacity]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    particles.forEach((particle, index) => {
      mesh.setColorAt(index, new THREE.Color(particle.color));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera, clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const halfArea = config.area / 2;
    const wrap = (value: number, min: number, max: number) => {
      const range = max - min;
      if (value < min) return value + range;
      if (value > max) return value - range;
      return value;
    };

    particles.forEach((particle, index) => {
      particle.x = wrap(particle.x + particle.vx * delta, -halfArea, halfArea);
      particle.y = wrap(particle.y + particle.vy * delta, config.yMin, config.yMax);
      particle.z = wrap(particle.z + particle.vz * delta, -halfArea, halfArea);

      const pulse = 0.78 + Math.sin(clock.elapsedTime * 1.4 + particle.phase) * 0.22;
      tempObject.position.set(particle.x, particle.y, particle.z);
      tempObject.quaternion.copy(camera.quaternion);
      tempObject.scale.set(particle.scaleX * pulse, particle.scaleY * pulse, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[atmosphereParticleGeometry, material, particles.length]}
      frustumCulled={false}
      renderOrder={2}
    />
  );
};

const isBattlePresenceMode = (mode: GameMode) =>
  mode === GameMode.BATTLE ||
  mode === GameMode.QUIZ_RESULT ||
  mode === GameMode.REWARD ||
  mode === GameMode.CHEST_REWARD;

export const Scene: React.FC<SceneProps> = ({ inputVector, dashTrigger }) => {
  const playerRef = useRef<THREE.Group>(null);
  // Per-field selectors: only re-render on changes to fields Scene actually reads.
  // Previously, destructuring `useGameStore()` subscribed to the whole store, so
  // any mutation (XP ticks, HP, peers, dash cooldown, etc.) re-rendered this 700+ line tree.
  const mode = useGameStore(s => s.mode);
  const playerStats = useGameStore(s => s.playerStats);
  const worldPosition = useGameStore(s => s.worldPosition);
  const portals = useGameStore(s => s.portals);
  const activeBattle = useGameStore(s => s.activeBattle);
  const activeStage = useGameStore(s => s.activeStage);
  const isQuizOpen = useGameStore(s => s.isQuizOpen);
  const isImpactOpen = useGameStore(s => s.isImpactOpen);
  const isStageReady = useGameStore(s => s.isStageReady);
  const isOverworldSceneReady = useGameStore(s => s.isOverworldSceneReady);
  const lastGameplayMode = useGameStore(s => s.lastGameplayMode);
  const highlightedPortalId = useGameStore(s => s.highlightedPortalId);
  const showNarrative = useGameStore(s => s.showNarrative);
  const narrativeDismissed = useGameStore(s => s.narrativeDismissed);
  const cameraZoom = useGameStore(s => s.cameraZoom);
  const isPortalEntry = useGameStore(s => s.isPortalEntry);
  const portalRefUrl = useGameStore(s => s.portalRefUrl);
  const enterBattle = useGameStore(s => s.enterBattle);
  const setDashCooldown = useGameStore(s => s.setDashCooldown);
  const updatePosition = useGameStore(s => s.updatePosition);
  const setOverworldSceneReady = useGameStore(s => s.setOverworldSceneReady);
  const enterShop = useGameStore(s => s.enterShop);
  const setShowNarrative = useGameStore(s => s.setShowNarrative);
  const setNarrativeDismissed = useGameStore(s => s.setNarrativeDismissed);
  const setCameraZoom = useGameStore(s => s.setCameraZoom);
  const localSlotIndex = useGameStore((s) => s.multiplayer.slotIndex);
  const mpJoinedAt = useGameStore((s) => s.multiplayer.joinedAt);
  const mpGroupId = useGameStore((s) => s.multiplayer.groupId);
  const peers = useGameStore((s) => s.multiplayer.peers);
  const mpPortalVotes = useGameStore((s) => s.multiplayer.portalVotes);
  const localPlayerId = useGameStore((s) => s.multiplayer.localPlayerId);
  const peerList = useMemo(() => Object.values(peers), [peers]);
  const visiblePeerList = useMemo(
    () => peerList.filter((p) => p.scene !== 'BATTLE'),
    [peerList]
  );
  const hasPeers = peerList.length > 0;
  const lastBroadcastRef = useRef<number>(0);
  const localPortalVoteRef = useRef<string | null>(null);
  const [localPortalVoteId, setLocalPortalVoteId] = useState<string | null>(null);
  const aiConfig = useAiDirectorStore(state => state.currentConfig);
  const { camera, gl } = useThree();
  const [facing, setFacing] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [viewDirection, setViewDirection] = useState<'DOWN'|'UP'|'SIDE'>('DOWN');
  const [groundTextHighlights, setGroundTextHighlights] = useState<GroundTextHighlights>({});
  const facingRef = useRef(1);
  const isMovingRef = useRef(false);
  const viewDirectionRef = useRef<'DOWN'|'UP'|'SIDE'>('DOWN');
  const battleCooldown = useRef(0);
  const lastMapUpdate = useRef(0);
  const dashTimer = useRef(0);
  // Local source of truth for dash cooldown — previously this was read from the store,
  // which meant every frame of cooldown setDashCooldown() re-rendered the whole Scene tree.
  // We decrement this ref locally and only sync to the store at ~10Hz for the UI display.
  const dashCooldownRef = useRef(0);
  const dashCooldownStoreSync = useRef(0);
  const dashDirection = useRef(new THREE.Vector2(0, 0));
  const lastMoveDir = useRef(new THREE.Vector2(1, 0));
  const shakeIntensity = useRef(0);
  const lastProcessedDamageTime = useRef(0);
  const prevModeRef = useRef<GameMode>(mode);
  const prevBroadcastModeRef = useRef<GameMode>(mode);
  const overworldWarmupFrames = useRef(0);
  const groundTextHighlightsRef = useRef<GroundTextHighlights>({});
  const stageIntroGroundInsideRef = useRef(false);
  const quizGroundInsideRef = useRef(false);
  const bossGroundInsideRef = useRef(false);
  const zoomCurrent = useRef(1.0);
  const fogRef = useRef<THREE.Fog>(null);
  const _camTarget = useRef(new THREE.Vector3());
  const _portalVec = useRef(new THREE.Vector3());
  const _vjNextVec = useRef(new THREE.Vector3(-13, 0, -5));
  const _vjReturnVec = useRef(new THREE.Vector3(-25, 0, -5));
  const portalGraceTimer = useRef(5.0); // 5-second grace period after portal entry
  const joinSpawnAdjustedForGroupRef = useRef<string | null>(null);
  
  const themeId = React.useMemo(() => ((activeStage - 1) % 10) + 1, [activeStage]);
  const landmarkType = React.useMemo(() => getLandmarkType(activeStage, aiConfig), [activeStage, aiConfig]);
  const sceneTheme = React.useMemo<ThemeName>(() => {
    return Object.prototype.hasOwnProperty.call(THEME_FOG_COLORS, landmarkType) ? landmarkType as ThemeName : 'FOREST';
  }, [landmarkType]);
  const fogColor = React.useMemo(() => THEME_FOG_COLORS[sceneTheme], [sceneTheme]);
  const backgroundColor = React.useMemo(() => THEME_BACKGROUND_COLORS[sceneTheme], [sceneTheme]);
  const hemisphereColors = React.useMemo(() => THEME_HEMISPHERE_COLORS[sceneTheme], [sceneTheme]);
  const landmarkRadius = React.useMemo(() => {
    switch(landmarkType) { case 'VOLCANO': return 8.5; case 'PYRAMID': return 8.5; case 'HELL': return 7.0; case 'FOREST': case 'SKULL': return 5.5; default: return 4.5; }
  }, [landmarkType]);
  
  const LANDMARK_POS = { x: 0, z: -10 };
  const SHOP_POS = { x: 15, z: -5 };
  const QUIZ_PORTAL_CENTER_POS = { x: 0, z: 6 };
  const stageIntroGroundTextCenter = {
    x: LANDMARK_POS.x,
    z: LANDMARK_POS.z + STAGE_INTRO_GROUND_TEXT_PANEL.offsetZ,
  };
  const quizGroundTextCenter = {
    x: QUIZ_PORTAL_CENTER_POS.x,
    z: QUIZ_PORTAL_CENTER_POS.z + QUIZ_GROUND_TEXT_PANEL.offsetZ,
  };
  const shopGroundTextCenter = {
    x: SHOP_POS.x,
    z: SHOP_POS.z + SHOP_GROUND_TEXT_PANEL.offsetZ,
  };
  const VIBEJAM_NEXT_POS = { x: -13, z: -5 };   // VibeJam exit portal — always present
  const VIBEJAM_RETURN_POS = { x: -25, z: -5 };  // VibeJam return portal — portal entry only

  const vibeJamNextGroundTextCenter = {
    x: VIBEJAM_NEXT_POS.x,
    z: VIBEJAM_NEXT_POS.z + VIBEJAM_GROUND_TEXT_PANEL.offsetZ,
  };
  const vibeJamReturnGroundTextCenter = {
    x: VIBEJAM_RETURN_POS.x,
    z: VIBEJAM_RETURN_POS.z + VIBEJAM_GROUND_TEXT_PANEL.offsetZ,
  };

  const gaiaStageNumber = React.useMemo(() => Math.min(10, Math.max(1, activeStage)), [activeStage]);
  const bossPortal = useMemo(() => portals.find(p => p.type === 'BOSS') ?? null, [portals]);
  const hasBossPortal = Boolean(bossPortal);
  const quizPortalSignature = useMemo(
    () => portals.filter(p => p.quizOption).map(p => p.id).sort().join('|'),
    [portals]
  );
  const quizQuestionAudioSrc = aiConfig?.quiz?.audioQuestionSrc;
  const quizQuestionAudioKey = aiConfig?.quiz?.audioId
    ? `quiz-question:${activeStage}:${quizPortalSignature}:${aiConfig.quiz.audioId}`
    : aiConfig?.quiz?.question
      ? `quiz-question:${activeStage}:${quizPortalSignature}:${aiConfig.quiz.question}`
      : undefined;
  const isQuizGroundTextVisible = Boolean((showNarrative || narrativeDismissed) && aiConfig?.quiz?.question && !hasBossPortal);
  const stageIntroAudioSrc = aiConfig ? ASSET_PATHS.audio.gaia.stageIntro(gaiaStageNumber) : undefined;
  const stageIntroAudioKey = aiConfig ? `gaia:stage-intro:${gaiaStageNumber}` : undefined;
  const bossGroundTextCenter = bossPortal
    ? {
        x: bossPortal.x,
        z: bossPortal.z + BOSS_GROUND_TEXT_PANEL.offsetZ,
      }
    : null;
  const bossPromptAudioSrc = bossPortal ? ASSET_PATHS.audio.gaia.bossPrompt(gaiaStageNumber) : undefined;
  const bossPromptAudioKey = bossPortal ? `gaia:boss-prompt:${gaiaStageNumber}:${bossPortal.id}` : undefined;

  const props = React.useMemo(() => {
    const possibleTypes = getThemePropPool(sceneTheme, aiConfig?.theme.propType);
    const items = []; for(let i=0; i<150; i++) { const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)]; const x = (Math.random() - 0.5) * 54; const z = (Math.random() - 0.5) * 54; const dist = Math.sqrt(x*x + z*z); if (z > -16 && z < 1 && x > -8 && x < 8) continue; if (z > 1 && z < 18 && x > -12 && x < 12) continue;
    const distToShop = Math.sqrt((x - SHOP_POS.x)**2 + (z - SHOP_POS.z)**2); if (distToShop < 8) continue;
    const distToVJNext = Math.sqrt((x - VIBEJAM_NEXT_POS.x)**2 + (z - VIBEJAM_NEXT_POS.z)**2); if (distToVJNext < 6) continue;
    const distToVJReturn = Math.sqrt((x - VIBEJAM_RETURN_POS.x)**2 + (z - VIBEJAM_RETURN_POS.z)**2); if (distToVJReturn < 6) continue;
    if (dist < 6) continue; items.push({ id: i, type, x, z }); }
    return items;
  }, [sceneTheme, aiConfig]);

  const propSprites = React.useMemo(
    () => props.map((p) => ({ ...p, scale: getPropScale(p.type) })),
    [props]
  );

  const updateMovingState = (nextIsMoving: boolean) => {
    if (isMovingRef.current === nextIsMoving) return;
    isMovingRef.current = nextIsMoving;
    setIsMoving(nextIsMoving);
  };

  const updateFacingState = (nextFacing: number) => {
    if (facingRef.current === nextFacing) return;
    facingRef.current = nextFacing;
    setFacing(nextFacing);
  };

  const updateViewDirectionState = (nextViewDirection: 'DOWN'|'UP'|'SIDE') => {
    if (viewDirectionRef.current === nextViewDirection) return;
    viewDirectionRef.current = nextViewDirection;
    setViewDirection(nextViewDirection);
  };

  const updateGroundTextHighlights = (nextHighlights: GroundTextHighlights) => {
    if (areGroundTextHighlightsEqual(groundTextHighlightsRef.current, nextHighlights)) return;
    groundTextHighlightsRef.current = nextHighlights;
    setGroundTextHighlights(nextHighlights);
  };

  useEffect(() => {
    if (playerRef.current) {
        if (prevModeRef.current === GameMode.PAUSED || prevModeRef.current === GameMode.SHOP || prevModeRef.current === GameMode.STATUS || prevModeRef.current === GameMode.LIBRARY) { /* */ }
        else { if (mode === GameMode.OVERWORLD) { battleCooldown.current = 3.0; } else if (mode === GameMode.BATTLE) { const isResuming = prevModeRef.current === GameMode.REWARD || prevModeRef.current === GameMode.CHEST_REWARD; if (!isResuming) { playerRef.current.position.set(0, 0, 0); } } }
    }
    prevModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!isOverworldSceneReady) return;
    if (mode !== GameMode.OVERWORLD) return;
    if (!playerRef.current) return;
    playerRef.current.position.set(worldPosition.x, 0, worldPosition.z);
  }, [isOverworldSceneReady]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (mode !== GameMode.OVERWORLD) return;
    if (!mpGroupId || !mpJoinedAt) return;
    if (joinSpawnAdjustedForGroupRef.current === mpGroupId) return;
    if (Date.now() - mpJoinedAt > 4000) return;
    if (localSlotIndex <= 0) return; // keep existing player (slot 0) fixed

    // Nudge only newly joined non-host players a little to avoid overlap at spawn.
    const offsets: Array<{ x: number; z: number }> = [
      { x: 0, z: 0 },
      { x: 2.0, z: 0 },
      { x: -2.0, z: 0 },
      { x: 0, z: 2.0 },
    ];
    const offset = offsets[localSlotIndex] ?? offsets[1];
    playerRef.current.position.x += offset.x;
    playerRef.current.position.z += offset.z;
    updatePosition(playerRef.current.position.x, playerRef.current.position.z);
    joinSpawnAdjustedForGroupRef.current = mpGroupId;
  }, [mode, mpGroupId, mpJoinedAt, localSlotIndex, updatePosition]);

  // Reset VibeJam portal grace timer whenever a portal entry session starts
  useEffect(() => {
    if (isPortalEntry) { portalGraceTimer.current = 5.0; }
  }, [isPortalEntry]);

  useEffect(() => {
    stageIntroGroundInsideRef.current = false;
  }, [stageIntroAudioKey]);

  useEffect(() => {
    quizGroundInsideRef.current = false;
  }, [quizQuestionAudioKey]);

  useEffect(() => {
    bossGroundInsideRef.current = false;
  }, [bossPromptAudioKey]);

  useEffect(() => {
    if (mode === GameMode.MENU || mode === GameMode.DIFFICULTY_SELECT || mode === GameMode.LOADING_LEVEL) {
      stageIntroGroundInsideRef.current = false;
      quizGroundInsideRef.current = false;
      bossGroundInsideRef.current = false;
      updateGroundTextHighlights({});
    }
  }, [mode]);

  // Keep dashCooldownRef in sync with external store resets (stage change etc.)
  // Subscribe side-effect-only so this doesn't cause Scene re-renders.
  useEffect(() => {
    dashCooldownRef.current = useGameStore.getState().dashCooldownCurrent;
    return useGameStore.subscribe((state, prevState) => {
      if (state.dashCooldownCurrent !== prevState.dashCooldownCurrent &&
          Math.abs(state.dashCooldownCurrent - dashCooldownRef.current) > 0.15) {
        dashCooldownRef.current = state.dashCooldownCurrent;
      }
    });
  }, []);

  useFrame((state, delta) => {
    if (showOverworldScene && !isOverworldSceneReady) {
      overworldWarmupFrames.current += 1;
      if (overworldWarmupFrames.current >= 2) {
        setOverworldSceneReady(true);
      }
    } else if (!showOverworldScene) {
      overworldWarmupFrames.current = 0;
    }

    if (!playerRef.current) return;
    if (mode === GameMode.PAUSED || isQuizOpen || isImpactOpen || mode === GameMode.SHOP || mode === GameMode.STATUS || mode === GameMode.LIBRARY) return;
    if (battleCooldown.current > 0) battleCooldown.current -= delta;
    if (dashCooldownRef.current > 0) {
      dashCooldownRef.current = Math.max(0, dashCooldownRef.current - delta);
      // Sync to store only at ~10Hz for the UI readout, or immediately on 0-crossing.
      const elapsed = state.clock.elapsedTime;
      if (dashCooldownRef.current === 0 || elapsed - dashCooldownStoreSync.current > 0.1) {
        dashCooldownStoreSync.current = elapsed;
        setDashCooldown(dashCooldownRef.current);
      }
    }
    if (dashTimer.current > 0) dashTimer.current -= delta;
    if ((mode === GameMode.OVERWORLD || mode === GameMode.BATTLE)) {
        let moveX = 0; let moveZ = 0;
        if (Math.abs(inputVector.current.x) > 0.1 || Math.abs(inputVector.current.y) > 0.1) { const len = Math.sqrt(inputVector.current.x**2 + inputVector.current.y**2); lastMoveDir.current.set(inputVector.current.x / len, inputVector.current.y / len); }
        if ((mode === GameMode.BATTLE || mode === GameMode.OVERWORLD) && dashTrigger.current && dashCooldownRef.current <= 0) { dashCooldownRef.current = playerStats.dashCooldownTime; setDashCooldown(playerStats.dashCooldownTime); dashTimer.current = 0.25; if (Math.abs(inputVector.current.x) > 0.1 || Math.abs(inputVector.current.y) > 0.1) { const len = Math.sqrt(inputVector.current.x**2 + inputVector.current.y**2); dashDirection.current.set(inputVector.current.x / len, inputVector.current.y / len); } else dashDirection.current.set(lastMoveDir.current.x, lastMoveDir.current.y); dashTrigger.current = false; }
        if (dashTimer.current > 0) { const dashSpeed = playerStats.moveSpeed * 3.5; moveX = dashDirection.current.x * dashSpeed * delta; moveZ = dashDirection.current.y * dashSpeed * delta; } else { const speed = playerStats.moveSpeed; moveX = inputVector.current.x * speed * delta; moveZ = inputVector.current.y * speed * delta; }
        let nextX = playerRef.current.position.x + moveX; let nextZ = playerRef.current.position.z + moveZ;
        
        if (mode === GameMode.OVERWORLD) { 
            const dx = nextX - LANDMARK_POS.x; const dz = nextZ - LANDMARK_POS.z; const distSq = dx*dx + dz*dz; const minDist = landmarkRadius + 0.5; if (distSq < minDist * minDist) { const angle = Math.atan2(dz, dx); nextX = LANDMARK_POS.x + Math.cos(angle) * minDist; nextZ = LANDMARK_POS.z + Math.sin(angle) * minDist; } 
            
            // --- SHOP COLLISION & BOUNCE BACK ---
            const sdx = nextX - SHOP_POS.x; 
            const sdz = nextZ - SHOP_POS.z; 
            if (sdx*sdx + sdz*sdz < 2.5) { 
                const angle = Math.atan2(sdz, sdx);
                const safeDist = 2.2; // Increased to 2.2 to prevent immediate re-entry
                nextX = SHOP_POS.x + Math.cos(angle) * safeDist;
                nextZ = SHOP_POS.z + Math.sin(angle) * safeDist;
                
                // Immediately update ref to prevent glitching back in next frame
                if (playerRef.current) {
                    playerRef.current.position.x = nextX;
                    playerRef.current.position.z = nextZ;
                }
                
                // FORCE STOP: Zero out input vector so player doesn't walk back in immediately
                inputVector.current = { x: 0, y: 0 };
                
                enterShop(); 
            } 

        }
        playerRef.current.position.x = nextX; playerRef.current.position.z = nextZ;
        const isCurrentlyMoving = Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001;
        updateMovingState(isCurrentlyMoving);
        if (isCurrentlyMoving) {
          if (Math.abs(inputVector.current.y) > Math.abs(inputVector.current.x)) {
            if (inputVector.current.y > 0.1) updateViewDirectionState('DOWN');
            else if (inputVector.current.y < -0.1) updateViewDirectionState('UP');
          } else if (Math.abs(inputVector.current.x) > 0.1) {
            updateViewDirectionState('SIDE');
            if (inputVector.current.x > 0) updateFacingState(1);
            if (inputVector.current.x < 0) updateFacingState(-1);
          }
        }
        const limit = mode === GameMode.BATTLE ? 24.5 : 30.0; if (playerRef.current.position.x > limit) playerRef.current.position.x = limit; if (playerRef.current.position.x < -limit) playerRef.current.position.x = -limit; if (playerRef.current.position.z > limit) playerRef.current.position.z = limit; if (playerRef.current.position.z < -limit) playerRef.current.position.z = -limit;
        if (state.clock.elapsedTime - lastMapUpdate.current > 0.1) { lastMapUpdate.current = state.clock.elapsedTime; updatePosition(playerRef.current.position.x, playerRef.current.position.z); }
        const playerX = playerRef.current.position.x;
        const playerZ = playerRef.current.position.z;
        const isOverworldMode = mode === GameMode.OVERWORLD;
        const nextGroundTextHighlights: GroundTextHighlights = {
          stageIntro: isOverworldMode && Boolean(aiConfig) && isInsideGroundTextPanel(playerX, playerZ, stageIntroGroundTextCenter, STAGE_INTRO_GROUND_TEXT_PANEL),
          quiz: isOverworldMode && isQuizGroundTextVisible && isInsideGroundTextPanel(playerX, playerZ, quizGroundTextCenter, QUIZ_GROUND_TEXT_PANEL),
          boss: isOverworldMode && Boolean(bossGroundTextCenter) && isInsideGroundTextPanel(playerX, playerZ, bossGroundTextCenter ?? stageIntroGroundTextCenter, BOSS_GROUND_TEXT_PANEL),
          shop: isOverworldMode && isInsideGroundTextPanel(playerX, playerZ, shopGroundTextCenter, SHOP_GROUND_TEXT_PANEL),
          vibeJamNext: isOverworldMode && isInsideGroundTextPanel(playerX, playerZ, vibeJamNextGroundTextCenter, VIBEJAM_GROUND_TEXT_PANEL),
          vibeJamReturn: isOverworldMode && isPortalEntry && isInsideGroundTextPanel(playerX, playerZ, vibeJamReturnGroundTextCenter, VIBEJAM_GROUND_TEXT_PANEL),
        };
        updateGroundTextHighlights(nextGroundTextHighlights);
        if (mode === GameMode.OVERWORLD && stageIntroAudioSrc && stageIntroAudioKey) {
          const insideStageIntroText =
            Math.abs(playerRef.current.position.x - stageIntroGroundTextCenter.x) <= STAGE_INTRO_GROUND_TEXT_PANEL.width / 2 &&
            Math.abs(playerRef.current.position.z - stageIntroGroundTextCenter.z) <= STAGE_INTRO_GROUND_TEXT_PANEL.height / 2;

          if (insideStageIntroText && !stageIntroGroundInsideRef.current) {
            requestGaiaNarration(stageIntroAudioSrc, stageIntroAudioKey);
          }

          stageIntroGroundInsideRef.current = insideStageIntroText;
        } else {
          stageIntroGroundInsideRef.current = false;
        }
        if (mode === GameMode.OVERWORLD && isQuizGroundTextVisible && quizQuestionAudioSrc && quizQuestionAudioKey) {
          const insideQuizText =
            Math.abs(playerRef.current.position.x - quizGroundTextCenter.x) <= QUIZ_GROUND_TEXT_PANEL.width / 2 &&
            Math.abs(playerRef.current.position.z - quizGroundTextCenter.z) <= QUIZ_GROUND_TEXT_PANEL.height / 2;

          if (insideQuizText && !quizGroundInsideRef.current) {
            requestQuizNarration(quizQuestionAudioSrc, quizQuestionAudioKey);
          }

          quizGroundInsideRef.current = insideQuizText;
        } else {
          quizGroundInsideRef.current = false;
        }
        if (mode === GameMode.OVERWORLD && bossGroundTextCenter && bossPromptAudioSrc && bossPromptAudioKey) {
          const insideBossText =
            Math.abs(playerRef.current.position.x - bossGroundTextCenter.x) <= BOSS_GROUND_TEXT_PANEL.width / 2 &&
            Math.abs(playerRef.current.position.z - bossGroundTextCenter.z) <= BOSS_GROUND_TEXT_PANEL.height / 2;

          if (insideBossText && !bossGroundInsideRef.current) {
            requestGaiaNarration(bossPromptAudioSrc, bossPromptAudioKey);
          }

          bossGroundInsideRef.current = insideBossText;
        } else {
          bossGroundInsideRef.current = false;
        }
        const isGenerating = useAiDirectorStore.getState().isGenerating;
        if (mode === GameMode.OVERWORLD && battleCooldown.current <= 0) {
          let nearestPortalId: string | null = null;
          for (const portal of portals) {
            _portalVec.current.set(portal.x, 0, portal.z);
            const dist = playerRef.current.position.distanceTo(_portalVec.current);
            if (dist < PORTAL_VOTE_PROXIMITY) {
              nearestPortalId = portal.id;
              if (!hasPeers && !isGenerating) {
                enterBattle(portal);
              }
              break;
            }
          }
          if (localPortalVoteRef.current !== nearestPortalId) {
            localPortalVoteRef.current = nearestPortalId;
            setLocalPortalVoteId(nearestPortalId);
            setLocalPortalVote(nearestPortalId);
          }
        } else {
          if (localPortalVoteRef.current !== null) {
            localPortalVoteRef.current = null;
            setLocalPortalVoteId(null);
            setLocalPortalVote(null);
          }
        }

        // Broadcast only while in overworld.
        // Battle is solo-per-player, so battle movement should not leak into overworld peers.
        if (mode === GameMode.OVERWORLD && mpGroupId && hasPeers) {
          const nowMs = performance.now();
          const broadcastInterval = 1000 / POSITION_BROADCAST_HZ;
          if (nowMs - lastBroadcastRef.current >= broadcastInterval) {
            lastBroadcastRef.current = nowMs;
            broadcastMultiplayer({
              type: 'player_state',
              playerId: localPlayerId,
              x: playerRef.current.position.x,
              z: playerRef.current.position.z,
              facing,
              viewDirection,
              action: isMoving ? 'RUN' : 'IDLE',
              isDashing: dashTimer.current > 0,
              scene: 'OVERWORLD',
              hp: playerStats.hp,
              maxHp: playerStats.maxHp,
              portalVote: localPortalVoteRef.current,
              t: Date.now(),
            });
          }
        }

        // VibeJam portal grace period countdown
        if (isPortalEntry && portalGraceTimer.current > 0) { portalGraceTimer.current -= delta; }
        const vjGraceActive = isPortalEntry && portalGraceTimer.current > 0;

        // VibeJam Next portal (green) — always present, sends player to vibej.am webring
        if (mode === GameMode.OVERWORLD && !vjGraceActive && playerRef.current.position.distanceTo(_vjNextVec.current) < 1.5) {
          const params = new URLSearchParams();
          params.set('portal', 'true');
          params.set('ref', window.location.hostname);
          const stats = useGameStore.getState().playerStats;
          params.set('hp', String(Math.round(stats.hp)));
          window.location.href = `https://vibej.am/portal/2026?${params.toString()}`;
        }

        // VibeJam Return portal (red) — only when player entered via ?portal=true
        if (mode === GameMode.OVERWORLD && isPortalEntry && !vjGraceActive && playerRef.current.position.distanceTo(_vjReturnVec.current) < 1.5) {
          const destination = portalRefUrl ?? 'https://vibej.am/portal/2026';
          try {
            const url = new URL(destination);
            url.searchParams.set('portal', 'true');
            url.searchParams.set('ref', window.location.hostname);
            window.location.href = url.toString();
          } catch {
            const params = new URLSearchParams();
            params.set('portal', 'true');
            params.set('ref', window.location.hostname);
            window.location.href = `${destination}?${params.toString()}`;
          }
        }
    } else { updateMovingState(false); }
    const currentStats = useGameStore.getState().playerStats; if (currentStats.lastDamageTime > lastProcessedDamageTime.current) { shakeIntensity.current = 2.5; lastProcessedDamageTime.current = currentStats.lastDamageTime; }
    
    // --- DYNAMIC CAMERA ZOOM LOGIC ---
    const aspect = state.size.width / state.size.height;

    zoomCurrent.current = THREE.MathUtils.lerp(zoomCurrent.current, cameraZoom, delta * 6);

    // Scale fog with zoom so it doesn't eat the scene when zoomed out
    if (fogRef.current) {
      fogRef.current.near = 20 * zoomCurrent.current;
      fogRef.current.far  = 45 * zoomCurrent.current;
    }

    let portraitBoost = 0;
    let effectiveZoom = zoomCurrent.current;

    if (aspect < 1.0) {
        portraitBoost = (1.0 - aspect) * PORTRAIT_CAMERA_BOOST;
        effectiveZoom = THREE.MathUtils.clamp(
          1 + ((zoomCurrent.current - 1) * PORTRAIT_ZOOM_RANGE_SCALE),
          0.25,
          2.4
        );
    }

    const camY = (18 * effectiveZoom) + portraitBoost;
    const camZ = (16 * effectiveZoom) + portraitBoost;

    _camTarget.current.set(playerRef.current.position.x, playerRef.current.position.y + camY, playerRef.current.position.z + camZ);
    camera.position.lerp(_camTarget.current, 4 * delta);
    
    if (shakeIntensity.current > 0) { const s = shakeIntensity.current; camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; camera.position.z += (Math.random() - 0.5) * s; shakeIntensity.current = Math.max(0, shakeIntensity.current - (delta * 8.0)); }
    camera.lookAt(playerRef.current.position);
  });

  useEffect(() => {
    if (!mpGroupId || !hasPeers) {
      prevBroadcastModeRef.current = mode;
      return;
    }
    const prev = prevBroadcastModeRef.current;
    prevBroadcastModeRef.current = mode;

    if (isBattlePresenceMode(mode) && !isBattlePresenceMode(prev)) {
      broadcastMultiplayer({
        type: 'player_state',
        playerId: localPlayerId,
        x: worldPosition.x,
        z: worldPosition.z,
        facing,
        viewDirection,
        action: 'IDLE',
        isDashing: false,
        scene: 'BATTLE',
        hp: playerStats.hp,
        maxHp: playerStats.maxHp,
        portalVote: null,
        t: Date.now(),
      });
    }
  }, [mode, mpGroupId, hasPeers, localPlayerId, worldPosition.x, worldPosition.z, facing, viewDirection, playerStats.hp, playerStats.maxHp]);

  const getPortalColor = (portal: any) => { if (portal.colorOverride) return portal.colorOverride; if (portal.type === 'BOSS') return '#aa00ff'; return '#00ffff'; };
  // Map quizOption key to display label for portals
  const getPortalLabel = (portal: any): string | undefined => { if (portal.type === 'BOSS') return 'BOSS'; if (!portal.quizOption) return undefined; if (portal.quizOption === 'A') return 'YES'; if (portal.quizOption === 'B') return 'NO'; return portal.quizOption; };
  const isPlayerHit = (Date.now() - playerStats.lastDamageTime) < 200;
  const arrowTarget = useMemo(() => { if (highlightedPortalId) { return portals.find(p => p.id === highlightedPortalId); } if (bossPortal) return bossPortal; const normalPortals = portals.filter(p => p.type === 'NORMAL'); if (normalPortals.length === 1) { return normalPortals[0]; } return null; }, [portals, highlightedPortalId, bossPortal]);
  const showStars = sceneTheme === 'VOID' || sceneTheme === 'HELL' || sceneTheme === 'SKULL';
  const showGameplayStars = sceneTheme === 'SKULL';
  const showClouds = !showStars || sceneTheme === 'SKULL';
  const showDefaultSky = !showStars && sceneTheme !== 'CYBER' && sceneTheme !== 'SKY';
  const showOverworldScene = (
    mode === GameMode.OVERWORLD ||
    mode === GameMode.INSTRUCTIONS ||
    mode === GameMode.LOADING_LEVEL ||
    ((mode === GameMode.PAUSED || mode === GameMode.SHOP || mode === GameMode.STATUS || mode === GameMode.LIBRARY) && lastGameplayMode === GameMode.OVERWORLD)
  );
  const showBattleScene = (mode === GameMode.BATTLE || mode === GameMode.REWARD || mode === GameMode.CHEST_REWARD || ((mode === GameMode.PAUSED || mode === GameMode.STATUS || mode === GameMode.LIBRARY || mode === GameMode.SHOP) && lastGameplayMode === GameMode.BATTLE));
  const localVotedPortal = useMemo(
    () => (localPortalVoteId ? portals.find((p) => p.id === localPortalVoteId) ?? null : null),
    [localPortalVoteId, portals]
  );
  const localVoteState = localPortalVoteId ? mpPortalVotes[localPortalVoteId] : null;
  const useMutedGameplayBackdrop = showOverworldScene || showBattleScene;
  const bloomThreshold = useMutedGameplayBackdrop ? 0.9 : 0.6;
  const bloomIntensity = useMutedGameplayBackdrop ? 0.35 : 0.6;

  useEffect(() => {
    if (!showOverworldScene || isOverworldSceneReady) {
      overworldWarmupFrames.current = 0;
      return;
    }

    overworldWarmupFrames.current = 0;
  }, [showOverworldScene, isOverworldSceneReady, activeStage, landmarkType, portals.length]);

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCameraZoom((current) => current + e.deltaY * 0.001);
    };
    gl.domElement.addEventListener('wheel', onWheel, { passive: false });
    return () => gl.domElement.removeEventListener('wheel', onWheel);
  }, [gl, mode, setCameraZoom]);

  useEffect(() => {
    let lastPinchDist = 0;
    const canZoom = () =>
      mode === GameMode.OVERWORLD ||
      mode === GameMode.BATTLE ||
      mode === GameMode.PAUSED ||
      mode === GameMode.STATUS ||
      mode === GameMode.LIBRARY ||
      mode === GameMode.SHOP;

    const onTouchStart = (e: TouchEvent) => {
      if (!canZoom() || e.touches.length !== 2) return;
      lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!canZoom() || e.touches.length !== 2) return;
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastPinchDist > 0) {
        setCameraZoom((current) => current - (dist - lastPinchDist) * 0.005);
      }
      lastPinchDist = dist;
    };
    const resetPinch = () => {
      lastPinchDist = 0;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', resetPinch);
    window.addEventListener('touchcancel', resetPinch);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', resetPinch);
      window.removeEventListener('touchcancel', resetPinch);
    };
  }, [mode, setCameraZoom]);

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      {showDefaultSky && !useMutedGameplayBackdrop && <Sky sunPosition={[100, 50, 100]} rayleigh={2} turbidity={10} mieCoefficient={0.005} mieDirectionalG={0.7} />}
      {sceneTheme === 'SKY' && !useMutedGameplayBackdrop && <Sky sunPosition={[0, 1, 0]} turbidity={0.5} />}
      {showStars && (!useMutedGameplayBackdrop || showGameplayStars) && <Stars radius={80} depth={50} count={3000} factor={4} fade />}
      {showClouds && <AnimatedClouds hideLowerClouds={showBattleScene} />}
      <hemisphereLight args={[hemisphereColors.sky, hemisphereColors.ground, 0.75]} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      {showOverworldScene && (
          <group>
            <PixelGround width={64} height={64} themeId={themeId} mode="OVERWORLD" aiConfig={aiConfig} />
            <BiomeAtmosphere theme={sceneTheme} />
            <VoxelLandmark type={landmarkType} position={[LANDMARK_POS.x, 0, LANDMARK_POS.z]} />
            <VoxelShop position={[SHOP_POS.x, 0, SHOP_POS.z]} />
            {/* VibeJam Next portal — always present, sends player to the VibeJam webring */}
            <VoxelPortal position={[VIBEJAM_NEXT_POS.x, 0, VIBEJAM_NEXT_POS.z]} color="#22d3ee" tintStructure isBoss={false} label="Vibe" />
            {/* VibeJam Return portal — only when player arrived via ?portal=true */}
            {isPortalEntry && (
              <VoxelPortal position={[VIBEJAM_RETURN_POS.x, 0, VIBEJAM_RETURN_POS.z]} color="#fb923c" innerColor="#a78bfa" tintStructure isBoss={false} label="Return" />
            )}
            <PropSpriteBatch items={propSprites} />
            {portals.map((portal) => ( <VoxelPortal key={portal.id} position={[portal.x, 0, portal.z]} color={getPortalColor(portal)} isBoss={portal.type === 'BOSS'} label={getPortalLabel(portal)} /> ))}
            <InWorldText
              landmarkPos={[LANDMARK_POS.x, 0, LANDMARK_POS.z]}
              portalCenterPos={[QUIZ_PORTAL_CENTER_POS.x, 0, QUIZ_PORTAL_CENTER_POS.z]}
              shopPos={[SHOP_POS.x, 0, SHOP_POS.z]}
              showNarrative={showNarrative}
              narrativeDismissed={narrativeDismissed}
              stageConfig={aiConfig}
              onNarrativeDone={() => {
                setShowNarrative(false);
                setNarrativeDismissed(true);
              }}
              hasBossPortal={hasBossPortal}
              bossPortalPos={bossPortal ? [bossPortal.x, 0, bossPortal.z] as [number, number, number] : null}
              vibeJamNextPos={[VIBEJAM_NEXT_POS.x, 0, VIBEJAM_NEXT_POS.z]}
              isPortalEntry={isPortalEntry}
              vibeJamReturnPos={[VIBEJAM_RETURN_POS.x, 0, VIBEJAM_RETURN_POS.z]}
              portalRefUrl={portalRefUrl}
              highlights={groundTextHighlights}
            />
            {arrowTarget && ( <QuestArrow playerRef={playerRef} target={{ x: arrowTarget.x, z: arrowTarget.z }} /> )}
            {hasPeers && localVotedPortal && (
              <group position={[localVotedPortal.x, 0.08, localVotedPortal.z + 2.8]} rotation={[-Math.PI / 2, 0, 0]}>
                <mesh position={[0, 0, -0.02]}>
                  <planeGeometry args={[6.6, 2.1]} />
                  <meshBasicMaterial color="#081518" transparent opacity={0.72} depthWrite={false} />
                </mesh>
                <Text
                  font={kenpixelFontUrl}
                  fontSize={0.28}
                  color="#67e8f9"
                  position={[0, 0.4, 0.01]}
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={5.8}
                  textAlign="center"
                  outlineWidth={0.03}
                  outlineColor="#000000"
                >
                  {localVoteState ? `${localVoteState.voters.length}/${localVoteState.required} READY` : 'PORTAL VOTE'}
                </Text>
                <Text
                  font={kenpixelFontUrl}
                  fontSize={0.2}
                  color="#d1fae5"
                  position={[0, -0.35, 0.01]}
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={5.8}
                  textAlign="center"
                  outlineWidth={0.02}
                  outlineColor="#000000"
                >
                  {localVoteState?.countdownMs != null
                    ? `STARTING IN ${Math.max(0, Math.ceil(localVoteState.countdownMs / 1000))}`
                    : 'All players vote; top portal wins'}
                </Text>
              </group>
            )}
          </group>
      )}
      <PlayerTrailRenderer playerRef={playerRef} dashTimer={dashTimer} />
      <group ref={playerRef}><Suspense fallback={null}><PlayerSpriteBillboard position={[0, 1, 0]} scale={2.0} facing={facing} action={isMoving ? 'RUN' : 'IDLE'} viewDirection={viewDirection} isHit={isPlayerHit} slotIndex={localSlotIndex} /></Suspense><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><circleGeometry args={[0.5, 16]} /><meshBasicMaterial color="black" opacity={0.5} transparent /></mesh></group>
      {showOverworldScene && !showBattleScene && visiblePeerList.map((peer) => (
        <Suspense key={peer.playerId} fallback={null}>
          <RemotePlayer peer={peer} scale={2.0} />
        </Suspense>
      ))}
      <Suspense fallback={null}>
        {showBattleScene && (
            <BattleManager playerPosition={playerRef.current ? playerRef.current.position : new THREE.Vector3(0,0,0)} activeBattle={activeBattle} />
        )}
      </Suspense>
      <EffectComposer multisampling={2} stencilBuffer={false}>
        <Bloom luminanceThreshold={bloomThreshold} intensity={bloomIntensity} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};
