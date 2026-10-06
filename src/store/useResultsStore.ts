/**
 * Résultats éphémères (non persistés) transmis aux écrans de résultat.
 * Une fermeture de l'app les efface, ce qui est voulu : pas de reprise de session ni de test.
 */
import { create } from 'zustand';

import type { TestRecord, Word } from '@/domain/types';

/** Récapitulatif de fin de session (RG-35). */
export interface SessionSummary {
  known: number;
  total: number;
  /** Mots dont la boîte a atteint 4 pendant la session. */
  newlyMastered: number;
  /** Cartes du jour avant la session (pour détecter « objectif atteint pendant la session »). */
  cardsTodayBefore: number;
}

/** Résultat d'un test terminé (RG-70). */
export interface TestResult {
  record: TestRecord;
  missed: Word[];
}

interface ResultsState {
  lastSession: SessionSummary | null;
  lastTest: TestResult | null;
  setLastSession: (summary: SessionSummary) => void;
  setLastTest: (result: TestResult) => void;
}

export const useResultsStore = create<ResultsState>()((set) => ({
  lastSession: null,
  lastTest: null,
  setLastSession: (lastSession) => set({ lastSession }),
  setLastTest: (lastTest) => set({ lastTest }),
}));
