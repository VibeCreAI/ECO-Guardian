import React, { useEffect, useMemo, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AiStageConfig } from '../../types';
import kenpixelFontUrl from 'three/examples/fonts/ttf/kenpixel.ttf?url';

interface InWorldTextProps {
  landmarkPos: [number, number, number];
  portalCenterPos: [number, number, number];
  shopPos: [number, number, number];
  showNarrative: boolean;
  narrativeDismissed: boolean;
  stageConfig: AiStageConfig | null;
  onNarrativeDone: () => void;
  hasBossPortal: boolean;
  bossPortalPos: [number, number, number] | null;
}

const applyTextOpacity = (text: any, opacity: number) => {
  if (!text?.material) return;
  text.material.transparent = true;
  text.material.opacity = opacity;
  text.material.depthWrite = false;
};

const applyMaterialOpacity = (material: THREE.MeshBasicMaterial | null, opacity: number) => {
  if (!material) return;
  material.opacity = opacity;
  material.transparent = true;
  material.depthWrite = false;
};

interface GroundTextPanelProps {
  width: number;
  height: number;
  opacity?: number;
  bgColor?: string;
  borderColor?: string;
  accentColor?: string;
  materialRef?: React.Ref<THREE.MeshBasicMaterial>;
}

const GroundTextPanel: React.FC<GroundTextPanelProps> = ({
  width,
  height,
  opacity = 0.34,
  bgColor = '#082012',
  borderColor = '#020805',
  accentColor = '#4ade80',
  materialRef,
}) => {
  const edge = 0.08;
  const corner = 0.26;
  const halfW = width / 2;
  const halfH = height / 2;

  return (
    <>
      <mesh position={[0, 0, -0.03]} renderOrder={0}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={materialRef}
          color={bgColor}
          transparent
          opacity={opacity}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, halfH - edge / 2, -0.015]} renderOrder={1}>
        <planeGeometry args={[width, edge]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.68} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, -halfH + edge / 2, -0.015]} renderOrder={1}>
        <planeGeometry args={[width, edge]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.68} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[-halfW + edge / 2, 0, -0.015]} renderOrder={1}>
        <planeGeometry args={[edge, height]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.68} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[halfW - edge / 2, 0, -0.015]} renderOrder={1}>
        <planeGeometry args={[edge, height]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.68} toneMapped={false} depthWrite={false} />
      </mesh>

      {[
        [-halfW + corner / 2, halfH - corner / 2, -0.005],
        [halfW - corner / 2, halfH - corner / 2, -0.005],
        [-halfW + corner / 2, -halfH + corner / 2, -0.005],
        [halfW - corner / 2, -halfH + corner / 2, -0.005],
      ].map((position, idx) => (
        <mesh key={idx} position={position as [number, number, number]} renderOrder={2}>
          <planeGeometry args={[corner, corner]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.72} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
};

export const InWorldText: React.FC<InWorldTextProps> = ({
  landmarkPos,
  portalCenterPos,
  showNarrative,
  narrativeDismissed,
  stageConfig,
  onNarrativeDone,
  hasBossPortal,
  shopPos,
  bossPortalPos,
}) => {
  const narrativeDoneRef = useRef(false);

  const narrativeTitleRef = useRef<any>(null);
  const narrativeBodyRef = useRef<any>(null);
  const narrativeBgRef = useRef<THREE.MeshBasicMaterial>(null);

  const quizHeaderRef = useRef<any>(null);
  const quizQuestionRef = useRef<any>(null);
  const quizBgRef = useRef<THREE.MeshBasicMaterial>(null);

  const narrativePosition = useMemo<[number, number, number]>(
    () => [landmarkPos[0], 0.08, landmarkPos[2] + 8],
    [landmarkPos],
  );

  const quizPosition = useMemo<[number, number, number]>(
    () => [portalCenterPos[0], 0.08, portalCenterPos[2] + 6],
    [portalCenterPos],
  );

  const shopTextPos = useMemo<[number, number, number]>(
    () => [shopPos[0], 0.08, shopPos[2] + 4],
    [shopPos],
  );

  const bossTextPos = useMemo<[number, number, number] | null>(
    () => bossPortalPos ? [bossPortalPos[0], 0.08, bossPortalPos[2] + 5] : null,
    [bossPortalPos],
  );

  const quizVisible = Boolean((showNarrative || narrativeDismissed) && stageConfig?.quiz?.question && !hasBossPortal);

  useEffect(() => {
    narrativeDoneRef.current = false;
  }, [stageConfig?.stageName]);

  useEffect(() => {
    if (showNarrative && !narrativeDoneRef.current) {
      narrativeDoneRef.current = true;
      onNarrativeDone();
    }
  }, [showNarrative, onNarrativeDone]);

  useFrame((state) => {
    if (quizVisible) {
      const pulse = 0.84 + Math.sin(state.clock.elapsedTime * 3.2) * 0.12;
      applyTextOpacity(quizHeaderRef.current, pulse);
      applyTextOpacity(quizQuestionRef.current, pulse);
      applyMaterialOpacity(quizBgRef.current, 0.3 + Math.sin(state.clock.elapsedTime * 2.4) * 0.04);
    }
  });

  return (
    <>
      {stageConfig && (
        <group position={narrativePosition} rotation={[-Math.PI / 2, 0, 0]}>
          <GroundTextPanel width={14} height={5} materialRef={narrativeBgRef} opacity={0.32} />

          <Text
            ref={narrativeTitleRef}
            font={kenpixelFontUrl}
            fontSize={0.7}
            color="#a3ff12"
            position={[0, 1.2, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={12}
            textAlign="center"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {stageConfig.stageName.toUpperCase()}
          </Text>

          <Text
            ref={narrativeBodyRef}
            font={kenpixelFontUrl}
            fontSize={0.35}
            color="#d8ffd0"
            position={[0, -0.4, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={12.5}
            textAlign="center"
            lineHeight={1.45}
            outlineWidth={0.04}
            outlineColor="#000000"
          >
            {stageConfig.narrativeIntro}
          </Text>
        </group>
      )}

      {quizVisible && stageConfig?.quiz && (
        <group position={quizPosition} rotation={[-Math.PI / 2, 0, 0]}>
          <GroundTextPanel width={12} height={3.6} materialRef={quizBgRef} opacity={0.3} />

          <Text
            ref={quizHeaderRef}
            font={kenpixelFontUrl}
            fontSize={0.35}
            color="#a3ff12"
            position={[0, 1.0, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={10}
            textAlign="center"
            outlineWidth={0.04}
            outlineColor="#000000"
          >
            GAIA ASKS...
          </Text>

          <Text
            ref={quizQuestionRef}
            font={kenpixelFontUrl}
            fontSize={0.42}
            color="#fde047"
            position={[0, -0.2, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={10.5}
            textAlign="center"
            lineHeight={1.4}
            outlineWidth={0.04}
            outlineColor="#000000"
          >
            {stageConfig.quiz.question}
          </Text>
        </group>
      )}

      {hasBossPortal && bossTextPos && stageConfig?.boss && (
        <group position={bossTextPos} rotation={[-Math.PI / 2, 0, 0]}>
          <GroundTextPanel
            width={12}
            height={3.4}
            bgColor="#240d0d"
            accentColor="#ef4444"
            opacity={0.34}
          />

          <Text
            font={kenpixelFontUrl}
            fontSize={0.5}
            color="#f87171"
            position={[0, 0.8, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={10}
            textAlign="center"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {stageConfig.boss.name}
          </Text>

          <Text
            font={kenpixelFontUrl}
            fontSize={0.28}
            color="#fca5a5"
            position={[0, -0.3, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={10.5}
            textAlign="center"
            lineHeight={1.4}
            outlineWidth={0.03}
            outlineColor="#000000"
          >
            {stageConfig.boss.narrative}
          </Text>
        </group>
      )}

      <group position={shopTextPos} rotation={[-Math.PI / 2, 0, 0]}>
        <GroundTextPanel width={10} height={3} opacity={0.28} />

        <Text
          font={kenpixelFontUrl}
          fontSize={0.55}
          color="#a3ff12"
          position={[0, 0.65, 0.01]}
          anchorX="center"
          anchorY="middle"
          maxWidth={8}
          textAlign="center"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          ECO-MART
        </Text>

        <Text
          font={kenpixelFontUrl}
          fontSize={0.26}
          color="#d8ffd0"
          position={[0, -0.3, 0.01]}
          anchorX="center"
          anchorY="middle"
          maxWidth={8.5}
          textAlign="center"
          lineHeight={1.4}
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          Spend carbon to upgrade weapons and unlock eco-abilities
        </Text>
      </group>
    </>
  );
};
