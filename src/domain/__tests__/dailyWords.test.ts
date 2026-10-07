import {
  answerReviewCard,
  buildReviewQueue,
  getTodayWords,
  hardWords,
  isDailyWord,
  isPassDone,
  sortDailyWords,
  startReviewPass,
} from '../dailyWords';
import { createSeededRng } from '../random';
import type { ProgressMap, WordProgress } from '../types';
import { fakeWord, fakeWords } from './helpers';

const NOW = new Date(2026, 9, 7, 14, 0, 0); // mercredi 7 octobre 2026, heure locale
const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const P = (box: number, lastSeenAt: string | null, seenCount = 1): WordProgress => ({
  box,
  seenCount,
  firstSeenAt: lastSeenAt,
  lastSeenAt,
});

describe('Mots du jour (RG-100 → RG-104, US-11)', () => {
  const words = fakeWords(8);

  it('AC-11.1 : 3 mots du jour (dont un évalué 2 fois) et 2 d’hier → exactement 3, sans doublon', () => {
    const progress: ProgressMap = {
      w0: P(1, at(2026, 10, 7, 9)),
      w1: P(2, at(2026, 10, 7, 11), 2), // évalué 2 fois : une seule ligne
      w2: P(0, at(2026, 10, 7, 13)),
      w3: P(2, at(2026, 10, 6, 20)),
      w4: P(1, at(2026, 10, 6, 8)),
    };
    const ids = getTodayWords(words, progress, NOW).map((d) => d.word.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids)).toEqual(new Set(['w0', 'w1', 'w2']));
  });

  it('AC-11.2 : un mot dont seule la boîte a changé (test) garde lastSeenAt d’hier → absent', () => {
    const progress: ProgressMap = { w0: P(0, at(2026, 10, 6, 18), 3) };
    expect(getTodayWords(words, progress, NOW)).toEqual([]);
  });

  it('AC-11.3 : 23:59 est du jour à 23:59:59, plus à 00:00:00 le lendemain', () => {
    const p = P(1, new Date(2026, 9, 7, 23, 59, 0).toISOString());
    expect(isDailyWord(p, new Date(2026, 9, 7, 23, 59, 59))).toBe(true);
    expect(isDailyWord(p, new Date(2026, 9, 8, 0, 0, 0))).toBe(false);
  });

  it('AC-11.3 : dates locales aux changements d’heure (jours de 23 h et 25 h)', () => {
    // Quel que soit le fuseau de la machine, la comparaison se fait sur la date locale.
    for (const [y, m, d] of [
      [2026, 3, 29],
      [2026, 10, 25],
      [2026, 3, 8],
      [2026, 11, 1],
    ] as const) {
      const first = P(1, new Date(y, m - 1, d, 0, 30).toISOString());
      const last = P(1, new Date(y, m - 1, d, 23, 30).toISOString());
      const sameDay = new Date(y, m - 1, d, 12, 0);
      const nextDay = new Date(y, m - 1, d + 1, 0, 0);
      const prevDay = new Date(y, m - 1, d - 1, 23, 59);
      expect(isDailyWord(first, sameDay) && isDailyWord(last, sameDay)).toBe(true);
      expect(isDailyWord(first, nextDay) || isDailyWord(last, nextDay)).toBe(false);
      expect(isDailyWord(first, prevDay) || isDailyWord(last, prevDay)).toBe(false);
    }
  });

  it('RG-102 : à minuit la liste se vide (recalcul à partir de l’heure injectée)', () => {
    const progress: ProgressMap = { w0: P(1, at(2026, 10, 7, 23, 58)) };
    expect(getTodayWords(words, progress, new Date(2026, 9, 7, 23, 59))).toHaveLength(1);
    expect(getTodayWords(words, progress, new Date(2026, 9, 8, 0, 1))).toHaveLength(0);
  });

  it('AC-11.4 : statut dérivé de la boîte (0 → À revoir, 1 à 5 → Su)', () => {
    const progress: ProgressMap = {};
    for (let box = 0; box <= 5; box++) progress[`w${box}`] = P(box, at(2026, 10, 7));
    const byId = Object.fromEntries(getTodayWords(words, progress, NOW).map((d) => [d.word.id, d.status]));
    expect(byId.w0).toBe('toReview');
    for (let box = 1; box <= 5; box++) expect(byId[`w${box}`]).toBe('known');
  });

  it('AC-11.5 / RG-106 : ordre total (À revoir, boîte, lastSeenAt décroissant, alphabétique), stable', () => {
    const list = [
      fakeWord(1, { id: 'a', en: 'zebra' }),
      fakeWord(2, { id: 'b', en: 'apple' }),
      fakeWord(3, { id: 'c', en: 'mango' }),
      fakeWord(4, { id: 'd', en: 'berry' }),
      fakeWord(5, { id: 'e', en: 'cherry' }),
      fakeWord(6, { id: 'f', en: 'lemon' }),
    ];
    const progress: ProgressMap = {
      a: P(3, at(2026, 10, 7, 9)),
      b: P(0, at(2026, 10, 7, 9)), // à revoir, 09:00
      c: P(0, at(2026, 10, 7, 12)), // à revoir, plus récent
      d: P(1, at(2026, 10, 7, 9)),
      e: P(1, at(2026, 10, 7, 9)), // même boîte et même heure : alphabétique
      f: P(1, at(2026, 10, 7, 11)), // plus récent que d et e
    };
    const expected = ['c', 'b', 'f', 'd', 'e', 'a'];
    const run = (l: typeof list) => getTodayWords(l, progress, NOW).map((d) => d.word.id);
    expect(run(list)).toEqual(expected);
    expect(run([...list].reverse())).toEqual(expected);
    expect(run(list)).toEqual(run(list));
    const items = getTodayWords(list, progress, NOW);
    expect(sortDailyWords([...items].reverse()).map((d) => d.word.id)).toEqual(expected);
  });

  it('AC-11.6 / RG-104 : aucun filtre n’est appliqué (la fonction ne reçoit que la banque et la progression)', () => {
    const travel = fakeWords(2, { category: 'travel', level: 'A1' });
    const house = [fakeWord(5, { category: 'house', level: 'B2' })];
    const progress: ProgressMap = {
      w0: P(1, at(2026, 10, 7)),
      w1: P(1, at(2026, 10, 7)),
      w5: P(1, at(2026, 10, 7)),
    };
    expect(getTodayWords([...travel, ...house], progress, NOW)).toHaveLength(3);
  });

  it('AC-11.7 : lastSeenAt invalide/null, seenCount 0, id inconnu → ignorés sans crash', () => {
    const progress: ProgressMap = {
      w0: P(1, 'pas-une-date'),
      w1: P(1, null),
      w2: P(1, at(2026, 10, 7), 0),
      inconnu: P(1, at(2026, 10, 7)),
      w3: P(2, at(2026, 10, 7)),
    };
    expect(getTodayWords(words, progress, NOW).map((d) => d.word.id)).toEqual(['w3']);
  });

  it('AC-11.8 : progression vide (après réinitialisation) → liste vide', () => {
    expect(getTodayWords(words, {}, NOW)).toEqual([]);
  });
});

