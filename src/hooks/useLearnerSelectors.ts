/**
 * Valeurs dérivées de l'état de l'apprenant, calculées par le domaine.
 */
import { useMemo } from 'react';

import { WORDS } from '@/data/words';
import { toLocalDateKey } from '@/domain/dates';
import { filterPool } from '@/domain/filters';
import { computeCategoryStats, computeGlobalStats } from '@/domain/stats';
import { cardsOnDay, computeBestStreak, computeCurrentStreak, computeGoalStatus, getWeekDays } from '@/domain/streak';
import { getTestStatus } from '@/domain/weeklyTest';
import { useLearnerStore } from '@/store/useLearnerStore';

/** Statistiques globales (ignorent les filtres, AC-04.5). */
export function useGlobalStats() {
  const progress = useLearnerStore((s) => s.progress);
  return useMemo(() => computeGlobalStats(WORDS, progress), [progress]);
}

export function useCategoryStats() {
  const progress = useLearnerStore((s) => s.progress);
  return useMemo(() => computeCategoryStats(WORDS, progress), [progress]);
}

/** Série actuelle et meilleure série (RG-46, RG-47). */
export function useStreaks(now: Date) {
  const activeDays = useLearnerStore((s) => s.activeDays);
  const bestStored = useLearnerStore((s) => s.bestStreak);
  const todayKey = toLocalDateKey(now);
  return useMemo(() => {
    const current = computeCurrentStreak(activeDays, todayKey);
    return { current, best: Math.max(current, computeBestStreak(bestStored, activeDays)) };
  }, [activeDays, bestStored, todayKey]);
}

/** Objectif du jour (RG-44). */
export function useGoalStatus(now: Date) {
  const cardsPerDay = useLearnerStore((s) => s.cardsPerDay);
  const goal = useLearnerStore((s) => s.dailyGoal);
  const todayKey = toLocalDateKey(now);
  return useMemo(() => computeGoalStatus(cardsOnDay(cardsPerDay, todayKey), goal), [cardsPerDay, goal, todayKey]);
}

/** Pool filtré des sessions (RG-51). */
export function useSessionPool() {
  const filters = useLearnerStore((s) => s.filters);
  return useMemo(() => filterPool(WORDS, filters), [filters]);
}

/** État du test de la semaine (RG-60 → RG-62, RG-72). */
export function useTestStatus(now: Date) {
  const progress = useLearnerStore((s) => s.progress);
  const history = useLearnerStore((s) => s.testHistory);
  const time = now.getTime();
  return useMemo(() => getTestStatus(WORDS, progress, history, new Date(time)), [progress, history, time]);
}

/** Jours de la semaine ISO courante et leur statut actif (WeekStrip, design §4.6). */
export function useWeekDays(now: Date) {
  const activeDays = useLearnerStore((s) => s.activeDays);
  const todayKey = toLocalDateKey(now);
  return useMemo(() => getWeekDays(activeDays, todayKey), [activeDays, todayKey]);
}
