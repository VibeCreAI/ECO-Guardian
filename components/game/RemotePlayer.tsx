import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getCachedPlayerSlotTextures, getPlayerSlotTextures, PlayerFrameKey } from './playerTint';
import type { SlotIndex } from '../../multiplayer/config';
import { INTERP_BUFFER_MS } from '../../multiplayer/config';
import type { PeerState, PlayerFacing } from '../../multiplayer/sync';

interface RemotePlayerProps {
  peer: PeerState;
  scale?: number;
}

const pickFrameKey = (facing: number, viewDirection: PlayerFacing, action: 'IDLE' | 'RUN'): PlayerFrameKey => {
  if (action !== 'RUN') return 'idle';
  if (viewDirection === 'UP') return 'walkNorth';
  if (viewDirection === 'DOWN') return 'walkSouth';
  return facing === 1 ? 'walkEast' : 'walkWest';
};

export const RemotePlayer: React.FC<RemotePlayerProps> = ({ peer, scale = 1.0 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [ready, setReady] = useState<boolean>(() => getCachedPlayerSlotTextures(peer.slotIndex) !== null);
  const trailsRef = useRef<Array<{ id: string; x: number; z: number; life: number }>>([]);
  const [renderTrails, setRenderTrails] = useState<Array<{ id: string; x: number; z: number; life: number }>>([]);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    getPlayerSlotTextures(peer.slotIndex as SlotIndex).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [peer.slotIndex, ready]);

  const prevRef = useRef({ x: peer.x, z: peer.z, t: performance.now() });
  const nextRef = useRef({ x: peer.x, z: peer.z, t: performance.now() });

  useEffect(() => {
    prevRef.current = { ...nextRef.current };
    nextRef.current = { x: peer.x, z: peer.z, t: performance.now() };
  }, [peer.x, peer.z]);

  useFrame(({ clock, camera }, delta) => {
    if (!meshRef.current || !matRef.current) return;
    meshRef.current.quaternion.copy(camera.quaternion);

    const now = performance.now() - INTERP_BUFFER_MS;
    const prev = prevRef.current;
    const next = nextRef.current;
    const span = Math.max(1, next.t - prev.t);
    const alpha = Math.max(0, Math.min(1, (now - prev.t) / span));
    const x = prev.x + (next.x - prev.x) * alpha;
    const z = prev.z + (next.z - prev.z) * alpha;
    meshRef.current.position.set(x, 0.9, z);
    meshRef.current.scale.set(scale, scale, 1);

    let needsTrailUpdate = false;
    if (peer.isDashing && Math.random() < 0.6) {
      trailsRef.current.push({
        id: `${clock.elapsedTime}_${Math.random().toString(36).slice(2, 7)}`,
        x,
        z,
        life: 0.3,
      });
      needsTrailUpdate = true;
    }
    if (trailsRef.current.length > 0) {
      trailsRef.current = trailsRef.current.filter((t) => {
        t.life -= delta;
        return t.life > 0;
      });
      needsTrailUpdate = true;
    }
    if (needsTrailUpdate) {
      setRenderTrails([...trailsRef.current]);
    }

    const textures = getCachedPlayerSlotTextures(peer.slotIndex);
    if (!textures) return;
    const frameKey = pickFrameKey(peer.facing || 1, peer.viewDirection, peer.action);
    const activeTex = textures[frameKey];
    if (matRef.current.map !== activeTex) {
      matRef.current.map = activeTex;
      matRef.current.needsUpdate = true;
    }
    const fps = 10;
    const totalFrames = 16;
    const frame = Math.floor(clock.elapsedTime * fps) % totalFrames;
    if (activeTex) {
      const col = frame % 4;
      const row = Math.floor(frame / 4);
      activeTex.offset.x = col * 0.25;
      activeTex.offset.y = 0.75 - row * 0.25;
    }
  });

  const nameYOffset = useMemo(() => 1.45, []);

  return (
    <>
      <group>
        {renderTrails.map((t) => (
          <mesh key={t.id} position={[t.x, 0.8, t.z]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial color="#bae6fd" transparent opacity={t.life} />
          </mesh>
        ))}
      </group>
      <mesh ref={meshRef} position={[peer.x, 0.9, peer.z]} scale={[scale, scale, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={matRef}
          transparent
          alphaTest={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {ready && (
        <mesh position={[peer.x, nameYOffset, peer.z]} scale={[0.01, 0.01, 0.01]} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </>
  );
};
