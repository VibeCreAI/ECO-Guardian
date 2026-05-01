import React, { useEffect, useMemo, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AiStageConfig } from '../../types';

const groundTextFontUrl = '/assets/font/DungGeunMo.ttf';

export const QUIZ_GROUND_TEXT_PANEL = {
  width: 14.5,
  height: 4.8,
  offsetZ: 6,
} as const;

export const BOSS_GROUND_TEXT_PANEL = {
  width: 12.8,
  height: 3.8,
  offsetZ: 5,
} as const;

export const STAGE_INTRO_GROUND_TEXT_PANEL = {
  width: 13.5,
  height: 4.4,
  offsetZ: 8,
} as const;

export const getStageIntroGroundTextPanel = (stageName?: string | null) => {
  if (stageName === 'The Null Void') {
    return {
      ...STAGE_INTRO_GROUND_TEXT_PANEL,
      height: 5.3,
    };
  }

  return STAGE_INTRO_GROUND_TEXT_PANEL;
};

export const SHOP_GROUND_TEXT_PANEL = {
  width: 11.2,
  height: 2.9,
  offsetZ: 4,
} as const;

export const VIBEJAM_GROUND_TEXT_PANEL = {
  width: 12,
  height: 3.05,
  offsetZ: 4.5,
} as const;

export type GroundTextHighlights = Partial<Record<
  'stageIntro' | 'quiz' | 'boss' | 'shop' | 'vibeJamNext' | 'vibeJamReturn',
  boolean
>>;

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
  vibeJamNextPos: [number, number, number];
  isPortalEntry: boolean;
  vibeJamReturnPos: [number, number, number];
  portalRefUrl: string | null;
  hideVibeJam?: boolean;
  highlights?: GroundTextHighlights;
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
  highlighted?: boolean;
}

