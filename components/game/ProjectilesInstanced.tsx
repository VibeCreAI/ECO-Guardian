
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
import { AreaEffectRender, MortarProjectile, HolyBeamRender, VoxelProjectile } from './ProjectileRender';

const PLANE_GEO = new THREE.PlaneGeometry(1, 1);
const INSTANCE_CAPACITY = 256;

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
                mesh.geometry = PLANE_GEO;
                const mat = mesh.material as THREE.Material | THREE.Material[];
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                else mat.dispose();
                mesh.dispose();
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
            if (!mesh) {
                const sample = arr[0];
                const tex = getProjectileTexture(
                    sample.variant ?? 'NORMAL',
                    sample.type ?? 'NORMAL',
                    sample.color,
                );
                const material = makeBillboardMaterial(tex);
                mesh = new THREE.InstancedMesh(PLANE_GEO, material, INSTANCE_CAPACITY);
                mesh.frustumCulled = false;
                mesh.count = 0;
                meshesRef.current.set(key, mesh);
                host.add(mesh);
            }
            const capacity = mesh.count === 0 ? INSTANCE_CAPACITY : (mesh.instanceMatrix.count);
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
                const mat = mesh.material as THREE.Material | THREE.Material[];
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                else mat.dispose();
                mesh.dispose();
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

interface SpecialProjectilesProps {
    projectilesRef: MutableRefObject<Projectile[]>;
}

const isSpecial = (p: Projectile): boolean => {
    if (!p.fromPlayer) return true;
    const v = p.variant;
    return v === 'LAVA_POOL' || v === 'POISON_CLOUD' || v === 'PLAGUE_SPREADER'
        || v === 'FIRE_MORTAR' || v === 'TOXIC_FLASK'
        || v === 'HOLY_BEAM';
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
                if (!p.fromPlayer) {
                    return <VoxelProjectile key={p.id} projectile={p} />;
                }
                return null;
            })}
        </>
    );
};
