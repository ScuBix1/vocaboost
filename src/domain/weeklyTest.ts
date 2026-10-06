/**
 * Test hebdomadaire QCM (RG-60 → RG-72, US-07, US-08).
 */
import { getWeekId } from './dates';
import { boxWeight, getWordProgress, isSeen, nextBox } from './leitner';
import { sampleUniform, sampleWeighted, shuffle, type Rng } from './random';
import type { ProgressMap, TestRecord, Word } from './types';

/** Mots vus requis pour débloquer le test (RG-61). */
export const TEST_MIN_SEEN = 10;
/** Nombre maximal de questions (RG-62). */
export const TEST_MAX_QUESTIONS = 20;
/** Seuil de réussite en pourcentage (RG-68). */
export const TEST_PASS_PERCENT = 70;
export const OPTIONS_PER_QUESTION = 4;

export type TestStatus =
  | { kind: 'locked'; seen: number; remaining: number }
  | { kind: 'available'; questionCount: number }
  | { kind: 'done'; record: TestRecord };

/** Test terminé pendant la semaine ISO de `now`, s'il existe (RG-60). */
export function findRecordForWeek(history: readonly TestRecord[], now: Date): TestRecord | undefined {
  const weekId = getWeekId(now);
  return history.find((r) => r.weekId === weekId);
}

/** Nombre de questions N = min(20, mots vus) (RG-62). */
export function questionCountFor(seen: number): number {
  return Math.min(TEST_MAX_QUESTIONS, seen);
}

/**
 * État du test de la semaine (RG-60, RG-61, RG-72) :
 * terminé cette semaine → `done` ; sinon < 10 vus → `locked` ; sinon `available`.
 */
export function getTestStatus(
  words: readonly Word[],
  progress: ProgressMap,
  history: readonly TestRecord[],
  now: Date,
): TestStatus {
  const record = findRecordForWeek(history, now);
  if (record) return { kind: 'done', record };
  const seen = words.filter((w) => isSeen(getWordProgress(progress, w.id))).length;
  if (seen < TEST_MIN_SEEN) {
    return { kind: 'locked', seen, remaining: TEST_MIN_SEEN - seen };
  }
  return { kind: 'available', questionCount: questionCountFor(seen) };
}

/** Mot étudié cette semaine : vu, et dernière évaluation dans la semaine ISO de `now` (spec §3). */
export function isStudiedThisWeek(progress: ProgressMap, wordId: string, now: Date): boolean {
  const p = getWordProgress(progress, wordId);
  if (!isSeen(p) || !p.lastSeenAt) return false;
  const last = new Date(p.lastSeenAt);
  return !Number.isNaN(last.getTime()) && getWeekId(last) === getWeekId(now);
}

/**
 * Sélection des mots du test (RG-63), sans doublon et sans tenir compte des filtres :
 * 1. mots étudiés cette semaine, tirage uniforme jusqu'à N ;
 * 2. complément parmi les autres mots vus, tirage pondéré RG-24.
 * Ordre final mélangé.
 */
export function selectTestWords(
  words: readonly Word[],
  progress: ProgressMap,
  now: Date,
  rng: Rng,
): Word[] {
  const seenWords = words.filter((w) => isSeen(getWordProgress(progress, w.id)));
  const count = questionCountFor(seenWords.length);
  const thisWeek = seenWords.filter((w) => isStudiedThisWeek(progress, w.id, now));
  const others = seenWords.filter((w) => !isStudiedThisWeek(progress, w.id, now));

  const fromWeek = sampleUniform(thisWeek, count, rng);
  const complement = sampleWeighted(
    others,
    count - fromWeek.length,
    (w) => boxWeight(getWordProgress(progress, w.id).box),
    rng,
  );
  return shuffle([...fromWeek, ...complement], rng);
}

/**
 * 3 distracteurs distincts de la bonne réponse, pris dans toute la banque,
 * en priorité dans la même catégorie (RG-65).
 */
