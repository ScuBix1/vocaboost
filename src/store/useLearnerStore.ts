/**
 * Store persistant de l'apprenant (RG-90 → RG-94).
 * Zustand + persist + AsyncStorage, clé unique versionnée. Les actions délèguent au domaine ;
 * seule l'heure courante est lue ici (paramètre `now` surchargeable pour les tests).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import {
  allCategoriesSelected,
  DEFAULT_FILTERS,
  toggleCategory as toggleCategoryInFilters,
  toggleLevel as toggleLevelInFilters,
} from '@/domain/filters';
import {
  applyCardEvaluation,
  applyTestCompletion,
  createInitialData,
  migrateLearnerData,
  resetLearnerData,
  sanitizePersistedData,
} from '@/domain/learnerState';
import type { CategoryId, DailyGoal, Level, PersistedData, TestRecord } from '@/domain/types';
import type { TestAnswer } from '@/domain/weeklyTest';

export const STORAGE_KEY = 'vocaboost-store';
export const STORAGE_VERSION = 2;

/** Tentatives de lecture avant de considérer le stockage illisible (BUG-03). */
const READ_ATTEMPTS = 3;
const READ_RETRY_DELAY_MS = 100;

/**
 * Garde-fou d'écriture (BUG-03) : aucune écriture tant qu'une lecture n'a pas réussi.
 * - lecture réussie (même JSON corrompu, RG-93) → écritures autorisées ;
 * - lecture en échec (erreur AsyncStorage) → l'app démarre vierge en mémoire, mais rien
 *   n'est écrit : les données sur disque restent intactes pour le prochain lancement.
 */
let persistenceEnabled = false;
let lastReadFailed = false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Accès AsyncStorage tolérant : couvre aussi le rendu statique web (pas de `window`). */
const guardedAsyncStorage: StateStorage = {
  getItem: async (name) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < READ_ATTEMPTS; attempt++) {
      try {
        const value = await AsyncStorage.getItem(name);
        lastReadFailed = false;
        return value;
      } catch (error) {
        lastError = error;
        if (attempt < READ_ATTEMPTS - 1) await wait(READ_RETRY_DELAY_MS * attempt);
      }
    }
    lastReadFailed = true;
    throw lastError;
  },
  setItem: async (name, value) => {
    if (!persistenceEnabled) return;
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Écriture impossible : l'état reste en mémoire.
    }
  },
  removeItem: async (name) => {
    if (!persistenceEnabled) return;
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Ignoré.
    }
  },
};

export interface LearnerState extends PersistedData {
  /** Vrai une fois la lecture AsyncStorage terminée (succès ou échec). Non persisté. */
  hasHydrated: boolean;
  /** Enregistre immédiatement une évaluation de carte (RG-14). */
  evaluateCard: (wordId: string, knew: boolean, now?: Date) => void;
  /**
   * Termine le test : boîtes + historique + jour actif (RG-69, RG-71).
   * `startedAt` fixe la semaine ISO du test (décision PM post-QA, OBS-01) ; défaut : `now`.
   */
  completeTest: (answers: readonly TestAnswer[], now?: Date, startedAt?: Date) => TestRecord | null;
  setDailyGoal: (goal: DailyGoal) => void;
  /** Renvoie false si l'action est bloquée (dernier élément du groupe, RG-50). */
  toggleCategory: (category: CategoryId) => boolean;
  toggleLevel: (level: Level) => boolean;
  selectAllCategories: () => void;
  resetFilters: () => void;
  resetProgress: () => void;
}

const pickData = (state: PersistedData): PersistedData => ({
  progress: state.progress,
  activeDays: state.activeDays,
  cardsPerDay: state.cardsPerDay,
  bestStreak: state.bestStreak,
  testHistory: state.testHistory,
  filters: state.filters,
  dailyGoal: state.dailyGoal,
});

export const useLearnerStore = create<LearnerState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),
      hasHydrated: false,

      evaluateCard: (wordId, knew, now = new Date()) => {
        set(applyCardEvaluation(pickData(get()), wordId, knew, now));
      },

      completeTest: (answers, now = new Date(), startedAt = now) => {
        const { data, record } = applyTestCompletion(pickData(get()), answers, now, startedAt);
        if (record) set(data);
        return record;
      },

      setDailyGoal: (dailyGoal) => set({ dailyGoal }),

      toggleCategory: (category) => {
        const { filters, blocked } = toggleCategoryInFilters(get().filters, category);
        if (!blocked) set({ filters });
        return !blocked;
      },

      toggleLevel: (level) => {
        const { filters, blocked } = toggleLevelInFilters(get().filters, level);
        if (!blocked) set({ filters });
        return !blocked;
      },

      selectAllCategories: () => {
        if (allCategoriesSelected(get().filters)) return;
        set({ filters: { ...get().filters, categories: [...DEFAULT_FILTERS.categories] } });
      },

      resetFilters: () =>
        set({ filters: { categories: [...DEFAULT_FILTERS.categories], levels: [...DEFAULT_FILTERS.levels] } }),

      resetProgress: () => set(resetLearnerData(pickData(get()))),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => guardedAsyncStorage),
      partialize: (state) => pickData(state),
      // v1 → v2 : objectif 10 → 15 une seule fois (RG-147) ; version future : champs reconnus, sans plantage.
      migrate: (persisted, version) => migrateLearnerData(persisted, version),
      // Toute donnée lue est validée champ par champ (RG-93).
      merge: (persisted, current) => ({ ...current, ...sanitizePersistedData(persisted) }),
      onRehydrateStorage: () => () => {
        // Appelé en cas de succès comme d'erreur : on démarre quoi qu'il arrive (RG-93),
        // mais on n'écrit que si la lecture a abouti (BUG-03).
        // Si la lecture a réussi, ce setState réécrit l'état assaini (ex. JSON corrompu → état vierge).
        persistenceEnabled = !lastReadFailed;
        useLearnerStore.setState({ hasHydrated: true });
      },
    },
  ),
);
