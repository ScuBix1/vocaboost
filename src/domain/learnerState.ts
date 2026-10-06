/**
 * Transitions de l'état persisté de l'apprenant (RG-14, RG-44 → RG-48, RG-69, RG-71, RG-90 → RG-94).
 * Fonctions pures : le store zustand se contente de les appeler avec l'heure courante.
 */
import { toLocalDateKey } from './dates';
import { DEFAULT_FILTERS } from './filters';
import { MAX_BOX, MIN_BOX, recordEvaluation } from './leitner';
import { computeCurrentStreak, incrementCardsOnDay, markActiveDay } from './streak';
import {
  CATEGORY_IDS,
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_GOAL,
  LEVELS,
  type CategoryId,
  type DailyGoal,
  type Filters,
  type Level,
  type PersistedData,
  type ProgressMap,
  type TestRecord,
  type WordProgress,
} from './types';
import { applyTestAnswers, createTestRecord, findRecordForWeek, type TestAnswer } from './weeklyTest';

export function createInitialData(): PersistedData {
  return {
    progress: {},
    activeDays: [],
    cardsPerDay: {},
    bestStreak: 0,
    testHistory: [],
    filters: { categories: [...DEFAULT_FILTERS.categories], levels: [...DEFAULT_FILTERS.levels] },
    dailyGoal: DEFAULT_DAILY_GOAL,
  };
}

/** Marque le jour actif et met à jour la meilleure série (RG-45, RG-47). */
function withActiveDay(data: PersistedData, dayKey: string): PersistedData {
  const activeDays = markActiveDay(data.activeDays, dayKey);
  const bestStreak = Math.max(data.bestStreak, computeCurrentStreak(activeDays, dayKey));
  return { ...data, activeDays, bestStreak };
}

/**
 * Évaluation d'une carte en session (RG-11 → RG-14, RG-44, RG-45) :
 * boîte, seenCount, dates, compteur du jour, jour actif, meilleure série.
 */
export function applyCardEvaluation(
  data: PersistedData,
  wordId: string,
  knew: boolean,
  now: Date,
): PersistedData {
  const dayKey = toLocalDateKey(now);
  return withActiveDay(
    {
      ...data,
      progress: recordEvaluation(data.progress, wordId, knew, now),
      cardsPerDay: incrementCardsOnDay(data.cardsPerDay, dayKey),
    },
    dayKey,
  );
}

/**
 * Fin d'un test (RG-60, RG-69, RG-71, RG-45) : boîtes mises à jour en une fois,
 * entrée d'historique ajoutée, jour marqué actif. L'objectif quotidien n'est pas touché.
 * Si un test a déjà été terminé cette semaine, l'état est renvoyé inchangé.
 */
export function applyTestCompletion(
  data: PersistedData,
  answers: readonly TestAnswer[],
  now: Date,
): { data: PersistedData; record: TestRecord | null } {
  if (answers.length === 0 || findRecordForWeek(data.testHistory, now)) {
    return { data, record: null };
  }
  const record = createTestRecord(answers, now);
  const next = withActiveDay(
    {
      ...data,
      progress: applyTestAnswers(data.progress, answers),
      testHistory: [...data.testHistory, record],
    },
    toLocalDateKey(now),
  );
  return { data: next, record };
}

/** Réinitialisation (RG-94) : tout est effacé sauf l'objectif quotidien et les filtres. */
export function resetLearnerData(data: PersistedData): PersistedData {
  return { ...createInitialData(), dailyGoal: data.dailyGoal, filters: data.filters };
}

// --- Lecture défensive des données persistées (RG-93, AC-10.4) ---

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isDayKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isIsoOrNull = (v: unknown): v is string | null =>
  v === null || (typeof v === 'string' && !Number.isNaN(new Date(v).getTime()));
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function sanitizeWordProgress(v: unknown): WordProgress | null {
  if (!isRecord(v)) return null;
  const { box, seenCount, firstSeenAt, lastSeenAt } = v;
  if (!isCount(box) || box < MIN_BOX || box > MAX_BOX || !isCount(seenCount)) return null;
  if (!isIsoOrNull(firstSeenAt) || !isIsoOrNull(lastSeenAt)) return null;
  return { box, seenCount, firstSeenAt, lastSeenAt };
}

function sanitizeTestRecord(v: unknown): TestRecord | null {
  if (!isRecord(v)) return null;
  const { weekId, finishedAt, total, correct, percent, passed } = v;
  if (typeof weekId !== 'string' || !/^\d{4}-W\d{2}$/.test(weekId)) return null;
  if (typeof finishedAt !== 'string' || Number.isNaN(new Date(finishedAt).getTime())) return null;
  if (!isCount(total) || !isCount(correct) || !isCount(percent) || typeof passed !== 'boolean') return null;
  return { weekId, finishedAt, total, correct, percent, passed };
}

function sanitizeGroup<T extends string>(v: unknown, allowed: readonly T[]): T[] | null {
  if (!Array.isArray(v)) return null;
  const selected = allowed.filter((x) => v.includes(x));
  return selected.length > 0 ? selected : null;
}

/**
 * Convertit des données persistées inconnues en `PersistedData` valide.
 * Toute partie illisible retombe sur sa valeur vierge, sans exception (RG-93).
 */
export function sanitizePersistedData(raw: unknown): PersistedData {
  const base = createInitialData();
  if (!isRecord(raw)) return base;

  const progress: ProgressMap = {};
  if (isRecord(raw.progress)) {
    for (const [id, value] of Object.entries(raw.progress)) {
      const p = sanitizeWordProgress(value);
      if (p) progress[id] = p;
    }
  }

  const activeDays = Array.isArray(raw.activeDays)
    ? [...new Set(raw.activeDays.filter(isDayKey))].sort()
    : base.activeDays;

  const cardsPerDay: Record<string, number> = {};
  if (isRecord(raw.cardsPerDay)) {
    for (const [day, count] of Object.entries(raw.cardsPerDay)) {
      if (isDayKey(day) && isCount(count)) cardsPerDay[day] = count;
    }
  }

  const testHistory = Array.isArray(raw.testHistory)
    ? raw.testHistory.map(sanitizeTestRecord).filter((r): r is TestRecord => r !== null)
    : base.testHistory;

  const filtersRaw = isRecord(raw.filters) ? raw.filters : {};
  const filters: Filters = {
    categories: sanitizeGroup<CategoryId>(filtersRaw.categories, CATEGORY_IDS) ?? base.filters.categories,
    levels: sanitizeGroup<Level>(filtersRaw.levels, LEVELS) ?? base.filters.levels,
  };

  const dailyGoal = (DAILY_GOAL_OPTIONS as readonly unknown[]).includes(raw.dailyGoal)
    ? (raw.dailyGoal as DailyGoal)
    : base.dailyGoal;

  return {
    progress,
    activeDays,
    cardsPerDay,
    bestStreak: isCount(raw.bestStreak) ? raw.bestStreak : 0,
    testHistory,
    filters,
    dailyGoal,
  };
}
