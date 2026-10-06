import { WORDS } from '@/data/words';

import { DEFAULT_FILTERS, filterPool } from '../filters';
import { boxWeight, getWordProgress, isSeen } from '../leitner';
import { createSeededRng, sampleWeighted } from '../random';
import { becameMastered, composeSession, SESSION_SIZE } from '../session';
import type { ProgressMap, Word } from '../types';
import { fakeWords, progressFor } from './helpers';

const countNew = (cards: Word[], progress: ProgressMap) =>
  cards.filter((w) => !isSeen(getWordProgress(progress, w.id))).length;

describe('Composition de session (RG-20 → RG-26)', () => {
  it('AC-01.2 / RG-20 : 10 cartes distinctes quand le pool compte ≥ 10 mots', () => {
    const cards = composeSession(WORDS, {}, createSeededRng(1));
    expect(cards).toHaveLength(SESSION_SIZE);
    expect(new Set(cards.map((w) => w.id)).size).toBe(SESSION_SIZE);
  });

  it('AC-01.3 : pool de k < 10 mots → session de k cartes ; pool vide → aucune carte', () => {
    const pool = fakeWords(4);
    expect(composeSession(pool, progressFor(pool.slice(0, 2), 1), createSeededRng(2))).toHaveLength(4);
    expect(composeSession([], {}, createSeededRng(2))).toEqual([]);
  });

  it('AC-02.1 : première session (aucun mot vu) → 10 nouveaux', () => {
    const cards = composeSession(WORDS, {}, createSeededRng(3));
    expect(countNew(cards, {})).toBe(10);
  });

  it('AC-02.2 : ≥ 3 nouveaux et ≥ 7 vus → exactement 3 nouveaux + 7 révisions', () => {
    const progress = progressFor(WORDS.slice(0, 50), 2);
    for (let seed = 0; seed < 20; seed++) {
      const cards = composeSession(WORDS, progress, createSeededRng(seed));
      expect(cards).toHaveLength(10);
      expect(countNew(cards, progress)).toBe(3);
    }
  });

  it('AC-02.3 : 2 nouveaux restants et ≥ 8 vus → 2 nouveaux + 8 révisions', () => {
    const pool = fakeWords(20);
    const progress = progressFor(pool.slice(0, 18), 1);
    const cards = composeSession(pool, progress, createSeededRng(4));
    expect(cards).toHaveLength(10);
    expect(countNew(cards, progress)).toBe(2);
  });

  it('AC-02.3 : 4 vus et ≥ 6 nouveaux → 4 révisions + 6 nouveaux', () => {
    const pool = fakeWords(30);
    const progress = progressFor(pool.slice(0, 4), 1);
    const cards = composeSession(pool, progress, createSeededRng(5));
    expect(cards).toHaveLength(10);
    expect(countNew(cards, progress)).toBe(6);
  });

  it('RG-22 : tous les mots vus → 10 révisions', () => {
    const progress = progressFor(WORDS, 5);
    const cards = composeSession(WORDS, progress, createSeededRng(6));
    expect(cards).toHaveLength(10);
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
