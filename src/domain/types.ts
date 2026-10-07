/**
 * Types métier de VocaBoost (spec PM §3 et §4).
 * Aucune dépendance React : ce module est importable depuis les tests et le store.
 */

/** Niveaux CECRL couverts par la banque (RG-02). */
export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type Level = (typeof LEVELS)[number];

/** Identifiants techniques des 10 catégories, dans l'ordre d'affichage RG-04. */
export const CATEGORY_IDS = [
  'house',
  'food',
  'travel',
  'work',
  'school',
  'body',
  'nature',
  'emotions',
  'time',
  'verbs',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Libellés français des catégories (RG-04, RG-06). */
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  house: 'Maison',
  food: 'Nourriture',
  travel: 'Voyage',
  work: 'Travail',
  school: 'École',
  body: 'Corps & santé',
  nature: 'Nature & animaux',
  emotions: 'Émotions & personnalité',
  time: 'Temps & calendrier',
  verbs: 'Verbes courants',
};

/** Un mot de la banque embarquée (RG-02). */
export interface Word {
  id: string;
  en: string;
  fr: string;
  category: CategoryId;
  level: Level;
  example: string;
  /** Traduction française de `example` (RG-155) ; jamais affichée au recto ni dans le test. */
  exampleFr: string;
}

/** État d'apprentissage d'un mot (RG-10 → RG-13). */
export interface WordProgress {
  /** Boîte de Leitner, entier de 0 à 5. */
  box: number;
  seenCount: number;
  /** Horodatage ISO de la première évaluation en session. */
  firstSeenAt: string | null;
  /** Horodatage ISO de la dernière évaluation en session. */
  lastSeenAt: string | null;
}

/** État par mot, indexé par id. Un mot absent est un mot nouveau (RG-91). */
export type ProgressMap = Record<string, WordProgress>;

/** Filtres de session (RG-50 → RG-52). */
export interface Filters {
  categories: CategoryId[];
  levels: Level[];
}

/** Entrée d'historique d'un test hebdomadaire terminé (RG-71). */
export interface TestRecord {
  weekId: string;
  /** Horodatage ISO de fin du test. */
  finishedAt: string;
  total: number;
  correct: number;
  percent: number;
  passed: boolean;
}

/** Valeurs autorisées pour l'objectif quotidien (RG-44). */
export const DAILY_GOAL_OPTIONS = [10, 15, 20, 30] as const;
export type DailyGoal = (typeof DAILY_GOAL_OPTIONS)[number];
export const DEFAULT_DAILY_GOAL: DailyGoal = 15;

/** Données persistées (RG-91). La banque de mots n'en fait pas partie. */
export interface PersistedData {
  progress: ProgressMap;
  /** Dates locales actives `YYYY-MM-DD`, triées, sans doublon (RG-48). */
  activeDays: string[];
  /** Nombre de cartes évaluées par date locale (RG-44, RG-48). */
  cardsPerDay: Record<string, number>;
  bestStreak: number;
  testHistory: TestRecord[];
  filters: Filters;
  dailyGoal: DailyGoal;
}