export function pickDistractors(answer: Word, bank: readonly Word[], rng: Rng): Word[] {
  const needed = OPTIONS_PER_QUESTION - 1;
  const candidates = bank.filter((w) => w.id !== answer.id);
  const sameCategory = candidates.filter((w) => w.category === answer.category);
  const otherCategories = candidates.filter((w) => w.category !== answer.category);
  const picked = sampleUniform(sameCategory, needed, rng);
  return [...picked, ...sampleUniform(otherCategories, needed - picked.length, rng)];
}

export type QuestionDirection = 'en-fr' | 'fr-en';

export interface TestOption {
  wordId: string;
  label: string;
}

export interface TestQuestion {
  wordId: string;
  direction: QuestionDirection;
  /** Texte affiché : mot EN (en-fr) ou traduction FR (fr-en). */
  prompt: string;
  options: TestOption[];
  correctIndex: number;
}

/** Questions impaires (1, 3, 5…) EN → FR, paires FR → EN (RG-64). */
export function directionForQuestion(questionNumber: number): QuestionDirection {
  return questionNumber % 2 === 1 ? 'en-fr' : 'fr-en';
}

/** Construit une question QCM à 4 options mélangées (RG-64, RG-65). */
export function buildQuestion(
  word: Word,
  questionNumber: number,
  bank: readonly Word[],
  rng: Rng,
): TestQuestion {
  const direction = directionForQuestion(questionNumber);
  const labelOf = (w: Word) => (direction === 'en-fr' ? w.fr : w.en);
  const options = shuffle([word, ...pickDistractors(word, bank, rng)], rng).map((w) => ({
    wordId: w.id,
    label: labelOf(w),
  }));
  return {
    wordId: word.id,
    direction,
    prompt: direction === 'en-fr' ? word.en : word.fr,
    options,
    correctIndex: options.findIndex((o) => o.wordId === word.id),
  };
}

/** Génère le test complet de la semaine (RG-62 → RG-65). */
export function generateTest(
  bank: readonly Word[],
  progress: ProgressMap,
  now: Date,
  rng: Rng,
): TestQuestion[] {
  return selectTestWords(bank, progress, now, rng).map((word, i) => buildQuestion(word, i + 1, bank, rng));
}

export interface TestScore {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
}

/** Score = bonnes / N ; % = round ; réussi si ≥ 70 % (RG-68). */
export function scoreTest(correct: number, total: number): TestScore {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, passed: percent >= TEST_PASS_PERCENT };
}

export interface TestAnswer {
  wordId: string;
  correct: boolean;
}

/**
 * Effet du test sur les boîtes, appliqué en une fois à la fin (RG-69) :
 * bonne réponse → +1 (max 5), mauvaise → 0. `seenCount` et `lastSeenAt` ne changent pas.
 */
export function applyTestAnswers(progress: ProgressMap, answers: readonly TestAnswer[]): ProgressMap {
  const next: ProgressMap = { ...progress };
  for (const { wordId, correct } of answers) {
    const current = getWordProgress(next, wordId);
    next[wordId] = { ...current, box: nextBox(current.box, correct) };
  }
  return next;
}

/**
 * Entrée d'historique d'un test terminé à `finishedAt` (RG-71), rattachée à la semaine ISO
 * de son démarrage `startedAt` (décision PM post-QA, OBS-01).
 */
export function createTestRecord(
  answers: readonly TestAnswer[],
  finishedAt: Date,
  startedAt: Date = finishedAt,
): TestRecord {
  const score = scoreTest(answers.filter((a) => a.correct).length, answers.length);
  return {
    weekId: getWeekId(startedAt),
    finishedAt: finishedAt.toISOString(),
    total: score.total,
    correct: score.correct,
    percent: score.percent,
    passed: score.passed,
  };
}

/** Historique du plus récent au plus ancien (RG-71, AC-08.2). */
export function sortHistory(history: readonly TestRecord[]): TestRecord[] {
  return [...history].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
}
