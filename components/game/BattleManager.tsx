
import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Enemy, Projectile, GameMode, ActiveBattleState, XpOrb, Chest } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { useAiDirectorStore } from '../../store/aiDirectorStore';
import { SpriteBillboard, ExternalBossSprite } from './SpriteBillboard';
import { ProjectilesInstanced, SpecialProjectiles } from './ProjectilesInstanced';
import { PixelGround } from './PixelGround';
import { WEAPONS_DATA } from '../../constants';
import { ASSET_PATHS } from '../../assets';
import * as THREE from 'three';
import { QuestArrow } from './QuestArrow';
import { getEnemyCombatProfile, isKnockbackResistantEnemyType, isLargeEnemyType, STAGE_ENEMY_POOLS, HORDE_MELEE_TYPES } from './enemyDrawing';
import { FINAL_ENDING_NARRATION_KEY, requestGaiaNarration, requestSfx } from './AudioManager';

interface BattleManagerProps {
  playerPosition: THREE.Vector3;
  activeBattle: ActiveBattleState;
}

const STAGE_ONE_ROUND_ONE_ENEMY_HP_MULTIPLIER = 0.5;

const NORMAL_MOB_PROJECTILE_BALANCE = {
  default: {
    attackCooldown: 2.0,
    novaThreshold: 0.8,
    burstThreshold: 0.6,
    spreadThreshold: 0.4,
    hardProjectileCap: 60,
  },
  8: {
    attackCooldown: 2.05,
    novaThreshold: 0.84,
    burstThreshold: 0.6,
    spreadThreshold: 0.4,
    hardProjectileCap: 70,
  },
  9: {
    attackCooldown: 2.1,
    novaThreshold: 0.83,
    burstThreshold: 0.62,
    spreadThreshold: 0.39,
    hardProjectileCap: 80,
  },
  10: {
    attackCooldown: 2.08,
    novaThreshold: 0.82,
    burstThreshold: 0.62,
    spreadThreshold: 0.39,
    hardProjectileCap: 90,
  },
} as const;

const getNormalMobProjectileBalance = (stage: number) => {
  if (stage >= 10) return NORMAL_MOB_PROJECTILE_BALANCE[10];
  if (stage >= 9) return NORMAL_MOB_PROJECTILE_BALANCE[9];
  if (stage >= 8) return NORMAL_MOB_PROJECTILE_BALANCE[8];
  return NORMAL_MOB_PROJECTILE_BALANCE.default;
};

const FireAura: React.FC<{ radius: number, position: THREE.Vector3 }> = ({ radius, position }) => {
    const groupRef = useRef<THREE.Group>(null);
    const mesh1 = useRef<THREE.Mesh>(null);
    const mesh2 = useRef<THREE.Mesh>(null);

    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0,0,128,128);
            ctx.strokeStyle = '#f97316'; ctx.lineWidth = 8; ctx.beginPath();
            for(let i=0; i<=360; i+=10) {
                const rad = (i * Math.PI) / 180;
                const r = 54 + (Math.random() * 8); 
                const x = 64 + Math.cos(rad) * r;
                const y = 64 + Math.sin(rad) * r;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath(); ctx.stroke();
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4; ctx.beginPath();
            for(let i=0; i<=360; i+=15) {
                const rad = (i * Math.PI) / 180;
                const r = 46 + (Math.random() * 6);
                const x = 64 + Math.cos(rad) * r;
                const y = 64 + Math.sin(rad) * r;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath(); ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter;
        return tex;
    }, []);

    useFrame((state, delta) => {
        if (useGameStore.getState().mode === GameMode.PAUSED) return;
        if (groupRef.current) groupRef.current.position.set(position.x, 0.05, position.z);
        if(mesh1.current) {
            mesh1.current.rotation.z += delta * 2; 
            const s = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
            mesh1.current.scale.set(s, s, 1);
        }
        if (mesh2.current) mesh2.current.rotation.z -= delta * 1.5; 
    });

    return (
        <group ref={groupRef} rotation={[-Math.PI/2, 0, 0]}><mesh ref={mesh1}><planeGeometry args={[radius * 2, radius * 2]} /><meshBasicMaterial map={texture} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} /></mesh><mesh ref={mesh2} position={[0,0,-0.01]}><planeGeometry args={[radius * 2, radius * 2]} /><meshBasicMaterial map={texture} color="#ef4444" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} /></mesh></group>
    );
};

const TeslaCoil: React.FC<{ radius: number, position: THREE.Vector3 }> = ({ radius, position }) => {
    const groupRef = useRef<THREE.Group>(null);
    const outerRef = useRef<THREE.Mesh>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const sparksRef = useRef<THREE.Group>(null);
    const innerMatRef = useRef<THREE.MeshBasicMaterial>(null);

    const outerTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0,0,256,256);
            const cx = 128, cy = 128;
            ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath();
            for(let i=0; i<=360; i+=6) {
                const rad = (i * Math.PI) / 180;
                const r = 108 + (Math.random() * 14 - 7);
                const x = cx + Math.cos(rad) * r;
                const y = cy + Math.sin(rad) * r;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath(); ctx.stroke();
            ctx.strokeStyle = '#dbeafe'; ctx.lineWidth = 3; ctx.beginPath();
            for(let i=0; i<=360; i+=6) {
                const rad = (i * Math.PI) / 180;
                const r = 108 + (Math.random() * 10 - 5);
                const x = cx + Math.cos(rad) * r;
                const y = cy + Math.sin(rad) * r;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath(); ctx.stroke();
            ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.lineCap = 'round';
            for(let i=0; i<360; i+=15) {
                const rad = (i * Math.PI) / 180;
                ctx.beginPath();
                let px = cx + Math.cos(rad) * 80;
                let py = cy + Math.sin(rad) * 80;
                ctx.moveTo(px, py);
                for (let s=0; s<4; s++) {
                    const tr = 80 + s * 8;
                    const ta = rad + (Math.random() - 0.5) * 0.35;
                    px = cx + Math.cos(ta) * tr;
                    py = cy + Math.sin(ta) * tr;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
        return tex;
    }, []);

    const innerTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0,0,256,256);
            const cx = 128, cy = 128;
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110);
            grd.addColorStop(0, 'rgba(147,197,253,0.55)');
            grd.addColorStop(0.55, 'rgba(59,130,246,0.25)');
            grd.addColorStop(1, 'rgba(29,78,216,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(cx, cy, 110, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            for(let i=0; i<6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                let px = cx, py = cy;
                ctx.moveTo(px, py);
                for (let s=1; s<=8; s++) {
                    const tr = s * 12;
                    const ta = a + (Math.random() - 0.5) * 0.4;
                    px = cx + Math.cos(ta) * tr;
                    py = cy + Math.sin(ta) * tr;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
        return tex;
    }, []);

    useFrame((state, delta) => {
        if (useGameStore.getState().mode === GameMode.PAUSED) return;
        if (groupRef.current) groupRef.current.position.set(position.x, 0.05, position.z);
        const t = state.clock.elapsedTime;
        if (outerRef.current) outerRef.current.rotation.z += delta * 0.25;
        if (innerRef.current) innerRef.current.rotation.z -= delta * 0.6;
        if (innerMatRef.current) innerMatRef.current.opacity = 0.28 + Math.sin(t * 4) * 0.05;
        if (sparksRef.current) {
            sparksRef.current.rotation.z += delta * 1.1;
            sparksRef.current.children.forEach((child, i) => {
                const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
                if (mat) mat.opacity = 0.6 + Math.sin(t * 6 + i * 1.3) * 0.35;
            });
        }
    });

    const sparks = useMemo(() => {
        const arr: { angle: number }[] = [];
        const count = 5;
        for (let i = 0; i < count; i++) arr.push({ angle: (i / count) * Math.PI * 2 });
        return arr;
    }, []);

    return (
        <group ref={groupRef} rotation={[-Math.PI/2, 0, 0]}>
            <mesh ref={innerRef} position={[0, 0, -0.02]}>
                <planeGeometry args={[radius * 2, radius * 2]} />
                <meshBasicMaterial ref={innerMatRef} map={innerTexture} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh ref={outerRef}>
                <planeGeometry args={[radius * 2, radius * 2]} />
                <meshBasicMaterial map={outerTexture} transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
            <group ref={sparksRef}>
                {sparks.map((s, i) => (
                    <mesh key={i} position={[Math.cos(s.angle) * radius, Math.sin(s.angle) * radius, 0.01]}>
                        <sphereGeometry args={[0.22, 8, 8]} />
                        <meshBasicMaterial color="#bfdbfe" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

interface VisualEffect {
  id: string;
  x: number;
  z: number;
  life: number;
  initialLife?: number;
  type: 'THUNDER' | 'DASH_TRAIL' | 'BOSS_DEATH' | 'CHAIN_LIGHTNING';
  path?: { x: number; y?: number; z: number }[];
}

interface LightningBoltProps {
    // Stable effect object ref — life is mutated in place each frame so we can animate
    // opacity via our own useFrame without triggering a parent re-render.
    effect: VisualEffect;
    defaultInitialLife: number;
    color?: string;
    glowColor?: string;
}

// Shared geometries/materials to avoid per-frame allocation
const _boltCoreGeo = new THREE.BoxGeometry(1, 0.05, 0.05);
const _boltGlowGeo = new THREE.BoxGeometry(1, 0.25, 0.25);
const _nodeGeo = new THREE.SphereGeometry(0.4, 8, 8);
const _nodeSmallGeo = new THREE.SphereGeometry(0.1, 8, 8);
const _tempVec = new THREE.Vector3();
const _tempDir = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);

const LightningBolt: React.FC<LightningBoltProps> = ({ effect, defaultInitialLife, color="#ffffff", glowColor="#0ea5e9" }) => {
    const path = effect.path || [];
    const segments = useMemo(() => {
        const segs = [];
        if (!path || path.length < 2) return [];

        for(let i=0; i<path.length-1; i++) {
            const start = new THREE.Vector3(path[i].x, path[i].y ?? 1, path[i].z);
            const end = new THREE.Vector3(path[i+1].x, path[i+1].y ?? 1, path[i+1].z);
            const dist = start.distanceTo(end);
            const steps = Math.max(3, Math.floor(dist * 2.0));

            let prev = start.clone();
            for(let j=1; j<=steps; j++) {
                const t = j/steps;
                const next = new THREE.Vector3().lerpVectors(start, end, t);
                if (j < steps) {
                    const offset = 0.25;
                    next.x += (Math.random() - 0.5) * offset;
                    next.y += (Math.random() - 0.5) * offset;
                    next.z += (Math.random() - 0.5) * offset;
                }
                // Pre-compute transform data to avoid allocations in render
                const mid = new THREE.Vector3().addVectors(prev, next).multiplyScalar(0.5);
                const dir = new THREE.Vector3().subVectors(next, prev);
                const len = dir.length();
                const quaternion = new THREE.Quaternion();
                quaternion.setFromUnitVectors(_xAxis, dir.normalize());
                segs.push({ mid, quaternion, len });
                prev = next;
            }
        }
        return segs;
    }, [path]);

    const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true }), [color]);
    const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, blending: THREE.AdditiveBlending }), [glowColor]);
    const nodeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, blending: THREE.AdditiveBlending }), [glowColor]);

    // Self-animate opacity from the mutable effect object so the parent no longer
    // needs to setRenderEffects each frame just to drive this fade.
    useFrame(() => {
        const initialLife = effect.initialLife ?? defaultInitialLife;
        const opacity = Math.min(1, effect.life / (initialLife * 0.5));
        coreMat.opacity = opacity;
        glowMat.opacity = opacity * 0.6;
        nodeMat.opacity = opacity;
    });

    return (
        <group>
            {segments.map((s, i) => (
                <group key={i} position={s.mid} quaternion={s.quaternion}><mesh geometry={_boltCoreGeo} material={coreMat} scale={[s.len, 1, 1]} /><mesh geometry={_boltGlowGeo} material={glowMat} scale={[s.len + 0.1, 1, 1]} /></group>
            ))}
             {path.map((p, i) => {
                 if (p.y && p.y > 5) return null;
                 return (
                     <mesh key={`node_${i}`} position={[p.x, p.y ?? 1, p.z]} geometry={i === 0 ? _nodeSmallGeo : _nodeGeo} material={nodeMat} />
                 );
             })}
        </group>
    );
};

