
import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VoxelLandmarkProps {
  type: string;
  position: [number, number, number];
}

interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string;
}

const voxelGeo = new THREE.BoxGeometry(1, 1, 1);
const voxelMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });

const StaticVoxelBatch = ({ voxels, scale = 0.4 }: { voxels: VoxelData[], scale?: number }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const tempObj = new THREE.Object3D();
        voxels.forEach((data, i) => {
            tempObj.position.set(data.x * scale, data.y * scale, data.z * scale);
            tempObj.scale.set(scale, scale, scale);
            tempObj.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObj.matrix);
            meshRef.current!.setColorAt(i, new THREE.Color(data.color));
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [voxels, scale]);
    return <instancedMesh ref={meshRef} args={[voxelGeo, voxelMat, voxels.length]} castShadow receiveShadow />;
};

const DynamicVoxel = ({ position, color, scale = 0.4, emissive = false }: any) => (
    <mesh position={position} scale={[scale, scale, scale]} castShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} emissive={emissive ? color : '#000'} emissiveIntensity={emissive ? 2 : 0} /></mesh>
);

const ThemeForest = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let i=0; i<40; i++) { const angle = (i/40) * Math.PI * 2; const dist = 5 + Math.random() * 4; v.push({ x: Math.cos(angle)*dist, y: 0, z: Math.sin(angle)*dist, color: '#451a03' }); }
        for(let y=0; y<25; y++) { const radius = 3.5 - (y * 0.08); for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) { if (x*x + z*z < radius*radius) { if (Math.random() > 0.2) v.push({ x, y, z, color: Math.random() > 0.8 ? '#5d4037' : '#451a03' }); } } }
        const centerX = 0, centerY = 28, centerZ = 0; const r = 14;
        for(let x=-r; x<=r; x++) for(let y=-r; y<=r; y++) for(let z=-r; z<=r; z++) { const dist = Math.sqrt(x*x + y*y + z*z); if (dist < r && dist > r - 3) { if (Math.random() > 0.6) { v.push({ x: centerX+x, y: centerY+y, z: centerZ+z, color: Math.random() > 0.5 ? '#15803d' : '#166534' }); } } }
        return v;
    }, []);
    const firefliesRef = useRef<THREE.Group>(null);
    useFrame((state) => { if(firefliesRef.current) { firefliesRef.current.rotation.y = state.clock.elapsedTime * 0.2; firefliesRef.current.children.forEach((c, i) => { c.position.y = 8 + Math.sin(state.clock.elapsedTime + i) * 2; }); } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.4} /><group position={[0, 5, 0]}><pointLight color="#86efac" intensity={3} distance={10} /><mesh><octahedronGeometry args={[1.5, 0]} /><meshBasicMaterial color="#86efac" wireframe /></mesh></group><group ref={firefliesRef}>{new Array(8).fill(0).map((_, i) => { const a = (i/8)*Math.PI*2; return <DynamicVoxel key={i} position={[Math.cos(a)*6, 8, Math.sin(a)*6]} color="#bef264" emissive /> })}</group></group>
    );
};

const ThemeSkull = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = []; const r = 8;
        for(let x=-r; x<=r; x++) for(let y=0; y<=r*1.4; y++) for(let z=-r; z<=r; z++) { const dist = Math.sqrt(x*x + (y-4)*(y-4)*0.8 + z*z); if (dist < r && dist > r - 1.5) { if (z > 3 && y > 3 && y < 7 && Math.abs(x) > 1.5 && Math.abs(x) < 4.5) continue; if (z > 4 && y > 1 && y < 3 && Math.abs(x) < 1.5) continue; v.push({ x, y: y + 2, z, color: '#e2e8f0' }); } }
        for(let x=-5; x<=5; x++) for(let z=2; z<=8; z++) { v.push({ x, y: 0, z, color: '#cbd5e1' }); if (Math.abs(x) === 5 || z === 8) v.push({ x, y: 1, z, color: '#cbd5e1' }); }
        return v;
    }, []);
    const mistRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if(mistRef.current) { mistRef.current.children.forEach((c: any, i) => { c.position.y += delta * 2; c.position.z += delta; c.material.opacity = Math.max(0, 1 - (c.position.y - 4)/4); if (c.position.y > 8) { c.position.y = 4; c.position.z = 5; c.material.opacity = 1; } }); } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.5} /><group ref={mistRef}><mesh position={[-2, 4, 5]} scale={[0.5, 0.5, 0.5]}><boxGeometry /><meshBasicMaterial color="#4ade80" transparent /></mesh><mesh position={[2, 4, 5]} scale={[0.5, 0.5, 0.5]}><boxGeometry /><meshBasicMaterial color="#4ade80" transparent /></mesh></group><pointLight position={[0, 5, 6]} color="#4ade80" distance={8} intensity={2} /></group>
    );
};

