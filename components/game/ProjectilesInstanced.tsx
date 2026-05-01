
import React, { useRef, useState, useEffect, MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Projectile } from '../../types';
import {
    PROJECTILE_SCALE,
    SPIN_VARIANTS,
    ALIGN_VARIANTS,
    DEFAULT_SCALE,
    getProjectileTexture,
    projectileTextureKey,
} from './projectileVisuals';
import { AreaEffectRender, MortarProjectile, HolyBeamRender } from './ProjectileRender';

const PLANE_GEO = new THREE.PlaneGeometry(1, 1);
const VOXEL_CORE_GEO = new THREE.BoxGeometry(1, 1, 1);
const VOXEL_BIT_GEO = new THREE.BoxGeometry(1, 1, 1);
const INSTANCE_CAPACITY = 256;
const MAX_INSTANCE_CAPACITY = 4096;
const HOSTILE_VOXEL_SCALE = 0.35;
const HOSTILE_VOXEL_BIT_OFFSET = HOSTILE_VOXEL_SCALE * 0.8;
const HOSTILE_VOXEL_BIT_SCALE = HOSTILE_VOXEL_SCALE * 0.4;

const BILLBOARD_VERTEX_SNIPPET = `
vec3 iPos  = vec3(instanceMatrix[3]);
float sx   = length(vec3(instanceMatrix[0]));
float sy   = length(vec3(instanceMatrix[1]));
float ca   = instanceMatrix[0][0] / max(sx, 1e-6);
float sa   = instanceMatrix[0][1] / max(sx, 1e-6);
vec2 corner = vec2(position.x * ca - position.y * sa,
                   position.x * sa + position.y * ca) * vec2(sx, sy);
vec4 mvPos = modelViewMatrix * vec4(iPos, 1.0);
mvPos.xy  += corner;
gl_Position = projectionMatrix * mvPos;
`;

const makeBillboardMaterial = (texture: THREE.Texture): THREE.MeshBasicMaterial => {
    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        alphaTest: 0.01,
        side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            BILLBOARD_VERTEX_SNIPPET,
        );
    };
    return mat;
};

const getInstanceCapacity = (required: number) => {
    let capacity = INSTANCE_CAPACITY;
    while (capacity < required && capacity < MAX_INSTANCE_CAPACITY) {
        capacity *= 2;
    }
    return Math.min(capacity, MAX_INSTANCE_CAPACITY);
};

const disposeInstancedMesh = (mesh: THREE.InstancedMesh) => {
    const mat = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
    mesh.dispose();
};

const isInstanceable = (p: Projectile): boolean => {
    if (!p.fromPlayer) return false;
    const v = p.variant;
    if (v === 'LAVA_POOL' || v === 'POISON_CLOUD' || v === 'PLAGUE_SPREADER') return false;
    if (v === 'FIRE_MORTAR' || v === 'TOXIC_FLASK') return false;
    if (v === 'HOLY_BEAM') return false;
    return true;
};

interface ProjectilesInstancedProps {
    projectilesRef: MutableRefObject<Projectile[]>;
}

