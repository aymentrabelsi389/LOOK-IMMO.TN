import React, { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  value: string | number;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 800 }) => {
  const [count, setCount] = useState(0);
  const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;

  useEffect(() => {
    if (target <= 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [target, duration]);

  return <span>{count.toLocaleString('fr-FR')}</span>;
};

export default AnimatedCounter;
