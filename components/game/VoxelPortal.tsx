
import React, { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VoxelPortalProps {
  position: [number, number, number];
  color: string;
  innerColor?: string;
  tintStructure?: boolean;
  isBoss: boolean;
  label?: string;
}

const Box = React.memo(({ position, rotation, scale, color, emissive, opacity }: any) => (
    <mesh position={position} rotation={rotation} scale={scale}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} emissive={emissive || color} emissiveIntensity={emissive ? 2 : 0} transparent={opacity !== undefined} opacity={opacity || 1} roughness={0.2} metalness={0.8} /></mesh>
));

type BoxInstance = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

const InstancedBoxes = React.memo(({
  boxes,
  color,
  emissive = false,
  opacity,
}: {
  boxes: BoxInstance[];
  color: string;
  emissive?: boolean;
  opacity?: number;
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive: emissive ? color : '#000000',
    emissiveIntensity: emissive ? 2 : 0,
    transparent: opacity !== undefined,
    opacity: opacity ?? 1,
    roughness: 0.2,
    metalness: 0.8,
  }), [color, emissive, opacity]);

  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    boxes.forEach((box, index) => {
      const position = box.position ?? [0, 0, 0];
      const rotation = box.rotation ?? [0, 0, 0];
      const scale = box.scale ?? [1, 1, 1];

      tempObject.position.set(position[0], position[1], position[2]);
      tempObject.rotation.set(rotation[0], rotation[1], rotation[2]);
      tempObject.scale.set(scale[0], scale[1], scale[2]);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [boxes, tempObject]);

  if (boxes.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[boxGeometry, material, boxes.length]} />;
});

