
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface QuestArrowProps {
    playerRef?: React.RefObject<THREE.Group>;
    playerPosition?: THREE.Vector3;
    target: { x: number, z: number };
}

export const QuestArrow: React.FC<QuestArrowProps> = ({ playerRef, playerPosition, target }) => {
    const groupRef = useRef<THREE.Group>(null);
    const arrowRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const currentPos = playerPosition || playerRef?.current?.position;
        if (!groupRef.current || !currentPos) return;
        
        groupRef.current.position.copy(currentPos);
        groupRef.current.lookAt(target.x, currentPos.y, target.z);

        if (arrowRef.current) { 
            const t = state.clock.elapsedTime; 
            arrowRef.current.position.y = 0.5 + Math.sin(t * 5) * 0.2; 
            const scale = 1.0 + Math.sin(t * 10) * 0.2; 
            arrowRef.current.scale.set(scale, scale, scale); 
        }
    });

    return (
        <group ref={groupRef}>
            <group ref={arrowRef} position={[0, 0, 3]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.5, 1.2, 4]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} toneMapped={false} />
                </mesh>
                <pointLight distance={3} intensity={2} color="#fbbf24" decay={2} />
            </group>
        </group>
    );
};
