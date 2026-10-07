/**
 * Heure courante recalculée au focus de l'écran et au retour au premier plan
 * (design §4.6 et §5.4 : changement de jour / de semaine pendant que l'app est ouverte).
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(new Date());
    });
    return () => subscription.remove();
  }, []);

  // Écran laissé ouvert à minuit (V11-02) : on se réveille juste après le prochain minuit local.
  useEffect(() => {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
    const timer = setTimeout(() => setNow(new Date()), Math.max(next.getTime() - now.getTime(), 1000));
    return () => clearTimeout(timer);
  }, [now]);

  return now;
}