export const VoxelPortal: React.FC<VoxelPortalProps> = ({ position, color, innerColor, tintStructure = false, isBoss, label }) => {
  const resolvedInnerColor = innerColor ?? color;
  const groupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const innerRingRef = useRef<THREE.Group>(null);
  const eventHorizonRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Group>(null);

  // Derive dark/mid/light structural shades from the main color when tintStructure is on.
  // Falls back to the original stone palette when off so quiz/boss portals are unchanged.
  const structColors = useMemo(() => {
    if (!tintStructure) {
      return {
        base1:     '#44403c',
        base2:     '#292524',
        ringDark:  '#1c1917',
        ringMid:   '#57534e',
        innerRing: '#a8a29e',
        cylinder:  '#292524',
      };
    }
    const c = new THREE.Color(color);
    const shade = (t: number) => '#' + c.clone().multiplyScalar(t).getHexString();
    return {
      base1:     shade(0.35),
      base2:     shade(0.22),
      ringDark:  shade(0.55),
      ringMid:   shade(0.85),
      innerRing: shade(1.00),
      cylinder:  shade(0.28),
    };
  }, [color, tintStructure]);

  const config = useMemo(() => ({ radius: isBoss ? 3.5 : 1.8, thickness: isBoss ? 0.6 : 0.4, blockCount: isBoss ? 24 : 16, innerCount: isBoss ? 16 : 12, innerRadius: isBoss ? 2.8 : 1.4 }), [isBoss]);

  const labelTexture = useMemo(() => {
      if (!label) return null;
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.stroke();
        // Scale font so the text always fits inside the 60px-diameter circle
        const fontSize = label.length <= 2 ? 36 : label.length <= 3 ? 28 : label.length <= 4 ? 22 : label.length <= 5 ? 17 : 13;
        ctx.font = `bold ${fontSize}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'white'; ctx.fillText(label, 32, 34);
      }
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

  const outerMidBoxes = useMemo(() => outerBlocks
    .filter((b) => !b.isChevron)
    .map((b) => ({
      position: [b.x, b.y, 0] as [number, number, number],
      rotation: [0, 0, b.rotZ] as [number, number, number],
      scale: [config.thickness, 1.2, config.thickness] as [number, number, number],
    })), [outerBlocks, config.thickness]);

  const outerChevronBlocks = useMemo(() => outerBlocks
    .filter((b) => b.isChevron)
    .map((b) => ({
      position: [b.x, b.y, 0] as [number, number, number],
      rotation: [0, 0, b.rotZ] as [number, number, number],
      scale: [config.thickness, 1.2, config.thickness] as [number, number, number],
    })), [outerBlocks, config.thickness]);

  const outerChevronPanels = useMemo(() => outerBlocks
    .filter((b) => b.isChevron)
    .map((b) => ({
      position: [b.x, b.y, config.thickness / 2 + 0.1] as [number, number, number],
      rotation: [0, 0, b.rotZ] as [number, number, number],
      scale: [config.thickness * 0.8, 0.4, 0.1] as [number, number, number],
    })), [outerBlocks, config.thickness]);

  const innerBlockBoxes = useMemo(() => innerBlocks.map((b) => ({
    position: [b.x, b.y, 0] as [number, number, number],
    rotation: [0, 0, b.rotZ] as [number, number, number],
    scale: [config.thickness * 0.6, 0.6, config.thickness * 0.6] as [number, number, number],
  })), [innerBlocks, config.thickness]);

  const particleOrbiters = useMemo(() => particles.map((p, i) => {
    const angle = (i / particles.length) * Math.PI * 2;
    const scale = p.size * (tintStructure ? 2.2 : isBoss ? 1.9 : 1.7);
    return {
      position: [
        Math.cos(angle) * config.radius * 1.2,
        0,
        Math.sin(angle) * config.radius * 1.2,
      ] as [number, number, number],
      scale: [scale, scale, scale] as [number, number, number],
    };
  }), [particles, config.radius, tintStructure, isBoss]);

  const particleStyle = useMemo(() => ({
    emissiveIntensity: tintStructure ? 4 : isBoss ? 3.2 : 2.6,
    lightIntensity: tintStructure ? 1.8 : isBoss ? 1.35 : 0.85,
    lightDistance: tintStructure ? 3.5 : isBoss ? 3.2 : 2.4,
    orbitSpeed: tintStructure ? 0.5 : isBoss ? 0.42 : 0.36,
  }), [tintStructure, isBoss]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * (isBoss ? 1.0 : 0.5);
    if (eventHorizonRef.current) { const scale = 1 + Math.sin(t * 3) * 0.05; eventHorizonRef.current.scale.set(scale, scale, 1); eventHorizonRef.current.rotation.z += delta * 0.2; }
    if (groupRef.current) groupRef.current.position.y = position[1] + Math.sin(t) * 0.2;
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * particleStyle.orbitSpeed;
      particlesRef.current.children.forEach((child, i) => {
        const particle = particles[i];
        if (!particle) return;
        child.position.y = Math.sin(t * particle.speed + particle.offset) * particle.dist;
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group position={[0, 0, 0]}>
        <Box position={[0, 0.25, 0]} scale={[config.radius * 2.5, 0.5, 3]} color={structColors.base1} />
        <Box position={[0, 0.75, 0]} scale={[config.radius * 1.8, 0.5, 2]} color={structColors.base2} />
        <Box position={[config.radius, 0.75, 0.8]} scale={[0.5, 0.6, 0.2]} color={color} emissive={true} />
        <Box position={[-config.radius, 0.75, 0.8]} scale={[0.5, 0.6, 0.2]} color={color} emissive={true} />
      </group>
      <group position={[0, config.radius + 1.0, 0]}>
        <group ref={outerRingRef}>
          <InstancedBoxes boxes={outerMidBoxes} color={structColors.ringMid} />
          <InstancedBoxes boxes={outerChevronBlocks} color={structColors.ringDark} />
          <InstancedBoxes boxes={outerChevronPanels} color={color} emissive />
        </group>
        <group ref={innerRingRef}>
          <InstancedBoxes boxes={innerBlockBoxes} color={structColors.innerRing} />
        </group>
        <group ref={eventHorizonRef}>
          <mesh><circleGeometry args={[config.innerRadius - 0.2, 32]} /><meshBasicMaterial color="#000000" /></mesh>
          <mesh position={[0, 0, 0.05]}><circleGeometry args={[config.innerRadius - 0.3, 32]} /><meshBasicMaterial color={resolvedInnerColor} transparent opacity={0.6} /></mesh>
          <mesh position={[0, 0, 0.1]}><circleGeometry args={[config.innerRadius * 0.4, 16]} /><meshBasicMaterial color="white" transparent opacity={0.4} /></mesh>
        </group>
        {labelTexture && (<mesh position={[0, 0, 0.3]}><planeGeometry args={[1.5, 1.5]} /><meshBasicMaterial map={labelTexture} transparent depthWrite={false} /></mesh>)}
        <group position={[0, 0, -0.5]}>
          <mesh rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[config.radius * 0.8, config.radius * 0.8, 0.5, 8]} />
            <meshStandardMaterial color={structColors.cylinder} roughness={0.8} />
          </mesh>
        </group>
      </group>
      <group ref={particlesRef} position={[0, config.radius, 0]}>
        {particleOrbiters.map((particle, i) => {
          return (
            <group key={i} position={particle.position}>
              {/* Bright orb: octahedron with high emissiveIntensity to trigger Bloom post-processing like landmark fireflies */}
              <mesh scale={particle.scale}>
                <octahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={particleStyle.emissiveIntensity} />
              </mesh>
              {/* Every other orb emits a small point light onto surrounding geometry */}
              {i % 2 === 0 && (
                <pointLight color={color} intensity={particleStyle.lightIntensity} distance={particleStyle.lightDistance} decay={2} />
              )}
            </group>
          );
        })}
      </group>
      <pointLight position={[0, config.radius + 1, 1]} color={color} intensity={isBoss ? 5 : 3} distance={isBoss ? 12 : 8} decay={2}/>
      <pointLight position={[0, 1, 0]} color={color} intensity={1} distance={4}/>
    </group>
  );
};
