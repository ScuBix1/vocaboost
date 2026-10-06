/**
 * Statistiques de progression (RG-40 → RG-43, US-04).
 * Les statistiques portent toujours sur la banque complète : les filtres sont ignorés (RG-43, AC-04.5).
 */
import { getWordProgress, isMastered, isSeen } from './leitner';
import { CATEGORY_IDS, type CategoryId, type ProgressMap, type Word } from './types';

/** Pourcentage arrondi à l'entier inférieur (spec §3). */
export function floorPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.floor((part / total) * 100);
}

export function countSeen(words: readonly Word[], progress: ProgressMap): number {
  return words.filter((w) => isSeen(getWordProgress(progress, w.id))).length;
}

export function countMastered(words: readonly Word[], progress: ProgressMap): number {
  return words.filter((w) => isMastered(getWordProgress(progress, w.id))).length;
}

export interface GlobalStats {
  seen: number;
  mastered: number;
  total: number;
  percent: number;
}

/** Vus, maîtrisés et % global = floor(maîtrisés / total × 100) (RG-40, RG-41, RG-42). */
export function computeGlobalStats(words: readonly Word[], progress: ProgressMap): GlobalStats {
  const mastered = countMastered(words, progress);
  return {
    seen: countSeen(words, progress),
    mastered,
    total: words.length,
    percent: floorPercent(mastered, words.length),
  };
}

export interface CategoryStats extends GlobalStats {
  category: CategoryId;
}

/** Statistiques des 10 catégories, dans l'ordre RG-04 (RG-43). */
export function computeCategoryStats(words: readonly Word[], progress: ProgressMap): CategoryStats[] {
  return CATEGORY_IDS.map((category) => ({
    category,
    ...computeGlobalStats(
      words.filter((w) => w.category === category),
      progress,
    ),
  }));
}
