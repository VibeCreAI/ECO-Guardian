
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Projectile } from '../../types';
import { getProjectileTexture } from './projectileVisuals';

interface ProjectileRenderProps {
  projectile: Projectile;
}

const voxelCoreGeo = new THREE.BoxGeometry(1, 1, 1);
const voxelBitGeo = new THREE.BoxGeometry(1, 1, 1);
const mortarShellGeo = new THREE.SphereGeometry(0.3, 8, 8);
const HOLY_BEAM_RENDER_ORDER = -20;

export const VoxelProjectile = ({ projectile }: { projectile: Projectile }) => {
    const groupRef = useRef<THREE.Group>(null);
    const bitsRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if (groupRef.current) { groupRef.current.position.set(projectile.x, 1, projectile.z); groupRef.current.rotation.x += delta * 2.5; groupRef.current.rotation.z += delta * 1.5; } if (bitsRef.current) { bitsRef.current.rotation.y -= delta * 4; } });
    const mainColor = projectile.color; const secondaryColor = '#1a1a1a'; const scale = 0.35;
    return (
        <group ref={groupRef} position={[projectile.x, 1, projectile.z]} scale={[scale, scale, scale]}><mesh geometry={voxelCoreGeo}><meshStandardMaterial color={mainColor} emissive={mainColor} emissiveIntensity={0.8} roughness={0.2} transparent opacity={1} /></mesh><group ref={bitsRef}><mesh position={[0.8, 0, 0]} geometry={voxelBitGeo} scale={[0.4, 0.4, 0.4]}><meshStandardMaterial color={secondaryColor} transparent opacity={1} /></mesh><mesh position={[-0.8, 0, 0]} geometry={voxelBitGeo} scale={[0.4, 0.4, 0.4]}><meshStandardMaterial color={secondaryColor} transparent opacity={1} /></mesh></group></group>
    );
};

export const MortarProjectile = ({ projectile }: { projectile: Projectile }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const color = projectile.variant === 'TOXIC_FLASK' ? '#a3e635' : '#ef4444';
    useFrame(() => { if (meshRef.current) { const totalLife = projectile.initialLife || 1.5; const lifeUsed = totalLife - projectile.life; const progress = lifeUsed / totalLife; const height = 4.0; const yOffset = 4 * height * progress * (1 - progress); meshRef.current.position.set(projectile.x, 0.5 + yOffset, projectile.z); meshRef.current.rotation.x += 0.2; meshRef.current.rotation.z += 0.2; } });
    return ( <mesh ref={meshRef} position={[projectile.x, 0.5, projectile.z]} geometry={mortarShellGeo}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} /></mesh> );
};

export const AreaEffectRender = ({ projectile }: { projectile: Projectile }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const texture = useMemo(() => getProjectileTexture(projectile.variant || 'LAVA_POOL', 'STATIONARY', '#ef4444'), [projectile.variant]);
    useFrame((state) => { if (meshRef.current) { const alpha = 0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.2; (meshRef.current.material as THREE.MeshBasicMaterial).opacity = alpha; if (projectile.life < 0.5) { (meshRef.current.material as THREE.MeshBasicMaterial).opacity = alpha * (projectile.life / 0.5); } meshRef.current.rotation.z += 0.005; } });
    return ( <mesh ref={meshRef} position={[projectile.x, 0.05, projectile.z]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[4, 4]} /><meshBasicMaterial map={texture} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} /></mesh> );
};

export const HolyBeamRender = ({ projectile }: { projectile: Projectile }) => {
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
        <group position={[projectile.x, 0, projectile.z]}><mesh ref={meshRef} position={[0, 15, 0]} renderOrder={HOLY_BEAM_RENDER_ORDER}><cylinderGeometry args={[1, 1, 30, 16, 1, true]} /><meshBasicMaterial color="#fef08a" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh><mesh ref={coreRef} position={[0, 15, 0]} renderOrder={HOLY_BEAM_RENDER_ORDER}><cylinderGeometry args={[1, 1, 30, 16, 1, true]} /><meshBasicMaterial color="#ffffff" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh><mesh ref={ringRef} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.1, 0]} renderOrder={HOLY_BEAM_RENDER_ORDER}><ringGeometry args={[0.5, 1, 32]} /><meshBasicMaterial color="#fef08a" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh></group>
    );
};

export const ProjectileRender: React.FC<ProjectileRenderProps> = ({ projectile }) => {
  if (projectile.variant === 'LAVA_POOL' || projectile.variant === 'POISON_CLOUD' || projectile.variant === 'PLAGUE_SPREADER') { return <AreaEffectRender projectile={projectile} />; }
  if (projectile.variant === 'FIRE_MORTAR' || projectile.variant === 'TOXIC_FLASK') { return <MortarProjectile projectile={projectile} />; }
  if (projectile.variant === 'HOLY_BEAM') { return <HolyBeamRender projectile={projectile} />; }
  if (!projectile.fromPlayer) { return <VoxelProjectile projectile={projectile} />; }
  return null;
};
