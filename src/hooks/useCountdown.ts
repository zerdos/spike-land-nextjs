import { useCallback, useEffect, useState } from "react";
import { useInterval } from "./useInterval";

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

/**
 * Custom hook to calculate time remaining until a target date.
 * Updates every second using useInterval.
 *
 * @param targetDate - The Date object to count down to
 * @returns CountdownTime object containing days, hours, minutes, seconds and completion status
 */
export function useCountdown(targetDate: Date): CountdownTime {
  const targetTime = targetDate.getTime();

  const calculateTimeLeft = useCallback((): CountdownTime => {
    const difference = targetTime - new Date().getTime();

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isComplete: true,
      };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isComplete: false,
    };
  }, [targetTime]);

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft());

  // Update the countdown every second
  useInterval(
    () => {
      setTimeLeft(calculateTimeLeft());
    },
    timeLeft.isComplete ? null : 1000,
  );

  // Sync timeLeft if targetDate changes
  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
  }, [calculateTimeLeft, targetTime]);

  return timeLeft;
}