export const ProjectilesInstanced: React.FC<ProjectilesInstancedProps> = ({ projectilesRef }) => {
    const hostRef = useRef<THREE.Group>(null);
    const meshesRef = useRef<Map<string, THREE.InstancedMesh>>(new Map());
    const idleFramesRef = useRef<Map<string, number>>(new Map());
    const spinRef = useRef<Map<string, number>>(new Map());
    const spinGcCounterRef = useRef(0);
    const dummy = useRef(new THREE.Object3D()).current;

    useEffect(() => {
        return () => {
            const host = hostRef.current;
            meshesRef.current.forEach((mesh) => {
                if (host) host.remove(mesh);
                disposeInstancedMesh(mesh);
            });
            meshesRef.current.clear();
            idleFramesRef.current.clear();
            spinRef.current.clear();
        };
    }, []);

    useFrame((_, delta) => {
        const host = hostRef.current;
        if (!host) return;
        const projectiles = projectilesRef.current;

        const groups: Map<string, Projectile[]> = new Map();
        const keyByProjectileId: Record<string, string> = {};

        for (let i = 0; i < projectiles.length; i++) {
            const p = projectiles[i];
            if (!isInstanceable(p)) continue;
            const key = projectileTextureKey(
                p.variant ?? 'NORMAL',
                p.type ?? 'NORMAL',
                p.color,
            );
            let arr = groups.get(key);
            if (!arr) { arr = []; groups.set(key, arr); }
            arr.push(p);
            keyByProjectileId[p.id] = key;
        }

        groups.forEach((arr, key) => {
            let mesh = meshesRef.current.get(key);
            const requiredCapacity = getInstanceCapacity(arr.length);
            if (!mesh || mesh.instanceMatrix.count < requiredCapacity) {
                if (mesh) {
                    host.remove(mesh);
                    disposeInstancedMesh(mesh);
                }
                const sample = arr[0];
                const tex = getProjectileTexture(
                    sample.variant ?? 'NORMAL',
                    sample.type ?? 'NORMAL',
                    sample.color,
                );
                const material = makeBillboardMaterial(tex);
                mesh = new THREE.InstancedMesh(PLANE_GEO, material, requiredCapacity);
                mesh.frustumCulled = false;
                mesh.count = 0;
                meshesRef.current.set(key, mesh);
                host.add(mesh);
            }
            const capacity = mesh.instanceMatrix.count;
            const limit = Math.min(arr.length, capacity);
            for (let i = 0; i < limit; i++) {
                const p = arr[i];
                const [sx, sy] = PROJECTILE_SCALE[p.variant ?? ''] ?? DEFAULT_SCALE;
                dummy.position.set(p.x, 1, p.z);
                dummy.scale.set(sx, sy, 1);
                if (SPIN_VARIANTS.has(p.variant ?? '')) {
                    const a = (spinRef.current.get(p.id) ?? 0) + delta * 15;
                    spinRef.current.set(p.id, a);
                    dummy.rotation.set(0, 0, a);
                } else if (ALIGN_VARIANTS.has(p.variant ?? '')) {
                    dummy.rotation.set(0, 0, -Math.atan2(p.vz, p.vx) - Math.PI / 2);
                } else {
                    dummy.rotation.set(0, 0, 0);
                }
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.count = limit;
            mesh.instanceMatrix.needsUpdate = true;
            idleFramesRef.current.set(key, 0);
        });

        meshesRef.current.forEach((mesh, key) => {
            if (groups.has(key)) return;
            if (mesh.count !== 0) {
                mesh.count = 0;
                mesh.instanceMatrix.needsUpdate = true;
            }
            const idle = (idleFramesRef.current.get(key) ?? 0) + 1;
            if (idle > 60) {
                host.remove(mesh);
                disposeInstancedMesh(mesh);
                meshesRef.current.delete(key);
                idleFramesRef.current.delete(key);
            } else {
                idleFramesRef.current.set(key, idle);
            }
        });

        spinGcCounterRef.current += 1;
        if (spinGcCounterRef.current >= 30) {
            spinGcCounterRef.current = 0;
            const liveIds = new Set<string>();
            for (let i = 0; i < projectiles.length; i++) liveIds.add(projectiles[i].id);
            spinRef.current.forEach((_, id) => {
                if (!liveIds.has(id)) spinRef.current.delete(id);
            });
        }
    });

    return <group ref={hostRef} />;
};

interface HostileProjectilesInstancedProps {
    projectilesRef: MutableRefObject<Projectile[]>;
}

type HostileVoxelGroup = {
    core: THREE.InstancedMesh;
    bits: THREE.InstancedMesh;
};

type HostileSpin = {
    rx: number;
    rz: number;
    bitAngle: number;
};

const makeHostileVoxelGroup = (color: string, capacity: number): HostileVoxelGroup => {
    const coreMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 1,
    });
    const bitMaterial = new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        transparent: true,
        opacity: 1,
    });
    const core = new THREE.InstancedMesh(VOXEL_CORE_GEO, coreMaterial, capacity);
    const bits = new THREE.InstancedMesh(VOXEL_BIT_GEO, bitMaterial, capacity * 2);
    core.frustumCulled = false;
    bits.frustumCulled = false;
    core.count = 0;
    bits.count = 0;
    return { core, bits };
};

const disposeHostileVoxelGroup = (group: HostileVoxelGroup) => {
    disposeInstancedMesh(group.core);
    disposeInstancedMesh(group.bits);
};

