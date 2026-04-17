
import React, { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type ShopVoxel = {
    x: number;
    y: number;
    z: number;
    color: string;
    emissive: boolean;
};

const shopVoxelGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);

const ShopVoxelInstances: React.FC<{ voxels: ShopVoxel[]; color: string; emissive: boolean }> = React.memo(({ voxels, color, emissive }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color,
        emissive: emissive ? color : '#000000',
        emissiveIntensity: emissive ? 2.0 : 0,
        roughness: 0.4,
        metalness: 0.6,
    }), [color, emissive]);

    useEffect(() => () => material.dispose(), [material]);

    useLayoutEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        voxels.forEach((voxel, index) => {
            tempObject.position.set(voxel.x, voxel.y, voxel.z);
            tempObject.rotation.set(0, 0, 0);
            tempObject.scale.set(1, 1, 1);
            tempObject.updateMatrix();
            mesh.setMatrixAt(index, tempObject.matrix);
        });

        mesh.instanceMatrix.needsUpdate = true;
    }, [voxels, tempObject]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[shopVoxelGeometry, material, voxels.length]}
            castShadow
            receiveShadow
        />
    );
});

// Floating Icon Component
const ShopIcon = () => {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Glow effect
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 30;
            
            ctx.fillStyle = '#4ade80';
            ctx.font = '140px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('♻️', 128, 138);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }, []);

    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (ref.current) {
            // Bobbing
            ref.current.position.y = 8.0 + Math.sin(state.clock.elapsedTime * 2.0) * 0.3;
            // Slow Rotation
            ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3; 
        }
    });

    return (
        <group position={[0, 0, 0]}>
            <mesh ref={ref} scale={[1.2, 1.2, 1.2]}>
                <planeGeometry args={[2.5, 2.5]} />
                <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
        </group>
    );
};

export const VoxelShop = ({ position }: { position: [number, number, number] }) => {
    const voxelGroups = useMemo(() => {
        const groups = new Map<string, { color: string; emissive: boolean; voxels: ShopVoxel[] }>();
        const s = 0.25; // Scale unit

        const addBlock = (x: number, y: number, z: number, color: string, emissive = false) => {
            const key = `${color}_${emissive ? 'emissive' : 'solid'}`;
            const group = groups.get(key) ?? { color, emissive, voxels: [] };
            group.voxels.push({ x: x * s, y: y * s, z: z * s, color, emissive });
            groups.set(key, group);
        };

        // --- 1. FLOOR (12x12 grid) ---
        // Range: -6 to 6
        const radius = 7;
        for(let x = -radius; x <= radius; x++) {
            for(let z = -radius; z <= radius; z++) {
                // Circularish base
                if(Math.sqrt(x*x + z*z) < radius) {
                    const isEdge = Math.sqrt(x*x + z*z) > radius - 1.5;
                    addBlock(x, 0, z, isEdge ? '#1e293b' : '#334155'); // Slate border, lighter center
                }
            }
        }

        // --- 2. PILLARS (4 Corners) ---
        const pillarLocs = [
            {x: -5, z: -5}, {x: 5, z: -5},
            {x: -5, z: 5}, {x: 5, z: 5}
        ];
        
        pillarLocs.forEach(p => {
            for(let y=1; y<=16; y++) {
                addBlock(p.x, y, p.z, '#0f172a');
                // Glowing stripe
                if(y === 8 || y === 12) addBlock(p.x, y, p.z, '#22c55e', true);
            }
        });

        // --- 3. ROOF (Pyramid) ---
        // Base height = 16 (4 units)
        const roofBaseY = 16;
        for(let y=0; y<5; y++) {
            const roofW = 7 - y;
            for(let x=-roofW; x<=roofW; x++) {
                for(let z=-roofW; z<=roofW; z++) {
                    const isEdge = Math.abs(x) === roofW || Math.abs(z) === roofW;
                    const c = isEdge ? '#14532d' : '#166534';
                    addBlock(x, roofBaseY + y, z, c);
                }
            }
        }
        // Top glowing tip
        addBlock(0, roofBaseY + 5, 0, '#4ade80', true);
        addBlock(0, roofBaseY + 6, 0, '#4ade80', true);

        // --- 4. COUNTER / MACHINE (Back Center) ---
        for(let x=-3; x<=3; x++) {
            for(let y=1; y<=5; y++) {
                addBlock(x, y, -2, '#1e293b');
            }
        }
        // Counter top
        for(let x=-3; x<=3; x++) addBlock(x, 5, -1, '#64748b');
        
        // --- 5. ENTRANCE ARCH (Front) ---
        for(let x=-3; x<=3; x++) {
            // Top bar
            addBlock(x, 12, 5, '#1e293b');
            addBlock(x, 13, 5, '#1e293b');
        }
        // Side posts for arch
        for(let y=1; y<=12; y++) {
            addBlock(-3, y, 5, '#1e293b');
            addBlock(3, y, 5, '#1e293b');
        }
        // Glowing Sign Board area
        for(let x=-2; x<=2; x++) addBlock(x, 12, 5.5, '#4ade80', true);

        return Array.from(groups.entries());
    }, []);

    return (
        <group position={position}>
            <group position={[0, 0.125, 0]}>
                {voxelGroups.map(([key, group]) => (
                    <ShopVoxelInstances
                        key={key}
                        voxels={group.voxels}
                        color={group.color}
                        emissive={group.emissive}
                    />
                ))}
            </group>
            <ShopIcon />
            <pointLight position={[0, 2, 0]} color="#4ade80" intensity={1} distance={8} />
        </group>
    );
};
