import { useState, useEffect, useCallback } from 'react';

/**
 * Timer hook for match countdown.
 * @param {number} durationMinutes - Timer duration in minutes
 * @param {boolean} enabled - Whether timer feature is enabled
 */
export function useTimer(durationMinutes, enabled) {
  const [seconds, setSeconds] = useState(durationMinutes * 60);
  const [running, setRunning] = useState(false);

  // Reset when duration changes
  useEffect(() => {
    setSeconds(durationMinutes * 60);
    setRunning(false);
  }, [durationMinutes]);

  // Countdown logic
  useEffect(() => {
    if (!running || seconds <= 0 || !enabled) return;

    const interval = setInterval(() => {
      setSeconds((t) => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, seconds, enabled]);

  const toggle = useCallback(() => setRunning((r) => !r), []);

  const reset = useCallback(() => {
    setSeconds(durationMinutes * 60);
    setRunning(false);
  }, [durationMinutes]);

  const formatTime = useCallback((secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    seconds,
    running,
    formatted: formatTime(seconds),
    toggle,
    reset,
    isExpired: seconds <= 0,
    isWarning: seconds <= 60 && seconds > 0
  };
}
