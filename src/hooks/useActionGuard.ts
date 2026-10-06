/**
 * Verrou temporel anti-double-tap partagé par plusieurs boutons (BUG-01, BUG-02 ; design §5.4).
 * Après `lock()`, toute action est ignorée pendant `durationMs` : un 2e tap qui tombe sur
 * le bouton venant d'apparaître au même endroit n'a donc aucun effet.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** Durée du verrou, alignée sur l'animation de retournement (300 ms). */
export const ACTION_GUARD_MS = 300;

export function useActionGuard(durationMs = ACTION_GUARD_MS) {
  const lockedUntil = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locked, setLocked] = useState(false);

  const lock = useCallback(() => {
    lockedUntil.current = Date.now() + durationMs;
    setLocked(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setLocked(false);
    }, durationMs);
  }, [durationMs]);

  /** Vérification synchrone (indépendante du rendu) : vrai tant que le verrou est actif. */
  const isLocked = useCallback(() => Date.now() < lockedUntil.current, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { locked, lock, isLocked };
}

/**
 * Verrou d'arrivée sur un écran (symétrie de V2-01) : le 2e tap d'un double tap sur le dernier
 * « Je savais » ou sur « Voir le résultat » ne doit pas actionner le bouton de l'écran de résultat
 * qui apparaît sous le doigt (« Accueil », « Retour à l'accueil »). Vrai pendant `durationMs`
 * après le montage ; sans effet visuel (pas de nouveau rendu).
 */
export function useArrivalGuard(durationMs = ACTION_GUARD_MS) {
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  return useCallback(
    () => mountedAt.current === null || Date.now() - mountedAt.current < durationMs,
    [durationMs],
  );
}