const ThemeIce = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let y=0; y<40; y++) { const w = Math.max(1, 6 - Math.floor(y/6)); for(let x=-w; x<=w; x++) for(let z=-w; z<=w; z++) { if (Math.random() > 0.3) { const isCore = Math.abs(x) < 2 && Math.abs(z) < 2; v.push({ x, y, z, color: isCore ? '#cffafe' : '#22d3ee' }); } } }
        for(let i=0; i<20; i++) { const dist = 5 + Math.random() * 6; const ang = Math.random() * Math.PI * 2; const h = Math.random() * 5; const bx = Math.cos(ang)*dist; const bz = Math.sin(ang)*dist; for(let y=0; y<h; y++) v.push({ x: bx, y, z: bz, color: '#67e8f9' }); }
        return v;
    }, []);
    const ringRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if(ringRef.current) { ringRef.current.rotation.y += delta; ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2; } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.4} /><group ref={ringRef} position={[0, 10, 0]}>{new Array(12).fill(0).map((_, i) => { const a = (i/12)*Math.PI*2; return <DynamicVoxel key={i} position={[Math.cos(a)*5, 0, Math.sin(a)*5]} color="#a5f3fc" emissive /> })}</group><pointLight position={[0, 8, 0]} color="#22d3ee" intensity={3} distance={15} /></group>
    );
};

const ThemeVolcano = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let y=0; y<15; y++) { const radius = 12 - (y * 0.6); for(let x=-Math.ceil(radius); x<=Math.ceil(radius); x++) for(let z=-Math.ceil(radius); z<=Math.ceil(radius); z++) { if (x*x + z*z < radius*radius) { if (y > 10 && x*x + z*z < (radius-2)*(radius-2)) { v.push({ x, y: y-2, z, color: '#b91c1c' }); } else { v.push({ x, y, z, color: Math.random() > 0.8 ? '#44403c' : '#292524' }); } } } }
        return v;
    }, []);
    const particlesRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if (particlesRef.current) { particlesRef.current.children.forEach((p) => { p.position.y += delta * 8; p.position.x += (Math.random() - 0.5) * 0.2; if (p.position.y > 15) { p.position.y = 8; p.position.x = (Math.random() - 0.5) * 3; p.position.z = (Math.random() - 0.5) * 3; } }); } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.5} /><group ref={particlesRef} position={[0, 4, 0]}>{new Array(15).fill(0).map((_, i) => ( <DynamicVoxel key={i} position={[(Math.random()-0.5)*2, 8 + Math.random()*5, (Math.random()-0.5)*2]} color={Math.random()>0.5 ? '#facc15' : '#ef4444'} emissive scale={0.3} /> ))}</group><pointLight position={[0, 12, 0]} color="#ea580c" intensity={4} distance={20} /></group>
    );
};

