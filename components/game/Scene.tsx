
import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { Cloud, Clouds, Sky, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore'; 
import { GameMode, Vector2, AiStageConfig } from '../../types';
import { SpriteBillboard, PropSprite, PlayerSpriteBillboard } from './SpriteBillboard';
import { BattleManager } from './BattleManager';
import { PixelGround } from './PixelGround';
import { VoxelPortal } from './VoxelPortal';
import { VoxelLandmark } from './VoxelLandmark';
import { VoxelShop } from './VoxelShop';
import { QuestArrow } from './QuestArrow';
import { InWorldText } from './InWorldText';

interface SceneProps {
  inputVector: React.MutableRefObject<Vector2>;
  dashTrigger: React.MutableRefObject<boolean>;
}

type ThemeName = 'FOREST' | 'SKULL' | 'ICE' | 'VOLCANO' | 'PYRAMID' | 'MUSHROOM' | 'CYBER' | 'VOID' | 'SKY' | 'HELL';

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
  { x: -28, y: 9.8, z: -36, drift: 0.55, scale: 1.2, seed: 101, segments: 22, bounds: [7.2, 1.9, 1.5] as [number, number, number], volume: 1.95, opacity: 0.52 },
  { x:   8, y: 10.2, z: -32, drift: 0.45, scale: 1.35, seed: 203, segments: 24, bounds: [7.8, 2.0, 1.6] as [number, number, number], volume: 2.05, opacity: 0.5 },
  { x:  34, y: 9.2, z: -24, drift: 0.95, scale: 0.95, seed: 307, segments: 16, bounds: [5.8, 1.6, 1.25] as [number, number, number], volume: 1.55, opacity: 0.56 },
  { x: -42, y: 8.8, z: -15, drift: 0.7, scale: 1.1, seed: 409, segments: 18, bounds: [6.2, 1.7, 1.3] as [number, number, number], volume: 1.7, opacity: 0.54 },
  { x: -12, y: 6.0, z: -10, drift: 0.9, scale: 1.0, seed: 503, segments: 18, bounds: [6.0, 1.6, 1.25] as [number, number, number], volume: 1.6, opacity: 0.5, hideInBattle: true },
  { x:  24, y: 5.0, z: -7,  drift: 1.1, scale: 0.92, seed: 601, segments: 16, bounds: [5.6, 1.45, 1.15] as [number, number, number], volume: 1.45, opacity: 0.5, hideInBattle: true },
  { x: -36, y: 4.0, z: -5,  drift: 0.75, scale: 0.95, seed: 701, segments: 16, bounds: [5.8, 1.5, 1.2] as [number, number, number], volume: 1.5, opacity: 0.48, hideInBattle: true },
  { x:  12, y: 3.4, z: -3,  drift: 0.65, scale: 1.0, seed: 809, segments: 18, bounds: [6.2, 1.55, 1.2] as [number, number, number], volume: 1.55, opacity: 0.46, hideInBattle: true },
  { x:  38, y: 4.4, z: -4,  drift: 0.85, scale: 0.92, seed: 907, segments: 14, bounds: [5.4, 1.35, 1.05] as [number, number, number], volume: 1.35, opacity: 0.48, hideInBattle: true },
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
      texture={cloudTexture}
      material={THREE.MeshBasicMaterial}
      limit={visibleSegmentLimit}
      range={visibleSegmentLimit}
      frustumCulled={false}
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

const PlayerTrailRenderer = ({ playerRef, dashTimer }: { playerRef: React.RefObject<THREE.Group>, dashTimer: React.MutableRefObject<number> }) => {
    const trails = useRef<{id: string, x: number, z: number, life: number}[]>([]);
    const [renderTrails, setRenderTrails] = useState<any[]>([]);
    useFrame((state, delta) => {
        if (useGameStore.getState().mode === GameMode.PAUSED) return;
        let needsUpdate = false;
        if (dashTimer.current > 0 && playerRef.current) { if (Math.random() < 0.6) { trails.current.push({ id: Math.random().toString(), x: playerRef.current.position.x, z: playerRef.current.position.z, life: 0.3 }); needsUpdate = true; } }
        if (trails.current.length > 0) { trails.current = trails.current.filter(t => { t.life -= delta; return t.life > 0; }); needsUpdate = true; }
        if (needsUpdate) setRenderTrails([...trails.current]);
    });
    return (
        <group>{renderTrails.map(t => (<mesh key={t.id} position={[t.x, 0.8, t.z]}><sphereGeometry args={[0.4, 8, 8]} /><meshBasicMaterial color="#bae6fd" transparent opacity={t.life} /></mesh>))}</group>
    );
};

const getLandmarkType = (stage: number, config: AiStageConfig | null) => {
    if (config?.theme?.landmarkType) return config.theme.landmarkType;
    const cycle = ((stage - 1) % 10) + 1;
    switch(cycle) { case 1: return 'FOREST'; case 2: return 'SKULL'; case 3: return 'ICE'; case 4: return 'VOLCANO'; case 5: return 'PYRAMID'; case 6: return 'MUSHROOM'; case 7: return 'CYBER'; case 8: return 'VOID'; case 9: return 'SKY'; case 10: return 'HELL'; default: return 'FOREST'; }
}

const getPropScale = (type: string) => {
    if (type.includes('TREE') || type === 'PALM' || type === 'SWAMP_TREE' || type === 'SNOW_TREE') return 3.5;
    if (type.includes('PILLAR') || type === 'RUIN' || type === 'SERVER' || type.includes('GATE') || type === 'NEON_SIGN') return 3.0;
    if (type === 'MUSHROOM' || type === 'CRYSTAL' || type === 'CACTUS' || type === 'GRAVE' || type === 'TRASH_CAN') return 2.2;
    if (type.includes('STONE') || type.includes('ROCK') || type === 'VINE') return 1.8;
    return 2.0;
};

export const Scene: React.FC<SceneProps> = ({ inputVector, dashTrigger }) => {
  const playerRef = useRef<THREE.Group>(null);
  const { mode, playerStats, enterBattle, dashCooldownCurrent, setDashCooldown, worldPosition, portals, activeBattle, updatePosition, activeStage, isQuizOpen, isImpactOpen, isStageReady, isOverworldSceneReady, setOverworldSceneReady, enterShop, lastGameplayMode, highlightedPortalId, showNarrative, narrativeDismissed, setShowNarrative, setNarrativeDismissed, cameraZoom, setCameraZoom } = useGameStore();
  const aiConfig = useAiDirectorStore(state => state.currentConfig);
  const { camera, gl } = useThree();
  const [facing, setFacing] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [viewDirection, setViewDirection] = useState<'DOWN'|'UP'|'SIDE'>('DOWN');
  const battleCooldown = useRef(0);
  const lastMapUpdate = useRef(0);
  const dashTimer = useRef(0);
  const dashDirection = useRef(new THREE.Vector2(0, 0));
  const lastMoveDir = useRef(new THREE.Vector2(1, 0));
  const shakeIntensity = useRef(0);
  const lastProcessedDamageTime = useRef(0);
  const prevModeRef = useRef<GameMode>(mode);
  const overworldWarmupFrames = useRef(0);
  const zoomCurrent = useRef(1.0);
  const fogRef = useRef<THREE.Fog>(null);
  const _camTarget = useRef(new THREE.Vector3());
  const _portalVec = useRef(new THREE.Vector3());
  
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

  const props = React.useMemo(() => {
    let possibleTypes: string[] = ['TREE', 'STONE', 'MUSHROOM']; 
    if (aiConfig) { possibleTypes = [aiConfig.theme.propType, 'STONE']; if (aiConfig.theme.propType === 'TREE') possibleTypes.push('MUSHROOM'); } 
    else { if (themeId === 2) possibleTypes = ['GRAVE', 'RUIN', 'STONE']; else if (themeId === 3) possibleTypes = ['SNOW_TREE', 'CRYSTAL', 'STONE']; else if (themeId === 4) possibleTypes = ['MAGMA_ROCK', 'LAVA_PILLAR']; else if (themeId === 5) possibleTypes = ['CACTUS', 'PALM', 'STONE']; else if (themeId === 6) possibleTypes = ['SWAMP_TREE', 'VINE', 'MUSHROOM']; else if (themeId === 7) possibleTypes = ['SERVER', 'NEON_SIGN']; else if (themeId === 8) possibleTypes = ['VOID_ROCK', 'STAR_PILLAR']; else if (themeId === 9) possibleTypes = ['CLOUD_PILLAR', 'GOLD_GATE']; else if (themeId === 10) possibleTypes = ['SPIKE_ROCK', 'LAVA_PILLAR']; }
    const items = []; for(let i=0; i<150; i++) { const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)]; const x = (Math.random() - 0.5) * 54; const z = (Math.random() - 0.5) * 54; const dist = Math.sqrt(x*x + z*z); if (z > -16 && z < 1 && x > -8 && x < 8) continue; if (z > 1 && z < 18 && x > -12 && x < 12) continue;
    const distToShop = Math.sqrt((x - SHOP_POS.x)**2 + (z - SHOP_POS.z)**2); if (distToShop < 8) continue;
    if (dist < 6) continue; items.push({ id: i, type, x, z }); }
    return items;
  }, [themeId, aiConfig]);

  useEffect(() => {
    if (playerRef.current) {
        if (prevModeRef.current === GameMode.PAUSED || prevModeRef.current === GameMode.SHOP || prevModeRef.current === GameMode.STATUS || prevModeRef.current === GameMode.LIBRARY) { /* */ }
        else { if (mode === GameMode.OVERWORLD) { playerRef.current.position.set(worldPosition.x, 0, worldPosition.z); battleCooldown.current = 3.0; } else if (mode === GameMode.BATTLE) { const isResuming = prevModeRef.current === GameMode.REWARD || prevModeRef.current === GameMode.CHEST_REWARD; if (!isResuming) { playerRef.current.position.set(0, 0, 0); } } }
    }
    prevModeRef.current = mode;
  }, [mode]);

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
    if (dashCooldownCurrent > 0) { const next = dashCooldownCurrent - delta; setDashCooldown(next > 0 ? next : 0); }
    if (dashTimer.current > 0) dashTimer.current -= delta;
    if ((mode === GameMode.OVERWORLD || mode === GameMode.BATTLE)) {
        let moveX = 0; let moveZ = 0;
        if (Math.abs(inputVector.current.x) > 0.1 || Math.abs(inputVector.current.y) > 0.1) { const len = Math.sqrt(inputVector.current.x**2 + inputVector.current.y**2); lastMoveDir.current.set(inputVector.current.x / len, inputVector.current.y / len); }
        if ((mode === GameMode.BATTLE || mode === GameMode.OVERWORLD) && dashTrigger.current && dashCooldownCurrent <= 0) { setDashCooldown(playerStats.dashCooldownTime); dashTimer.current = 0.25; if (Math.abs(inputVector.current.x) > 0.1 || Math.abs(inputVector.current.y) > 0.1) { const len = Math.sqrt(inputVector.current.x**2 + inputVector.current.y**2); dashDirection.current.set(inputVector.current.x / len, inputVector.current.y / len); } else dashDirection.current.set(lastMoveDir.current.x, lastMoveDir.current.y); dashTrigger.current = false; }
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
        const isCurrentlyMoving = Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001; setIsMoving(isCurrentlyMoving);
        if (isCurrentlyMoving) { if (Math.abs(inputVector.current.y) > Math.abs(inputVector.current.x)) { if (inputVector.current.y > 0.1) setViewDirection('DOWN'); else if (inputVector.current.y < -0.1) setViewDirection('UP'); } else if (Math.abs(inputVector.current.x) > 0.1) { setViewDirection('SIDE'); if (inputVector.current.x > 0) setFacing(1); if (inputVector.current.x < 0) setFacing(-1); } }
        const limit = mode === GameMode.BATTLE ? 24.5 : 30.0; if (playerRef.current.position.x > limit) playerRef.current.position.x = limit; if (playerRef.current.position.x < -limit) playerRef.current.position.x = -limit; if (playerRef.current.position.z > limit) playerRef.current.position.z = limit; if (playerRef.current.position.z < -limit) playerRef.current.position.z = -limit;
        if (state.clock.elapsedTime - lastMapUpdate.current > 0.1) { lastMapUpdate.current = state.clock.elapsedTime; updatePosition(playerRef.current.position.x, playerRef.current.position.z); }
        const isGenerating = useAiDirectorStore.getState().isGenerating;
        if (mode === GameMode.OVERWORLD && battleCooldown.current <= 0) { for (const portal of portals) { _portalVec.current.set(portal.x, 0, portal.z); if (playerRef.current.position.distanceTo(_portalVec.current) < 1.5) { if (!isGenerating) { enterBattle(portal); } break; } } }
    } else { setIsMoving(false); }
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

  const getPortalColor = (portal: any) => { if (portal.colorOverride) return portal.colorOverride; if (portal.type === 'BOSS') return '#aa00ff'; return '#00ffff'; };
  // Map quizOption key to display label for portals
  const getPortalLabel = (portal: any): string | undefined => { if (!portal.quizOption) return undefined; if (portal.quizOption === 'A') return 'YES'; if (portal.quizOption === 'B') return 'NO'; return portal.quizOption; };
  const isPlayerHit = (Date.now() - playerStats.lastDamageTime) < 200;
  const arrowTarget = useMemo(() => { if (highlightedPortalId) { return portals.find(p => p.id === highlightedPortalId); } const bossPortal = portals.find(p => p.type === 'BOSS'); if (bossPortal) return bossPortal; const normalPortals = portals.filter(p => p.type === 'NORMAL'); if (normalPortals.length === 1) { return normalPortals[0]; } return null; }, [portals, highlightedPortalId]);
  const showStars = sceneTheme === 'VOID' || sceneTheme === 'HELL' || sceneTheme === 'SKULL';
  const showDefaultSky = !showStars && sceneTheme !== 'CYBER' && sceneTheme !== 'SKY';
  const showOverworldScene = (
    mode === GameMode.OVERWORLD ||
    (mode === GameMode.INSTRUCTIONS && isStageReady) ||
    ((mode === GameMode.PAUSED || mode === GameMode.SHOP || mode === GameMode.STATUS || mode === GameMode.LIBRARY) && lastGameplayMode === GameMode.OVERWORLD)
  );
  const showBattleScene = (mode === GameMode.BATTLE || mode === GameMode.REWARD || mode === GameMode.CHEST_REWARD || ((mode === GameMode.PAUSED || mode === GameMode.STATUS || mode === GameMode.LIBRARY || mode === GameMode.SHOP) && lastGameplayMode === GameMode.BATTLE));
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
      {showStars && !useMutedGameplayBackdrop && <Stars radius={80} depth={50} count={3000} factor={4} fade />}
      {!showStars && <AnimatedClouds hideLowerClouds={showBattleScene} />}
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
            {props.map((p) => {
                const s = getPropScale(p.type);
                return <PropSprite key={p.id} position={[p.x, s * 0.5, p.z]} type={p.type as any} scale={s} />;
            })}
            {portals.map((portal) => ( <VoxelPortal key={portal.id} position={[portal.x, 0, portal.z]} color={getPortalColor(portal)} isBoss={portal.type === 'BOSS'} label={getPortalLabel(portal)} /> ))}
            <InWorldText
              landmarkPos={[LANDMARK_POS.x, 0, LANDMARK_POS.z]}
              portalCenterPos={[0, 0, 6]}
              shopPos={[SHOP_POS.x, 0, SHOP_POS.z]}
              showNarrative={showNarrative}
              narrativeDismissed={narrativeDismissed}
              stageConfig={aiConfig}
              onNarrativeDone={() => {
                setShowNarrative(false);
                setNarrativeDismissed(true);
              }}
              hasBossPortal={portals.some(p => p.type === 'BOSS')}
              bossPortalPos={(() => { const bp = portals.find(p => p.type === 'BOSS'); return bp ? [bp.x, 0, bp.z] as [number, number, number] : null; })()}
            />
            {arrowTarget && ( <QuestArrow playerRef={playerRef} target={{ x: arrowTarget.x, z: arrowTarget.z }} /> )}
          </group>
      )}
      <PlayerTrailRenderer playerRef={playerRef} dashTimer={dashTimer} />
      <group ref={playerRef}><Suspense fallback={null}><PlayerSpriteBillboard position={[0, 1, 0]} scale={2.0} facing={facing} action={isMoving ? 'RUN' : 'IDLE'} viewDirection={viewDirection} isHit={isPlayerHit} /></Suspense><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><circleGeometry args={[0.5, 16]} /><meshBasicMaterial color="black" opacity={0.5} transparent /></mesh></group>
      <Suspense fallback={null}>
        {showBattleScene && (
            <BattleManager playerPosition={playerRef.current ? playerRef.current.position : new THREE.Vector3(0,0,0)} activeBattle={activeBattle} />
        )}
      </Suspense>
      <EffectComposer>
        <Bloom luminanceThreshold={bloomThreshold} intensity={bloomIntensity} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};
