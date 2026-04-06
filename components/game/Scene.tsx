
import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
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

interface SceneProps {
  inputVector: React.MutableRefObject<Vector2>;
  dashTrigger: React.MutableRefObject<boolean>;
}

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
  const { mode, playerStats, enterBattle, dashCooldownCurrent, setDashCooldown, worldPosition, portals, activeBattle, updatePosition, activeStage, isQuizOpen, isImpactOpen, enterShop, lastGameplayMode, highlightedPortalId, showNarrative } = useGameStore();
  const aiConfig = useAiDirectorStore(state => state.currentConfig);
  const { camera } = useThree();
  const [facing, setFacing] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [viewDirection, setViewDirection] = useState<'DOWN'|'UP'|'SIDE'>('DOWN');
  const battleCooldown = useRef(0);
  const lastMapUpdate = useRef(0);
  const dashTimer = useRef(0);
  const dashDirection = useRef(new THREE.Vector2(0, 0));
  const shakeIntensity = useRef(0);
  const lastProcessedDamageTime = useRef(0);
  const prevModeRef = useRef<GameMode>(mode);
  
  const themeId = React.useMemo(() => ((activeStage - 1) % 10) + 1, [activeStage]);
  const landmarkType = React.useMemo(() => getLandmarkType(activeStage, aiConfig), [activeStage, aiConfig]);
  const landmarkRadius = React.useMemo(() => {
    switch(landmarkType) { case 'VOLCANO': return 8.5; case 'PYRAMID': return 8.5; case 'HELL': return 7.0; case 'FOREST': case 'SKULL': return 5.5; default: return 4.5; }
  }, [landmarkType]);
  
  const LANDMARK_POS = { x: 0, z: -10 };
  const SHOP_POS = { x: 15, z: -5 };

  const props = React.useMemo(() => {
    let possibleTypes: string[] = ['TREE', 'STONE', 'MUSHROOM']; 
    if (aiConfig) { possibleTypes = [aiConfig.theme.propType, 'STONE']; if (aiConfig.theme.propType === 'TREE') possibleTypes.push('MUSHROOM'); } 
    else { if (themeId === 2) possibleTypes = ['GRAVE', 'RUIN', 'STONE']; else if (themeId === 3) possibleTypes = ['SNOW_TREE', 'CRYSTAL', 'STONE']; else if (themeId === 4) possibleTypes = ['MAGMA_ROCK', 'LAVA_PILLAR']; else if (themeId === 5) possibleTypes = ['CACTUS', 'PALM', 'STONE']; else if (themeId === 6) possibleTypes = ['SWAMP_TREE', 'VINE', 'MUSHROOM']; else if (themeId === 7) possibleTypes = ['SERVER', 'NEON_SIGN']; else if (themeId === 8) possibleTypes = ['VOID_ROCK', 'STAR_PILLAR']; else if (themeId === 9) possibleTypes = ['CLOUD_PILLAR', 'GOLD_GATE']; else if (themeId === 10) possibleTypes = ['SPIKE_ROCK', 'LAVA_PILLAR']; }
    const items = []; for(let i=0; i<150; i++) { const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)]; const x = (Math.random() - 0.5) * 90; const z = (Math.random() - 0.5) * 90; const dist = Math.sqrt(x*x + z*z); if (z > -20 && z < 1 && x > -10 && x < 10) continue; 
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
    if (!playerRef.current) return;
    if (mode === GameMode.PAUSED || isQuizOpen || isImpactOpen || showNarrative || mode === GameMode.SHOP || mode === GameMode.STATUS || mode === GameMode.LIBRARY) return;
    if (battleCooldown.current > 0) battleCooldown.current -= delta;
    if (dashCooldownCurrent > 0) setDashCooldown(Math.max(0, dashCooldownCurrent - delta));
    if (dashTimer.current > 0) dashTimer.current -= delta;
    if ((mode === GameMode.OVERWORLD || mode === GameMode.BATTLE)) {
        let moveX = 0; let moveZ = 0;
        if ((mode === GameMode.BATTLE || mode === GameMode.OVERWORLD) && dashTrigger.current && dashCooldownCurrent <= 0) { setDashCooldown(playerStats.dashCooldownTime); dashTimer.current = 0.25; if (Math.abs(inputVector.current.x) > 0.1 || Math.abs(inputVector.current.y) > 0.1) { const len = Math.sqrt(inputVector.current.x**2 + inputVector.current.y**2); dashDirection.current.set(inputVector.current.x / len, inputVector.current.y / len); } else dashDirection.current.set(facing, 0); dashTrigger.current = false; } 
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
        const limit = mode === GameMode.BATTLE ? 24.5 : 49.0; if (playerRef.current.position.x > limit) playerRef.current.position.x = limit; if (playerRef.current.position.x < -limit) playerRef.current.position.x = -limit; if (playerRef.current.position.z > limit) playerRef.current.position.z = limit; if (playerRef.current.position.z < -limit) playerRef.current.position.z = -limit;
        if (state.clock.elapsedTime - lastMapUpdate.current > 0.1) { lastMapUpdate.current = state.clock.elapsedTime; updatePosition(playerRef.current.position.x, playerRef.current.position.z); }
        const isGenerating = useAiDirectorStore.getState().isGenerating;
        if (mode === GameMode.OVERWORLD && battleCooldown.current <= 0) { for (const portal of portals) { const distToPortal = playerRef.current.position.distanceTo(new THREE.Vector3(portal.x, 0, portal.z)); if (distToPortal < 1.5) { if (!isGenerating) { enterBattle(portal); } break; } } }
    } else { setIsMoving(false); }
    const currentStats = useGameStore.getState().playerStats; if (currentStats.lastDamageTime > lastProcessedDamageTime.current) { shakeIntensity.current = 2.5; lastProcessedDamageTime.current = currentStats.lastDamageTime; }
    
    // --- DYNAMIC CAMERA ZOOM LOGIC ---
    const aspect = state.size.width / state.size.height;
    
    // Landscape Base (closer than original to fix "too zoomed out")
    let camY = 18; 
    let camZ = 16; 

    // Portrait Adjustment (further to fix "too zoomed in")
    // If aspect < 1.0, we smoothly increase camera distance
    if (aspect < 1.0) {
        const boost = (1.0 - aspect) * 32; // e.g. at aspect 0.5 -> +16 units -> Y=34
        camY += boost;
        camZ += boost;
    }

    const targetCamPos = new THREE.Vector3(playerRef.current.position.x, playerRef.current.position.y + camY, playerRef.current.position.z + camZ); 
    camera.position.lerp(targetCamPos, 4 * delta);
    
    if (shakeIntensity.current > 0) { const s = shakeIntensity.current; camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; camera.position.z += (Math.random() - 0.5) * s; shakeIntensity.current = Math.max(0, shakeIntensity.current - (delta * 8.0)); }
    camera.lookAt(playerRef.current.position);
  });

  const getPortalColor = (portal: any) => { if (portal.colorOverride) return portal.colorOverride; if (portal.type === 'BOSS') return '#aa00ff'; return '#00ffff'; };
  // Map quizOption key to display label for portals
  const getPortalLabel = (portal: any): string | undefined => { if (!portal.quizOption) return undefined; if (portal.quizOption === 'A') return 'YES'; if (portal.quizOption === 'B') return 'NO'; return portal.quizOption; };
  const isPlayerHit = (Date.now() - playerStats.lastDamageTime) < 200;
  const arrowTarget = useMemo(() => { if (highlightedPortalId) { return portals.find(p => p.id === highlightedPortalId); } const bossPortal = portals.find(p => p.type === 'BOSS'); if (bossPortal) return bossPortal; const normalPortals = portals.filter(p => p.type === 'NORMAL'); if (normalPortals.length === 1) { return normalPortals[0]; } return null; }, [portals, highlightedPortalId]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      {(mode === GameMode.OVERWORLD || ((mode === GameMode.PAUSED || mode === GameMode.SHOP || mode === GameMode.STATUS || mode === GameMode.LIBRARY) && lastGameplayMode === GameMode.OVERWORLD)) && (
          <group>
            <PixelGround width={100} height={100} themeId={themeId} mode="OVERWORLD" aiConfig={aiConfig} />
            <VoxelLandmark type={landmarkType} position={[LANDMARK_POS.x, 0, LANDMARK_POS.z]} />
            <VoxelShop position={[SHOP_POS.x, 0, SHOP_POS.z]} />
            {props.map((p) => {
                const s = getPropScale(p.type);
                return <PropSprite key={p.id} position={[p.x, s * 0.5, p.z]} type={p.type as any} scale={s} />;
            })}
            {portals.map((portal) => ( <VoxelPortal key={portal.id} position={[portal.x, 0, portal.z]} color={getPortalColor(portal)} isBoss={portal.type === 'BOSS'} label={getPortalLabel(portal)} /> ))}
            {arrowTarget && ( <QuestArrow playerRef={playerRef} target={{ x: arrowTarget.x, z: arrowTarget.z }} /> )}
          </group>
      )}
      <PlayerTrailRenderer playerRef={playerRef} dashTimer={dashTimer} />
      <group ref={playerRef}><Suspense fallback={null}><PlayerSpriteBillboard position={[0, 1, 0]} scale={2.0} facing={facing} action={isMoving ? 'RUN' : 'IDLE'} viewDirection={viewDirection} isHit={isPlayerHit} /></Suspense><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><circleGeometry args={[0.5, 16]} /><meshBasicMaterial color="black" opacity={0.5} transparent /></mesh></group>
      <Suspense fallback={null}>
        {(mode === GameMode.BATTLE || mode === GameMode.REWARD || mode === GameMode.CHEST_REWARD || ((mode === GameMode.PAUSED || mode === GameMode.STATUS || mode === GameMode.LIBRARY || mode === GameMode.SHOP) && lastGameplayMode === GameMode.BATTLE)) && (
            <BattleManager playerPosition={playerRef.current ? playerRef.current.position : new THREE.Vector3(0,0,0)} activeBattle={activeBattle} />
        )}
      </Suspense>
    </>
  );
};
