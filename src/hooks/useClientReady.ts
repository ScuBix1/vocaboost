/**
 * Écrans à tirage aléatoire (session, test) : n'affiche le contenu qu'une fois le store réhydraté
 * et, sur le web, après le premier rendu client (V2-07 / RT-03).
 *
 * Sur le web, le HTML statique est produit au build avec un store vide et un autre tirage
 * `Math.random` : rendre le tirage dès le premier rendu client créait un écart d'hydratation
 * (erreur React #418). Le premier rendu client est donc identique au HTML statique (écran neutre),
 * puis le tirage se fait avec la progression réhydratée. Mobile : pas de rendu statique, seule
 * la réhydratation compte (le tirage ne part plus d'un store encore vide).
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useLearnerStore } from '@/store/useLearnerStore';

export function useClientReady(): boolean {
  const hasHydrated = useLearnerStore((s) => s.hasHydrated);
  const [mounted, setMounted] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setMounted(true);
  }, []);

  return hasHydrated && mounted;
}
