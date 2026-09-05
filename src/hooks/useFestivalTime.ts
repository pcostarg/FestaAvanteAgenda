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

/**
 * Converts a JavaScript Date into the appropriate FestivalDay,
 * taking into account nocturnal hours past midnight (< 06:00) belonging to the previous day.
 */
export function getFestivalDayFromDate(date: Date): FestivalDay {
  const effectiveDate = new Date(date.getTime());
  // Festival nocturnal hours before 06:00 belong to the previous festival day
  if (effectiveDate.getHours() < 6) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  }

  const y = effectiveDate.getFullYear();
  const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
  const d = String(effectiveDate.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  if (dateStr === '2025-09-05') return 'sexta';
  if (dateStr === '2025-09-06') return 'sabado';
  if (dateStr === '2025-09-07') return 'domingo';

  // Day of week: Friday (5), Saturday (6), Sunday (0)
  const dayOfWeek = effectiveDate.getDay();
  if (dayOfWeek === 5) return 'sexta';
  if (dayOfWeek === 6) return 'sabado';
  if (dayOfWeek === 0) return 'domingo';

  return 'sexta';
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

  const [currentDay, setCurrentDay] = useState<FestivalDay>(() => {
    if (simulatedDay) return simulatedDay;
    return getFestivalDayFromDate(new Date());
  });

  useEffect(() => {
    if (simulatedDay) {
      setCurrentDay(simulatedDay);
    }
    if (simulatedTime) {
      setRealTime(simulatedTime);
      return;
    }
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setRealTime(`${h}:${m}`);
      if (!simulatedDay) {
        setCurrentDay(getFestivalDayFromDate(now));
      }
    };
    update();
    const interval = setInterval(update, tickIntervalMs);
    return () => clearInterval(interval);
  }, [simulatedTime, simulatedDay, tickIntervalMs]);

  const activeTimeStr = simulatedTime || realTime;

  const currentMinutes = useMemo(() => {
    try {
      return timeToFestivalMinutes(activeTimeStr);
    } catch {
      return 1080; // 18:00 fallback
    }
  }, [activeTimeStr]);

  const axisStart = 480;  // 08:00
  const axisEnd = 1560;   // 02:00
  const totalSpan = axisEnd - axisStart; // 1080

  const isOperatingWindow = currentMinutes >= axisStart && currentMinutes <= axisEnd;

  const agoraPercentage = useMemo(() => {
    if (currentMinutes <= axisStart) return 0;
    if (currentMinutes >= axisEnd) return 100;
    return ((currentMinutes - axisStart) / totalSpan) * 100;
  }, [currentMinutes, axisStart, axisEnd, totalSpan]);

  return {
    currentTime: activeTimeStr,
    currentMinutes,
    isOperatingWindow,
    agoraPercentage,
    currentDay,
  };
}