const ThemePyramid = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = []; const layers = 18;
        for(let y=0; y<layers; y++) { const w = layers - y + 1; const off = -w/2; for(let x=0; x<w; x++) for(let z=0; z<w; z++) { const isEdge = x===0 || z===0 || x===w-1 || z===w-1; v.push({ x: off+x, y, z: off+z, color: isEdge ? '#d97706' : '#fbbf24' }); } }
        return v;
    }, []);
    const capstoneRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if(capstoneRef.current) { capstoneRef.current.rotation.y += delta; capstoneRef.current.position.y = 9 + Math.sin(state.clock.elapsedTime)*0.5; } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.5} /><group ref={capstoneRef} position={[0, 9, 0]}><mesh rotation={[Math.PI/4, Math.PI/4, 0]} scale={[1.5, 1.5, 1.5]}><octahedronGeometry /><meshStandardMaterial color="#fcd34d" emissive="#fcd34d" emissiveIntensity={0.5} /></mesh></group></group>
    );
};

const ThemeMushroom = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let y=0; y<20; y++) { const w = 3 + Math.sin(y*0.2); for(let x=-w; x<=w; x++) for(let z=-w; z<=w; z++) { if (x*x + z*z < w*w) v.push({ x, y, z, color: '#fef3c7' }); } }
        const capY = 18; const r = 14;
        for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) { const dist = Math.sqrt(x*x + z*z); const h = Math.cos((dist/r) * (Math.PI/2)) * 8; if (h > 0) { for(let y=0; y<h; y++) { const isSpot = (Math.floor(x/3) + Math.floor(z/3)) % 2 === 0; v.push({ x, y: capY+y, z, color: isSpot ? '#ffffff' : '#a855f7' }); } } }
        return v;
    }, []);
    const sporesRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if(sporesRef.current) { sporesRef.current.children.forEach(c => { c.position.y -= delta * 2; if(c.position.y < 0) { c.position.y = 15; c.position.x = (Math.random()-0.5)*16; c.position.z = (Math.random()-0.5)*16; } }); } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.4} /><group ref={sporesRef}>{new Array(20).fill(0).map((_,i) => ( <DynamicVoxel key={i} position={[(Math.random()-0.5)*16, Math.random()*15, (Math.random()-0.5)*16]} color="#e9d5ff" scale={0.2} emissive /> ))}</group></group>
    );
};

const ThemeCyber = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let y=0; y<40; y++) { for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) { const isEdge = Math.abs(x)===4 || Math.abs(z)===4; if (isEdge || y%10 === 0) { v.push({ x, y, z, color: '#0f172a' }); } else if (Math.random() > 0.1) { v.push({ x, y, z, color: '#1e293b' }); } } }
        return v;
    }, []);
    const streamsRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if(streamsRef.current) { streamsRef.current.children.forEach((c, i) => { c.position.y += delta * 4; if (c.position.y > 16) c.position.y = 0; }); } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.4} /><group ref={streamsRef}>{new Array(10).fill(0).map((_,i) => { const side = i % 4; let x=0, z=0; if(side===0) { x = 2; z = (Math.random()-0.5)*3; } if(side===1) { x = -2; z = (Math.random()-0.5)*3; } if(side===2) { z = 2; x = (Math.random()-0.5)*3; } if(side===3) { z = -2; x = (Math.random()-0.5)*3; } return <DynamicVoxel key={i} position={[x, Math.random()*16, z]} color="#0ea5e9" emissive scale={0.4} /> })}</group><pointLight position={[0, 8, 2]} color="#0ea5e9" intensity={2} distance={10} /></group>
    );
};

const ThemeVoid = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let i=0; i<60; i++) { const angle = (i/60) * Math.PI * 2; const r = 8; if (i % 5 !== 0) v.push({ x: Math.cos(angle)*r, y: 0, z: Math.sin(angle)*r, color: '#1e1b4b' }); }
        return v;
    }, []);
    const ringRef = useRef<THREE.Group>(null); const coreRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if(ringRef.current) { ringRef.current.rotation.x += delta * 0.5; ringRef.current.rotation.y += delta * 0.2; } if(coreRef.current) { const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2; coreRef.current.scale.set(s,s,s); } });
    return (
        <group><group ref={ringRef} position={[0, 8, 0]}><StaticVoxelBatch voxels={staticVoxels} scale={0.6} /><mesh rotation={[Math.PI/2, 0, 0]}><torusGeometry args={[3.5, 0.2, 16, 32]} /><meshBasicMaterial color="#7c3aed" /></mesh></group><group ref={coreRef} position={[0, 8, 0]}><mesh><sphereGeometry args={[2, 32, 32]} /><meshBasicMaterial color="black" /></mesh><mesh scale={[1.1, 1.1, 1.1]}><sphereGeometry args={[2, 16, 16]} /><meshBasicMaterial color="#4c1d95" wireframe /></mesh></group><pointLight position={[0, 8, 0]} color="#8b5cf6" intensity={5} distance={15} /></group>
    );
};