// Self-animating boss death effect — reads effect.life via useFrame so parent
// doesn't need to re-render every frame.
const BossDeathEffect: React.FC<{ effect: VisualEffect }> = ({ effect }) => {
    const ringRef = useRef<THREE.Mesh>(null);
    const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const beamRef = useRef<THREE.Mesh>(null);
    const beamMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const sphereRef = useRef<THREE.Mesh>(null);
    const sphereMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    useFrame(() => {
        const progress = 1 - (effect.life / 3.5);
        const scale = 1 + (progress * 10);
        const alpha = Math.max(0, 1 - progress);
        if (ringRef.current) { ringRef.current.scale.set(scale, scale, scale); }
        if (ringMatRef.current) { ringMatRef.current.opacity = alpha; }
        if (beamMatRef.current) { beamMatRef.current.opacity = alpha * 0.8; }
        if (beamRef.current) { const r = 2 * (1 - progress); beamRef.current.scale.set(r, 1, r); }
        if (sphereRef.current) { const s = 1 + progress * 2; sphereRef.current.scale.set(s, s, s); }
        if (sphereMatRef.current) { sphereMatRef.current.opacity = alpha; }
        if (lightRef.current) { lightRef.current.intensity = 5 * alpha; }
    });
    return (
        <group position={[effect.x, 0, effect.z]}>
            <mesh ref={ringRef} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.1, 0]}>
                <ringGeometry args={[0.5, 1.0, 32]} />
                <meshBasicMaterial ref={ringMatRef} color="#e879f9" transparent opacity={1} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={beamRef} position={[0, 10, 0]}>
                <cylinderGeometry args={[1, 1, 50, 16, 1, true]} />
                <meshBasicMaterial ref={beamMatRef} color="white" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={sphereRef} position={[0, 2, 0]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial ref={sphereMatRef} color="#a855f7" wireframe transparent opacity={1} />
            </mesh>
            <pointLight ref={lightRef} position={[0, 5, 0]} color="#d946ef" intensity={5} distance={15} />
        </group>
    );
};

// Self-animating default sphere fade (fallback effect type).
const DefaultFadeEffect: React.FC<{ effect: VisualEffect }> = ({ effect }) => {
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    useFrame(() => { if (matRef.current) matRef.current.opacity = Math.max(0, effect.life); });
    return (
        <mesh position={[effect.x, 1, effect.z]}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial ref={matRef} color="#ff00ff" transparent opacity={1} />
        </mesh>
    );
};

