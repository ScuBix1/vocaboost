import type { ProgressMap, Word, WordProgress } from '../types';

/** Progression d'un mot vu, avec dates par défaut. */
export function seen(box: number, lastSeenAt = '2026-01-01T10:00:00.000Z', seenCount = 1): WordProgress {
  return { box, seenCount, firstSeenAt: lastSeenAt, lastSeenAt };
}

/** Construit une ProgressMap où chaque mot donné est vu dans la boîte indiquée. */
export function progressFor(words: readonly Word[], box: number, lastSeenAt?: string): ProgressMap {
  return Object.fromEntries(words.map((w) => [w.id, seen(box, lastSeenAt)]));
}

/** Mot factice pour les tests de tirage. */
export function fakeWord(i: number, overrides: Partial<Word> = {}): Word {
  return {
    id: `w${i}`,
    en: `word${i}`,
    fr: `mot${i}`,
    category: 'house',
    level: 'A1',
    example: `word${i} example`,
    ...overrides,
  };
}

export function fakeWords(count: number, overrides: Partial<Word> = {}): Word[] {
  return Array.from({ length: count }, (_, i) => fakeWord(i, overrides));
}
