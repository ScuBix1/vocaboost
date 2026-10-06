import { WORDS, WORDS_BY_ID } from '@/data/words';

import { getWeekId } from '../dates';
import { createSeededRng } from '../random';
import type { ProgressMap, TestRecord } from '../types';
import {
  applyTestAnswers,
  buildQuestion,
  createTestRecord,
  directionForQuestion,
  generateTest,
  getTestStatus,
  pickDistractors,
  scoreTest,
  selectTestWords,
  sortHistory,
} from '../weeklyTest';
import { progressFor, seen } from './helpers';

// Mardi 6 octobre 2026, 10:00 locale (semaine 2026-W41).
const NOW = new Date(2026, 9, 6, 10, 0);
const THIS_WEEK = new Date(2026, 9, 5, 9, 0).toISOString(); // lundi de la même semaine
const LAST_WEEK = new Date(2026, 8, 28, 9, 0).toISOString();

const record = (weekId: string, finishedAt: string, correct = 7, total = 10): TestRecord => ({
  weekId,
  finishedAt,
  correct,
  total,
  percent: Math.round((correct / total) * 100),
  passed: correct / total >= 0.7,
});

describe('Disponibilité du test (RG-60 → RG-62, RG-72)', () => {
  it('AC-07.1 : 9 mots vus → verrouillé, « encore 1 mot »', () => {
    const status = getTestStatus(WORDS, progressFor(WORDS.slice(0, 9), 1), [], NOW);
    expect(status).toEqual({ kind: 'locked', seen: 9, remaining: 1 });
  });

  it('AC-07.1 : 10 mots vus → disponible, 10 questions', () => {
    const status = getTestStatus(WORDS, progressFor(WORDS.slice(0, 10), 1), [], NOW);
    expect(status).toEqual({ kind: 'available', questionCount: 10 });
  });

  it('RG-61 : état vierge → « Étudie encore 10 mots »', () => {
    expect(getTestStatus(WORDS, {}, [], NOW)).toMatchObject({ kind: 'locked', remaining: 10 });
  });

  it('AC-07.2 / RG-62 : 50 mots vus → 20 questions', () => {
    expect(getTestStatus(WORDS, progressFor(WORDS.slice(0, 50), 1), [], NOW)).toEqual({
      kind: 'available',
      questionCount: 20,
    });
  });

  it('AC-07.10 / RG-72 : test terminé cette semaine → indisponible jusqu’au lundi 00:00 local suivant', () => {
    const progress = progressFor(WORDS.slice(0, 30), 1);
    const history = [record(getWeekId(NOW), NOW.toISOString())];
    expect(getTestStatus(WORDS, progress, history, NOW).kind).toBe('done');
    expect(getTestStatus(WORDS, progress, history, new Date(2026, 9, 11, 23, 59, 59)).kind).toBe('done');
    expect(getTestStatus(WORDS, progress, history, new Date(2026, 9, 12, 0, 0, 0)).kind).toBe('available');
  });

  it('RG-72 : un test d’une semaine passée ne bloque pas la semaine courante', () => {
    const progress = progressFor(WORDS.slice(0, 30), 1);
    expect(getTestStatus(WORDS, progress, [record('2026-W40', LAST_WEEK)], NOW).kind).toBe('available');
  });
});

describe('Sélection des mots (RG-63)', () => {
  it('AC-07.2 : 50 vus → 20 mots sans doublon, tous vus', () => {
    const progress = progressFor(WORDS.slice(0, 50), 2, LAST_WEEK);
    const words = selectTestWords(WORDS, progress, NOW, createSeededRng(1));
    expect(words).toHaveLength(20);
    expect(new Set(words.map((w) => w.id)).size).toBe(20);
    expect(words.every((w) => progress[w.id])).toBe(true);
  });

  it('AC-07.3 : 12 mots de la semaine et 50 vus → les 12 + 8 autres mots vus', () => {
    const weekWords = WORDS.slice(0, 12);
    const progress: ProgressMap = {
      ...progressFor(WORDS.slice(12, 50), 2, LAST_WEEK),
      ...progressFor(weekWords, 2, THIS_WEEK),
    };
    for (let seed = 0; seed < 10; seed++) {
      const ids = selectTestWords(WORDS, progress, NOW, createSeededRng(seed)).map((w) => w.id);
      expect(ids).toHaveLength(20);
      for (const w of weekWords) expect(ids).toContain(w.id);
      expect(ids.filter((id) => !weekWords.some((w) => w.id === id))).toHaveLength(8);
    }
  });

  it('AC-07.4 : 30 mots de la semaine → 20 questions toutes sur des mots de la semaine', () => {
    const weekWords = WORDS.slice(0, 30);
    const progress: ProgressMap = {
      ...progressFor(WORDS.slice(30, 80), 0, LAST_WEEK),
      ...progressFor(weekWords, 3, THIS_WEEK),
    };
    const ids = selectTestWords(WORDS, progress, NOW, createSeededRng(3)).map((w) => w.id);
    expect(ids).toHaveLength(20);
    expect(ids.every((id) => weekWords.some((w) => w.id === id))).toBe(true);
  });

  it('RG-63 : le complément privilégie les boîtes basses (pondération RG-24)', () => {
    const progress: ProgressMap = {
      ...progressFor(WORDS.slice(0, 20), 0, LAST_WEEK),
      ...progressFor(WORDS.slice(20, 40), 5, LAST_WEEK),
    };
    const rng = createSeededRng(11);
    let low = 0;
    for (let i = 0; i < 50; i++) {
      // 40 vus → 20 questions ; on mesure la part de boîte 0.
      low += selectTestWords(WORDS, progress, NOW, rng).filter((w) => progress[w.id].box === 0).length;
    }
    expect(low / (50 * 20)).toBeGreaterThan(0.75);
  });

  it('RG-63 : les filtres sont ignorés (sélection sur la banque complète)', () => {
    const progress = progressFor(
      WORDS.filter((w) => w.category === 'food' || w.category === 'verbs').slice(0, 15),
      1,
      THIS_WEEK,
    );
    expect(selectTestWords(WORDS, progress, NOW, createSeededRng(2))).toHaveLength(15);
  });
});

