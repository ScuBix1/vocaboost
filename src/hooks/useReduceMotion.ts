/**
 * Préférence système « Réduire les animations » (design §3.3, §5.3).
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Dernière valeur connue, partagée par tous les composants : un écran monté après la première
 * lecture démarre directement avec le bon réglage (pas d'image animée avant la bascule, cf. recette v2 §8.4).
 */
let lastKnown = false;

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(lastKnown);

  useEffect(() => {
    let mounted = true;
    const update = (enabled: boolean) => {
      lastKnown = enabled;
      if (mounted) setReduceMotion(enabled);
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then(update)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