describe('Ordre d’une passe (RG-111, US-12)', () => {
  const four = [fakeWord(1), fakeWord(2), fakeWord(3), fakeWord(4)]; // w1,w2 boîte 0 ; w3 boîte 3 ; w4 boîte 5
  const progress: ProgressMap = {
    w1: P(0, at(2026, 10, 7)),
    w2: P(0, at(2026, 10, 7)),
    w3: P(3, at(2026, 10, 7)),
    w4: P(5, at(2026, 10, 7)),
  };

  it('AC-12.3 : les deux boîte 0 passent avant le 3 puis le 5, quelle que soit la graine', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const ids = buildReviewQueue(four, progress, createSeededRng(seed)).map((w) => w.id);
      expect(new Set(ids.slice(0, 2))).toEqual(new Set(['w1', 'w2']));
      expect(ids.slice(2)).toEqual(['w3', 'w4']);
    }
  });

  it('AC-12.3 : l’ordre intra-groupe varie selon la graine, et est reproductible à graine égale', () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) firsts.add(buildReviewQueue(four, progress, createSeededRng(seed))[0].id);
    expect(firsts).toEqual(new Set(['w1', 'w2']));
    const a = buildReviewQueue(four, progress, createSeededRng(7)).map((w) => w.id);
    const b = buildReviewQueue(four, progress, createSeededRng(7)).map((w) => w.id);
    expect(a).toEqual(b);
  });

  it('AC-12.4 : chaque mot exactement une fois (N = 200 inclus), entrée non modifiée', () => {
    const many = fakeWords(200);
    const prog: ProgressMap = Object.fromEntries(many.map((w, i) => [w.id, P(i % 6, at(2026, 10, 7))]));
    const copy = [...many];
    const queue = buildReviewQueue(many, prog, createSeededRng(3));
    expect(queue).toHaveLength(200);
    expect(new Set(queue.map((w) => w.id)).size).toBe(200);
    expect(many).toEqual(copy);
    const boxes = queue.map((w) => prog[w.id].box);
    expect(boxes).toEqual([...boxes].sort((x, y) => x - y));
  });

  it('AC-12.6 : N = 1 → une carte, fin normale', () => {
    let pass = startReviewPass([fakeWord(1)], progress, 'daily', createSeededRng(1));
    expect(pass.queue).toHaveLength(1);
    expect(isPassDone(pass)).toBe(false);
    pass = answerReviewCard(pass, true);
    expect(isPassDone(pass)).toBe(true);
    expect(pass.retainedIds).toEqual(['w1']);
  });
});

