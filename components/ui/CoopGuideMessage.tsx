import React from 'react';

interface CoopGuideMessageProps {
  message: string | null;
}

export const CoopGuideMessage: React.FC<CoopGuideMessageProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3 w-full max-w-[100vw]">
      <div className="mx-auto pixel-art text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded bg-black/70 border border-white/20 whitespace-normal break-words text-center max-w-[min(92vw,34rem)]">
        {message}
      </div>
    </div>
  );
};
