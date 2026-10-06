import { WORDS } from '@/data/words';

import { recordEvaluation } from '../leitner';
import { computeCategoryStats, computeGlobalStats, floorPercent } from '../stats';
import { progressFor } from './helpers';

describe('Statistiques de progression (RG-40 → RG-43)', () => {
  it('AC-04.2 : état vierge → 0 vu, 0 maîtrisé, 0 %, 10 catégories à 0/20', () => {
    expect(computeGlobalStats(WORDS, {})).toEqual({ seen: 0, mastered: 0, total: 200, percent: 0 });
    const categories = computeCategoryStats(WORDS, {});
    expect(categories).toHaveLength(10);
    expect(categories.every((c) => c.total === 20 && c.seen === 0 && c.percent === 0)).toBe(true);
  });

  it('RG-40 / RG-41 : vus = seenCount ≥ 1, maîtrisés = boîte ≥ 4', () => {
    const progress = { ...progressFor(WORDS.slice(0, 10), 2), ...progressFor(WORDS.slice(10, 13), 4) };
    const stats = computeGlobalStats(WORDS, progress);
    expect(stats.seen).toBe(13);
    expect(stats.mastered).toBe(3);
  });

  it('AC-04.4 / RG-42 : 13 mots maîtrisés → 6 % (floor de 6,5)', () => {
    const progress = progressFor(WORDS.slice(0, 13), 4);
    expect(computeGlobalStats(WORDS, progress).percent).toBe(6);
    expect(floorPercent(69, 1000)).toBe(6);
  });

  it('AC-04.3 : boîte 3 → 4 incrémente « maîtrisés » ; 4 → 0 le décrémente', () => {
    const now = new Date('2026-10-06T10:00:00Z');
    const base = progressFor(WORDS.slice(0, 1), 3);
    const up = recordEvaluation(base, WORDS[0].id, true, now);
    expect(computeGlobalStats(WORDS, up).mastered).toBe(computeGlobalStats(WORDS, base).mastered + 1);
    const down = recordEvaluation(up, WORDS[0].id, false, now);
    expect(computeGlobalStats(WORDS, down).mastered).toBe(computeGlobalStats(WORDS, up).mastered - 1);
  });

  it('RG-43 : statistiques par catégorie vus/20, maîtrisés/20 et floor %', () => {
    const house = WORDS.filter((w) => w.category === 'house');
    const progress = { ...progressFor(house.slice(0, 5), 1), ...progressFor(house.slice(5, 8), 5) };
    const stat = computeCategoryStats(WORDS, progress).find((c) => c.category === 'house');
    expect(stat).toMatchObject({ seen: 8, mastered: 3, total: 20, percent: 15 });
  });

  it('AC-04.5 / AC-06.4 : les statistiques ne dépendent pas des filtres (calculées sur la banque complète)', () => {
    // Les fonctions de statistiques ne reçoivent jamais les filtres : la signature le garantit.
    expect(computeGlobalStats.length).toBe(2);
    expect(computeCategoryStats.length).toBe(2);
  });
});
