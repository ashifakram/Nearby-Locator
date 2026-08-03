import React, { useState, useEffect } from 'react';

/**
 * CountdownTimer — shows a live seconds countdown, calls onTimerEnd when complete.
 * Renders null once countdown finishes.
 */
export default function CountdownTimer({ initialSeconds = 60, onTimerEnd, className = '' }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  // Reset when initialSeconds prop changes (e.g. after resend)
  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onTimerEnd) onTimerEnd();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onTimerEnd]);

  if (secondsLeft <= 0) return null;

  return (
    <span className={`text-xs font-medium text-slate-500 ${className}`}>
      Resend available in{' '}
      <strong className="text-blue-600 font-bold tabular-nums">{secondsLeft}s</strong>
    </span>
  );
}
