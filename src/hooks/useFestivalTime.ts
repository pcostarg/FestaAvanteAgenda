/**
 * Festa do Avante! 2025 - Festival Time Hook
 * File: src/hooks/useFestivalTime.ts
 *
 * Tracks current festival operating time, maps it to continuous festival minutes,
 * and calculates proportional AGORA needle coordinates across the 10:00 - 02:00 window.
 */

import { useState, useEffect, useMemo } from 'react';
import type { FestivalDay } from '../types/program';
import { timeToFestivalMinutes } from '../utils/conflictDetector';

export interface UseFestivalTimeOptions {
  simulatedTime?: string;
  simulatedDay?: FestivalDay;
  tickIntervalMs?: number;
}

export interface UseFestivalTimeReturn {
  currentTime: string;
  currentMinutes: number;
  isOperatingWindow: boolean;
  agoraPercentage: number;
  currentDay: FestivalDay;
}

export function useFestivalTime(options: UseFestivalTimeOptions = {}): UseFestivalTimeReturn {
  const { simulatedTime, simulatedDay, tickIntervalMs = 30000 } = options;

  const [realTime, setRealTime] = useState<string>(() => {
    if (simulatedTime) return simulatedTime;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  useEffect(() => {
    if (simulatedTime) {
      setRealTime(simulatedTime);
      return;
    }
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setRealTime(`${h}:${m}`);
    };
    update();
    const interval = setInterval(update, tickIntervalMs);
    return () => clearInterval(interval);
  }, [simulatedTime, tickIntervalMs]);

  const activeTimeStr = simulatedTime || realTime;

  const currentMinutes = useMemo(() => {
    try {
      return timeToFestivalMinutes(activeTimeStr);
    } catch {
      return 1080; // 18:00 fallback
    }
  }, [activeTimeStr]);

  const axisStart = 600;  // 10:00
  const axisEnd = 1560;   // 02:00
  const totalSpan = axisEnd - axisStart; // 960

  const isOperatingWindow = currentMinutes >= axisStart && currentMinutes <= axisEnd;

  const agoraPercentage = useMemo(() => {
    if (currentMinutes <= axisStart) return 0;
    if (currentMinutes >= axisEnd) return 100;
    return ((currentMinutes - axisStart) / totalSpan) * 100;
  }, [currentMinutes, axisStart, axisEnd, totalSpan]);

  const currentDay: FestivalDay = simulatedDay || 'sexta';

  return {
    currentTime: activeTimeStr,
    currentMinutes,
    isOperatingWindow,
    agoraPercentage,
    currentDay,
  };
}
