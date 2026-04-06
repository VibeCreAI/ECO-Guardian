
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VoxelPortalProps {
  position: [number, number, number];
  color: string;
  isBoss: boolean;
  label?: string;
}

const Box = React.memo(({ position, rotation, scale, color, emissive, opacity }: any) => (
    <mesh position={position} rotation={rotation} scale={scale}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} emissive={emissive || color} emissiveIntensity={emissive ? 2 : 0} transparent={opacity !== undefined} opacity={opacity || 1} roughness={0.2} metalness={0.8} /></mesh>
));

export const VoxelPortal: React.FC<VoxelPortalProps> = ({ position, color, isBoss, label }) => {
  const groupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const innerRingRef = useRef<THREE.Group>(null);
  const eventHorizonRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Group>(null);

  const config = useMemo(() => ({ radius: isBoss ? 3.5 : 1.8, thickness: isBoss ? 0.6 : 0.4, blockCount: isBoss ? 24 : 16, innerCount: isBoss ? 16 : 12, innerRadius: isBoss ? 2.8 : 1.4 }), [isBoss]);

  const labelTexture = useMemo(() => {
      if (!label) return null;
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext('2d');
      if (ctx) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.stroke(); ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'white'; ctx.fillText(label, 32, 34); }
      const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter; return tex;
  }, [label, color]);

  const outerBlocks = useMemo(() => {
      const blocks = [];
      for(let i=0; i<config.blockCount; i++) { const angle = (i / config.blockCount) * Math.PI * 2; const isChevron = i % (isBoss ? 3 : 4) === 0; blocks.push({ x: Math.cos(angle) * config.radius, y: Math.sin(angle) * config.radius, rotZ: angle, isChevron }); }
      return blocks;
  }, [config, isBoss]);

  const innerBlocks = useMemo(() => {
      const blocks = [];
      for(let i=0; i<config.innerCount; i++) { const angle = (i / config.innerCount) * Math.PI * 2; blocks.push({ x: Math.cos(angle) * config.innerRadius, y: Math.sin(angle) * config.innerRadius, rotZ: angle }); }
      return blocks;
  }, [config]);

  const particles = useMemo(() => {
      return new Array(isBoss ? 12 : 6).fill(0).map((_, i) => ({ offset: Math.random() * Math.PI * 2, speed: 0.5 + Math.random(), dist: (Math.random() * 2) + config.radius, size: 0.1 + Math.random() * 0.2 }));
  }, [isBoss, config.radius]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * (isBoss ? 1.0 : 0.5);
    if (eventHorizonRef.current) { const scale = 1 + Math.sin(t * 3) * 0.05; eventHorizonRef.current.scale.set(scale, scale, 1); eventHorizonRef.current.rotation.z += delta * 0.2; }
    if (groupRef.current) groupRef.current.position.y = position[1] + Math.sin(t) * 0.2;
    if (particlesRef.current) { particlesRef.current.rotation.y += delta * 0.5; particlesRef.current.children.forEach((child, i) => { child.position.y = Math.sin(t * particles[i].speed + particles[i].offset) * particles[i].dist; }); }
  });

  return (
    <group ref={groupRef} position={position}>
      <group position={[0, 0, 0]}><Box position={[0, 0.25, 0]} scale={[config.radius * 2.5, 0.5, 3]} color="#44403c" /><Box position={[0, 0.75, 0]} scale={[config.radius * 1.8, 0.5, 2]} color="#292524" /><Box position={[config.radius, 0.75, 0.8]} scale={[0.5, 0.6, 0.2]} color={color} emissive={true} /><Box position={[-config.radius, 0.75, 0.8]} scale={[0.5, 0.6, 0.2]} color={color} emissive={true} /></group>
      <group position={[0, config.radius + 1.0, 0]}><group ref={outerRingRef}>{outerBlocks.map((b, i) => ( <group key={i} position={[b.x, b.y, 0]} rotation={[0, 0, b.rotZ]}><Box scale={[config.thickness, 1.2, config.thickness]} color={b.isChevron ? "#1c1917" : "#57534e"} />{b.isChevron && <Box position={[0, 0, config.thickness/2 + 0.1]} scale={[config.thickness * 0.8, 0.4, 0.1]} color={color} emissive={true} />}</group> ))}</group><group ref={innerRingRef}>{innerBlocks.map((b, i) => ( <group key={i} position={[b.x, b.y, 0]} rotation={[0, 0, b.rotZ]}><Box scale={[config.thickness * 0.6, 0.6, config.thickness * 0.6]} color="#a8a29e" /></group> ))}</group><group ref={eventHorizonRef}><mesh><circleGeometry args={[config.innerRadius - 0.2, 32]} /><meshBasicMaterial color="#000000" /></mesh><mesh position={[0, 0, 0.05]}><circleGeometry args={[config.innerRadius - 0.3, 32]} /><meshBasicMaterial color={color} transparent opacity={0.6} /></mesh><mesh position={[0, 0, 0.1]}><circleGeometry args={[config.innerRadius * 0.4, 16]} /><meshBasicMaterial color="white" transparent opacity={0.4} /></mesh></group>{labelTexture && (<mesh position={[0, 0, 0.3]}><planeGeometry args={[1.5, 1.5]} /><meshBasicMaterial map={labelTexture} transparent depthWrite={false} /></mesh>)}<group position={[0, 0, -0.5]}><mesh rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[config.radius * 0.8, config.radius * 0.8, 0.5, 8]} /><meshStandardMaterial color="#292524" roughness={0.8} /></mesh></group></group>
      <group ref={particlesRef} position={[0, config.radius, 0]}>{particles.map((p, i) => { const angle = (i / particles.length) * Math.PI * 2; return ( <group key={i} position={[Math.cos(angle)*config.radius*1.2, 0, Math.sin(angle)*config.radius*1.2]}><Box scale={[p.size, p.size, p.size]} color={color} emissive={true} /></group> ); })}</group>
      <pointLight position={[0, config.radius + 1, 1]} color={color} intensity={isBoss ? 5 : 3} distance={isBoss ? 12 : 8} decay={2}/><pointLight position={[0, 1, 0]} color={color} intensity={1} distance={4}/>
    </group>
  );
};
