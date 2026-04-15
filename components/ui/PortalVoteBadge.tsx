import React from 'react';

const SLOT_BADGE_COLORS = ['#fbbf24', '#f97316', '#94a3b8', '#60a5fa'];

interface PortalVoteBadgeProps {
  voters: string[];
  required: number;
  voterSlotsByPlayerId: Record<string, number>;
  screenPos: { x: number; y: number };
  countdownSeconds?: number | null;
}

export const PortalVoteBadge: React.FC<PortalVoteBadgeProps> = ({
  voters,
  required,
  voterSlotsByPlayerId,
  screenPos,
  countdownSeconds,
}) => {
  if (!voters.length) return null;
  return (
    <div
      className="pointer-events-none absolute flex flex-col items-center"
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="pixel-art text-white text-xs px-2 py-1 rounded bg-black/70 border border-white/20">
        {voters.length} / {required}
      </div>
      <div className="flex gap-1 mt-1">
        {voters.map((playerId) => {
          const slot = voterSlotsByPlayerId[playerId] ?? 0;
          return (
            <span
              key={playerId}
              className="w-2 h-2 rounded-full border border-white/60"
              style={{ backgroundColor: SLOT_BADGE_COLORS[slot] ?? '#fff' }}
            />
          );
        })}
      </div>
      {countdownSeconds != null && countdownSeconds > 0 && (
        <div className="pixel-art text-yellow-300 text-[10px] mt-1 bg-black/60 px-1 rounded">
          {countdownSeconds}…
        </div>
      )}
    </div>
  );
};