export const HostileProjectilesInstanced: React.FC<HostileProjectilesInstancedProps> = ({ projectilesRef }) => {
    const hostRef = useRef<THREE.Group>(null);
    const groupsRef = useRef<Map<string, HostileVoxelGroup>>(new Map());
    const idleFramesRef = useRef<Map<string, number>>(new Map());
    const spinRef = useRef<Map<string, HostileSpin>>(new Map());
    const spinGcCounterRef = useRef(0);
    const dummy = useRef(new THREE.Object3D()).current;

    useEffect(() => {
        return () => {
            const host = hostRef.current;
            groupsRef.current.forEach((group) => {
                if (host) {
                    host.remove(group.core);
                    host.remove(group.bits);
                }
                disposeHostileVoxelGroup(group);
            });
            groupsRef.current.clear();
            idleFramesRef.current.clear();
            spinRef.current.clear();
        };
    }, []);

    useFrame((_, delta) => {
        const host = hostRef.current;
        if (!host) return;

        const byColor = new Map<string, Projectile[]>();
        const projectiles = projectilesRef.current;
        for (let i = 0; i < projectiles.length; i++) {
            const p = projectiles[i];
            if (p.fromPlayer) continue;
            const key = p.color || '#ffffff';
            let arr = byColor.get(key);
            if (!arr) { arr = []; byColor.set(key, arr); }
            arr.push(p);
        }

        byColor.forEach((arr, color) => {
            const requiredCapacity = getInstanceCapacity(arr.length);
            let group = groupsRef.current.get(color);
            if (!group || group.core.instanceMatrix.count < requiredCapacity) {
                if (group) {
                    host.remove(group.core);
                    host.remove(group.bits);
                    disposeHostileVoxelGroup(group);
                }
                group = makeHostileVoxelGroup(color, requiredCapacity);
                groupsRef.current.set(color, group);
                host.add(group.core);
                host.add(group.bits);
            }

            const capacity = group.core.instanceMatrix.count;
            const limit = Math.min(arr.length, capacity);
            for (let i = 0; i < limit; i++) {
                const p = arr[i];
                const spin = spinRef.current.get(p.id) ?? { rx: 0, rz: 0, bitAngle: 0 };
                spin.rx += delta * 2.5;
                spin.rz += delta * 1.5;
                spin.bitAngle -= delta * 4;
                spinRef.current.set(p.id, spin);

                dummy.position.set(p.x, 1, p.z);
                dummy.rotation.set(spin.rx, 0, spin.rz);
                dummy.scale.set(HOSTILE_VOXEL_SCALE, HOSTILE_VOXEL_SCALE, HOSTILE_VOXEL_SCALE);
                dummy.updateMatrix();
                group.core.setMatrixAt(i, dummy.matrix);

                const bitBaseIndex = i * 2;
                for (let side = 0; side < 2; side++) {
                    const angle = spin.bitAngle + side * Math.PI;
                    dummy.position.set(
                        p.x + Math.cos(angle) * HOSTILE_VOXEL_BIT_OFFSET,
                        1,
                        p.z + Math.sin(angle) * HOSTILE_VOXEL_BIT_OFFSET,
                    );
                    dummy.rotation.set(spin.rx, angle, spin.rz);
                    dummy.scale.set(HOSTILE_VOXEL_BIT_SCALE, HOSTILE_VOXEL_BIT_SCALE, HOSTILE_VOXEL_BIT_SCALE);
                    dummy.updateMatrix();
                    group.bits.setMatrixAt(bitBaseIndex + side, dummy.matrix);
                }
            }

            group.core.count = limit;
            group.bits.count = limit * 2;
            group.core.instanceMatrix.needsUpdate = true;
            group.bits.instanceMatrix.needsUpdate = true;
            idleFramesRef.current.set(color, 0);
        });

        groupsRef.current.forEach((group, color) => {
            if (byColor.has(color)) return;
            if (group.core.count !== 0 || group.bits.count !== 0) {
                group.core.count = 0;
                group.bits.count = 0;
                group.core.instanceMatrix.needsUpdate = true;
                group.bits.instanceMatrix.needsUpdate = true;
            }
            const idle = (idleFramesRef.current.get(color) ?? 0) + 1;
            if (idle > 60) {
                host.remove(group.core);
                host.remove(group.bits);
                disposeHostileVoxelGroup(group);
                groupsRef.current.delete(color);
                idleFramesRef.current.delete(color);
            } else {
                idleFramesRef.current.set(color, idle);
            }
        });

        spinGcCounterRef.current += 1;
        if (spinGcCounterRef.current >= 30) {
            spinGcCounterRef.current = 0;
            const liveHostileIds = new Set<string>();
            for (let i = 0; i < projectiles.length; i++) {
                if (!projectiles[i].fromPlayer) liveHostileIds.add(projectiles[i].id);
            }
            spinRef.current.forEach((_, id) => {
                if (!liveHostileIds.has(id)) spinRef.current.delete(id);
            });
        }
    });

    return <group ref={hostRef} />;
};

interface SpecialProjectilesProps {
    projectilesRef: MutableRefObject<Projectile[]>;
}

const isSpecial = (p: Projectile): boolean => {
    if (!p.fromPlayer) return false;
    return !isInstanceable(p);
};

export const SpecialProjectiles: React.FC<SpecialProjectilesProps> = ({ projectilesRef }) => {
    const [specials, setSpecials] = useState<Projectile[]>([]);
    const lastSigRef = useRef('');

    useFrame(() => {
        const filtered: Projectile[] = [];
        const arr = projectilesRef.current;
        for (let i = 0; i < arr.length; i++) {
            if (isSpecial(arr[i])) filtered.push(arr[i]);
        }
        let sig = String(filtered.length);
        for (let i = 0; i < filtered.length; i++) sig += '|' + filtered[i].id;
        if (sig !== lastSigRef.current) {
            lastSigRef.current = sig;
            setSpecials(filtered);
        }
    });

    return (
        <>
            {specials.map((p) => {
                if (p.variant === 'LAVA_POOL' || p.variant === 'POISON_CLOUD' || p.variant === 'PLAGUE_SPREADER') {
                    return <AreaEffectRender key={p.id} projectile={p} />;
                }
                if (p.variant === 'FIRE_MORTAR' || p.variant === 'TOXIC_FLASK') {
                    return <MortarProjectile key={p.id} projectile={p} />;
                }
                if (p.variant === 'HOLY_BEAM') {
                    return <HolyBeamRender key={p.id} projectile={p} />;
                }
                return null;
            })}
        </>
    );
};
