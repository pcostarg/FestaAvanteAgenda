import React from 'react';

export interface AgoraNeedleProps {
  currentTime?: string;
  percentage: number;
  isActive: boolean;
  showBadge?: boolean;
}

export const AgoraNeedle: React.FC<AgoraNeedleProps> = ({
  currentTime,
  percentage,
  isActive,
  showBadge = false,
}) => {
  if (!isActive) return null;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center -translate-x-1/2 z-10"
      style={{ left: `${percentage}%` }}
    >
      {showBadge && currentTime && (
        /* Floating Badge pinned to top ruler */
        <div className="sticky top-1 z-[35] transform -translate-x-1/2">
          <div className="bg-live-indicator text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-live-glow flex items-center gap-1.5 whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>AGORA {currentTime}</span>
          </div>
        </div>
      )}

      {/* Vertical Neon Line */}
      <div className="w-0.5 flex-1 bg-live-indicator shadow-live-glow"></div>
    </div>
  );
};
