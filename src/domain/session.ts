/**
 * Composition d'une session de cartes (RG-20 → RG-26, US-01, US-02).
 */
import { boxWeight, getWordProgress, isSeen, MASTERED_BOX } from './leitner';
import { sampleUniform, sampleWeighted, shuffle, type Rng } from './random';
import type { ProgressMap, Word } from './types';

/** Taille cible d'une session (RG-140). */
export const SESSION_SIZE = 15;
/** Nombre maximal de nouveaux mots par session (RG-141). */
export const MAX_NEW_PER_SESSION = 5;

/**
 * Compose une session à partir du pool filtré.
 * - au plus 5 nouveaux + 10 révisions, chaque catégorie comblant le manque de l'autre (RG-141, RG-142) ;
 * - nouveaux : tirage uniforme (RG-23) ; révisions : pondéré sans remise selon la boîte (RG-24) ;
 * - ordre final mélangé (RG-25) ; aucune répétition (RG-140).
 * Fonction pure : le hasard vient uniquement de `rng` (RG-26).
 */
export function composeSession(pool: readonly Word[], progress: ProgressMap, rng: Rng): Word[] {
  const newWords = pool.filter((w) => !isSeen(getWordProgress(progress, w.id)));
  const reviewWords = pool.filter((w) => isSeen(getWordProgress(progress, w.id)));

  const targetReviews = SESSION_SIZE - MAX_NEW_PER_SESSION;
  let newCount = Math.min(MAX_NEW_PER_SESSION, newWords.length);
  let reviewCount = Math.min(targetReviews, reviewWords.length);
  // Complément : révisions manquantes → nouveaux ; nouveaux manquants → révisions.
  newCount = Math.min(newWords.length, newCount + (targetReviews - reviewCount));
  reviewCount = Math.min(reviewWords.length, SESSION_SIZE - newCount);

  const pickedNew = sampleUniform(newWords, newCount, rng);
  const pickedReviews = sampleWeighted(
    reviewWords,
    reviewCount,
    (w) => boxWeight(getWordProgress(progress, w.id).box),
    rng,
  );
  return shuffle([...pickedNew, ...pickedReviews], rng);
}

/** Vrai si l'évaluation a fait entrer le mot dans les maîtrisés (récap RG-35). */
export function becameMastered(boxBefore: number, boxAfter: number): boolean {
  return boxBefore < MASTERED_BOX && boxAfter >= MASTERED_BOX;
}