describe('Questions QCM (RG-64, RG-65)', () => {
  it('AC-07.5 : question 1 EN→FR, question 2 FR→EN, en alternance', () => {
    expect([1, 2, 3, 4, 19, 20].map(directionForQuestion)).toEqual([
      'en-fr',
      'fr-en',
      'en-fr',
      'fr-en',
      'en-fr',
      'fr-en',
    ]);
    const progress = progressFor(WORDS.slice(0, 20), 1, THIS_WEEK);
    const questions = generateTest(WORDS, progress, NOW, createSeededRng(4));
    questions.forEach((q, i) => {
      const word = WORDS_BY_ID.get(q.wordId)!;
      if (i % 2 === 0) {
        expect(q.direction).toBe('en-fr');
        expect(q.prompt).toBe(word.en);
        expect(q.options[q.correctIndex].label).toBe(word.fr);
      } else {
        expect(q.direction).toBe('fr-en');
        expect(q.prompt).toBe(word.fr);
        expect(q.options[q.correctIndex].label).toBe(word.en);
      }
    });
  });

  it('AC-07.6 : 4 options distinctes, exactement une correcte, distracteurs de la même catégorie', () => {
    const rng = createSeededRng(5);
    for (const word of WORDS) {
      const q = buildQuestion(word, 1, WORDS, rng);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.label)).size).toBe(4);
      expect(q.options.filter((o) => o.wordId === word.id)).toHaveLength(1);
      expect(q.options[q.correctIndex].wordId).toBe(word.id);
      for (const o of q.options) {
        expect(WORDS_BY_ID.get(o.wordId)!.category).toBe(word.category);
      }
    }
  });

  it('RG-65 : complète avec d’autres catégories si la catégorie ne fournit pas 3 distracteurs', () => {
    const bank = [WORDS[0], WORDS[1], ...WORDS.filter((w) => w.category === 'food').slice(0, 5)];
    const distractors = pickDistractors(WORDS[0], bank, createSeededRng(6));
    expect(distractors).toHaveLength(3);
    expect(distractors.map((w) => w.id)).toContain(WORDS[1].id);
    expect(distractors.every((w) => w.id !== WORDS[0].id)).toBe(true);
  });

  it('RG-65 : les 4 options sont mélangées (la bonne réponse n’est pas toujours au même rang)', () => {
    const rng = createSeededRng(7);
    const positions = new Set(WORDS.slice(0, 40).map((w) => buildQuestion(w, 1, WORDS, rng).correctIndex));
    expect(positions.size).toBe(4);
  });
});

describe('Score et effets (RG-68 → RG-71)', () => {
  it('AC-07.8 : 14/20 → 70 % Réussi ; 13/20 → 65 % À retravailler ; 7/10 → 70 % Réussi', () => {
    expect(scoreTest(14, 20)).toEqual({ correct: 14, total: 20, percent: 70, passed: true });
    expect(scoreTest(13, 20)).toEqual({ correct: 13, total: 20, percent: 65, passed: false });
    expect(scoreTest(7, 10)).toEqual({ correct: 7, total: 10, percent: 70, passed: true });
  });

  it('RG-68 : pourcentage arrondi (Math.round)', () => {
    expect(scoreTest(2, 3).percent).toBe(67);
    expect(scoreTest(11, 16).percent).toBe(69);
    expect(scoreTest(11, 16).passed).toBe(false);
  });

  it('AC-07.9 / RG-69 : bonne réponse +1 (max 5), mauvaise → 0 ; seenCount et lastSeenAt inchangés', () => {
    const progress: ProgressMap = { a: seen(2, LAST_WEEK, 3), b: seen(5, LAST_WEEK, 4), c: seen(4, LAST_WEEK, 2) };
    const next = applyTestAnswers(progress, [
      { wordId: 'a', correct: true },
      { wordId: 'b', correct: true },
      { wordId: 'c', correct: false },
    ]);
    expect(next.a).toEqual({ ...progress.a, box: 3 });
    expect(next.b).toEqual({ ...progress.b, box: 5 });
    expect(next.c).toEqual({ ...progress.c, box: 0 });
    expect(progress.a.box).toBe(2); // immuable
  });

  it('RG-71 : l’entrée d’historique contient weekId, date de fin, N, bonnes réponses, %, réussi', () => {
    const answers = Array.from({ length: 20 }, (_, i) => ({ wordId: `w${i}`, correct: i < 14 }));
    expect(createTestRecord(answers, NOW)).toEqual({
      weekId: '2026-W41',
      finishedAt: NOW.toISOString(),
      total: 20,
      correct: 14,
      percent: 70,
      passed: true,
    });
  });

  it('AC-08.2 : historique trié du plus récent au plus ancien', () => {
    const history = [
      record('2026-W39', new Date(2026, 8, 22).toISOString()),
      record('2026-W41', new Date(2026, 9, 6).toISOString()),
      record('2026-W40', new Date(2026, 8, 29).toISOString()),
    ];
    expect(sortHistory(history).map((r) => r.weekId)).toEqual(['2026-W41', '2026-W40', '2026-W39']);
  });
});
