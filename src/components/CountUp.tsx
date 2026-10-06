/**
 * Compteur animé 0 → valeur (design §6, 600 ms, out-cubic). Valeur finale directe
 * si « Réduire les animations ».
 */
import { useEffect, useState } from 'react';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

const STEP_MS = 30;

export function useCountUp(target: number, duration: number = motion.count): number {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(reduceMotion || target <= 0 ? target : 0);

  useEffect(() => {
    if (reduceMotion || target <= 0) {
      setValue(target);
      return;
    }
    const start = Date.now();
    setValue(0);
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t >= 1) clearInterval(timer);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [target, duration, reduceMotion]);

  return value;
}

export function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value)}</>;
}
