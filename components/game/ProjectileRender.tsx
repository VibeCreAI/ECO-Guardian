
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Projectile } from '../../types';

interface ProjectileRenderProps {
  projectile: Projectile;
}

const textureCache: Record<string, THREE.Texture> = {};
const voxelCoreGeo = new THREE.BoxGeometry(1, 1, 1);
const voxelBitGeo = new THREE.BoxGeometry(1, 1, 1); 
const mortarShellGeo = new THREE.SphereGeometry(0.3, 8, 8);

const getProjectileTexture = (variant: string, type: string, color: string) => {
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

const VoxelProjectile = ({ projectile }: { projectile: Projectile }) => {
    const groupRef = useRef<THREE.Group>(null);
    const bitsRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if (groupRef.current) { groupRef.current.position.set(projectile.x, 1, projectile.z); groupRef.current.rotation.x += delta * 2.5; groupRef.current.rotation.z += delta * 1.5; } if (bitsRef.current) { bitsRef.current.rotation.y -= delta * 4; } });
    const mainColor = projectile.color; const secondaryColor = '#1a1a1a'; const scale = 0.35;
    return (
        <group ref={groupRef} position={[projectile.x, 1, projectile.z]} scale={[scale, scale, scale]}><mesh geometry={voxelCoreGeo}><meshStandardMaterial color={mainColor} emissive={mainColor} emissiveIntensity={0.8} roughness={0.2} /></mesh><group ref={bitsRef}><mesh position={[0.8, 0, 0]} geometry={voxelBitGeo} scale={[0.4, 0.4, 0.4]}><meshStandardMaterial color={secondaryColor} /></mesh><mesh position={[-0.8, 0, 0]} geometry={voxelBitGeo} scale={[0.4, 0.4, 0.4]}><meshStandardMaterial color={secondaryColor} /></mesh></group></group>
    );
};

const MortarProjectile = ({ projectile }: { projectile: Projectile }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const color = projectile.variant === 'TOXIC_FLASK' ? '#a3e635' : '#ef4444';
    useFrame(() => { if (meshRef.current) { const totalLife = projectile.initialLife || 1.5; const lifeUsed = totalLife - projectile.life; const progress = lifeUsed / totalLife; const height = 4.0; const yOffset = 4 * height * progress * (1 - progress); meshRef.current.position.set(projectile.x, 0.5 + yOffset, projectile.z); meshRef.current.rotation.x += 0.2; meshRef.current.rotation.z += 0.2; } });
    return ( <mesh ref={meshRef} position={[projectile.x, 0.5, projectile.z]} geometry={mortarShellGeo}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} /></mesh> );
};

const AreaEffectRender = ({ projectile }: { projectile: Projectile }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const texture = useMemo(() => getProjectileTexture(projectile.variant || 'LAVA_POOL', 'STATIONARY', '#ef4444'), [projectile.variant]);
    useFrame((state) => { if (meshRef.current) { const alpha = 0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.2; (meshRef.current.material as THREE.MeshBasicMaterial).opacity = alpha; if (projectile.life < 0.5) { (meshRef.current.material as THREE.MeshBasicMaterial).opacity = alpha * (projectile.life / 0.5); } meshRef.current.rotation.z += 0.005; } });
    return ( <mesh ref={meshRef} position={[projectile.x, 0.05, projectile.z]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[4, 4]} /><meshBasicMaterial map={texture} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} /></mesh> );
};