describe('Passe et mots difficiles (RG-112 à RG-114, US-13)', () => {
  const list = fakeWords(5);
  const progress: ProgressMap = Object.fromEntries(list.map((w) => [w.id, P(1, at(2026, 10, 7))]));

  it('AC-12.5 / AC-13.1 : retenus et difficiles exacts, la passe difficile reprend exactement ces mots', () => {
    let pass = startReviewPass(list, progress, 'daily', createSeededRng(2));
    const order = pass.queue.map((w) => w.id);
    const verdicts = [true, false, true, false, false];
    for (const v of verdicts) pass = answerReviewCard(pass, v);
    expect(isPassDone(pass)).toBe(true);
    expect(pass.retainedIds).toEqual(order.filter((_, i) => verdicts[i]));
    expect(hardWords(pass).map((w) => w.id)).toEqual(order.filter((_, i) => !verdicts[i]));

    const hardPass = startReviewPass(hardWords(pass), progress, 'hard', createSeededRng(3));
    expect(hardPass.mode).toBe('hard');
    expect(new Set(hardPass.queue.map((w) => w.id))).toEqual(new Set(order.filter((_, i) => !verdicts[i])));
  });

  it('AC-13.2 : tout retenu → aucun mot difficile', () => {
    let pass = startReviewPass(list, progress, 'daily', createSeededRng(2));
    for (let i = 0; i < 5; i++) pass = answerReviewCard(pass, true);
    expect(hardWords(pass)).toEqual([]);
  });

  it('AC-13.3 : 3 passes enchaînées, chacune reprend uniquement le sous-ensemble précédent', () => {
    let pass = startReviewPass(list, progress, 'daily', createSeededRng(5));
    const sizes: number[] = [];
    for (let round = 0; round < 3; round++) {
      // Le premier mot de la passe est retenu, les autres à revoir encore.
      pass.queue.forEach((_, i) => {
        pass = answerReviewCard(pass, i === 0);
      });
      const hard = hardWords(pass);
      sizes.push(hard.length);
      pass = startReviewPass(hard, progress, 'hard', createSeededRng(round));
    }
    expect(sizes).toEqual([4, 3, 2]);
  });

  it('une carte déjà traitée ne peut pas être rejouée (pas de retour arrière) et une passe terminée est inerte', () => {
    let pass = startReviewPass([fakeWord(1)], progress, 'daily', createSeededRng(1));
    pass = answerReviewCard(pass, false);
    expect(answerReviewCard(pass, true)).toBe(pass);
  });
});
