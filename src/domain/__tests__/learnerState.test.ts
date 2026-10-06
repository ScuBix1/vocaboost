import { WORDS } from '@/data/words';

import { toLocalDateKey } from '../dates';
import {
  applyCardEvaluation,
  applyTestCompletion,
  createInitialData,
  resetLearnerData,
  sanitizePersistedData,
} from '../learnerState';
import { computeCurrentStreak } from '../streak';
import { computeGlobalStats } from '../stats';
import type { PersistedData } from '../types';
import { getTestStatus } from '../weeklyTest';
import { progressFor } from './helpers';

const NOW = new Date(2026, 9, 6, 10, 0);
const TODAY = toLocalDateKey(NOW);

describe('Évaluation de carte (RG-14, RG-44, RG-45)', () => {
  it('AC-03.7 : 4 cartes évaluées → vus +4, objectif du jour +4 ; la 5e carte reste inchangée', () => {
    let data = createInitialData();
    const cards = WORDS.slice(0, 5);
    for (const w of cards.slice(0, 4)) data = applyCardEvaluation(data, w.id, true, NOW);
    expect(computeGlobalStats(WORDS, data.progress).seen).toBe(4);
    expect(data.cardsPerDay[TODAY]).toBe(4);
    expect(data.progress[cards[4].id]).toBeUndefined();
  });

  it('RG-45 : une carte évaluée rend le jour actif et met à jour la meilleure série', () => {
    const data = applyCardEvaluation(createInitialData(), 'kitchen', false, NOW);
    expect(data.activeDays).toEqual([TODAY]);
    expect(data.bestStreak).toBe(1);
  });

  it('AC-05.6 : le compteur suit la date locale au moment du tap', () => {
    let data = applyCardEvaluation(createInitialData(), 'kitchen', true, new Date(2026, 9, 6, 23, 59));
    data = applyCardEvaluation(data, 'door', true, new Date(2026, 9, 7, 0, 1));
    expect(data.cardsPerDay).toEqual({ '2026-10-06': 1, '2026-10-07': 1 });
  });
});

describe('Fin de test (RG-69, RG-71, RG-45)', () => {
  const base: PersistedData = { ...createInitialData(), progress: progressFor(WORDS.slice(0, 10), 2) };
  const answers = WORDS.slice(0, 10).map((w, i) => ({ wordId: w.id, correct: i < 7 }));

  it('AC-05.4 : un test terminé sans carte rend le jour actif ; l’objectif n’est pas modifié', () => {
    const { data, record } = applyTestCompletion(base, answers, NOW);
    expect(record).not.toBeNull();
    expect(data.activeDays).toEqual([TODAY]);
    expect(computeCurrentStreak(data.activeDays, TODAY)).toBe(1);
    expect(data.cardsPerDay).toEqual({});
  });

  it('AC-07.9 : boîtes mises à jour, seenCount inchangé, entrée d’historique ajoutée', () => {
    const { data, record } = applyTestCompletion(base, answers, NOW);
    expect(data.progress[WORDS[0].id].box).toBe(3);
    expect(data.progress[WORDS[9].id].box).toBe(0);
    expect(data.progress[WORDS[0].id].seenCount).toBe(1);
    expect(data.testHistory).toEqual([record]);
    expect(record).toMatchObject({ correct: 7, total: 10, percent: 70, passed: true, weekId: '2026-W41' });
  });

  it('RG-60 : un second test la même semaine est refusé', () => {
    const first = applyTestCompletion(base, answers, NOW).data;
    const second = applyTestCompletion(first, answers, new Date(2026, 9, 8));
    expect(second.record).toBeNull();
    expect(second.data).toBe(first);
  });

  it('AC-07.11 : abandon (aucun appel à applyTestCompletion) → boîtes et historique inchangés, test disponible', () => {
    expect(getTestStatus(WORDS, base.progress, base.testHistory, NOW).kind).toBe('available');
  });
});

describe('Réinitialisation (RG-94)', () => {
  it('AC-10.2 : tout est effacé sauf objectif et filtres ; test verrouillé', () => {
    let data: PersistedData = {
      ...createInitialData(),
      dailyGoal: 30,
      filters: { categories: ['travel'], levels: ['A1', 'A2'] },
    };
    for (const w of WORDS.slice(0, 12)) data = applyCardEvaluation(data, w.id, true, NOW);
    data = applyTestCompletion(data, [{ wordId: WORDS[0].id, correct: true }], NOW).data;

    const reset = resetLearnerData(data);
    expect(computeGlobalStats(WORDS, reset.progress)).toMatchObject({ seen: 0, mastered: 0 });
    expect(reset.activeDays).toEqual([]);
    expect(reset.cardsPerDay).toEqual({});
    expect(reset.bestStreak).toBe(0);
    expect(reset.testHistory).toEqual([]);
    expect(reset.dailyGoal).toBe(30);
    expect(reset.filters).toEqual({ categories: ['travel'], levels: ['A1', 'A2'] });
    expect(getTestStatus(WORDS, reset.progress, reset.testHistory, NOW).kind).toBe('locked');
  });
});

describe('Lecture défensive des données persistées (RG-93)', () => {
  it('AC-10.4 : données illisibles → état vierge sans exception', () => {
    for (const raw of [null, undefined, 42, 'oops', [], { progress: 'x', activeDays: 3, filters: [] }]) {
      expect(sanitizePersistedData(raw)).toEqual(createInitialData());
    }
  });

  it('RG-93 : les entrées invalides sont ignorées, les valides conservées', () => {
    const raw = {
      progress: {
        kitchen: { box: 3, seenCount: 2, firstSeenAt: NOW.toISOString(), lastSeenAt: NOW.toISOString() },
        door: { box: 9, seenCount: 1, firstSeenAt: null, lastSeenAt: null },
      },
      activeDays: ['2026-10-06', 'pas une date', '2026-10-05', '2026-10-06'],
      cardsPerDay: { '2026-10-06': 5, nope: 3 },
      bestStreak: 2,
      testHistory: [{ weekId: '2026-W41', finishedAt: NOW.toISOString(), total: 10, correct: 7, percent: 70, passed: true }, { bad: true }],
      filters: { categories: ['travel', 'unknown'], levels: [] },
      dailyGoal: 25,
    };
    const data = sanitizePersistedData(raw);
    expect(Object.keys(data.progress)).toEqual(['kitchen']);
    expect(data.activeDays).toEqual(['2026-10-05', '2026-10-06']);
    expect(data.cardsPerDay).toEqual({ '2026-10-06': 5 });
    expect(data.testHistory).toHaveLength(1);
    expect(data.filters.categories).toEqual(['travel']);
    expect(data.filters.levels).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(data.dailyGoal).toBe(10);
    expect(data.bestStreak).toBe(2);
  });
});
