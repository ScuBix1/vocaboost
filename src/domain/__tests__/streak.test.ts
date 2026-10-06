import { addDaysToKey } from '../dates';
import {
  cardsOnDay,
  computeBestStreak,
  computeCurrentStreak,
  computeGoalStatus,
  computeLongestStreak,
  incrementCardsOnDay,
  markActiveDay,
} from '../streak';

const today = '2026-10-06';
const day = (offset: number) => addDaysToKey(today, offset);

describe('Série de jours (RG-45 → RG-48)', () => {
  it('AC-05.1 : actifs J-2, J-1, J → série 3', () => {
    expect(computeCurrentStreak([day(-2), day(-1), today], today)).toBe(3);
  });

  it('AC-05.2 : actifs J-3, J-2, J-1 sans activité aujourd’hui → 3 ; une carte aujourd’hui → 4', () => {
    const days = [day(-3), day(-2), day(-1)];
    expect(computeCurrentStreak(days, today)).toBe(3);
    expect(computeCurrentStreak(markActiveDay(days, today), today)).toBe(4);
  });

  it('AC-05.3 : dernier jour actif J-2 → 0 ; une carte aujourd’hui → 1', () => {
    const days = [day(-4), day(-3), day(-2)];
    expect(computeCurrentStreak(days, today)).toBe(0);
    expect(computeCurrentStreak(markActiveDay(days, today), today)).toBe(1);
  });

  it('RG-46 : exemple de la spec (actifs 1, 2, 3 ; le 4 → 3 ; le 5 → 0)', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03'];
    expect(computeCurrentStreak(days, '2026-10-04')).toBe(3);
    expect(computeCurrentStreak(days, '2026-10-05')).toBe(0);
  });

  it('RG-46 : la série traverse les changements de mois et d’année', () => {
    expect(computeCurrentStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01')).toBe(3);
  });

  it('AC-05.5 / RG-47 : meilleure série conservée après rupture', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'];
    expect(computeLongestStreak(days)).toBe(5);
    expect(computeCurrentStreak(days, today)).toBe(0);
    expect(computeBestStreak(5, days)).toBe(5);
    expect(computeCurrentStreak(markActiveDay(days, today), today)).toBe(1);
    expect(computeBestStreak(2, [...days, today])).toBe(5);
  });

  it('RG-48 : markActiveDay garde un ensemble trié sans doublon', () => {
    expect(markActiveDay(['2026-10-05'], '2026-10-05')).toEqual(['2026-10-05']);
    expect(markActiveDay(['2026-10-05'], '2026-10-01')).toEqual(['2026-10-01', '2026-10-05']);
  });
});

describe('Objectif quotidien (RG-44)', () => {
  it('AC-05.6 : compteur par date locale, remis à 0 au changement de date', () => {
    let counts = {};
    for (let i = 0; i < 4; i++) counts = incrementCardsOnDay(counts, today);
    expect(cardsOnDay(counts, today)).toBe(4);
    expect(cardsOnDay(counts, day(1))).toBe(0);
  });

  it('AC-05.6 : le compteur dépasse l’objectif sans plafond (15 / 10, atteint)', () => {
    const status = computeGoalStatus(15, 10);
    expect(status).toMatchObject({ done: 15, goal: 10, reached: true, remaining: 0 });
    expect(status.ratio).toBe(1.5);
  });

  it('RG-44 : atteint quand x ≥ objectif', () => {
    expect(computeGoalStatus(9, 10).reached).toBe(false);
    expect(computeGoalStatus(9, 10).remaining).toBe(1);
    expect(computeGoalStatus(10, 10).reached).toBe(true);
    expect(computeGoalStatus(19, 20).reached).toBe(false);
  });
});
