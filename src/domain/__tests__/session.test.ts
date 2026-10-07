import { WORDS } from '@/data/words';

import { DEFAULT_FILTERS, filterPool } from '../filters';
import { boxWeight, getWordProgress, isSeen } from '../leitner';
import { createSeededRng, sampleWeighted } from '../random';
import { becameMastered, composeSession, MAX_NEW_PER_SESSION, SESSION_SIZE } from '../session';
import type { ProgressMap, Word } from '../types';
import { fakeWords, progressFor } from './helpers';

const countNew = (cards: Word[], progress: ProgressMap) =>
  cards.filter((w) => !isSeen(getWordProgress(progress, w.id))).length;

describe('Composition de session (RG-20 → RG-26, v1.2 : RG-140 → RG-144)', () => {
  it('AC-17.1 / RG-140 : 15 cartes distinctes quand le pool compte ≥ 15 mots', () => {
    expect(SESSION_SIZE).toBe(15);
    expect(MAX_NEW_PER_SESSION).toBe(5);
    const cards = composeSession(WORDS, {}, createSeededRng(1));
    expect(cards).toHaveLength(SESSION_SIZE);
    expect(new Set(cards.map((w) => w.id)).size).toBe(SESSION_SIZE);
  });

  it('AC-17.5 : pool de k < 15 mots → session de k cartes ; pool vide → aucune carte', () => {
    const pool = fakeWords(4);
    expect(composeSession(pool, progressFor(pool.slice(0, 2), 1), createSeededRng(2))).toHaveLength(4);
    for (const k of [10, 14]) {
      const p = fakeWords(k);
      expect(composeSession(p, progressFor(p.slice(0, 4), 1), createSeededRng(k))).toHaveLength(k);
    }
    expect(composeSession([], {}, createSeededRng(2))).toEqual([]);
  });

  it('AC-17.4 : première session (aucun mot vu) → 15 nouveaux', () => {
    const cards = composeSession(WORDS, {}, createSeededRng(3));
    expect(cards).toHaveLength(15);
    expect(countNew(cards, {})).toBe(15);
  });

  it('AC-17.2 : ≥ 5 nouveaux et ≥ 10 vus → exactement 5 nouveaux + 10 révisions', () => {
    const progress = progressFor(WORDS.slice(0, 50), 2);
    for (let seed = 0; seed < 20; seed++) {
      const cards = composeSession(WORDS, progress, createSeededRng(seed));
      expect(cards).toHaveLength(15);
      expect(countNew(cards, progress)).toBe(5);
    }
  });

  // AC-17.3 : une ligne du tableau RG-142 par test (n nouveaux, r révisions → nouveaux + révisions).
  it.each([
    [20, 8, 7, 8],
    [10, 5, 10, 5],
    [2, 30, 2, 13],
    [0, 40, 0, 15],
    [4, 6, 4, 6],
    [9, 5, 9, 5],
    [200, 0, 15, 0],
    [3, 30, 3, 12],
  ])('AC-17.3 / RG-142 : %i nouveaux + %i révisions en pool → %i nouveaux + %i révisions', (n, r, expNew, expRev) => {
    const pool = fakeWords(n + r);
    const progress = progressFor(pool.slice(0, r), 1);
    const cards = composeSession(pool, progress, createSeededRng(n * 31 + r));
    expect(countNew(cards, progress)).toBe(expNew);
    expect(cards.length - countNew(cards, progress)).toBe(expRev);
    expect(cards).toHaveLength(expNew + expRev);
  });

  it('RG-142 : tous les mots vus → 15 révisions', () => {
    const progress = progressFor(WORDS, 5);
    const cards = composeSession(WORDS, progress, createSeededRng(6));
    expect(cards).toHaveLength(15);
    expect(countNew(cards, progress)).toBe(0);
  });

  it('AC-02.4 / RG-24 : boîte 0 tirée ≈ 97 % face à boîte 5 sur 10 000 tirages', () => {
    const [a, b] = fakeWords(2);
    const progress = { [a.id]: { box: 0, seenCount: 1, firstSeenAt: null, lastSeenAt: null }, [b.id]: { box: 5, seenCount: 1, firstSeenAt: null, lastSeenAt: null } };
    const rng = createSeededRng(42);
    let box0 = 0;
    const runs = 10_000;
    for (let i = 0; i < runs; i++) {
      const picked = sampleWeighted([a, b], 1, (w) => boxWeight(progress[w.id].box), rng);
      if (picked[0].id === a.id) box0 += 1;
    }
    const ratio = (box0 / runs) * 100;
    expect(ratio).toBeGreaterThanOrEqual(95);
    expect(ratio).toBeLessThanOrEqual(99);
  });

  it('AC-02.4 : composeSession privilégie les boîtes basses parmi les révisions', () => {
    const pool = fakeWords(40);
    const progress: ProgressMap = {
      ...progressFor(pool.slice(0, 20), 0),
      ...progressFor(pool.slice(20), 5),
    };
    const rng = createSeededRng(7);
    let low = 0;
    let total = 0;
    for (let i = 0; i < 500; i++) {
      for (const w of composeSession(pool, progress, rng)) {
        total += 1;
        if (progress[w.id].box === 0) low += 1;
      }
    }
    expect(low / total).toBeGreaterThan(0.8);
  });

  it('AC-02.5 / RG-25 : deux graines différentes donnent un ordre différent', () => {
    const progress = progressFor(WORDS.slice(0, 50), 1);
    const first = composeSession(WORDS, progress, createSeededRng(100)).map((w) => w.id);
    const second = composeSession(WORDS, progress, createSeededRng(200)).map((w) => w.id);
    expect(first).not.toEqual(second);
  });

  it('RG-25 : nouveaux et révisions sont entremêlés (pas toujours les nouveaux en tête)', () => {
    const progress = progressFor(WORDS.slice(0, 50), 1);
    const positions = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const cards = composeSession(WORDS, progress, createSeededRng(seed));
      cards.forEach((w, i) => {
        if (!isSeen(getWordProgress(progress, w.id))) positions.add(i);
      });
    }
    expect(Math.max(...positions)).toBeGreaterThan(2);
  });

  it('RG-26 : même graine → même session (fonction pure)', () => {
    const a = composeSession(WORDS, {}, createSeededRng(9)).map((w) => w.id);
    const b = composeSession(WORDS, {}, createSeededRng(9)).map((w) => w.id);
    expect(a).toEqual(b);
  });

  it('AC-06.1 : avec seulement Voyage + A1, toutes les cartes sont Voyage A1', () => {
    const pool = filterPool(WORDS, { categories: ['travel'], levels: ['A1'] });
    const cards = composeSession(pool, {}, createSeededRng(10));
    expect(cards.length).toBe(5);
    expect(cards.every((w) => w.category === 'travel' && w.level === 'A1')).toBe(true);
  });

  it('RG-51 : filtres par défaut → pool complet', () => {
    expect(filterPool(WORDS, DEFAULT_FILTERS)).toHaveLength(200);
  });

  it('RG-35 : un mot devient maîtrisé quand sa boîte passe de < 4 à ≥ 4', () => {
    expect(becameMastered(3, 4)).toBe(true);
    expect(becameMastered(4, 5)).toBe(false);
    expect(becameMastered(2, 3)).toBe(false);
  });
});

