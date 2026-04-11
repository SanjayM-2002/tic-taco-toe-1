import { useState, useEffect } from "react";

interface TimerProps {
  deadline: number; // epoch seconds, 0 = no timer
  active: boolean;
}

export function Timer({ deadline, active }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!active || deadline === 0) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, deadline - Math.floor(Date.now() / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline, active]);

  if (deadline === 0 || !active) return null;

  const urgent = secondsLeft <= 10;
  const percentage = Math.min(100, (secondsLeft / 30) * 100);

  return (
    <div className={`timer ${urgent ? "timer--urgent" : ""}`}>
      <div className="timer__bar">
        <div className="timer__fill" style={{ width: `${percentage}%` }} />
      </div>
      <span className="timer__text">{secondsLeft}s</span>
    </div>
  );
}
