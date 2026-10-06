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
  resetLearnerData,
  sanitizePersistedData,
} from '@/domain/learnerState';
import type { CategoryId, DailyGoal, Level, PersistedData, TestRecord } from '@/domain/types';
import type { TestAnswer } from '@/domain/weeklyTest';

export const STORAGE_KEY = 'vocaboost-store';
export const STORAGE_VERSION = 1;

/**
 * Accès AsyncStorage qui ne lève jamais : une lecture en échec équivaut à « aucune donnée »
 * (état vierge, RG-93) et une écriture en échec est ignorée. Couvre aussi le rendu statique
 * web (pas de `window` côté serveur).
 */
const safeAsyncStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Écriture impossible : l'état reste en mémoire.
    }
  },
  removeItem: async (name) => {
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
  /** Termine le test : boîtes + historique + jour actif (RG-69, RG-71). */
  completeTest: (answers: readonly TestAnswer[], now?: Date) => TestRecord | null;
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

      completeTest: (answers, now = new Date()) => {
        const { data, record } = applyTestCompletion(pickData(get()), answers, now);
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
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => pickData(state),
      // Version future : repartir des champs reconnus plutôt que de planter.
      migrate: (persisted) => sanitizePersistedData(persisted),
      // Toute donnée lue est validée champ par champ (RG-93).
      merge: (persisted, current) => ({ ...current, ...sanitizePersistedData(persisted) }),
      onRehydrateStorage: () => () => {
        // Appelé en cas de succès comme d'erreur (JSON illisible) : on démarre quoi qu'il arrive.
        useLearnerStore.setState({ hasHydrated: true });
      },
    },
  ),
);
