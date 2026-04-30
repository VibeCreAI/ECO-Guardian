
import React, { useRef, useEffect, useState, Suspense, useMemo, useLayoutEffect } from 'react';
import { Billboard, Cloud, Clouds, Sky, Stars, Text } from '@react-three/drei';
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
import { requestGaiaNarration, requestQuizNarration, requestSfx } from './AudioManager';
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

type FirstQuizTutorialPhase = 'quiz' | 'portal' | 'done';

const FIRST_QUIZ_TUTORIAL_TEXT: Record<Exclude<FirstQuizTutorialPhase, 'done'>, string> = {
  quiz: 'READ THE QUIZ\nON THE GROUND',
  portal: 'CHOOSE YES OR NO\nPORTAL',
};

const FIRST_QUIZ_TUTORIAL_PANEL = {
  width: 5.05,
  height: 1.52,
} as const;

const FIRST_QUIZ_TUTORIAL_RENDER_ORDER = 10000;
const firstQuizTutorialFontUrl = '/assets/font/DungGeunMo.ttf';

const FirstQuizTutorialPrompt: React.FC<{ phase: Exclude<FirstQuizTutorialPhase, 'done'> }> = ({ phase }) => {
  const text = FIRST_QUIZ_TUTORIAL_TEXT[phase];
  const [displayText, setDisplayText] = useState(text);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(query.matches);
    syncPreference();

    if (query.addEventListener) {
      query.addEventListener('change', syncPreference);
      return () => query.removeEventListener('change', syncPreference);
    }

    query.addListener(syncPreference);
    return () => query.removeListener(syncPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(text);
      return;
    }

    let index = 0;
    setDisplayText('');
    const interval = window.setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));
      if (index >= text.length) window.clearInterval(interval);
    }, 34);

    return () => window.clearInterval(interval);
  }, [text, prefersReducedMotion]);

  const halfW = FIRST_QUIZ_TUTORIAL_PANEL.width / 2;
  const halfH = FIRST_QUIZ_TUTORIAL_PANEL.height / 2;
  const edge = 0.08;
  const corner = 0.24;

  return (
    <group position={[0, 3.5, 0]}>
      <Billboard follow>
        <group>
          <mesh position={[0, 0, -0.04]} renderOrder={FIRST_QUIZ_TUTORIAL_RENDER_ORDER}>
            <planeGeometry args={[FIRST_QUIZ_TUTORIAL_PANEL.width, FIRST_QUIZ_TUTORIAL_PANEL.height]} />
            <meshBasicMaterial color="#082012" transparent opacity={0.9} toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>

          <mesh position={[0, halfH - edge / 2, -0.02]} renderOrder={FIRST_QUIZ_TUTORIAL_RENDER_ORDER + 1}>
            <planeGeometry args={[FIRST_QUIZ_TUTORIAL_PANEL.width, edge]} />
            <meshBasicMaterial color="#020805" transparent opacity={0.92} toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh position={[0, -halfH + edge / 2, -0.02]} renderOrder={FIRST_QUIZ_TUTORIAL_RENDER_ORDER + 1}>
            <planeGeometry args={[FIRST_QUIZ_TUTORIAL_PANEL.width, edge]} />
            <meshBasicMaterial color="#020805" transparent opacity={0.92} toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh position={[-halfW + edge / 2, 0, -0.02]} renderOrder={FIRST_QUIZ_TUTORIAL_RENDER_ORDER + 1}>
            <planeGeometry args={[edge, FIRST_QUIZ_TUTORIAL_PANEL.height]} />
            <meshBasicMaterial color="#020805" transparent opacity={0.92} toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh position={[halfW - edge / 2, 0, -0.02]} renderOrder={FIRST_QUIZ_TUTORIAL_RENDER_ORDER + 1}>
            <planeGeometry args={[edge, FIRST_QUIZ_TUTORIAL_PANEL.height]} />
            <meshBasicMaterial color="#020805" transparent opacity={0.92} toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>

          {[
            [-halfW + corner / 2, halfH - corner / 2],
            [halfW - corner / 2, halfH - corner / 2],
            [-halfW + corner / 2, -halfH + corner / 2],
            [halfW - corner / 2, -halfH + corner / 2],
          ].map(([x, y], index) => (
            <mesh key={index} position={[x, y, -0.005]} renderOrder={FIRST_QUIZ_TUTORIAL_RENDER_ORDER + 2}>
              <planeGeometry args={[corner, corner]} />
              <meshBasicMaterial color="#4ade80" transparent opacity={0.96} toneMapped={false} depthTest={false} depthWrite={false} />
            </mesh>
          ))}
          <Text
            font={firstQuizTutorialFontUrl}
            fontSize={0.36}
            color="#d8ffd0"
            position={[0, -0.02, 0.03]}
            anchorX="center"
            anchorY="middle"
            maxWidth={4.38}
            textAlign="center"
            lineHeight={1.04}
            outlineWidth={0.045}
            outlineColor="#000000"
            depthTest={false}
            material-transparent
            material-opacity={1}
            material-depthTest={false}
            material-depthWrite={false}
            renderOrder={FIRST_QUIZ_TUTORIAL_RENDER_ORDER + 3}
          >
            {displayText}
          </Text>
        </group>
      </Billboard>
    </group>
  );
};

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
  SKULL: ['GRAVE', 'RUIN', 'BATTERY_GRAVE', 'CABLE_ROOTS', 'SKULL_STONE', 'BONE_TRASH_PILE'],
  ICE: ['SNOW_TREE', 'CRYSTAL', 'FROZEN_SERVER', 'ICE_SHARD', 'ICE_STONE', 'FROZEN_CABLE_PILE'],
  VOLCANO: ['MAGMA_ROCK', 'LAVA_PILLAR', 'OIL_DRUM', 'EMBER_VENT', 'SPIKE_ROCK', 'SCORCHED_EWASTE_PILE'],
  PYRAMID: ['CACTUS', 'PALM', 'GLASS_DUNE', 'SILICON_SPIRE', 'PYRAMID_STONE', 'SILICON_EWASTE_PILE'],
  MUSHROOM: ['SWAMP_TREE', 'VINE', 'TOXIC_MUSHROOM', 'TOXIC_BARREL', 'SLUDGE_POOL', 'BOG_TRASH_PILE'],
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
    if (type.includes('STONE') || type.includes('ROCK') || type === 'VINE' || type === 'BOTTLE_PILE' || type === 'BONE_TRASH_PILE' || type === 'FROZEN_CABLE_PILE' || type === 'SCORCHED_EWASTE_PILE' || type === 'SILICON_EWASTE_PILE' || type === 'CABLE_ROOTS' || type === 'SLUDGE_POOL' || type === 'EMBER_VENT') return 1.8;
    return 2.0;
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
  const hideVibeJam = useGameStore(s => s.hideVibeJam);
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
  const [firstQuizTutorialPhase, setFirstQuizTutorialPhase] = useState<FirstQuizTutorialPhase>('quiz');
  const [isPlayerPlacementReady, setIsPlayerPlacementReady] = useState(false);
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
  const firstQuizTutorialPhaseRef = useRef<FirstQuizTutorialPhase>('quiz');
  const isPlayerPlacementReadyRef = useRef(false);
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
  const hasInitialQuizPortals = useMemo(
    () => portals.some(p => p.id === 'p_A') && portals.some(p => p.id === 'p_B'),
    [portals]
  );
  const isFirstQuizTutorialEligible =
    activeStage === 1 &&
    mode === GameMode.OVERWORLD &&
    hasInitialQuizPortals &&
    Boolean(aiConfig?.quiz?.question);
  const showFirstQuizTutorial =
    isFirstQuizTutorialEligible && isOverworldSceneReady && isPlayerPlacementReady && firstQuizTutorialPhase !== 'done';
  const firstQuizTutorialPromptPhase =
    firstQuizTutorialPhase === 'done' ? 'quiz' : firstQuizTutorialPhase;

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

  const updateFirstQuizTutorialPhase = React.useCallback((nextPhase: FirstQuizTutorialPhase) => {
    if (firstQuizTutorialPhaseRef.current === nextPhase) return;
    firstQuizTutorialPhaseRef.current = nextPhase;
    setFirstQuizTutorialPhase(nextPhase);
  }, []);

  const updatePlayerPlacementReady = React.useCallback((ready: boolean) => {
    if (isPlayerPlacementReadyRef.current === ready) return;
    isPlayerPlacementReadyRef.current = ready;
    setIsPlayerPlacementReady(ready);
  }, []);

  useLayoutEffect(() => {
    if (mode === GameMode.MENU || mode === GameMode.DIFFICULTY_SELECT || mode === GameMode.INSTRUCTIONS || mode === GameMode.LOADING_LEVEL) {
      updatePlayerPlacementReady(false);
    }

    if (playerRef.current) {
        if (prevModeRef.current === GameMode.PAUSED || prevModeRef.current === GameMode.SHOP || prevModeRef.current === GameMode.STATUS || prevModeRef.current === GameMode.LIBRARY) { /* */ }
        else { if (mode === GameMode.OVERWORLD) { battleCooldown.current = 3.0; } else if (mode === GameMode.BATTLE) { const isResuming = prevModeRef.current === GameMode.REWARD || prevModeRef.current === GameMode.CHEST_REWARD; if (!isResuming) { playerRef.current.position.set(0, 0, 0); } updatePlayerPlacementReady(true); } }
    }
    prevModeRef.current = mode;
  }, [mode, updatePlayerPlacementReady]);

  useLayoutEffect(() => {
    if (!isOverworldSceneReady) return;
    if (mode !== GameMode.OVERWORLD) return;
    if (!playerRef.current) return;
    playerRef.current.position.set(worldPosition.x, 0, worldPosition.z);
    updatePlayerPlacementReady(true);
  }, [isOverworldSceneReady, mode, worldPosition.x, worldPosition.z, updatePlayerPlacementReady]);

  useLayoutEffect(() => {
    if (!playerRef.current) return;
    if (mode !== GameMode.OVERWORLD) return;
    if (!mpGroupId || !mpJoinedAt) return;
    if (joinSpawnAdjustedForGroupRef.current === mpGroupId) return;
    if (Date.now() - mpJoinedAt > 4000) return;
    if (localSlotIndex <= 0) return; // keep existing player (slot 0) fixed

    // Keep co-op spawn nudges on the portal line so every player starts between
    // the first YES/NO portals instead of drifting into the quiz ground text.
    const offsets: Array<{ x: number; z: number }> = [
      { x: 0, z: 0 },
      { x: 2.0, z: 0 },
      { x: -2.0, z: 0 },
      { x: 4.0, z: 0 },
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

  useEffect(() => {
    if (mode === GameMode.MENU || mode === GameMode.DIFFICULTY_SELECT || mode === GameMode.INSTRUCTIONS) {
      updateFirstQuizTutorialPhase('quiz');
    }
  }, [mode, updateFirstQuizTutorialPhase]);

  useEffect(() => {
    if (activeStage === 1 && (mode === GameMode.QUIZ_RESULT || mode === GameMode.BATTLE)) {
      updateFirstQuizTutorialPhase('done');
    }
  }, [activeStage, mode, updateFirstQuizTutorialPhase]);

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
        if ((mode === GameMode.BATTLE || mode === GameMode.OVERWORLD) && dashTrigger.current && dashCooldownRef.current <= 0) { dashCooldownRef.current = playerStats.dashCooldownTime; setDashCooldown(playerStats.dashCooldownTime); dashTimer.current = 0.25; if (Math.abs(inputVector.current.x) > 0.1 || Math.abs(inputVector.current.y) > 0.1) { const len = Math.sqrt(inputVector.current.x**2 + inputVector.current.y**2); dashDirection.current.set(inputVector.current.x / len, inputVector.current.y / len); } else dashDirection.current.set(lastMoveDir.current.x, lastMoveDir.current.y); dashTrigger.current = false; requestSfx('dash_player'); }
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
        const insideQuizGroundText =
          isOverworldMode &&
          isQuizGroundTextVisible &&
          isInsideGroundTextPanel(playerX, playerZ, quizGroundTextCenter, QUIZ_GROUND_TEXT_PANEL);
        const nextGroundTextHighlights: GroundTextHighlights = {
          stageIntro: isOverworldMode && Boolean(aiConfig) && isInsideGroundTextPanel(playerX, playerZ, stageIntroGroundTextCenter, STAGE_INTRO_GROUND_TEXT_PANEL),
          quiz: insideQuizGroundText,
          boss: isOverworldMode && Boolean(bossGroundTextCenter) && isInsideGroundTextPanel(playerX, playerZ, bossGroundTextCenter ?? stageIntroGroundTextCenter, BOSS_GROUND_TEXT_PANEL),
          shop: isOverworldMode && isInsideGroundTextPanel(playerX, playerZ, shopGroundTextCenter, SHOP_GROUND_TEXT_PANEL),
          vibeJamNext: isOverworldMode && isInsideGroundTextPanel(playerX, playerZ, vibeJamNextGroundTextCenter, VIBEJAM_GROUND_TEXT_PANEL),
          vibeJamReturn: isOverworldMode && isPortalEntry && isInsideGroundTextPanel(playerX, playerZ, vibeJamReturnGroundTextCenter, VIBEJAM_GROUND_TEXT_PANEL),
        };
        updateGroundTextHighlights(nextGroundTextHighlights);
        if (isFirstQuizTutorialEligible && firstQuizTutorialPhaseRef.current !== 'done') {
          if (firstQuizTutorialPhaseRef.current === 'quiz' && insideQuizGroundText) {
            updateFirstQuizTutorialPhase('portal');
          }

          const insideInitialQuizPortal = portals.some((portal) => {
            if (portal.id !== 'p_A' && portal.id !== 'p_B') return false;
            const dx = playerX - portal.x;
            const dz = playerZ - portal.z;
            return dx * dx + dz * dz < PORTAL_VOTE_PROXIMITY * PORTAL_VOTE_PROXIMITY;
          });

          if (insideInitialQuizPortal) {
            updateFirstQuizTutorialPhase('done');
          }
        }
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
          updatePosition(playerRef.current.position.x, playerRef.current.position.z);
          useGameStore.getState().saveRunProgress();
          const params = new URLSearchParams();
          params.set('portal', 'true');
          params.set('ref', window.location.hostname);
          const stats = useGameStore.getState().playerStats;
          params.set('hp', String(Math.round(stats.hp)));
          window.location.href = `https://vibej.am/portal/2026?${params.toString()}`;
        }

        // VibeJam Return portal (red) — only when player entered via ?portal=true
        if (mode === GameMode.OVERWORLD && isPortalEntry && !vjGraceActive && playerRef.current.position.distanceTo(_vjReturnVec.current) < 1.5) {
          updatePosition(playerRef.current.position.x, playerRef.current.position.z);
          useGameStore.getState().saveRunProgress();
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
  const arrowTarget = useMemo(() => { if (showFirstQuizTutorial && firstQuizTutorialPhase === 'quiz') return quizGroundTextCenter; if (highlightedPortalId) { return portals.find(p => p.id === highlightedPortalId); } if (bossPortal) return bossPortal; const normalPortals = portals.filter(p => p.type === 'NORMAL'); if (normalPortals.length === 1) { return normalPortals[0]; } return null; }, [showFirstQuizTutorial, firstQuizTutorialPhase, portals, highlightedPortalId, bossPortal]);
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
  const showLocalPlayer =
    showBattleScene ||
    (showOverworldScene && mode !== GameMode.INSTRUCTIONS && mode !== GameMode.LOADING_LEVEL && isOverworldSceneReady && isPlayerPlacementReady);
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
            <VoxelLandmark type={landmarkType} position={[LANDMARK_POS.x, 0, LANDMARK_POS.z]} />
            <VoxelShop position={[SHOP_POS.x, 0, SHOP_POS.z]} />
            {/* VibeJam Next portal — always present, sends player to the VibeJam webring */}
            {!hideVibeJam && <VoxelPortal position={[VIBEJAM_NEXT_POS.x, 0, VIBEJAM_NEXT_POS.z]} color="#22d3ee" tintStructure isBoss={false} label="Vibe" />}
            {/* VibeJam Return portal — only when player arrived via ?portal=true */}
            {!hideVibeJam && isPortalEntry && (
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
              hideVibeJam={hideVibeJam}
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
      <group ref={playerRef} visible={showLocalPlayer}>
        <Suspense fallback={null}>
          <PlayerSpriteBillboard position={[0, 1, 0]} scale={2.0} facing={facing} action={isMoving ? 'RUN' : 'IDLE'} viewDirection={viewDirection} isHit={isPlayerHit} slotIndex={localSlotIndex} />
        </Suspense>
        {showFirstQuizTutorial && (
          <FirstQuizTutorialPrompt phase={firstQuizTutorialPromptPhase} />
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.5, 16]} />
          <meshBasicMaterial color="black" opacity={0.5} transparent />
        </mesh>
      </group>
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