const HolyBeamRender = ({ projectile }: { projectile: Projectile }) => {
    const meshRef = useRef<THREE.Mesh>(null); const coreRef = useRef<THREE.Mesh>(null); const ringRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (!meshRef.current || !coreRef.current) return;
        const maxLife = projectile.initialLife || 2.0; const life = Math.max(0, projectile.life); const progress = 1.0 - (life / maxLife);
        let width = 0; let opacity = 0;
        if (progress < 0.15) { const p = progress / 0.15; width = p * 2.5; opacity = p; } else if (progress > 0.85) { const p = (1.0 - progress) / 0.15; width = p * 2.5; opacity = p; } else { width = 2.5; opacity = 1.0; }
        width += Math.sin(state.clock.elapsedTime * 30) * 0.1; meshRef.current.scale.set(width, 1, width); (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5; const coreWidth = width * 0.4; coreRef.current.scale.set(coreWidth, 1, coreWidth); (coreRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
        if (ringRef.current) { ringRef.current.scale.set(width * 1.5, width * 1.5, 1); (ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.8; ringRef.current.rotation.z += 0.1; }
    });
    return (
        <group position={[projectile.x, 0, projectile.z]}><mesh ref={meshRef} position={[0, 15, 0]}><cylinderGeometry args={[1, 1, 30, 16, 1, true]} /><meshBasicMaterial color="#fef08a" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh><mesh ref={coreRef} position={[0, 15, 0]}><cylinderGeometry args={[1, 1, 30, 16, 1, true]} /><meshBasicMaterial color="#ffffff" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh><mesh ref={ringRef} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[0.5, 1, 32]} /><meshBasicMaterial color="#fef08a" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh></group>
    );
};

export const ProjectileRender: React.FC<ProjectileRenderProps> = ({ projectile }) => {
  const meshRef = useRef<THREE.Sprite>(null);
  if (projectile.variant === 'LAVA_POOL' || projectile.variant === 'POISON_CLOUD' || projectile.variant === 'PLAGUE_SPREADER') { return <AreaEffectRender projectile={projectile} />; }
  if (projectile.variant === 'FIRE_MORTAR' || projectile.variant === 'TOXIC_FLASK') { return <MortarProjectile projectile={projectile} />; }
  if (projectile.variant === 'HOLY_BEAM') { return <HolyBeamRender projectile={projectile} />; }
  if (!projectile.fromPlayer) { return <VoxelProjectile projectile={projectile} />; }
  const texture = useMemo(() => getProjectileTexture(projectile.variant || 'NORMAL', projectile.type || 'NORMAL', projectile.color), [projectile.variant, projectile.type, projectile.color]);
  useFrame((state, delta) => { if (meshRef.current) { meshRef.current.position.set(projectile.x, 1, projectile.z); const material = meshRef.current.material; if (projectile.variant === 'AXE' || projectile.variant === 'CROSS' || projectile.variant === 'SHURIKEN') { material.rotation += delta * 15; } else if (projectile.variant === 'DAGGER' || projectile.variant === 'ICE_SHARD' || projectile.variant === 'MAGIC_ARROW' || projectile.variant === 'JAVELIN' || projectile.variant === 'SPEAR' || projectile.variant === 'KATANA') { const angle = Math.atan2(projectile.vz, projectile.vx); material.rotation = -angle - Math.PI/2; } } });
  let scale: [number, number, number] = [0.8, 0.8, 1];
  if (projectile.variant === 'FIREBALL') scale = [1.2, 1.2, 1]; else if (projectile.type === 'ORBITAL') scale = [1.0, 1.0, 1]; else if (projectile.variant === 'AXE') scale = [1.0, 1.0, 1]; else if (projectile.variant === 'DAGGER') scale = [0.6, 0.6, 1]; else if (projectile.variant === 'MAGIC_MISSILE') scale = [0.7, 0.7, 1]; else if (projectile.variant === 'MAGIC_ARROW') scale = [1.2, 1.2, 1]; else if (projectile.variant === 'FLAMETHROWER') scale = [0.6, 0.6, 1]; else if (projectile.variant === 'JAVELIN') scale = [1.5, 1.5, 1]; else if (projectile.variant === 'SPEAR') scale = [1.2, 2.4, 1]; else if (projectile.variant === 'SLIME_BALL') scale = [1.0, 1.0, 1]; else if (projectile.variant === 'SHURIKEN') scale = [0.8, 0.8, 1]; else if (projectile.variant === 'KATANA') scale = [4.0, 4.0, 1]; else if (projectile.variant === 'TOXIN_GUN') scale = [0.5, 0.5, 1];
  return <sprite ref={meshRef} scale={scale} position={[projectile.x, 1, projectile.z]}><spriteMaterial map={texture} transparent depthWrite={false} /></sprite>;
};