const ThemeSky = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let x=-10; x<=10; x++) for(let y=0; y<=4; y++) for(let z=-10; z<=10; z++) { const d = Math.sqrt(x*x + (y*2)*(y*2) + z*z); if (d < 10) { if (Math.random() > 0.4) v.push({ x, y, z, color: '#f0f9ff' }); } }
        for(let y=4; y<20; y++) { const w = 4; for(let x=-w; x<=w; x++) for(let z=-w; z<=w; z++) { if (x*x + z*z < w*w) { if (x*x + z*z > (w-1)*(w-1)) v.push({ x, y, z, color: '#cbd5e1' }); } } }
        for(let y=20; y<28; y++) { const w = 28 - y; for(let x=-w; x<=w; x++) for(let z=-w; z<=w; z++) { v.push({ x, y, z, color: '#fbbf24' }); } }
        return v;
    }, []);
    const floatRef = useRef<THREE.Group>(null);
    useFrame((state) => { if(floatRef.current) { floatRef.current.position.y = 2 + Math.sin(state.clock.elapsedTime * 0.5) * 1; } });
    return (
        <group ref={floatRef}><StaticVoxelBatch voxels={staticVoxels} scale={0.4} /></group>
    );
};

const ThemeHell = () => {
    const staticVoxels = useMemo(() => {
        const v: VoxelData[] = [];
        for(let y=0; y<30; y++) { for(let x=-8; x<=-4; x++) for(let z=-2; z<=2; z++) { if (Math.random() > 0.1) v.push({ x: x + (Math.random()-0.5), y, z, color: '#292524' }); } for(let x=4; x<=8; x++) for(let z=-2; z<=2; z++) { if (Math.random() > 0.1) v.push({ x: x + (Math.random()-0.5), y, z, color: '#292524' }); } }
        for(let x=-8; x<=8; x++) for(let y=25; y<=30; y++) for(let z=-2; z<=2; z++) { v.push({ x, y, z, color: '#44403c' }); }
        return v;
    }, []);
    const vortexRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => { if(vortexRef.current) { vortexRef.current.rotation.z -= delta * 2; const s = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1; vortexRef.current.scale.set(s,s,1); } });
    return (
        <group><StaticVoxelBatch voxels={staticVoxels} scale={0.4} /><group ref={vortexRef} position={[0, 12, 0]}><mesh><planeGeometry args={[6, 20]} /><meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} transparent opacity={0.6} /></mesh><mesh rotation={[0, 0, Math.PI/4]}><planeGeometry args={[4, 16]} /><meshBasicMaterial color="#7f1d1d" side={THREE.DoubleSide} transparent opacity={0.6} /></mesh></group><pointLight position={[0, 12, 2]} color="#ef4444" intensity={3} distance={15} /></group>
    );
};

export const VoxelLandmark: React.FC<VoxelLandmarkProps> = ({ type, position }) => {
  return (
    <group position={position}>
      {type === 'FOREST' && <ThemeForest />}
      {type === 'SKULL' && <ThemeSkull />}
      {type === 'ICE' && <ThemeIce />}
      {type === 'VOLCANO' && <ThemeVolcano />}
      {type === 'PYRAMID' && <ThemePyramid />}
      {type === 'MUSHROOM' && <ThemeMushroom />}
      {type === 'CYBER' && <ThemeCyber />}
      {type === 'VOID' && <ThemeVoid />}
      {type === 'SKY' && <ThemeSky />}
      {type === 'HELL' && <ThemeHell />}
    </group>
  );
};
