import React from 'react';
import { festivalMinutesToTime } from '../../utils/conflictDetector';

export const TimeAxisHeader: React.FC = () => {
  // Hours from 08:00 to 02:00 (19 hourly marks: 480, 540, ..., 1560)
  const hours = Array.from({ length: 19 }, (_, i) => 480 + i * 60);

  return (
    <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-border-subtle flex h-10 select-none">
      {/* Sticky Corner Cell */}
      <div className="sticky left-0 z-30 bg-surface border-r border-border-subtle w-44 md:w-48 shrink-0 flex items-center px-4">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
          Palco
        </span>
      </div>

      {/* Timeline Ruler */}
      <div className="relative w-[2400px] shrink-0 h-full">
        {hours.map((minutes) => {
          const leftPercent = ((minutes - 480) / 1080) * 100;
          const timeLabel = festivalMinutesToTime(minutes);

          return (
            <div
              key={minutes}
              style={{ left: `${leftPercent}%` }}
              className="absolute top-0 bottom-0 flex flex-col justify-between transform -translate-x-1/2 border-l border-border-subtle/50 pl-1"
            >
              <span className="text-[11px] font-mono font-bold text-text-secondary">
                {timeLabel}
              </span>
              <div className="h-1.5 w-0.5 bg-border-highlight"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
