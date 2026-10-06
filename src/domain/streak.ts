/**
 * Jours actifs, série et objectif quotidien (RG-44 → RG-48, US-05).
 * Les dates sont des clés locales `YYYY-MM-DD` fournies par l'appelant.
 */
import { addDaysToKey } from './dates';

/** Ajoute une date locale à l'ensemble trié des jours actifs (RG-45, RG-48). */
export function markActiveDay(activeDays: readonly string[], dayKey: string): string[] {
  if (activeDays.includes(dayKey)) return [...activeDays];
  return [...activeDays, dayKey].sort();
}

/** Nombre de jours actifs consécutifs se terminant à `endKey` (inclus). */
function countRunEndingAt(active: ReadonlySet<string>, endKey: string): number {
  let count = 0;
  let cursor = endKey;
  while (active.has(cursor)) {
    count += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return count;
}

/**
 * Série actuelle (RG-46) :
 * aujourd'hui actif → série finissant aujourd'hui ; sinon hier actif → série finissant hier ; sinon 0.
 */
export function computeCurrentStreak(activeDays: readonly string[], todayKey: string): number {
  const active = new Set(activeDays);
  if (active.has(todayKey)) return countRunEndingAt(active, todayKey);
  const yesterday = addDaysToKey(todayKey, -1);
  if (active.has(yesterday)) return countRunEndingAt(active, yesterday);
  return 0;
}

/** Plus longue série présente dans l'historique des jours actifs. */
export function computeLongestStreak(activeDays: readonly string[]): number {
  const active = new Set(activeDays);
  let best = 0;
  for (const day of active) {
    // On ne compte qu'à partir du début de chaque série.
    if (!active.has(addDaysToKey(day, -1))) {
      let length = 0;
      let cursor = day;
      while (active.has(cursor)) {
        length += 1;
        cursor = addDaysToKey(cursor, 1);
      }
      best = Math.max(best, length);
    }
  }
  return best;
}

/** Meilleure série conservée : maximum entre la valeur stockée et l'historique (RG-47). */
export function computeBestStreak(storedBest: number, activeDays: readonly string[]): number {
  return Math.max(storedBest, computeLongestStreak(activeDays));
}

/** Cartes évaluées à la date locale donnée (RG-44). */
export function cardsOnDay(cardsPerDay: Readonly<Record<string, number>>, dayKey: string): number {
  return cardsPerDay[dayKey] ?? 0;
}

/** Incrémente le compteur de cartes du jour (RG-44 ; jamais appelé par le test). */
export function incrementCardsOnDay(
  cardsPerDay: Readonly<Record<string, number>>,
  dayKey: string,
): Record<string, number> {
  return { ...cardsPerDay, [dayKey]: cardsOnDay(cardsPerDay, dayKey) + 1 };
}

export interface GoalStatus {
  done: number;
  goal: number;
  /** Ratio non borné (peut dépasser 1, ex. 15/10). */
  ratio: number;
  reached: boolean;
  remaining: number;
}

/** Objectif du jour : atteint quand x ≥ objectif, x continue au-delà (RG-44, AC-05.6). */
export function computeGoalStatus(done: number, goal: number): GoalStatus {
  return {
    done,
    goal,
    ratio: goal > 0 ? done / goal : 0,
    reached: done >= goal,
    remaining: Math.max(0, goal - done),
  };
}
