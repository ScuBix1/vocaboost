/**
 * Système de Leitner (RG-10 → RG-13, RG-24, RG-41).
 */
import type { ProgressMap, WordProgress } from './types';

export const MIN_BOX = 0;
export const MAX_BOX = 5;
/** Un mot est maîtrisé à partir de cette boîte (spec §3, RG-41). */
export const MASTERED_BOX = 4;

/** Poids de tirage des révisions par boîte (RG-24). */
export const BOX_WEIGHTS: readonly number[] = [16, 8, 4, 2, 1, 0.5];

/** État initial d'un mot (RG-10). */
export const NEW_WORD_PROGRESS: Readonly<WordProgress> = Object.freeze({
  box: 0,
  seenCount: 0,
  firstSeenAt: null,
  lastSeenAt: null,
});

export function getWordProgress(progress: ProgressMap, wordId: string): WordProgress {
  return progress[wordId] ?? NEW_WORD_PROGRESS;
}

/** Mot vu = évalué au moins une fois (spec §3). */
export function isSeen(p: WordProgress): boolean {
  return p.seenCount >= 1;
}

/** Mot maîtrisé = vu avec box ≥ 4 (spec §3). */
export function isMastered(p: WordProgress): boolean {
  return isSeen(p) && p.box >= MASTERED_BOX;
}

export function boxWeight(box: number): number {
  const clamped = Math.min(MAX_BOX, Math.max(MIN_BOX, Math.round(box)));
  return BOX_WEIGHTS[clamped];
}

/** Nouvelle boîte après une réponse : « Je savais » → +1 (max 5) ; sinon → 0 (RG-11, RG-12, RG-69). */
export function nextBox(box: number, knew: boolean): number {
  return knew ? Math.min(box + 1, MAX_BOX) : MIN_BOX;
}

/**
 * Applique une évaluation de session à un mot (RG-11 → RG-13).
 * Renvoie une nouvelle `ProgressMap` (immuable).
 */
export function recordEvaluation(
  progress: ProgressMap,
  wordId: string,
  knew: boolean,
  now: Date,
): ProgressMap {
  const current = getWordProgress(progress, wordId);
  const timestamp = now.toISOString();
  return {
    ...progress,
    [wordId]: {
      box: nextBox(current.box, knew),
      seenCount: current.seenCount + 1,
      firstSeenAt: current.firstSeenAt ?? timestamp,
      lastSeenAt: timestamp,
    },
  };
}