describe('Composition de session v1.2 — invariants sur de nombreuses graines (AC-17.6)', () => {
  /** Attendu RG-142 : [nouveaux, révisions] pour n nouveaux et r révisions en pool. */
  const expected = (n: number, r: number): [number, number] => {
    let newCount = Math.min(n, 5);
    let reviewCount = Math.min(r, 10);
    newCount = Math.min(n, newCount + (10 - reviewCount));
    reviewCount = Math.min(r, 15 - newCount);
    return [newCount, reviewCount];
  };

  it('taille, unicité et comptes conformes à RG-142 pour toutes les combinaisons (n, r ≤ 22) sur 200 graines', () => {
    for (let n = 0; n <= 22; n++) {
      for (let r = 0; r <= 22; r++) {
        const pool = fakeWords(n + r);
        const progress = progressFor(pool.slice(0, r), 2);
        const [expNew, expRev] = expected(n, r);
        for (let seed = 0; seed < 200; seed++) {
          const cards = composeSession(pool, progress, createSeededRng(seed * 7919 + n * 101 + r));
          expect(cards).toHaveLength(Math.min(15, n + r));
          expect(new Set(cards.map((w) => w.id)).size).toBe(cards.length);
          const newInSession = countNew(cards, progress);
          expect([newInSession, cards.length - newInSession]).toEqual([expNew, expRev]);
          expect(cards.every((w) => pool.includes(w))).toBe(true);
        }
      }
    }
  });

  it('pools de 0, 1, 14, 15 et 16 mots (tout vu / rien vu)', () => {
    for (const k of [0, 1, 14, 15, 16]) {
      const pool = fakeWords(k);
      for (const seenCount of [0, k]) {
        const progress = progressFor(pool.slice(0, seenCount), 1);
        const cards = composeSession(pool, progress, createSeededRng(k + seenCount));
        expect(cards).toHaveLength(Math.min(15, k));
        expect(new Set(cards.map((w) => w.id)).size).toBe(cards.length);
      }
    }
  });

  it('un rng constant (0 ou 0.9999999) ne casse ni la taille ni l’unicité', () => {
    const pool = fakeWords(40);
    const progress = progressFor(pool.slice(0, 20), 1);
    for (const value of [0, 0.9999999]) {
      const cards = composeSession(pool, progress, () => value);
      expect(cards).toHaveLength(15);
      expect(new Set(cards.map((w) => w.id)).size).toBe(15);
      expect(countNew(cards, progress)).toBe(5);
    }
  });

  it('première session sur la vraie banque : 15 nouveaux distincts sur 200 graines', () => {
    for (let seed = 0; seed < 200; seed++) {
      const cards = composeSession(WORDS, {}, createSeededRng(seed));
      expect(cards).toHaveLength(15);
      expect(new Set(cards.map((w) => w.id)).size).toBe(15);
    }
  });

  it('les ordres varient selon la graine et les nouveaux ne sont pas toujours en tête (RG-25)', () => {
    const progress = progressFor(WORDS.slice(0, 60), 1);
    const orders = new Set<string>();
    const newPositions = new Set<number>();
    for (let seed = 0; seed < 50; seed++) {
      const cards = composeSession(WORDS, progress, createSeededRng(seed));
      orders.add(cards.map((w) => w.id).join());
      cards.forEach((w, i) => {
        if (!isSeen(getWordProgress(progress, w.id))) newPositions.add(i);
      });
    }
    expect(orders.size).toBeGreaterThan(40);
    expect(Math.max(...newPositions)).toBeGreaterThan(5);
  });
});
