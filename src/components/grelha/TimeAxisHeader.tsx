import React from 'react';
import { festivalMinutesToTime } from '../../utils/conflictDetector';

export interface TimeAxisHeaderProps {
  currentTime?: string;
  agoraPercentage?: number;
  isAgoraActive?: boolean;
}

export const TimeAxisHeader: React.FC<TimeAxisHeaderProps> = ({
  currentTime,
  agoraPercentage,
  isAgoraActive,
}) => {
  // Hours from 08:00 to 02:00 (19 hourly marks: 480, 540, ..., 1560)
  const hours = Array.from({ length: 19 }, (_, i) => 480 + i * 60);

  return (
    <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-border-subtle flex h-10 select-none min-w-max">
      {/* Sticky Corner Cell (matches compact width of stage tracks) */}
      <div className="sticky left-0 z-40 bg-surface border-r border-border-subtle w-28 sm:w-36 md:w-40 shrink-0 flex items-center px-2.5 sm:px-3">
        <span className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">
          Palco
        </span>
      </div>

      {/* 2400px Timeline Track with Hour Markers and 15-min Minor Ticks */}
      <div className="relative w-[2400px] shrink-0 flex">
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

        {/* Live AGORA Badge pinned to TimeAxis ruler */}
        {isAgoraActive && agoraPercentage !== undefined && currentTime && (
          <div
            className="absolute top-1 transform -translate-x-1/2 z-20 pointer-events-none"
            style={{ left: `${agoraPercentage}%` }}
          >
            <div className="bg-live-indicator text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-live-glow flex items-center gap-1.5 whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>AGORA {currentTime}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
