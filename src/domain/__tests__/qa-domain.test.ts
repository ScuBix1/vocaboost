/**
 * Tests QA adversariaux (docs/05-rapport-qa.md) — logique pure.
 * Conçus pour passer quel que soit le fuseau : lancer aussi avec
 * TZ=Pacific/Auckland, TZ=America/Santiago, TZ=America/Sao_Paulo, TZ=Pacific/Kiritimati.
 */
import { WORDS } from '@/data/words';

import { addDaysToKey, getIsoWeek, getWeekId, toLocalDateKey } from '../dates';
import { applyCardEvaluation, applyTestCompletion, createInitialData, sanitizePersistedData } from '../learnerState';
import { createSeededRng } from '../random';
import { composeSession } from '../session';
import { computeCurrentStreak, computeLongestStreak } from '../streak';
import type { ProgressMap, Word } from '../types';
import { generateTest, getTestStatus, pickDistractors, selectTestWords } from '../weeklyTest';
import { fakeWords, seen } from './helpers';

/** Implémentation de référence indépendante de la semaine ISO (algorithme « jour de l'année »). */
function referenceIsoWeek(y: number, m: number, d: number): { year: number; week: number } {
  const isLeap = (yy: number) => (yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0;
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const ordinal = cum[m - 1] + d + (m > 2 && isLeap(y) ? 1 : 0);
  // Zeller-like : jour de semaine ISO (lundi=1) via Date UTC (pas de fuseau impliqué).
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
  const weeksInYear = (yy: number) => {
    const p = (z: number) => (z + Math.floor(z / 4) - Math.floor(z / 100) + Math.floor(z / 400)) % 7;
    return p(yy) === 4 || p(yy - 1) === 3 ? 53 : 52;
  };
  let week = Math.floor((ordinal - weekday + 10) / 7);
  let year = y;
  if (week < 1) {
    year = y - 1;
    week = weeksInYear(year);
  } else if (week > weeksInYear(y)) {
    year = y + 1;
    week = 1;
  }
  return { year, week };
}

describe('QA — semaine ISO en heure locale', () => {
  it('correspond à la référence pour chaque jour de 1995 à 2045, à 00:00, 12:00 et 23:59:59 locales', () => {
    const mismatches: string[] = [];
    for (let y = 1995; y <= 2045; y++) {
      for (let m = 1; m <= 12; m++) {
        const days = new Date(y, m, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const ref = referenceIsoWeek(y, m, d);
          for (const [h, mi, s] of [
            [0, 0, 0],
            [12, 0, 0],
            [23, 59, 59],
          ]) {
            const got = getIsoWeek(new Date(y, m - 1, d, h, mi, s, 999));
            if (got.year !== ref.year || got.week !== ref.week) {
              mismatches.push(`${y}-${m}-${d} ${h}h → ${got.year}-W${got.week} (attendu ${ref.year}-W${ref.week})`);
            }
          }
        }
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it('frontière lundi 00:00:00 local : dimanche 23:59:59.999 et lundi 00:00 sont dans deux semaines', () => {
    expect(getWeekId(new Date(2026, 9, 11, 23, 59, 59, 999))).toBe('2026-W41');
    expect(getWeekId(new Date(2026, 9, 12, 0, 0, 0, 0))).toBe('2026-W42');
    // Passage d'année ISO
    expect(getWeekId(new Date(2027, 0, 3, 23, 59, 59, 999))).toBe('2026-W53');
    expect(getWeekId(new Date(2027, 0, 4, 0, 0, 0, 0))).toBe('2027-W01');
    expect(getWeekId(new Date(2024, 11, 30))).toBe('2025-W01');
  });
});

describe('QA — série aux frontières de jour (fuseau et DST)', () => {
  it('addDaysToKey reste correct sur 20 ans dans le fuseau courant (incl. DST à minuit)', () => {
    let key = '2010-01-01';
    const start = new Date(2010, 0, 1);
    for (let i = 1; i < 7300; i++) {
      key = addDaysToKey(key, 1);
      const expected = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      expect(key).toBe(toLocalDateKey(expected));
    }
  });

  it('série de 400 jours consécutifs traversant plusieurs DST et années', () => {
    const days: string[] = [];
    let k = '2025-01-01';
    for (let i = 0; i < 400; i++) {
      days.push(k);
      k = addDaysToKey(k, 1);
    }
    const today = days[days.length - 1];
    expect(computeCurrentStreak(days, today)).toBe(400);
    expect(computeCurrentStreak(days, addDaysToKey(today, 1))).toBe(400);
    expect(computeCurrentStreak(days, addDaysToKey(today, 2))).toBe(0);
    expect(computeLongestStreak(days)).toBe(400);
  });

  it('carte évaluée à 23:59:59 puis à 00:00:00 : deux jours actifs, objectif remis à 0', () => {
    let data = createInitialData();
    data = applyCardEvaluation(data, WORDS[0].id, true, new Date(2026, 9, 5, 23, 59, 59));
    data = applyCardEvaluation(data, WORDS[1].id, true, new Date(2026, 9, 6, 0, 0, 0));
    expect(data.activeDays).toEqual(['2026-10-05', '2026-10-06']);
    expect(data.cardsPerDay).toEqual({ '2026-10-05': 1, '2026-10-06': 1 });
    expect(data.bestStreak).toBe(2);
  });
});

describe('QA — composition de session (toutes combinaisons nouveaux / révisions)', () => {
  it('taille = min(15, pool), sans doublon, nouveaux = min(nouveaux dispo, max(5, 15 − révisions))', () => {
    for (let nNew = 0; nNew <= 20; nNew++) {
      for (let nRev = 0; nRev <= 20; nRev++) {
        const pool: Word[] = fakeWords(nNew + nRev);
        const progress: ProgressMap = {};
        pool.slice(nNew).forEach((w, i) => (progress[w.id] = seen(i % 6)));
        for (let seed = 1; seed <= 5; seed++) {
          const s = composeSession(pool, progress, createSeededRng(seed * 97 + nNew * 13 + nRev));
          const ids = s.map((w) => w.id);
          expect(new Set(ids).size).toBe(ids.length);
          expect(s.length).toBe(Math.min(15, nNew + nRev));
          const newInSession = s.filter((w) => !progress[w.id]).length;
          const expectedNew = Math.min(nNew, Math.max(5, 15 - nRev));
          expect(newInSession).toBe(expectedNew);
        }
      }
    }
  });

  it('filtre très restrictif (1 catégorie, 1 niveau B2 = 4 mots) → 4 cartes', () => {
    const pool = WORDS.filter((w) => w.category === 'travel' && w.level === 'B2');
    expect(pool).toHaveLength(4);
    expect(composeSession(pool, {}, createSeededRng(3))).toHaveLength(4);
  });

  it('rng renvoyant 0 ou 0.9999999 en permanence ne casse pas le tirage', () => {
    const progress: ProgressMap = Object.fromEntries(WORDS.slice(0, 50).map((w, i) => [w.id, seen(i % 6)]));
    for (const rng of [() => 0, () => 0.9999999999]) {
      const s = composeSession(WORDS, progress, rng);
      expect(new Set(s.map((w) => w.id)).size).toBe(15);
    }
  });
});

describe('QA — test hebdomadaire', () => {
  it('distracteurs : pour les 200 mots × 20 graines, 3 distracteurs uniques, ≠ réponse, même catégorie, libellés FR et EN distincts', () => {
    for (const word of WORDS) {
      for (let seed = 1; seed <= 20; seed++) {
        const d = pickDistractors(word, WORDS, createSeededRng(seed));
        expect(d).toHaveLength(3);
        const ids = new Set([word.id, ...d.map((x) => x.id)]);
        expect(ids.size).toBe(4);
        expect(d.every((x) => x.category === word.category)).toBe(true);
        expect(new Set([word.fr, ...d.map((x) => x.fr.toLowerCase())].map((s) => s.toLowerCase())).size).toBe(4);
        expect(new Set([word.en, ...d.map((x) => x.en)].map((s) => s.toLowerCase())).size).toBe(4);
      }
    }
  });

  it('generateTest : N = min(20, vus) pour 10..200 vus, sans doublon, une seule bonne réponse par question', () => {
    const now = new Date(2026, 9, 7, 12);
    for (const seenN of [10, 11, 19, 20, 21, 57, 200]) {
      const progress: ProgressMap = Object.fromEntries(
        WORDS.slice(0, seenN).map((w, i) => [w.id, seen(i % 6, new Date(2026, 8, 1).toISOString())]),
      );
      const qs = generateTest(WORDS, progress, now, createSeededRng(seenN));
      expect(qs).toHaveLength(Math.min(20, seenN));
      expect(new Set(qs.map((q) => q.wordId)).size).toBe(qs.length);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map((o) => o.label)).size).toBe(4);
        expect(q.options.filter((o) => o.wordId === q.wordId)).toHaveLength(1);
        expect(q.options[q.correctIndex].wordId).toBe(q.wordId);
        expect(progress[q.wordId]).toBeDefined();
      }
    }
  });

  it('mots vus non présents dans la banque (id obsolète) : ne comptent pas et ne font pas planter le test', () => {
    const progress: ProgressMap = { 'obsolete-word': seen(0) };
    WORDS.slice(0, 10).forEach((w) => (progress[w.id] = seen(1)));
    const now = new Date(2026, 9, 7);
    expect(getTestStatus(WORDS, progress, [], now)).toEqual({ kind: 'available', questionCount: 10 });
    expect(selectTestWords(WORDS, progress, now, createSeededRng(1))).toHaveLength(10);
  });

  it('mot étudié lundi 00:00:30 local compte pour la semaine ; dimanche 23:59 précédent non', () => {
    const now = new Date(2026, 9, 7, 12); // mercredi W41
    const progress: ProgressMap = {};
    WORDS.slice(0, 25).forEach((w) => (progress[w.id] = seen(0, new Date(2026, 9, 4, 23, 59).toISOString())));
    progress[WORDS[0].id] = seen(5, new Date(2026, 9, 5, 0, 0, 30).toISOString());
    for (let seed = 1; seed <= 30; seed++) {
      expect(selectTestWords(WORDS, progress, now, createSeededRng(seed)).map((w) => w.id)).toContain(WORDS[0].id);
    }
  });

  it('OBS-01 (re-test, décision PM) : test commencé dimanche 23:58, terminé lundi 00:01 → semaine du démarrage ; lundi le test de la nouvelle semaine reste disponible', () => {
    let data = createInitialData();
    const sunday = new Date(2026, 9, 11, 23, 58);
    WORDS.slice(0, 10).forEach((w) => (data = applyCardEvaluation(data, w.id, true, new Date(2026, 9, 6))));
    expect(getTestStatus(WORDS, data.progress, data.testHistory, sunday).kind).toBe('available');
    const answers = WORDS.slice(0, 10).map((w) => ({ wordId: w.id, correct: true }));
    const monday = new Date(2026, 9, 12, 0, 1);
    const { data: after, record } = applyTestCompletion(data, answers, monday, sunday);
    expect(record?.weekId).toBe('2026-W41');
    expect(record?.finishedAt).toBe(monday.toISOString());
    expect(after.activeDays).toContain('2026-10-12');
    expect(getTestStatus(WORDS, after.progress, after.testHistory, monday).kind).toBe('available');
    // Un second test démarré en W41 (autre écran resté ouvert) est refusé.
    expect(applyTestCompletion(after, answers, monday, sunday).record).toBeNull();
    // Passage d'année : démarré le 2027-01-03 (2026-W53), fini le 2027-01-04.
    const r2 = applyTestCompletion(createInitialData(), answers, new Date(2027, 0, 4, 0, 2), new Date(2027, 0, 3, 23, 59)).record;
    expect(r2?.weekId).toBe('2026-W53');
  });
});

describe('QA — lecture défensive / migration', () => {
  it('données d’une ancienne version (champs manquants, types erronés) → valeurs par défaut, champs valides conservés', () => {
    const data = sanitizePersistedData({
      progress: { kitchen: { box: 9, seenCount: 1, firstSeenAt: null, lastSeenAt: null }, bed: { box: 2, seenCount: 3, firstSeenAt: null, lastSeenAt: 'x' }, door: { box: 3, seenCount: 2, firstSeenAt: null, lastSeenAt: null } },
      activeDays: 'nope',
      cardsPerDay: { '2026-10-06': -1, '2026-10-05': 4 },
      bestStreak: 2.5,
      testHistory: [{ weekId: '2026-W41' }],
      filters: { categories: [], levels: ['Z9', 'B1'] },
      dailyGoal: 25,
    });
    expect(Object.keys(data.progress)).toEqual(['door']);
    expect(data.activeDays).toEqual([]);
    expect(data.cardsPerDay).toEqual({ '2026-10-05': 4 });
    expect(data.bestStreak).toBe(0);
    expect(data.testHistory).toEqual([]);
    expect(data.filters.categories).toHaveLength(10);
    expect(data.filters.levels).toEqual(['B1']);
    expect(data.dailyGoal).toBe(15);
  });

  it('valeurs exotiques au niveau racine (null, nombre, tableau, chaîne) → état vierge', () => {
    for (const raw of [null, undefined, 42, [], 'x', true]) {
      expect(sanitizePersistedData(raw)).toEqual(createInitialData());
    }
  });
});