export const BattleManager: React.FC<BattleManagerProps> = ({ playerPosition, activeBattle }) => {
  // Per-field selectors so HP/XP/score ticks don't re-render this 1700-line tree on unrelated store changes.
  const mode = useGameStore(s => s.mode);
  const playerStats = useGameStore(s => s.playerStats);
  const activeStage = useGameStore(s => s.activeStage);
  const battleWon = useGameStore(s => s.battleWon);
  const isQuizOpen = useGameStore(s => s.isQuizOpen);
  const isImpactOpen = useGameStore(s => s.isImpactOpen);
  const collectCo2Orb = useGameStore(s => s.collectCo2Orb);
  const takeDamage = useGameStore(s => s.takeDamage);
  const setBattleWon = useGameStore(s => s.setBattleWon);
  const completePortal = useGameStore(s => s.completePortal);
  const completeStage = useGameStore(s => s.completeStage);
  const recordDamage = useGameStore(s => s.recordDamage);
  const recordKill = useGameStore(s => s.recordKill);
  const openChest = useGameStore(s => s.openChest);
  const gainXp = useGameStore(s => s.gainXp);
  const showQueuedLevelUp = useGameStore(s => s.showQueuedLevelUp);
  const prepareFinalEndingCinematic = useGameStore(s => s.prepareFinalEndingCinematic);
  const aiConfig = useAiDirectorStore(state => state.currentConfig);
  
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const xpOrbsRef = useRef<XpOrb[]>([]);
  
  const visualEffectsRef = useRef<{
      id: string, 
      x: number, 
      z: number, 
      ex?: number, 
      ez?: number, 
      life: number, 
      initialLife?: number,
      type: 'THUNDER' | 'DASH_TRAIL' | 'BOSS_DEATH' | 'CHAIN_LIGHTNING',
      path?: {x: number, y?: number, z: number}[] 
  }[]>([]);
  
  const [chest, setChest] = useState<Chest | null>(null);
  const battleDifficultyRef = useRef(activeBattle.level);
  
  const [renderEnemies, setRenderEnemies] = useState<Enemy[]>([]);
  const [renderEffects, setRenderEffects] = useState<any[]>([]);
  const [renderOrbs, setRenderOrbs] = useState<XpOrb[]>([]);
  const lastPlayerFacing = useRef<{x:number, z:number}>({x:0, z:1});

  const spawnTimer = useRef(0);
  const enemiesDefeated = useRef(0);
  const hitPulseCountRef = useRef(0);
  const hitPulseDamageRef = useRef(0);
  const bossSpawned = useRef(false);
  const bossPhaseTimer = useRef(0);
  const bossDeathTimer = useRef(0);
  const bossDefeatNarrationTriggered = useRef(false);
  const victoryTriggered = useRef(false);
  const victoryTimer = useRef(0);
  const completionHandled = useRef(false);
  const lootCollected = useRef(false); 
  
  const enemiesToSpawn = 10 + (battleDifficultyRef.current * 3);

  const HORDE_EXTRA_COUNT = Math.min(6 + (activeStage - 1) * 3, 30);
  const HORDE_HP_MULT = 0.45;
  const HORDE_XP_MULT = 0.5;
  const isHordeBattle =
    !activeBattle.isBoss &&
    Boolean(activeBattle.portalId) &&
    activeBattle.portalId.includes('_r2');
  const totalEnemiesToSpawn = enemiesToSpawn + (isHordeBattle ? HORDE_EXTRA_COUNT : 0);

  const weaponTimers = useRef({ magicMissile: 0, axe: 0, aura: 0, thunder: 0, orbital: 0, cross: 0, dagger: 0, magicArrow: 0, flamethrower: 0, fireMortar: 0, toxicFlask: 0, javelin: 0, chainLightning: 0, spear: 0, slimeBall: 0, shuriken: 0, bible: 0, katana: 0, toxinGun: 0, holyBeam: 0, plagueSpreader: 0, teslaCoil: 0 });
  
  const isPaused = (mode as any) === GameMode.REWARD || (mode as any) === GameMode.CHEST_REWARD || mode === GameMode.LOADING_LEVEL || mode === GameMode.PAUSED || mode === GameMode.STATUS || mode === GameMode.LIBRARY || mode === GameMode.SHOP || isQuizOpen || isImpactOpen;
  const countHostileProjectiles = () => {
      let count = 0;
      const projectiles = projectilesRef.current;
      for (let i = 0; i < projectiles.length; i++) {
          if (!projectiles[i].fromPlayer) count++;
      }
      return count;
  };
  const enemyHpMultiplier =
    activeStage === 1 &&
    !activeBattle.isBoss &&
    Boolean(activeBattle.portalId) &&
    !activeBattle.portalId.includes('_r2')
      ? STAGE_ONE_ROUND_ONE_ENEMY_HP_MULTIPLIER
      : 1;

  const requestBossDefeatNarration = () => {
      if (bossDefeatNarrationTriggered.current) return;
      bossDefeatNarrationTriggered.current = true;

      const stageNumber = Math.min(10, Math.max(1, activeStage));
      if (stageNumber >= 10) {
          prepareFinalEndingCinematic();
          requestGaiaNarration(ASSET_PATHS.audio.gaia.finalEnding, FINAL_ENDING_NARRATION_KEY);
          return;
      }

      requestGaiaNarration(
          ASSET_PATHS.audio.gaia.stageSaved(stageNumber),
          `gaia:stage-saved:${stageNumber}`,
      );
  };

  const themeId = React.useMemo(() => {
     const cycle = ((activeStage - 1) % 10) + 1;
     return cycle; 
  }, [activeStage]);

  const getEnemyColor = (type: string, stage: number) => '#ffffff';

  const getBossName = (stage: number) => {
      if (aiConfig && aiConfig.boss) return aiConfig.boss.name;
      const bosses = ["PLASTIC GOLIATH", "CIRCUIT LICH", "FROSTBYTE GOLEM", "SLAG COLOSSUS", "SILICON DUNE WORM", "TOXIC ALCHEMIST", "MAINFRAME OVERLORD", "DATA WRAITH", "SMOG DRAGON", "NUCLEAR CORE TITAN"];
      const stageIndex = Math.min(Math.max(stage, 1), bosses.length) - 1;
      return bosses[stageIndex] || "UNKNOWN ENTITY";
  };

  const spawnCo2Orb = (x: number, z: number, val: number) => {
      const orb: XpOrb = { id: Math.random().toString(), x, z, value: val, type: 'CO2_ORB' };
      xpOrbsRef.current.push(orb); setRenderOrbs([...xpOrbsRef.current]);
  };

  const damageEnemy = (e: Enemy, amount: number, knockbackBase: number, sourceX: number, sourceZ: number, currentTime: number) => {
       if (e.hp <= 0) return;
       // Invulnerable during fade out/in of teleport
       if (e.type === 'BOSS' && e.teleportState && e.teleportState !== 'IDLE' && e.teleportState !== 'TELEGRAPH') return;

       e.hp -= amount;
       e.lastHit = currentTime;
       recordDamage(amount);
       hitPulseCountRef.current += 1;
       hitPulseDamageRef.current += amount;

       // --- KNOCKBACK LOGIC ---
       if (knockbackBase > 0) {
           const dx = e.x - sourceX;
           const dz = e.z - sourceZ;
           const len = Math.sqrt(dx * dx + dz * dz) || 1;
           
           // Apply player modifiers to base knockback
           const force = knockbackBase * (playerStats.modifiers.knockback || 1.0);
           
           // Bosses resist knockback significantly
           const resistance = e.type === 'BOSS' ? 0.9 : (isKnockbackResistantEnemyType(e.type) ? 0.5 : 0);
           const effectiveForce = Math.max(0, force * (1 - resistance));

           // Add impulsive force to current knockback velocity
           e.knockbackX = (e.knockbackX || 0) + (dx / len) * effectiveForce * 5; 
           e.knockbackZ = (e.knockbackZ || 0) + (dz / len) * effectiveForce * 5;
       }

       if (e.hp <= 0) {
           if (e.type === 'BOSS') {
               visualEffectsRef.current.push({ id: `boss_death_${Math.random()}`, x: e.x, z: e.z, life: 3.5, type: 'BOSS_DEATH' });
               visualEffectsRef.current = visualEffectsRef.current.filter(ef => ef.type !== 'THUNDER');
               setRenderEffects([...visualEffectsRef.current]);
               bossDeathTimer.current = 3.5; projectilesRef.current = [];
               requestSfx('boss_defeat');
               requestBossDefeatNarration();
               enemiesRef.current = enemiesRef.current.filter(en => en.id !== e.id); setRenderEnemies([...enemiesRef.current]);
           } else {
               requestSfx('die_enemy', { pitchJitter: true, volume: 0.5 });
           }

           const stageXpMult = 1.0 + (activeStage * 0.5);
           let baseXp = e.type === 'BOSS' ? 1500 : 40;
           baseXp = Math.floor(baseXp * stageXpMult * (e.isHordeMob ? HORDE_XP_MULT : 1));
           gainXp(baseXp);

           const co2Value = e.type === 'BOSS' ? 100 : Math.floor(Math.random() * 3) + 1;
           spawnCo2Orb(e.x, e.z, co2Value);

           recordKill(); enemiesDefeated.current++; e.hp = -1;
       }
  };

  const winBattle = () => {
      if (useGameStore.getState().mode === GameMode.REWARD) return;
      if (victoryTriggered.current) return;
      victoryTriggered.current = true;
      projectilesRef.current = [];
      visualEffectsRef.current = visualEffectsRef.current.filter(ef => ef.type !== 'THUNDER'); setRenderEffects([...visualEffectsRef.current]);
  };

  const spawnBoss = () => {
     bossSpawned.current = true;
     
     // Boss HP per stage (stage 1–10)
     const BOSS_HP_TABLE = [4000, 8000, 16000, 32000, 62000, 100000, 200000, 400000, 800000, 1600000];
     const stageIndex = Math.min(Math.max(activeStage - 1, 0), BOSS_HP_TABLE.length - 1);
     let hp = BOSS_HP_TABLE[stageIndex];
     
     let damage = 25 + (activeStage * 5);
     const variant = aiConfig?.boss?.visualVariant || (activeStage % 2 === 0 ? "CRYPT" : "FOREST");
     const taunt = aiConfig?.boss?.introductionLine || "YOU SHALL PERISH!";

     if (aiConfig) {
         if (aiConfig.enemies.damageMultiplier) {
             damage *= aiConfig.enemies.damageMultiplier;
         }
     }

     enemiesRef.current.push({
        id: 'BOSS', x: 0, z: -15, 
        hp: hp, maxHp: hp,
        type: 'BOSS', speed: 1.5 + (activeStage * 0.1), 
        attackRange: 8, damage: damage, 
        attackCooldown: 0, dashCooldown: 5.0, facing: 1,
        name: getBossName(activeStage),
        visualVariant: variant,
        taunt: taunt,
        knockbackX: 0, knockbackZ: 0,
        opacity: 1.0, teleportState: 'IDLE', teleportTimer: 0,
        orbitDirection: Math.random() < 0.5 ? 1 : -1,
     });
     setRenderEnemies([...enemiesRef.current]);
  };

  const spawnEnemy = (hordeMob = false) => {
    const angle = Math.random() * Math.PI * 2;
    const r = 24;
    let type: Enemy['type'] = STAGE_ENEMY_POOLS[0][0];

    if (hordeMob) {
        const stageIdx = Math.max(0, activeStage - 1);
        const stagePool = HORDE_MELEE_TYPES.filter(t =>
            (STAGE_ENEMY_POOLS[stageIdx] as readonly string[]).includes(t)
        );
        const hordePool = stagePool.length > 0 ? stagePool : HORDE_MELEE_TYPES;
        type = hordePool[Math.floor(Math.random() * hordePool.length)] as any;
    } else if (aiConfig && aiConfig.enemies.spawnPool && aiConfig.enemies.spawnPool.length > 0) {
        const pool = aiConfig.enemies.spawnPool;
        type = pool[Math.floor(Math.random() * pool.length)] as any;
    } else {
        const fallbackPool = STAGE_ENEMY_POOLS[0];
        type = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    }

    const hpMult = 1.0 + ((activeStage - 1) * 0.6);
    const dmgMult = 1.0 + ((activeStage - 1) * 0.4);
    const baseHp = (50 + (battleDifficultyRef.current * 20));
    const baseDmg = (10 + battleDifficultyRef.current * 2);
    
    let hpMod = 1.0; let speed = 2.0; let damageMod = 1.0; let attackRange = 1;

    if (aiConfig) {
        hpMod *= aiConfig.enemies.hpMultiplier;
        speed *= aiConfig.enemies.speedMultiplier;
        if (aiConfig.enemies.damageMultiplier) {
            damageMod *= aiConfig.enemies.damageMultiplier;
        }
    }

    if (type !== 'BOSS' && type !== 'MISINFORMATION') {
        const profile = getEnemyCombatProfile(type);
        speed = profile.speed;
        hpMod = profile.hpMod;
        damageMod = profile.damageMod;
        attackRange = profile.attackRange;
    }

    const hp = baseHp * hpMult * hpMod * enemyHpMultiplier * (hordeMob ? HORDE_HP_MULT : 1);

    enemiesRef.current.push({
        id: Math.random().toString(), x: Math.cos(angle) * r, z: Math.sin(angle) * r,
        hp, maxHp: hp,
        type: type, speed: speed, attackRange: attackRange,
        damage: baseDmg * dmgMult * damageMod, attackCooldown: 0, dashCooldown: 0, facing: 1,
        knockbackX: 0, knockbackZ: 0,
        isHordeMob: hordeMob,
    });
  };

  const findClosestEnemy = (pos: THREE.Vector3, excludeIds: string[] = []) => {
    let closestDist = Infinity; let targetId = null;
    enemiesRef.current.forEach(e => { 
        if (excludeIds.includes(e.id)) return;
        const d = Math.sqrt((e.x - pos.x)**2 + (e.z - pos.z)**2); 
        if (d < 25 && d < closestDist) { closestDist = d; targetId = e.id; } 
    });
    return targetId ? enemiesRef.current.find(e => e.id === targetId) : null;
  };

  const spawnProjectile = (start: THREE.Vector3, target: Enemy, weaponType: string, angleOffset: number = 0, options: { turnsLeft?: number } = {}) => {
      const dx = target.x - start.x; const dz = target.z - start.z; const distToTarget = Math.sqrt(dx*dx + dz*dz);
      const angle = Math.atan2(dz, dx) + angleOffset;
      let speed = 8, life = 3; let damage = playerStats.attackPower * playerStats.modifiers.damage; let color = '#ffff00';
      let variant: Projectile['variant'] = 'MAGIC_MISSILE'; let type: Projectile['type'] = 'NORMAL';
      const levels = playerStats.unlockedWeapons;
      
      // Get base knockback from constants
      const wData = WEAPONS_DATA[weaponType];
      let knockbackValue = wData ? wData.knockback : 1.0;

      let bouncesLeft = 0;
      let spawnX = start.x;
      let spawnZ = start.z;
      let spawnVX = Math.cos(angle) * speed;
      let spawnVZ = Math.sin(angle) * speed;

      if (weaponType === 'AXE') { speed = 6; damage *= (2.0 + (levels['AXE'] * 0.5)); color = '#ff0000'; variant = 'AXE'; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; } 
      else if (weaponType === 'MAGIC_MISSILE') { damage *= (1.0 + (levels['MAGIC_MISSILE'] * 0.2)); color = '#00ffff'; variant = 'MAGIC_MISSILE'; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; } 
      else if (weaponType === 'CROSS') { speed = 10; damage *= (1.5 + (levels['CROSS'] * 0.3)); color = '#3b82f6'; variant = 'CROSS'; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; } 
      else if (weaponType === 'DAGGER') { speed = 14; damage *= (0.8 + (levels['DAGGER'] * 0.2)); color = '#e5e5e5'; variant = 'DAGGER'; life = 1.5; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; } 
      else if (weaponType === 'MAGIC_ARROW') { speed = 12; damage *= (3.5 + (levels['MAGIC_ARROW'] * 0.5)); color = '#d8b4fe'; variant = 'MAGIC_ARROW'; type = 'HOMING'; life = 4.0; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'FLAMETHROWER') { speed = 9; damage *= (1.2 + (levels['FLAMETHROWER'] * 0.3)); color = '#f97316'; variant = 'FLAMETHROWER'; life = 0.5; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'FIRE_MORTAR') { 
          speed = 8; damage *= (4.0 + (levels['FIRE_MORTAR'] * 0.6)); color = '#ef4444'; variant = 'FIRE_MORTAR'; 
          life = distToTarget / speed; 
          spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; 
      } 
      else if (weaponType === 'TOXIC_FLASK') { 
          speed = 8; damage *= (1.5 + (levels['TOXIC_FLASK'] * 0.4)); color = '#a3e635'; variant = 'TOXIC_FLASK'; 
          life = distToTarget / speed; 
          spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; 
      }
      else if (weaponType === 'JAVELIN') { speed = 20; damage *= (2.0 + (levels['JAVELIN'] * 0.5)); color = '#22d3ee'; variant = 'JAVELIN'; life = 2.0; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'SPEAR') { speed = 14; life = 0.35; damage *= (1.5 + (levels['SPEAR'] * 0.3)); color = '#94a3b8'; variant = 'SPEAR'; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'SLIME_BALL') { speed = 7; life = 12; damage *= (1.2 + (levels['SLIME_BALL'] * 0.2)); color = '#bef264'; variant = 'SLIME_BALL'; bouncesLeft = 4 + Math.floor((levels['SLIME_BALL'] || 1)); spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'SHURIKEN') { speed = 14; life = 2; damage *= (0.8 + (levels['SHURIKEN'] * 0.2)); color = '#e2e8f0'; variant = 'SHURIKEN'; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'KATANA') { speed = 8.0; life = 0.3; damage *= (1.8 + (levels['KATANA'] * 0.4)); color = '#e2e8f0'; variant = 'KATANA'; type = 'MELEE'; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'TOXIN_GUN') { speed = 16; life = 1.0; damage *= (0.8 + (levels['TOXIN_GUN'] * 0.2)); color = '#4ade80'; variant = 'TOXIN_GUN'; spawnVX = Math.cos(angle)*speed; spawnVZ = Math.sin(angle)*speed; }
      else if (weaponType === 'HOLY_BEAM') { spawnX = target.x; spawnZ = target.z; spawnVX = 0; spawnVZ = 0; life = 2.0; damage *= (3.0 + (levels['HOLY_BEAM'] * 0.8)); color = '#fef08a'; variant = 'HOLY_BEAM'; type = 'STATIONARY'; }
      else if (weaponType === 'PLAGUE_SPREADER') { spawnX = target.x; spawnZ = target.z; spawnVX = 0; spawnVZ = 0; life = 4.0; damage *= (1.5 + (levels['PLAGUE_SPREADER'] * 0.4)); color = '#3f6212'; variant = 'PLAGUE_SPREADER'; type = 'STATIONARY'; }

      projectilesRef.current.push({ 
          id: Math.random().toString(), 
          x: spawnX, z: spawnZ, 
          vx: spawnVX, vz: spawnVZ, 
          damage, fromPlayer: true, color, life, initialLife: life, type, variant, bouncesLeft,
          turnsLeft: options.turnsLeft,
          hitList: [],
          knockbackValue
      });
  };

  const isVariant = (p: Projectile, name: string): boolean => {
      return (p.variant as string) === name;
  };

  useEffect(() => {
    enemiesRef.current = []; projectilesRef.current = []; xpOrbsRef.current = []; visualEffectsRef.current = [];
    enemiesDefeated.current = 0; spawnTimer.current = 0; bossSpawned.current = false;
    victoryTriggered.current = false; victoryTimer.current = 0; bossPhaseTimer.current = 0; bossDeathTimer.current = 0;
    bossDefeatNarrationTriggered.current = false; completionHandled.current = false; setChest(null); lootCollected.current = false;
    weaponTimers.current = { magicMissile: 0, axe: 0, aura: 0, thunder: 0, orbital: 0, cross: 0, dagger: 0, magicArrow: 0, flamethrower: 0, fireMortar: 0, toxicFlask: 0, javelin: 0, chainLightning: 0, spear: 0, slimeBall: 0, shuriken: 0, bible: 0, katana: 0, toxinGun: 0, holyBeam: 0, plagueSpreader: 0, teslaCoil: 0 };
    battleDifficultyRef.current = activeBattle.level;
    setRenderEffects([]); setRenderOrbs([]);
    if (activeBattle.isBoss) {
        spawnBoss();
    } else {
        // Spawn Misinformation enemy if player just lost a streak
        if (activeBattle.lostStreak > 0) {
            const hpMult = 1.0 + ((activeStage - 1) * 0.6);
            const dmgMult = 1.0 + ((activeStage - 1) * 0.4);
            const angle = Math.random() * Math.PI * 2;
            const r = 16;
            const hp = (400 + activeBattle.lostStreak * 200) * hpMult * enemyHpMultiplier;
            enemiesRef.current.push({
                id: 'misinformation_' + Math.random().toString(),
                x: Math.cos(angle) * r, z: Math.sin(angle) * r,
                hp,
                maxHp: hp,
                type: 'MISINFORMATION' as any,
                speed: 3.0, attackRange: 6, damage: (15 + battleDifficultyRef.current * 3) * dmgMult * 1.5,
                attackCooldown: 0, dashCooldown: 3.0, facing: 1,
                knockbackX: 0, knockbackZ: 0
            });
        }
        setRenderEnemies([...enemiesRef.current]);
    }
  }, [activeBattle]);

  useFrame((state, delta) => {
    if (chest && !chest.isOpen && mode === GameMode.BATTLE) {
        if (Math.sqrt((playerPosition.x - chest.x)**2 + (playerPosition.z - chest.z)**2) < 1.0) {
            setChest(prev => prev ? { ...prev, isOpen: true } : null); openChest(); return; 
        }
    }

    if (isPaused) return;
    
    const moveX = playerPosition.x - (playerStats.modifiers as any).lastX || 0;
    const moveZ = playerPosition.z - (playerStats.modifiers as any).lastZ || 0;
    (playerStats.modifiers as any).lastX = playerPosition.x;
    (playerStats.modifiers as any).lastZ = playerPosition.z;
    if (Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001) {
        const len = Math.sqrt(moveX*moveX + moveZ*moveZ);
        lastPlayerFacing.current.x = moveX / len;
        lastPlayerFacing.current.z = moveZ / len;
    }

    const updateVisuals = (forceMagnet: boolean = false) => {
        if (visualEffectsRef.current.length > 0) {
            const prevLen = visualEffectsRef.current.length;
            // Mutate .life in place; each effect's own useFrame reads .life to drive
            // its opacity/scale animation, so we only need to tell React about
            // *list membership* changes (add/remove), not per-frame ticks.
            visualEffectsRef.current = visualEffectsRef.current.filter(ef => { ef.life -= delta; return ef.life > 0; });
            if (visualEffectsRef.current.length !== prevLen) setRenderEffects([...visualEffectsRef.current]);
        }
        
        // Positions are mutated in place on the orb objects; SpriteBillboard reads
        // entity.x/z in its own useFrame via the stable object ref, so movement does
        // not require a React re-render. Only re-render when an orb is collected
        // (list membership changes).
        const activeOrbs: XpOrb[] = [];
        let orbsListChanged = false;

        xpOrbsRef.current.forEach(orb => {
            const dx = playerPosition.x - orb.x; const dz = playerPosition.z - orb.z; const dist = Math.sqrt(dx*dx + dz*dz);
            const shouldPull = forceMagnet || dist < 5.0;
            const magnetSpeed = forceMagnet ? 20 : 8;
            const collectRadius = forceMagnet ? 1.5 : 1.0;

            if (shouldPull && dist > 0.0001) {
                orb.x += (dx/dist) * magnetSpeed * delta;
                orb.z += (dz/dist) * magnetSpeed * delta;
            }

            if (dist < collectRadius) {
                collectCo2Orb(orb.value);
                requestSfx('co2_orb_pickup');
                orbsListChanged = true;
            } else {
                activeOrbs.push(orb);
            }
        });

        if (orbsListChanged) { xpOrbsRef.current = activeOrbs; setRenderOrbs([...activeOrbs]); }
    };

    if (victoryTriggered.current) {
        if (mode === GameMode.REWARD || mode === GameMode.CHEST_REWARD) return;
        const isFinalBossVictory = activeBattle.isBoss && activeStage >= 10;

        if (isFinalBossVictory) {
            if (!completionHandled.current) {
                // Final stage: instantly bank remaining drops, then jump to victory flow.
                if (xpOrbsRef.current.length > 0) {
                    xpOrbsRef.current.forEach((orb) => collectCo2Orb(orb.value));
                    xpOrbsRef.current = [];
                    setRenderOrbs([]);
                }
                completionHandled.current = true;
                completeStage();
            }
            return;
        }

        updateVisuals(true);
        if (xpOrbsRef.current.length === 0 && !lootCollected.current) {
             lootCollected.current = true;
             if (activeBattle.isBonus || activeBattle.isBoss) { 
                setChest({ id: 'reward_chest', x: 0, z: 0, isOpen: false }); 
             } else { 
                setBattleWon(true); 
             }
        }
        if (chest) { if (chest.isOpen && mode === GameMode.BATTLE && !battleWon) setBattleWon(true); if (!battleWon) return; }
        if (lootCollected.current) { victoryTimer.current += delta; }
        if (victoryTimer.current > 3.0 && !completionHandled.current) {
             completionHandled.current = true;
             if (activeBattle.isBoss) completeStage(); else completePortal(activeBattle.portalId);
        }
        return; 
    }
    
    if (bossDeathTimer.current > 0) {
        bossDeathTimer.current -= delta; updateVisuals(false); 
        if (projectilesRef.current.length > 0) { projectilesRef.current = []; }
        if (bossDeathTimer.current <= 0) {
            winBattle();
            showQueuedLevelUp();
        }
        return; 
    }

    const time = state.clock.elapsedTime;
    bossPhaseTimer.current += delta;
    let enemiesChanged = false; let projectilesChanged = false;

    if (activeBattle.isBoss) {
        if (bossSpawned.current && enemiesRef.current.length === 0) { if (bossDeathTimer.current <= 0) { winBattle(); return; } }
    } else {
        spawnTimer.current += delta;
        let densityMod = 1.0;
        if (aiConfig) densityMod = aiConfig.enemies.densityMultiplier;
        const spawnDelay = Math.max(0.3, (1.5 - (activeStage * 0.1) - (battleDifficultyRef.current * 0.05)) / densityMod);
        if (enemiesRef.current.length + enemiesDefeated.current < totalEnemiesToSpawn && spawnTimer.current > spawnDelay) {
          spawnTimer.current = 0;
          const isHordeSpawn = isHordeBattle && (enemiesRef.current.length + enemiesDefeated.current >= enemiesToSpawn);
          spawnEnemy(isHordeSpawn); enemiesChanged = true;
        }
        if (enemiesDefeated.current >= totalEnemiesToSpawn && enemiesRef.current.length === 0) { winBattle(); return; }
    }

    const poisonClouds = projectilesRef.current.filter(p => isVariant(p, 'POISON_CLOUD') || isVariant(p, 'PLAGUE_SPREADER'));

    const aliveEnemies: Enemy[] = [];
    enemiesRef.current.forEach(enemy => {
        // --- MOVEMENT & KNOCKBACK UPDATE ---
        const dx = playerPosition.x - enemy.x; const dz = playerPosition.z - enemy.z; const dist = Math.sqrt(dx * dx + dz * dz);
        let moveSpeed = enemy.speed;
        
        // Poison Slow
        if (poisonClouds.length > 0) {
            for (const cloud of poisonClouds) {
                const d = (cloud.x - enemy.x)**2 + (cloud.z - enemy.z)**2;
                const radius = isVariant(cloud, 'PLAGUE_SPREADER') ? 6.0 : 9.0;
                if (d < radius) { moveSpeed *= 0.5; break; }
            }
        }

        // Apply Friction to Knockback (Decay)
        const kbFriction = 0.85; // How quickly knockback decays
        enemy.knockbackX = (enemy.knockbackX || 0) * kbFriction;
        enemy.knockbackZ = (enemy.knockbackZ || 0) * kbFriction;
        
        // Stop very small knockback values
        if (Math.abs(enemy.knockbackX) < 0.01) enemy.knockbackX = 0;
        if (Math.abs(enemy.knockbackZ) < 0.01) enemy.knockbackZ = 0;

        let vx = 0; let vz = 0;

        if (enemy.type === 'BOSS') {
            // DETERMINE BOSS MOVEMENT PATTERN BASED ON STAGE
            let pattern: 'DASH' | 'TELEPORT' | 'ORBIT' = 'DASH';
            
            if (activeStage >= 10) {
                // Ascended: HP-gated phases (DASH -> TELEPORT -> ORBIT as HP drops)
                const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
                if (hpRatio > 0.66) pattern = 'DASH';
                else if (hpRatio > 0.33) pattern = 'TELEPORT';
                else pattern = 'ORBIT';
            } else if (activeStage >= 7) {
                pattern = 'ORBIT';
            } else if (activeStage >= 4) {
                pattern = 'TELEPORT';
            }

            // Clean up leftover state when the pattern is NOT TELEPORT so the
            // attack cooldown check doesn't get blocked by a stale fade state
            // after an HP-driven phase swap.
            if (pattern !== 'TELEPORT' && enemy.teleportState && enemy.teleportState !== 'IDLE') {
                enemy.teleportState = 'IDLE';
                enemy.opacity = 1.0;
                enemy.teleportTimer = 0;
            }

            // --- TELEPORT PATTERN ---
            if (pattern === 'TELEPORT') {
                if (!enemy.teleportState) {
                    enemy.teleportState = 'IDLE';
                    enemy.teleportTimer = 4.0 + Math.random() * 2.0;
                }

                if (enemy.teleportState === 'IDLE') {
                    // Normal chasing while idle
                    vx = (dx / dist) * moveSpeed;
                    vz = (dz / dist) * moveSpeed;
                    enemy.teleportTimer = (enemy.teleportTimer ?? 5.0) - delta;
                    if (enemy.teleportTimer <= 0) {
                        enemy.teleportState = 'TELEGRAPH'; // Telegraph before fade
                        enemy.teleportTimer = 1.5; // Warning time (flashing)

                        // Fire a pre-committed shot at player's current position.
                        // Punishes standing still during the telegraph window.
                        const aimAngle = Math.atan2(dz, dx);
                        projectilesRef.current.push({
                            id: Math.random().toString(),
                            x: enemy.x, z: enemy.z,
                            vx: Math.cos(aimAngle) * 9,
                            vz: Math.sin(aimAngle) * 9,
                            damage: enemy.damage,
                            fromPlayer: false,
                            color: '#ff6600',
                            life: 4,
                            type: 'NORMAL',
                            variant: 'BOSS_NORMAL',
                        });
                        projectilesChanged = true;
                    }
                } else if (enemy.teleportState === 'TELEGRAPH') {
                    vx = 0; vz = 0; // Stop moving
                    enemy.teleportTimer = (enemy.teleportTimer || 1.5) - delta;
                    if (enemy.teleportTimer <= 0) {
                        enemy.teleportState = 'FADEOUT';
                        enemy.teleportTimer = 0.5; // Fade time
                    }
                } else if (enemy.teleportState === 'FADEOUT') {
                    vx = 0; vz = 0;
                    enemy.opacity = Math.max(0, (enemy.opacity || 1.0) - delta * 2);
                    if (enemy.opacity <= 0) {
                        // Teleport Move - reject & retry until we find a destination
                        // that fits inside the arena at the desired radius, so the
                        // boss never gets clamped to a wall on appearance.
                        const limit = 22.0;
                        let tx = enemy.x, tz = enemy.z;
                        let found = false;
                        for (let attempt = 0; attempt < 12; attempt++) {
                            const angle = Math.random() * Math.PI * 2;
                            const r = 8 + Math.random() * 8;
                            const cx = playerPosition.x + Math.cos(angle) * r;
                            const cz = playerPosition.z + Math.sin(angle) * r;
                            if (Math.abs(cx) <= limit && Math.abs(cz) <= limit) {
                                tx = cx; tz = cz; found = true; break;
                            }
                        }
                        if (!found) {
                            // Fallback: place 10u from player toward arena center
                            const angleToCenter = Math.atan2(-playerPosition.z, -playerPosition.x);
                            tx = playerPosition.x + Math.cos(angleToCenter) * 10;
                            tz = playerPosition.z + Math.sin(angleToCenter) * 10;
                            tx = Math.max(-limit, Math.min(limit, tx));
                            tz = Math.max(-limit, Math.min(limit, tz));
                        }
                        enemy.x = tx;
                        enemy.z = tz;

                        enemy.teleportState = 'FADEIN';
                        enemy.opacity = 0;
                    }
                } else if (enemy.teleportState === 'FADEIN') {
                    vx = 0; vz = 0;
                    enemy.opacity = Math.min(1, (enemy.opacity || 0) + delta * 2);
                    if (enemy.opacity >= 1) {
                        enemy.teleportState = 'IDLE';
                        // Randomized idle window so players can't perfectly predict the telegraph
                        enemy.teleportTimer = (activeStage >= 10)
                            ? (2.0 + Math.random() * 1.5)
                            : (4.0 + Math.random() * 2.0);
                    }
                }
            } 
            // --- ORBIT PATTERN ---
            else if (pattern === 'ORBIT') {
                enemy.opacity = 1.0; // Ensure visible

                // Stage 8+: breathing radius pulses between ~5 and ~11 units
                let desiredDist = 8.0;
                if (activeStage >= 8) {
                    desiredDist = 8.0 + Math.sin(bossPhaseTimer.current * 0.8) * 3.0;
                }

                // Shrink the orbit circle so it fits inside the arena when the
                // player is near a wall/corner. Floor at 3u so the boss never
                // collapses onto the player.
                const arenaLimit = 24.0;
                const maxFit = Math.max(3.0, Math.min(
                    arenaLimit - Math.abs(playerPosition.x),
                    arenaLimit - Math.abs(playerPosition.z)
                ));
                desiredDist = Math.min(desiredDist, maxFit);

                let orbitActive = true;

                // Stage 9+: telegraphed lunges interrupt the orbit
                if (activeStage >= 9) {
                    if (enemy.dashTime && enemy.dashTime > 0) {
                        orbitActive = false;
                        enemy.dashTime -= delta;
                        if (enemy.dashTime > 0.8) {
                            // Telegraph: freeze and flash
                            vx = 0; vz = 0;
                        } else {
                            // Lunge along saved vector
                            const lungeSpeed = 14;
                            vx = (enemy.dashVector?.x || 0) * lungeSpeed;
                            vz = (enemy.dashVector?.z || 0) * lungeSpeed;
                            if (Math.random() > 0.5) {
                                visualEffectsRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, life: 0.5, type: 'DASH_TRAIL' });
                                setRenderEffects([...visualEffectsRef.current]);
                            }
                        }
                        // Flip orbit direction on the frame the lunge finishes
                        if (enemy.dashTime <= 0) {
                            enemy.orbitDirection = (enemy.orbitDirection === 1 ? -1 : 1);
                        }
                    } else {
                        enemy.dashCooldown = (enemy.dashCooldown || 6.0) - delta;
                        if (enemy.dashCooldown <= 0 && dist > 4) {
                            enemy.dashTime = 1.4; // 0.6 telegraph + 0.8 lunge
                            enemy.dashCooldown = 6.0;
                            enemy.dashVector = { x: dx / dist, z: dz / dist };
                            requestSfx('dash_enemy');
                        }
                    }
                }

                if (orbitActive) {
                    // Spiral movement: Tangential + Radial correction
                    const angle = Math.atan2(dz, dx);
                    // Move perpendicular (Orbit) - direction per-spawn random, flipped post-lunge on stage 9+
                    const orbitDir = enemy.orbitDirection ?? 1;
                    const orbitSpeed = moveSpeed * 1.5;
                    vx += Math.cos(angle + orbitDir * Math.PI/2) * orbitSpeed;
                    vz += Math.sin(angle + orbitDir * Math.PI/2) * orbitSpeed;

                    // Move towards/away to maintain distance
                    const distError = dist - desiredDist;
                    if (Math.abs(distError) > 0.5) {
                        vx += (dx / dist) * Math.sign(distError) * moveSpeed;
                        vz += (dz / dist) * Math.sign(distError) * moveSpeed;
                    }
                }
            }
            // --- DASH PATTERN (DEFAULT) ---
            else {
                enemy.opacity = 1.0;
                if (enemy.dashTime && enemy.dashTime > 0) {
                     enemy.dashTime -= delta;
                     if (enemy.dashTime > 0.5) {
                         // Telegraph phase: freeze and paint the dash path so the
                         // player can see where the boss is about to go.
                         vx = 0; vz = 0;
                         if (enemy.dashVector && Math.random() > 0.5) {
                             for (let i = 1; i <= 4; i++) {
                                 visualEffectsRef.current.push({
                                     id: Math.random().toString(),
                                     x: enemy.x + enemy.dashVector.x * i * 1.8,
                                     z: enemy.z + enemy.dashVector.z * i * 1.8,
                                     life: 0.25,
                                     type: 'DASH_TRAIL',
                                 });
                             }
                             setRenderEffects([...visualEffectsRef.current]);
                         }
                     }
                     else {
                         const dashSpeed = 25 + (activeStage * 1.5);
                         vx = (enemy.dashVector?.x || 0) * dashSpeed; vz = (enemy.dashVector?.z || 0) * dashSpeed;
                         if (Math.random() > 0.4) {
                             visualEffectsRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, life: 0.5, type: 'DASH_TRAIL' });
                             setRenderEffects([...visualEffectsRef.current]);
                         }
                     }
                } else {
                    vx = (dx / dist) * moveSpeed * 0.3; // Slower when preparing
                    vz = (dz / dist) * moveSpeed * 0.3;
                    enemy.dashCooldown = (enemy.dashCooldown || 5.0) - delta;
                    if (enemy.dashCooldown <= 0) {
                         const distToPlayer = Math.sqrt(dx*dx + dz*dz);
                         if (distToPlayer > 6 && distToPlayer < 22) {
                             // Wall-aware dash: project the end of the dash and
                             // skip the trigger if it would end outside the arena.
                             const dashSpeed = 25 + (activeStage * 1.5);
                             const dashDuration = 0.5; // active-dash window
                             const nx = dx / distToPlayer;
                             const nz = dz / distToPlayer;
                             const endX = enemy.x + nx * dashSpeed * dashDuration;
                             const endZ = enemy.z + nz * dashSpeed * dashDuration;
                             const wallLimit = 22.0;
                             if (Math.abs(endX) < wallLimit && Math.abs(endZ) < wallLimit) {
                                 enemy.dashTime = 1.0;
                                 enemy.dashCooldown = Math.max(4.0, 9.0 - (activeStage * 0.5));
                                 enemy.dashVector = { x: nx, z: nz };
                                 requestSfx('dash_enemy');
                             } else {
                                 // Re-try sooner instead of sitting on full cooldown
                                 enemy.dashCooldown = 1.5;
                             }
                         }
                    }
                }
            }

            enemy.attackCooldown = (enemy.attackCooldown || 0) + delta;
            
            // --- ADVANCED BOSS ATTACK PATTERNS (Existing Logic) ---
            const s = activeStage;
            // Escalating pattern pool based on stage
            let patterns = [0, 1]; // Stage 1 defaults
            if (s >= 2) patterns = [0, 1, 2, 8];
            if (s >= 3) patterns = [1, 2, 3, 5, 8];
            if (s >= 4) patterns = [0, 2, 3, 4, 6, 8];
            if (s >= 5) patterns = [1, 3, 4, 5, 7, 9];
            if (s >= 7) patterns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Full rotation

            const patternSwitchTime = Math.max(3, 7 - (s * 0.4));
            const patternIdx = Math.floor(bossPhaseTimer.current / patternSwitchTime) % patterns.length;
            const currentPattern = patterns[patternIdx];

            const fireRateMult = Math.min(2.5, 1.0 + (s * 0.15));
            
            let fireRate = 1.0;
            if (currentPattern === 0) fireRate = 1.2 / fireRateMult; // Nova
            else if (currentPattern === 1) fireRate = 0.15 / fireRateMult; // Spiral
            else if (currentPattern === 2) fireRate = 0.3 / fireRateMult; // Sniper
            else if (currentPattern === 3) fireRate = 1.0 / fireRateMult; // Ring Pulse
            else if (currentPattern === 4) fireRate = 0.2 / fireRateMult; // Vortex
            else if (currentPattern === 5) fireRate = 1.0 / fireRateMult; // Sine Barrage
            else if (currentPattern === 6) fireRate = 1.5 / fireRateMult; // Cross
            else if (currentPattern === 7) fireRate = 2.0 / fireRateMult; // Homing Orbs
            else if (currentPattern === 8) fireRate = 1.0 / fireRateMult; // Wall
            else if (currentPattern === 9) fireRate = 0.8 / fireRateMult; // Screen Wave

            // Prevent attack during fadeout/fadein, but allow during telegraph (optional difficulty choice)
            if (enemy.attackCooldown > fireRate && (enemy.teleportState === 'IDLE' || enemy.teleportState === undefined)) { 
                enemy.attackCooldown = 0;
                const projVariant = 'BOSS_NORMAL'; 
                const baseDmg = enemy.damage; // Use the boss's configured damage
                const bX = enemy.x; const bZ = enemy.z;
                const pAngle = Math.atan2(dz, dx);

                if (currentPattern === 0) { 
                    const count = 8 + (activeStage * 2);
                    for(let i=0; i<count; i++) { 
                        const a = (i / count) * Math.PI * 2 + (bossPhaseTimer.current * 0.5); 
                        projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*8, vz: Math.sin(a)*8, damage: baseDmg, fromPlayer: false, color: '#aa00ff', life: 4, type: 'NORMAL', variant: projVariant }); 
                    } 
                }
                else if (currentPattern === 1) { 
                    const a = bossPhaseTimer.current * 8 + (activeStage * 0.2); 
                    projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*10, vz: Math.sin(a)*10, damage: baseDmg, fromPlayer: false, color: '#facc15', life: 5, type: 'NORMAL', variant: projVariant }); 
                }
                else if (currentPattern === 2) { 
                    const lead = 0.1;
                    const a = pAngle + (Math.random() - 0.5) * lead;
                    projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*16, vz: Math.sin(a)*16, damage: baseDmg * 1.5, fromPlayer: false, color: '#ef4444', life: 3, type: 'NORMAL', variant: projVariant }); 
                }
                else if (currentPattern === 3) { 
                    for(let i=0; i<16; i++) {
                        const a = (i/16) * Math.PI * 2;
                        projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*6, vz: Math.sin(a)*6, damage: baseDmg, fromPlayer: false, color: '#3b82f6', life: 6, type: 'NORMAL', variant: projVariant });
                    }
                }
                else if (currentPattern === 4) { 
                    const a1 = bossPhaseTimer.current * 6;
                    const a2 = -bossPhaseTimer.current * 6;
                    projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a1)*9, vz: Math.sin(a1)*9, damage: baseDmg, fromPlayer: false, color: '#10b981', life: 5, type: 'NORMAL', variant: projVariant });
                    projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a2)*9, vz: Math.sin(a2)*9, damage: baseDmg, fromPlayer: false, color: '#34d399', life: 5, type: 'NORMAL', variant: projVariant });
                }
                else if (currentPattern === 5) { 
                    for(let i=-1; i<=1; i++) {
                        const a = pAngle + (i * 0.4);
                        const speed = 11;
                        projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*speed, vz: Math.sin(a)*speed, damage: baseDmg, fromPlayer: false, color: '#6366f1', life: 5, type: 'NORMAL', variant: projVariant });
                    }
                }
                else if (currentPattern === 6) { 
                    const isPlus = Math.floor(bossPhaseTimer.current * 2) % 2 === 0;
                    const startA = isPlus ? 0 : Math.PI/4;
                    for(let i=0; i<4; i++) {
                        const a = startA + (i * Math.PI/2);
                        projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*12, vz: Math.sin(a)*12, damage: baseDmg * 2, fromPlayer: false, color: '#f8fafc', life: 5, type: 'NORMAL', variant: projVariant });
                    }
                }
                else if (currentPattern === 7) { 
                    const a = Math.random() * Math.PI * 2;
                    projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*4, vz: Math.sin(a)*4, damage: baseDmg * 0.8, fromPlayer: false, color: '#a855f7', life: 8, type: 'HOMING', variant: projVariant });
                }
                else if (currentPattern === 8) { 
                    const a = pAngle; const perp = a + Math.PI/2;
                    for(let i=-2; i<=2; i++) {
                        projectilesRef.current.push({ id: Math.random().toString(), x: bX + Math.cos(perp)*i*2, z: bZ + Math.sin(perp)*i*2, vx: Math.cos(a)*8, vz: Math.sin(a)*8, damage: baseDmg, fromPlayer: false, color: '#22c55e', life: 4, type: 'NORMAL', variant: projVariant });
                    }
                }
                else if (currentPattern === 9) { 
                    for(let i=0; i<3; i++) {
                            const a = Math.random() * Math.PI * 2;
                            projectilesRef.current.push({ id: Math.random().toString(), x: bX, z: bZ, vx: Math.cos(a)*14, vz: Math.sin(a)*14, damage: baseDmg, fromPlayer: false, color: '#fbbf24', life: 5, type: 'NORMAL', variant: projVariant });
                    }
                }
                
                projectilesChanged = true;
            }
        }
        else if ((enemy.type as string) === 'MISINFORMATION') {
            // MISINFORMATION ENEMY - dash + ranged attacks
            if (enemy.dashTime && enemy.dashTime > 0) {
                enemy.dashTime -= delta;
                if (enemy.dashTime > 0.3) { vx = 0; vz = 0; }
                else {
                    const dashSpeed = 20;
                    vx = (enemy.dashVector?.x || 0) * dashSpeed;
                    vz = (enemy.dashVector?.z || 0) * dashSpeed;
                    if (Math.random() > 0.4) {
                        visualEffectsRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, life: 0.5, type: 'DASH_TRAIL' });
                        setRenderEffects([...visualEffectsRef.current]);
                    }
                }
            } else {
                vx = (dx / dist) * moveSpeed * 0.4;
                vz = (dz / dist) * moveSpeed * 0.4;
                enemy.dashCooldown = (enemy.dashCooldown || 3.0) - delta;
                if (enemy.dashCooldown <= 0) {
                    const distToPlayer = Math.sqrt(dx*dx + dz*dz);
                    if (distToPlayer > 5 && distToPlayer < 20) {
                        enemy.dashTime = 0.7;
                        enemy.dashCooldown = 3.5;
                        enemy.dashVector = { x: dx/distToPlayer, z: dz/distToPlayer };
                        requestSfx('dash_enemy');
                    }
                }
            }

            // Ranged attack
            enemy.attackCooldown = (enemy.attackCooldown || 0) + delta;
            if (dist < 12 && dist > 2 && enemy.attackCooldown > 1.5) {
                const projectileBalance = getNormalMobProjectileBalance(activeStage);
                const activeHostileProjectiles = countHostileProjectiles();
                const remainingProjectileBudget = projectileBalance.hardProjectileCap - activeHostileProjectiles;

                if (remainingProjectileBudget >= 3) {
                    const a = Math.atan2(dz, dx);
                    const dmg = enemy.damage;

                    // Triple spread of "fake news" projectiles. If the full pattern
                    // does not fit the hostile projectile budget, hold fire and retry.
                    for (const offset of [-1, 0, 1]) {
                        const spreadA = a + (offset * 0.25);
                        projectilesRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, vx: Math.cos(spreadA)*7, vz: Math.sin(spreadA)*7, damage: dmg, fromPlayer: false, color: '#dc2626', life: 3, type: 'NORMAL', variant: 'ENEMY_NORMAL' });
                    }

                    projectilesChanged = true;
                    enemy.attackCooldown = 0;
                } else {
                    enemy.attackCooldown = 1.0;
                }
            }
        }
        else {
            // NORMAL ENEMY MOVEMENT
            vx = (dx / dist) * moveSpeed;
            vz = (dz / dist) * moveSpeed;

            if (enemy.attackRange > 1) {
                 enemy.attackCooldown = (enemy.attackCooldown || 0) + delta;
                 if (dist < enemy.attackRange && dist > 3) {
                     vx = 0; vz = 0;
                     const projectileBalance = getNormalMobProjectileBalance(activeStage);
                     if (enemy.attackCooldown > projectileBalance.attackCooldown) { 
                         const activeHostileProjectiles = countHostileProjectiles();
                         const remainingProjectileBudget = projectileBalance.hardProjectileCap - activeHostileProjectiles;
                         const holdFire = () => {
                             enemy.attackCooldown = projectileBalance.attackCooldown * (0.75 + Math.random() * 0.15);
                         };

                         if (remainingProjectileBudget <= 0) {
                             holdFire();
                         } else {
                             // SCALED ENEMY PROJECTILE PATTERNS
                             const a = Math.atan2(dz, dx);
                             const dmg = (15 + activeStage * 2);
                             const roll = Math.random();
                             let selectedPattern: 'NOVA' | 'BURST' | 'SPREAD' | 'SINGLE' = 'SINGLE';
                             let projectileCost = 1;

                             if (activeStage >= 8 && roll > projectileBalance.novaThreshold) {
                                 selectedPattern = 'NOVA';
                                 projectileCost = 8;
                             } else if (activeStage >= 5 && roll > projectileBalance.burstThreshold) {
                                 selectedPattern = 'BURST';
                                 projectileCost = 3;
                             } else if (activeStage >= 3 && roll > projectileBalance.spreadThreshold) {
                                 selectedPattern = 'SPREAD';
                                 projectileCost = 3;
                             }

                             if (remainingProjectileBudget < projectileCost) {
                                 holdFire();
                             } else if (selectedPattern === 'NOVA') {
                                 // Nova (8-way)
                                 const count = 8;
                                 for(let i=0; i<count; i++) {
                                     const na = (i / count) * Math.PI * 2;
                                     projectilesRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, vx: Math.cos(na)*6, vz: Math.sin(na)*6, damage: dmg * 0.8, fromPlayer: false, color: '#f87171', life: 5, type: 'NORMAL', variant: 'ENEMY_NORMAL' });
                                 }
                                 projectilesChanged = true;
                                 enemy.attackCooldown = 0;
                             } else if (selectedPattern === 'BURST') {
                                 // Rapid Burst (3 fast shots)
                                 projectilesRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, vx: Math.cos(a)*10, vz: Math.sin(a)*10, damage: dmg * 0.7, fromPlayer: false, color: '#facc15', life: 5, type: 'NORMAL', variant: 'ENEMY_NORMAL' });
                                 projectilesRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, vx: Math.cos(a)*8, vz: Math.sin(a)*8, damage: dmg * 0.7, fromPlayer: false, color: '#facc15', life: 5, type: 'NORMAL', variant: 'ENEMY_NORMAL' });
                                 projectilesRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, vx: Math.cos(a)*6, vz: Math.sin(a)*6, damage: dmg * 0.7, fromPlayer: false, color: '#facc15', life: 5, type: 'NORMAL', variant: 'ENEMY_NORMAL' });
                                 projectilesChanged = true;
                                 enemy.attackCooldown = 0;
                             } else if (selectedPattern === 'SPREAD') {
                                 // Triple Spread
                                 for(let i=-1; i<=1; i++) {
                                     const spreadA = a + (i * 0.3);
                                     projectilesRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, vx: Math.cos(spreadA)*7, vz: Math.sin(spreadA)*7, damage: dmg, fromPlayer: false, color: '#a3e635', life: 5, type: 'NORMAL', variant: 'ENEMY_NORMAL' });
                                 }
                                 projectilesChanged = true;
                                 enemy.attackCooldown = 0;
                             } else {
                                 // Standard Single Shot
                                 projectilesRef.current.push({ id: Math.random().toString(), x: enemy.x, z: enemy.z, vx: Math.cos(a)*7, vz: Math.sin(a)*7, damage: dmg, fromPlayer: false, color: 'red', life: 5, type: 'NORMAL', variant: 'ENEMY_NORMAL' });
                                 projectilesChanged = true;
                                 enemy.attackCooldown = 0;
                             }
                         }
                     }
                 }
            }
        }

        // Add Knockback Vector
        vx += enemy.knockbackX;
        vz += enemy.knockbackZ;

        enemy.x += vx * delta; enemy.z += vz * delta;
        if (vx > 0.05) enemy.facing = 1; if (vx < -0.05) enemy.facing = -1;
        
        // Fix: TypeScript narrowing issue causing 'BOSS' comparison error by casting to string once
        const eType = enemy.type as string;
        const collisionRadius = eType === 'BOSS' || isLargeEnemyType(eType) ? 2.0 : 0.8;
        if (dist < collisionRadius && (eType !== 'BOSS' || (enemy.teleportState === 'IDLE' || enemy.teleportState === undefined))) {
             takeDamage(eType === 'BOSS' ? 1.0 : 0.5);
        }
        
        const limit = 24.5;
        if (enemy.x > limit) enemy.x = limit; if (enemy.x < -limit) enemy.x = -limit;
        if (enemy.z > limit) enemy.z = limit; if (enemy.z < -limit) enemy.z = -limit;
        if (enemy.hp > 0) aliveEnemies.push(enemy);
    });

    if (aliveEnemies.length !== enemiesRef.current.length) enemiesChanged = true;
    enemiesRef.current = aliveEnemies;

    const { projectileCount, damage: dmgMod, area: areaMod, cooldown: cdMod } = playerStats.modifiers;
    const weapons = playerStats.unlockedWeapons;

    const spawnWeapon = (weaponId: string, timerKey: keyof typeof weaponTimers.current, cooldownBase: number, action: () => void) => {
        const lvl = weapons[weaponId] || 0;
        if (lvl > 0) {
            const cd = Math.max(0.1, (cooldownBase - (lvl * 0.1)) * cdMod);
            weaponTimers.current[timerKey] += delta;
            if (weaponTimers.current[timerKey] > cd) { action(); weaponTimers.current[timerKey] = 0; }
        }
    };

    spawnWeapon('MAGIC_MISSILE', 'magicMissile', 0.8, () => {
        const target = findClosestEnemy(playerPosition);
        if (target) {
            const count = Math.min(10, Math.ceil(weapons['MAGIC_MISSILE'] / 1.5) + projectileCount);
            for(let i=0; i<count; i++) spawnProjectile(playerPosition, target, 'MAGIC_MISSILE', (i - (count-1)/2) * 0.2);
            projectilesChanged = true;
        }
    });

    spawnWeapon('AXE', 'axe', 1.2, () => { if (enemiesRef.current.length > 0) { const count = 1 + projectileCount + Math.floor(weapons['AXE'] / 3); for (let i = 0; i < count; i++) spawnProjectile(playerPosition, enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)], 'AXE', (i*0.5)); projectilesChanged = true; }});
    spawnWeapon('DAGGER', 'dagger', 0.5, () => { const count = 1 + projectileCount + Math.floor(weapons['DAGGER'] / 2); const target = findClosestEnemy(playerPosition); if (target) { for(let i=0; i<count; i++) spawnProjectile(playerPosition, target, 'DAGGER', (i - (count-1)/2) * 0.15); projectilesChanged = true; }});
    spawnWeapon('CROSS', 'cross', 1.5, () => { const target = findClosestEnemy(playerPosition) || enemiesRef.current[0]; if (target) { const count = 1 + projectileCount; for (let i=0; i<count; i++) spawnProjectile(playerPosition, target, 'CROSS', (i * 0.4)); projectilesChanged = true; }});
    
    spawnWeapon('MAGIC_ARROW', 'magicArrow', 1.0, () => { 
        const count = 1 + projectileCount;
        const targetIds: string[] = [];
        for (let i = 0; i < count; i++) {
            let t = findClosestEnemy(playerPosition, targetIds);
            let offset = 0;
            if (t) {
                targetIds.push(t.id);
            } else if (targetIds.length > 0) {
                t = enemiesRef.current.find(en => en.id === targetIds[0]);
                offset = (i - count / 2) * 0.8; 
            } else {
                t = { x: playerPosition.x + 10, z: playerPosition.z } as any;
                offset = (i - count / 2) * 0.8;
            }
            if (t) spawnProjectile(playerPosition, t, 'MAGIC_ARROW', offset);
        }
        projectilesChanged = true; 
    });

    spawnWeapon('FLAMETHROWER', 'flamethrower', 0.2, () => {
         const count = 2 + projectileCount;
         const enemy = findClosestEnemy(playerPosition);
         const target = enemy ? enemy : { x: playerPosition.x + lastPlayerFacing.current.x * 5, z: playerPosition.z + lastPlayerFacing.current.z * 5 } as any;
         for(let i=0; i<count; i++) spawnProjectile(playerPosition, target, 'FLAMETHROWER', (Math.random()-0.5) * 0.5);
         projectilesChanged = true;
    });

    spawnWeapon('FIRE_MORTAR', 'fireMortar', 2.0, () => { 
        const lvl = weapons['FIRE_MORTAR'] || 1;
        const count = 1 + projectileCount + Math.floor(lvl / 2);
        const sortedEnemies = [...enemiesRef.current].sort((a,b) => {
            const da = (a.x - playerPosition.x)**2 + (a.z - playerPosition.z)**2;
            const db = (b.x - playerPosition.x)**2 + (b.z - playerPosition.z)**2;
            return da - db;
        });

        for (let i=0; i<count; i++) { 
            let t = sortedEnemies[i % sortedEnemies.length];
            if (!t) {
                t = { x: playerPosition.x + (Math.random()-0.5)*15, z: playerPosition.z + (Math.random()-0.5)*15 } as any; 
            }
            spawnProjectile(playerPosition, t, 'FIRE_MORTAR', (Math.random()-0.5)*0.2); 
        } 
        projectilesChanged = true; 
    });

    spawnWeapon('SPEAR', 'spear', 1.5, () => {
        const count = 1 + Math.floor(projectileCount / 2);
        const closest = findClosestEnemy(playerPosition);
        const target = closest || { x: playerPosition.x + lastPlayerFacing.current.x * 5, z: playerPosition.z + lastPlayerFacing.current.z * 5 } as any;
        for (let i=0; i<count; i++) {
            const angleOffset = (i - (count-1)/2) * 0.3;
            spawnProjectile(playerPosition, target, 'SPEAR', angleOffset);
        }
        projectilesChanged = true;
    });

    spawnWeapon('SLIME_BALL', 'slimeBall', 1.5, () => {
        const count = 1 + projectileCount;
        const targetIds: string[] = [];
        for (let i = 0; i < count; i++) {
            let t = findClosestEnemy(playerPosition, targetIds);
            let offset = 0;
            if (t) {
                targetIds.push(t.id);
            } else if (targetIds.length > 0) {
                t = enemiesRef.current.find(en => en.id === targetIds[0]);
                offset = (i - count / 2) * 1.2; 
            } else {
                const angle = Math.random() * Math.PI * 2;
                t = { x: playerPosition.x + Math.cos(angle)*5, z: playerPosition.z + Math.sin(angle)*5 } as any;
                offset = (i - count / 2) * 1.2;
            }
            if (t) spawnProjectile(playerPosition, t, 'SLIME_BALL', offset);
        }
        projectilesChanged = true;
    });

    spawnWeapon('SHURIKEN', 'shuriken', 1.2, () => {
        const count = 2 + projectileCount;
        for(let i=0; i<count; i++) {
             const t = enemiesRef.current.length > 0
                ? enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)]
                : { x: playerPosition.x + (Math.random()-0.5)*10, z: playerPosition.z + (Math.random()-0.5)*10 } as any;
             spawnProjectile(playerPosition, t, 'SHURIKEN', (Math.random()-0.5)*0.2);
        }
        projectilesChanged = true;
    });

    spawnWeapon('KATANA', 'katana', 1.0, () => {
        const count = 1 + projectileCount;
        const closest = findClosestEnemy(playerPosition);
        const target = closest || { x: playerPosition.x + lastPlayerFacing.current.x * 5, z: playerPosition.z + lastPlayerFacing.current.z * 5 };
        for (let i=0; i<count; i++) {
            const angleOffset = (i - (count-1)/2) * 0.5;
            spawnProjectile(playerPosition, target as any, 'KATANA', angleOffset);
        }
        projectilesChanged = true;
    });

    spawnWeapon('TOXIN_GUN', 'toxinGun', 0.4, () => { const count = 1 + projectileCount; const target = findClosestEnemy(playerPosition); if (target) { for(let i=0; i<count; i++) spawnProjectile(playerPosition, target, 'TOXIN_GUN', (i - (count-1)/2) * 0.1); projectilesChanged = true; } });
    spawnWeapon('TOXIC_FLASK', 'toxicFlask', 2.5, () => { 
        const lvl = weapons['TOXIC_FLASK'] || 1;
        const count = 1 + projectileCount + Math.floor(lvl / 2);
        const sortedEnemies = [...enemiesRef.current].sort((a,b) => {
            const da = (a.x - playerPosition.x)**2 + (a.z - playerPosition.z)**2;
            const db = (b.x - playerPosition.x)**2 + (b.z - playerPosition.z)**2;
            return da - db;
        });

        for(let i=0; i<count; i++) { 
            let t = sortedEnemies[i % sortedEnemies.length];
            if (!t) {
                t = { x: playerPosition.x + (Math.random()-0.5)*15, z: playerPosition.z + (Math.random()-0.5)*15 } as any; 
            }
            spawnProjectile(playerPosition, t, 'TOXIC_FLASK', (Math.random()-0.5)*0.2); 
        } 
        projectilesChanged = true; 
    });

    spawnWeapon('JAVELIN', 'javelin', 1.8, () => { 
        const level = weapons['JAVELIN'] || 1;
        const count = 1 + projectileCount + (level - 1); 
        const targetIds: string[] = [];
        for (let i = 0; i < count; i++) {
            let t = findClosestEnemy(playerPosition, targetIds);
            let offset = 0;
            if (t) {
                targetIds.push(t.id);
            } else if (targetIds.length > 0) {
                t = enemiesRef.current.find(en => en.id === targetIds[0]);
                offset = (i - count / 2) * 0.6;
            } else {
                t = { x: playerPosition.x + 10, z: playerPosition.z } as any;
                offset = (i - count / 2) * 0.6;
            }
            if (t) spawnProjectile(playerPosition, t, 'JAVELIN', offset, { turnsLeft: level });
        }
        projectilesChanged = true; 
    });

    spawnWeapon('CHAIN_LIGHTNING', 'chainLightning', 2.0, () => {
        if (enemiesRef.current.length === 0) return;
        const count = 1 + projectileCount;
        const maxChains = 3 + (weapons['CHAIN_LIGHTNING'] || 1);
        const dmg = (15 + (weapons['CHAIN_LIGHTNING'] * 5)) * dmgMod;
        const baseKB = WEAPONS_DATA['CHAIN_LIGHTNING'].knockback;
        const hitIds = new Set<string>();
        for (let i = 0; i < count; i++) {
            let currentTarget = findClosestEnemy(playerPosition, Array.from(hitIds));
            if (!currentTarget) {
                 currentTarget = enemiesRef.current.length > 0 ? enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)] : null;
            }
            if (!currentTarget) break;
            const lightningPath = [{x: playerPosition.x, z: playerPosition.z}];
            damageEnemy(currentTarget, dmg, baseKB, playerPosition.x, playerPosition.z, time);
            hitIds.add(currentTarget.id);
            lightningPath.push({x: currentTarget.x, z: currentTarget.z});
            let prevEnemy = currentTarget;
            for (let c = 0; c < maxChains; c++) {
                const nextTarget = findClosestEnemy(new THREE.Vector3(prevEnemy.x, 0, prevEnemy.z), Array.from(hitIds));
                if (nextTarget) {
                    damageEnemy(nextTarget, dmg * 0.8, baseKB * 0.5, prevEnemy.x, prevEnemy.z, time);
                    hitIds.add(nextTarget.id);
                    lightningPath.push({x: nextTarget.x, z: nextTarget.z});
                    prevEnemy = nextTarget;
                } else {
                    break;
                }
            }
            visualEffectsRef.current.push({
                id: Math.random().toString(),
                x: 0, z: 0, 
                life: 0.35, 
                initialLife: 0.35,
                type: 'CHAIN_LIGHTNING',
                path: lightningPath
            });
        }
        setRenderEffects([...visualEffectsRef.current]);
    });

    spawnWeapon('HOLY_BEAM', 'holyBeam', 5.0, () => { 
        const maxBeams = 2 + Math.floor(projectileCount / 2); 
        if (enemiesRef.current.length > 0) {
            const targets = [...enemiesRef.current].sort(() => 0.5 - Math.random());
            const count = Math.min(maxBeams, targets.length);
            for(let i=0; i<count; i++) { 
                spawnProjectile(playerPosition, targets[i], 'HOLY_BEAM', 0); 
            }
        } else {
            for(let i=0; i<maxBeams; i++) { 
                const t = { x: playerPosition.x + (Math.random()-0.5)*12, z: playerPosition.z + (Math.random()-0.5)*12 } as any; 
                spawnProjectile(playerPosition, t, 'HOLY_BEAM', 0); 
            }
        }
        projectilesChanged = true; 
    });
    spawnWeapon('PLAGUE_SPREADER', 'plagueSpreader', 0.5, () => { spawnProjectile(playerPosition, { x: playerPosition.x, z: playerPosition.z } as any, 'PLAGUE_SPREADER', 0); projectilesChanged = true; });

    if ((weapons['FIRE_AURA'] || 0) > 0) { 
        weaponTimers.current.aura += delta; 
        if (weaponTimers.current.aura > 0.5 * cdMod) { 
            const radius = (3.5 + (weapons['FIRE_AURA'] * 0.5)) * areaMod; 
            const dmg = ((playerStats.attackPower * 0.6) + (weapons['FIRE_AURA'] * 2)) * dmgMod; 
            const baseKB = WEAPONS_DATA['FIRE_AURA'].knockback;
            enemiesRef.current.forEach(e => { 
                if (Math.sqrt((e.x-playerPosition.x)**2+(e.z-playerPosition.z)**2) < radius) {
                    damageEnemy(e, dmg, baseKB, playerPosition.x, playerPosition.z, time); 
                }
            }); 
            weaponTimers.current.aura = 0; 
        } 
    }
    
    if ((weapons['TESLA_COIL'] || 0) > 0) {
        weaponTimers.current.teslaCoil += delta;
        if (weaponTimers.current.teslaCoil > 0.5 * cdMod) {
            const radius = (4.5 + (weapons['TESLA_COIL'] * 0.6)) * areaMod;
            const dmg = ((playerStats.attackPower * 0.4) + (weapons['TESLA_COIL'] * 1.5)) * dmgMod;
            const baseKB = WEAPONS_DATA['TESLA_COIL'].knockback;
            const hitTargets: Enemy[] = [];
            enemiesRef.current.forEach(e => {
                const dx = e.x - playerPosition.x;
                const dz = e.z - playerPosition.z;
                const distSq = dx*dx + dz*dz;
                if (distSq < radius * radius) {
                    damageEnemy(e, dmg, baseKB, playerPosition.x, playerPosition.z, time);
                    hitTargets.push(e);
                }
            });
            if (hitTargets.length > 0) {
                hitTargets.sort((a, b) => {
                    const da = (a.x-playerPosition.x)**2 + (a.z-playerPosition.z)**2;
                    const db = (b.x-playerPosition.x)**2 + (b.z-playerPosition.z)**2;
                    return db - da;
                });
                const maxVisualZaps = Math.min(2, hitTargets.length);
                for (let i = 0; i < maxVisualZaps; i++) {
                    const e = hitTargets[i];
                    visualEffectsRef.current.push({
                        id: `tesla_${Math.random()}`,
                        x: 0, z: 0,
                        life: 0.45,
                        initialLife: 0.45,
                        type: 'CHAIN_LIGHTNING',
                        path: [{x: playerPosition.x, z: playerPosition.z}, {x: e.x, z: e.z}]
                    });
                }
                setRenderEffects([...visualEffectsRef.current]);
            }
            weaponTimers.current.teslaCoil = 0;
        }
    }

    if ((weapons['THUNDER'] || 0) > 0) { 
        weaponTimers.current.thunder += delta; 
        if (weaponTimers.current.thunder > Math.max(0.5, (3.5 - (weapons['THUNDER'] * 0.4)) * cdMod) && enemiesRef.current.length > 0) { 
            const target = enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)]; 
            const dmg = ((playerStats.attackPower * 5) + (weapons['THUNDER'] * 10)) * dmgMod; 
            damageEnemy(target, dmg, WEAPONS_DATA['THUNDER'].knockback, playerPosition.x, playerPosition.z, time); 
            visualEffectsRef.current.push({ 
                id: Math.random().toString(), 
                x: target.x, 
                z: target.z, 
                life: 0.3, 
                initialLife: 0.3, 
                type: 'THUNDER', 
                path: [{x: target.x, y: 12, z: target.z}, {x: target.x, y: 0, z: target.z}] 
            }); 
            setRenderEffects([...visualEffectsRef.current]); 
            weaponTimers.current.thunder = 0; 
        } 
    }

    const orbitalLevel = weapons['ORBITAL'] || 0;
    const bibleLevel = weapons['BIBLE'] || 0;
    const desiredOrbitals = orbitalLevel > 0 ? (2 + Math.floor(orbitalLevel/2) + projectileCount) : 0;
    const currentOrbitals = projectilesRef.current.filter(p => p.type === 'ORBITAL' && p.variant !== 'BIBLE').length;
    if (currentOrbitals < desiredOrbitals) { projectilesRef.current.push({ id: Math.random().toString(), x: playerPosition.x, z: playerPosition.z, vx: 0, vz: 0, damage: (10 + (orbitalLevel * 5)) * dmgMod, fromPlayer: true, color: '#00ffff', life: 9999, type: 'ORBITAL', orbitAngle: (currentOrbitals / desiredOrbitals) * Math.PI * 2, knockbackValue: WEAPONS_DATA['ORBITAL'].knockback }); projectilesChanged = true; }
    const desiredBibles = bibleLevel > 0 ? (1 + Math.floor(bibleLevel/2) + projectileCount) : 0;
    const currentBibles = projectilesRef.current.filter(p => isVariant(p, 'BIBLE')).length;
    if (currentBibles < desiredBibles) { projectilesRef.current.push({ id: Math.random().toString(), x: playerPosition.x, z: playerPosition.z, vx: 0, vz: 0, damage: (15 + (bibleLevel * 6)) * dmgMod, fromPlayer: true, color: '#fcd34d', life: 9999, type: 'ORBITAL', variant: 'BIBLE', orbitAngle: (currentBibles / desiredBibles) * Math.PI * 2, knockbackValue: WEAPONS_DATA['BIBLE'].knockback }); projectilesChanged = true; }

    const activeProjectiles: Projectile[] = [];
    projectilesRef.current.forEach(p => {
        let keep = true;
        
        if (p.type === 'ORBITAL') {
            if (p.variant === 'BIBLE') {
                if (!weapons['BIBLE']) keep = false;
            } else {
                if (!weapons['ORBITAL']) keep = false;
            }
        }

        if (p.type === 'ORBITAL' && p.orbitAngle !== undefined) { const speed = isVariant(p, 'BIBLE') ? 3 : 2; p.orbitAngle += delta * (speed + (orbitalLevel * 0.5)); const radius = (isVariant(p, 'BIBLE') ? 3.5 : 2.5) * areaMod; p.x = playerPosition.x + Math.cos(p.orbitAngle) * radius; p.z = playerPosition.z + Math.sin(p.orbitAngle) * radius; } 
        else if (isVariant(p, 'CROSS')) { const age = 3 - p.life; if (age > 0.6) { const dx = playerPosition.x - p.x; const dz = playerPosition.z - p.z; const dist = Math.sqrt(dx*dx + dz*dz); p.vx += (dx/dist) * 30 * delta; p.vz += (dz/dist) * 30 * delta; } p.x += p.vx * delta; p.z += p.vz * delta; p.life -= delta; } 
        else if (isVariant(p, 'FIRE_MORTAR') || isVariant(p, 'TOXIC_FLASK')) { 
            p.x += p.vx * delta; p.z += p.vz * delta; p.life -= delta; 
            if (p.life <= 0) { 
                const lvl = weapons[p.variant as string] || 1; 
                const poolLife = 3.0 + (lvl * 0.5); 
                const poolVariant = isVariant(p, 'TOXIC_FLASK') ? 'POISON_CLOUD' : 'LAVA_POOL'; 
                const poolColor = isVariant(p, 'TOXIC_FLASK') ? '#84cc16' : '#ff4400'; 
                const damageTick = isVariant(p, 'TOXIC_FLASK') ? p.damage * 0.2 : p.damage * 0.5; 
                
                // Explode and create pool
                activeProjectiles.push({ id: Math.random().toString(), x: p.x, z: p.z, vx: 0, vz: 0, damage: damageTick, fromPlayer: true, color: poolColor, life: poolLife, type: 'STATIONARY', variant: poolVariant, knockbackValue: 0 }); 
                
                for(const e of enemiesRef.current) { 
                    if ((e.x-p.x)**2 + (e.z-p.z)**2 < 4.0) { 
                        // Use ?? to ensure 0 is respected if passed (which it should be from constants)
                        damageEnemy(e, p.damage, p.knockbackValue ?? 3.0, p.x, p.z, time); 
                    } 
                } 
                projectilesChanged = true; 
            } 
        } 
        else if (isVariant(p, 'LAVA_POOL') || isVariant(p, 'POISON_CLOUD') || isVariant(p, 'HOLY_BEAM') || isVariant(p, 'PLAGUE_SPREADER')) { 
            p.life -= delta; 
            const radius = isVariant(p, 'HOLY_BEAM') ? 2.0 : 2.5 * areaMod; 
            if (enemiesRef.current.length > 0) { 
                enemiesRef.current.forEach(e => { 
                    const d = (e.x-p.x)**2 + (e.z-p.z)**2; 
                    if (d < radius * radius) { 
                        if (time - (e.lastHit || 0) > 0.2) { 
                            // Beam pushes away from center of beam
                            damageEnemy(e, p.damage, p.knockbackValue || 0, p.x, p.z, time); 
                        } 
                    } 
                }); 
            } 
        } 
        else { if (p.type === 'HOMING' && enemiesRef.current.length > 0) { let closest = null; let minDist = 10000; for(const e of enemiesRef.current) { const d = (e.x-p.x)**2+(e.z-p.z)**2; if(d<minDist){ minDist=d; closest=e; } } if (closest) { const dx = closest.x - p.x; const dz = closest.z - p.z; const dist = Math.sqrt(dx*dx + dz*dz); if (dist > 0.1) { const steer = 0.15; const sp = 18; p.vx = (p.vx * (1 - steer)) + ((dx/dist) * sp * steer); p.vz = (p.vz * (1 - steer)) + ((dz/dist) * sp * steer); } } } p.x += p.vx * delta; p.z += p.vz * delta; p.life -= delta; }
        if (isVariant(p, 'SLIME_BALL')) {
             const limit = 24.0; 
             if (p.x > limit || p.x < -limit) { p.vx = -p.vx; p.x = Math.sign(p.x) * limit; }
             if (p.z > limit || p.z < -limit) { p.vz = -p.vz; p.z = Math.sign(p.z) * limit; }
        }
        
        if (p.life <= 0) keep = false;
        
        if (keep) {
             let hit = false;
             if (p.fromPlayer) {
                 if (isVariant(p, 'LAVA_POOL') || isVariant(p, 'POISON_CLOUD') || isVariant(p, 'FIRE_MORTAR') || isVariant(p, 'TOXIC_FLASK') || isVariant(p, 'HOLY_BEAM') || isVariant(p, 'PLAGUE_SPREADER')) { hit = false; } 
                 else if (isVariant(p, 'KATANA') || p.type === 'MELEE') {
                     for(const e of enemiesRef.current) { 
                         if ((e.x-p.x)**2 + (e.z-p.z)**2 < 5.0) { 
                             if (time - (e.lastHit || 0) > 0.2) {
                                // Melee knockback comes from player position
                                damageEnemy(e, p.damage, p.knockbackValue || 4.0, playerPosition.x, playerPosition.z, time); 
                             }
                         } 
                     }
                     hit = false; 
                 } else {
                     for(const e of enemiesRef.current) {
                         const targetType = e.type as string;
                         // Check boss opacity/teleport state for hit validation
                         if (targetType === 'BOSS' && e.opacity !== undefined && e.opacity < 0.5) continue;

                         if ((e.x-p.x)**2 + (e.z-p.z)**2 < (targetType === 'BOSS' || isLargeEnemyType(targetType) ? 2.5 : 1.2)) { 
                             if (isVariant(p, 'SLIME_BALL')) {
                                 if ((p.bouncesLeft || 0) > 0) {
                                     // Projectile knockback comes from projectile position
                                     damageEnemy(e, p.damage, p.knockbackValue || 1.5, p.x, p.z, time);
                                     p.bouncesLeft!--;
                                     const dx = p.x - e.x; const dz = p.z - e.z;
                                     const len = Math.sqrt(dx*dx + dz*dz) || 1;
                                     const nx = dx/len; const nz = dz/len;
                                     const dot = p.vx * nx + p.vz * nz;
                                     p.vx = p.vx - 2 * dot * nx;
                                     p.vz = p.vz - 2 * dot * nz;
                                     p.x += nx * 0.5; p.z += nz * 0.5;
                                     hit = false; 
                                 } else {
                                     hit = true; damageEnemy(e, p.damage, p.knockbackValue || 1.5, p.x, p.z, time);
                                 }
                             }
                             else if (isVariant(p, 'JAVELIN')) {
                                 if (!p.hitList) p.hitList = [];
                                 if (p.hitList.includes(e.id)) continue; 
                                 damageEnemy(e, p.damage, p.knockbackValue || 1.0, p.x, p.z, time);
                                 p.hitList.push(e.id);
                                 if ((p.turnsLeft || 0) > 0) {
                                     p.turnsLeft = (p.turnsLeft || 0) - 1;
                                     const next = findClosestEnemy(new THREE.Vector3(p.x, 0, p.z), p.hitList);
                                     if (next) {
                                         const dx = next.x - p.x; const dz = next.z - p.z;
                                         const dist = Math.sqrt(dx*dx + dz*dz);
                                         if (dist > 0.1) {
                                             const speed = Math.sqrt(p.vx*p.vx + p.vz*p.vz);
                                             p.vx = (dx/dist) * speed; p.vz = (dz/dist) * speed;
                                             p.life = Math.max(p.life, 1.5);
                                         }
                                     }
                                     break; 
                                 }
                                 hit = true;
                             }
                             else {
                                 const pVar = p.variant as string;
                                 const piercing = p.type === 'ORBITAL' || pVar === 'CROSS' || pVar === 'JAVELIN' || pVar === 'SHURIKEN' || pVar === 'SPEAR' || pVar === 'BIBLE';
                                 if (hit && !piercing) break;
                                 if (!piercing) hit = true;
                                 else {
                                     const last = p.enemyHitTimes?.[e.id] ?? -Infinity;
                                     if (time - last < 0.2) continue;
                                     (p.enemyHitTimes ??= {})[e.id] = time;
                                 }

                                 // Determine source for knockback:
                                 // Orbitals/Bible push away from Player center
                                 const isOrbital = p.type === 'ORBITAL' || pVar === 'BIBLE' || pVar === 'ORBITAL';
                                 const kbSourceX = isOrbital ? playerPosition.x : p.x;
                                 const kbSourceZ = isOrbital ? playerPosition.z : p.z;

                                 damageEnemy(e, p.damage, p.knockbackValue || 1.0, kbSourceX, kbSourceZ, time);
                             }
                         }
                     }
                 }
             } else {
                 if (((playerPosition.x - p.x)**2 + (playerPosition.z - p.z)**2) < 0.4) { hit = true; takeDamage(p.damage); }
             }
             const pVar = p.variant as string;
             const piercing = p.type === 'ORBITAL' || pVar === 'CROSS' || pVar === 'JAVELIN' || pVar === 'SHURIKEN' || pVar === 'SPEAR' || pVar === 'BIBLE';
             if (hit && !piercing) keep = false;
        }
        if (keep) activeProjectiles.push(p);
    });

    projectilesRef.current = activeProjectiles;
    updateVisuals(false);
    if (enemiesChanged) { enemiesRef.current = enemiesRef.current.filter(e => e.hp > -0.5); setRenderEnemies([...enemiesRef.current]); }

    if (hitPulseCountRef.current > 0) {
        const n = hitPulseCountRef.current;
        const vol = Math.min(0.6, 0.18 + 0.14 * Math.log2(1 + n));
        requestSfx('hit_enemy', { volume: vol });
        hitPulseCountRef.current = 0;
        hitPulseDamageRef.current = 0;
    }
  });

  return (
    <group>
      <PixelGround width={50} height={50} themeId={themeId} mode="BATTLE" aiConfig={aiConfig} />
      {renderEnemies.map(e => {
          // Fix: TypeScript narrowing issue causing 'BOSS' comparison error by casting to string
          const eType = e.type as string;
          if (eType === 'BOSS') {
              const stageNum = ((activeStage - 1) % 10) + 1;
              const bossUrl = ASSET_PATHS.images.bosses.byStage(stageNum);
              return (
                  <Suspense fallback={null} key={e.id}>
                      <ExternalBossSprite position={[e.x, 0, e.z]} entity={e} scale={5.5} opacity={e.opacity} textureUrl={bossUrl} />
                  </Suspense>
              );
          }
          return <SpriteBillboard key={e.id} color={getEnemyColor(e.type, activeStage)} scale={eType === 'BOSS' ? 4.5 : eType === 'MISINFORMATION' ? 4.0 : 1.8} entity={e} type={e.type} variant={e.visualVariant || e.name} />;
      })}
      <ProjectilesInstanced projectilesRef={projectilesRef} />
      <SpecialProjectiles projectilesRef={projectilesRef} />
      {renderEffects.map((ef: VisualEffect) => {
          if (ef.type === 'BOSS_DEATH') {
              return <BossDeathEffect key={ef.id} effect={ef} />;
          } else if (ef.type === 'CHAIN_LIGHTNING') {
              return <LightningBolt key={ef.id} effect={ef} defaultInitialLife={0.35} />;
          } else if (ef.type === 'THUNDER') {
              return <LightningBolt key={ef.id} effect={ef} defaultInitialLife={0.3} color="#00ffff" glowColor="#ffffff" />;
          }
          return <DefaultFadeEffect key={ef.id} effect={ef} />;
      })}
      {renderOrbs.map(orb => <SpriteBillboard key={orb.id} entity={orb} color="#22c55e" scale={0.8} type={orb.type || 'XP_ORB'} />)}
      {chest && !chest.isOpen && ( 
        <group position={[chest.x, 0, chest.z]}>
            <SpriteBillboard color="white" scale={3} type="CHEST" position={[0, 1.75, 0]} renderOrder={3} />
            <pointLight color="#fbbf24" distance={8} intensity={2} decay={2} />
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]} renderOrder={1}><ringGeometry args={[0.8, 1.2, 32]} /><meshBasicMaterial color="#fbbf24" transparent opacity={0.6} /></mesh>
            <mesh position={[0, 50, -0.1]} renderOrder={0}><cylinderGeometry args={[0.3, 0.3, 100, 16, 1, true]} /><meshBasicMaterial color="white" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
        </group>
      )}
      
      {chest && !chest.isOpen && (
          <QuestArrow playerPosition={playerPosition} target={{ x: chest.x, z: chest.z }} />
      )}
      
      {!!playerStats.unlockedWeapons['FIRE_AURA'] && <FireAura radius={(3.5 + (playerStats.unlockedWeapons['FIRE_AURA'] || 0)*0.5) * playerStats.modifiers.area} position={playerPosition} />}
      {!!playerStats.unlockedWeapons['TESLA_COIL'] && <TeslaCoil radius={(4.5 + (playerStats.unlockedWeapons['TESLA_COIL'] || 0)*0.6) * playerStats.modifiers.area} position={playerPosition} />}
    </group>
  );
};