const GroundTextPanel: React.FC<GroundTextPanelProps> = ({
  width,
  height,
  opacity = 0.34,
  bgColor = '#082012',
  borderColor = '#020805',
  accentColor = '#4ade80',
  materialRef,
  highlighted = false,
}) => {
  const edge = 0.08;
  const corner = 0.26;
  const halfW = width / 2;
  const halfH = height / 2;
  const bgOpacity = highlighted ? Math.min(opacity + 0.12, 0.5) : opacity;
  const borderOpacity = highlighted ? 0.92 : 0.68;
  const accentOpacity = highlighted ? 0.96 : 0.72;

  return (
    <>
      {highlighted && (
        <mesh position={[0, 0, -0.065]} renderOrder={-1}>
          <planeGeometry args={[width + 0.55, height + 0.55]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.13}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh position={[0, 0, -0.03]} renderOrder={0}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={materialRef}
          color={bgColor}
          transparent
          opacity={bgOpacity}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, halfH - edge / 2, -0.015]} renderOrder={1}>
        <planeGeometry args={[width, edge]} />
        <meshBasicMaterial color={highlighted ? accentColor : borderColor} transparent opacity={borderOpacity} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, -halfH + edge / 2, -0.015]} renderOrder={1}>
        <planeGeometry args={[width, edge]} />
        <meshBasicMaterial color={highlighted ? accentColor : borderColor} transparent opacity={borderOpacity} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[-halfW + edge / 2, 0, -0.015]} renderOrder={1}>
        <planeGeometry args={[edge, height]} />
        <meshBasicMaterial color={highlighted ? accentColor : borderColor} transparent opacity={borderOpacity} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[halfW - edge / 2, 0, -0.015]} renderOrder={1}>
        <planeGeometry args={[edge, height]} />
        <meshBasicMaterial color={highlighted ? accentColor : borderColor} transparent opacity={borderOpacity} toneMapped={false} depthWrite={false} />
      </mesh>

      {[
        [-halfW + corner / 2, halfH - corner / 2, -0.005],
        [halfW - corner / 2, halfH - corner / 2, -0.005],
        [-halfW + corner / 2, -halfH + corner / 2, -0.005],
        [halfW - corner / 2, -halfH + corner / 2, -0.005],
      ].map((position, idx) => (
        <mesh key={idx} position={position as [number, number, number]} renderOrder={2}>
          <planeGeometry args={[corner, corner]} />
          <meshBasicMaterial color={accentColor} transparent opacity={accentOpacity} toneMapped={false} depthWrite={false} />
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
  vibeJamNextPos,
  isPortalEntry,
  vibeJamReturnPos,
  portalRefUrl,
  hideVibeJam = false,
  highlights,
}) => {
  const narrativeDoneRef = useRef(false);

  const narrativeTitleRef = useRef<any>(null);
  const narrativeBodyRef = useRef<any>(null);
  const narrativeBgRef = useRef<THREE.MeshBasicMaterial>(null);

  const quizHeaderRef = useRef<any>(null);
  const quizQuestionRef = useRef<any>(null);
  const quizBgRef = useRef<THREE.MeshBasicMaterial>(null);
  const stageIntroPanel = useMemo(
    () => getStageIntroGroundTextPanel(stageConfig?.stageName),
    [stageConfig?.stageName],
  );
  const stageIntroUsesTallPanel = stageIntroPanel.height > STAGE_INTRO_GROUND_TEXT_PANEL.height;

  const narrativePosition = useMemo<[number, number, number]>(
    () => [landmarkPos[0], 0.08, landmarkPos[2] + stageIntroPanel.offsetZ],
    [landmarkPos, stageIntroPanel.offsetZ],
  );

  const quizPosition = useMemo<[number, number, number]>(
    () => [portalCenterPos[0], 0.08, portalCenterPos[2] + QUIZ_GROUND_TEXT_PANEL.offsetZ],
    [portalCenterPos],
  );

  const shopTextPos = useMemo<[number, number, number]>(
    () => [shopPos[0], 0.08, shopPos[2] + SHOP_GROUND_TEXT_PANEL.offsetZ],
    [shopPos],
  );

  const bossTextPos = useMemo<[number, number, number] | null>(
    () => bossPortalPos ? [bossPortalPos[0], 0.08, bossPortalPos[2] + BOSS_GROUND_TEXT_PANEL.offsetZ] : null,
    [bossPortalPos],
  );

  const vibeJamNextTextPos = useMemo<[number, number, number]>(
    () => [vibeJamNextPos[0], 0.08, vibeJamNextPos[2] + VIBEJAM_GROUND_TEXT_PANEL.offsetZ],
    [vibeJamNextPos],
  );

  const vibeJamReturnTextPos = useMemo<[number, number, number]>(
    () => [vibeJamReturnPos[0], 0.08, vibeJamReturnPos[2] + VIBEJAM_GROUND_TEXT_PANEL.offsetZ],
    [vibeJamReturnPos],
  );
  const returnDestinationLabel = useMemo(() => {
    if (!portalRefUrl) return 'vibej.am';
    try {
      const parsed = new URL(portalRefUrl);
      return parsed.hostname;
    } catch {
      return portalRefUrl;
    }
  }, [portalRefUrl]);

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
          <GroundTextPanel
            width={stageIntroPanel.width}
            height={stageIntroPanel.height}
            materialRef={narrativeBgRef}
            opacity={0.32}
            highlighted={Boolean(highlights?.stageIntro)}
          />

          <Text
            ref={narrativeTitleRef}
            font={groundTextFontUrl}
            fontSize={1.25}
            color="#a3ff12"
            position={[0, stageIntroUsesTallPanel ? 1.48 : 1.08, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={12.5}
            textAlign="center"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {stageConfig.stageName.toUpperCase()}
          </Text>

          <Text
            ref={narrativeBodyRef}
            font={groundTextFontUrl}
            fontSize={0.72}
            color="#d8ffd0"
            position={[0, stageIntroUsesTallPanel ? -0.82 : -0.62, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={12.5}
            textAlign="center"
            lineHeight={1.18}
            outlineWidth={0.055}
            outlineColor="#000000"
          >
            {stageConfig.narrativeIntro}
          </Text>
        </group>
      )}

      {quizVisible && stageConfig?.quiz && (
        <group position={quizPosition} rotation={[-Math.PI / 2, 0, 0]}>
          <GroundTextPanel
            width={QUIZ_GROUND_TEXT_PANEL.width}
            height={QUIZ_GROUND_TEXT_PANEL.height}
            materialRef={quizBgRef}
            opacity={0.3}
            highlighted={Boolean(highlights?.quiz)}
          />

          <Text
            ref={quizHeaderRef}
            font={groundTextFontUrl}
            fontSize={1.0}
            color="#a3ff12"
            position={[0, 1.28, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={12.5}
            textAlign="center"
            outlineWidth={0.08}
            outlineColor="#000000"
          >
            CHOOSE YES OR NO PORTALS
          </Text>

          <Text
            ref={quizQuestionRef}
            font={groundTextFontUrl}
            fontSize={0.78}
            color="#fde047"
            position={[0, -0.82, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={12.3}
            textAlign="center"
            lineHeight={1.2}
            outlineWidth={0.06}
            outlineColor="#000000"
          >
            {stageConfig.quiz.question}
          </Text>
        </group>
      )}

      {hasBossPortal && bossTextPos && stageConfig?.boss && (
        <group position={bossTextPos} rotation={[-Math.PI / 2, 0, 0]}>
          <GroundTextPanel
            width={BOSS_GROUND_TEXT_PANEL.width}
            height={BOSS_GROUND_TEXT_PANEL.height}
            bgColor="#240d0d"
            accentColor="#ef4444"
            opacity={0.34}
            highlighted={Boolean(highlights?.boss)}
          />

          <Text
            font={groundTextFontUrl}
            fontSize={0.9}
            color="#f87171"
            position={[0, 0.9, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={11.5}
            textAlign="center"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {stageConfig.boss.name}
          </Text>

          <Text
            font={groundTextFontUrl}
            fontSize={0.56}
            color="#fca5a5"
            position={[0, -0.55, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={12}
            textAlign="center"
            lineHeight={1.2}
            outlineWidth={0.045}
            outlineColor="#000000"
          >
            {stageConfig.boss.narrative}
          </Text>
        </group>
      )}

      <group position={shopTextPos} rotation={[-Math.PI / 2, 0, 0]}>
        <GroundTextPanel
          width={SHOP_GROUND_TEXT_PANEL.width}
          height={SHOP_GROUND_TEXT_PANEL.height}
          opacity={0.28}
          highlighted={Boolean(highlights?.shop)}
        />

        <Text
          font={groundTextFontUrl}
          fontSize={1.18}
          color="#a3ff12"
          position={[0, 0.58, 0.01]}
          anchorX="center"
          anchorY="middle"
          maxWidth={10.2}
          textAlign="center"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          ECO-MART
        </Text>

        <Text
          font={groundTextFontUrl}
          fontSize={0.62}
          color="#d8ffd0"
          position={[0, -0.55, 0.01]}
          anchorX="center"
          anchorY="middle"
          maxWidth={10.4}
          textAlign="center"
          lineHeight={1.08}
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          Spend carbon to upgrade weapons and unlock eco-abilities
        </Text>
      </group>

      {/* ── VibeJam Next Portal ground label ── */}
      {!hideVibeJam && <group position={vibeJamNextTextPos} rotation={[-Math.PI / 2, 0, 0]}>
        <GroundTextPanel
          width={VIBEJAM_GROUND_TEXT_PANEL.width}
          height={VIBEJAM_GROUND_TEXT_PANEL.height}
          bgColor="#0d1f1f"
          borderColor="#050f0f"
          accentColor="#22d3ee"
          opacity={0.32}
          highlighted={Boolean(highlights?.vibeJamNext)}
        />

        <Text
          font={groundTextFontUrl}
          fontSize={1.1}
          color="#22d3ee"
          position={[0, 0.6, 0.01]}
          anchorX="center"
          anchorY="middle"
          maxWidth={11}
          textAlign="center"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          VIBE JAM PORTAL
        </Text>

        <Text
          font={groundTextFontUrl}
          fontSize={0.62}
          color="#a5f3fc"
          position={[0, -0.55, 0.01]}
          anchorX="center"
          anchorY="middle"
          maxWidth={11.2}
          textAlign="center"
          lineHeight={1.08}
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          Travel to other worlds in the VibeJam universe
        </Text>
      </group>}

      {/* ── VibeJam Return Portal ground label (portal entry only) ── */}
      {!hideVibeJam && isPortalEntry && (
        <group position={vibeJamReturnTextPos} rotation={[-Math.PI / 2, 0, 0]}>
          <GroundTextPanel
            width={VIBEJAM_GROUND_TEXT_PANEL.width}
            height={VIBEJAM_GROUND_TEXT_PANEL.height}
            bgColor="#1f0d0d"
            borderColor="#0f0505"
            accentColor="#fb923c"
            opacity={0.32}
            highlighted={Boolean(highlights?.vibeJamReturn)}
          />

          <Text
            font={groundTextFontUrl}
            fontSize={1.1}
            color="#fb923c"
            position={[0, 0.6, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={11}
            textAlign="center"
            outlineWidth={0.04}
            outlineColor="#000000"
          >
            RETURN PORTAL
          </Text>

          <Text
            font={groundTextFontUrl}
            fontSize={0.62}
            color="#fde68a"
            position={[0, -0.55, 0.01]}
            anchorX="center"
            anchorY="middle"
            maxWidth={11.2}
            textAlign="center"
            lineHeight={1.08}
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {`Back to: ${returnDestinationLabel}`}
          </Text>
        </group>
      )}
    </>
  );
};
