/**
 * Passe de révision éphémère (v1.1, RG-112 → RG-114, RG-120). Non persisté, comme useResultsStore :
 * la fermeture de l'app efface tout. Ce store n'écrit jamais dans useLearnerStore.
 */
import { create } from 'zustand';

import {
  answerReviewCard,
  hardWords,
  startReviewPass,
  type ReviewPass,
} from '@/domain/dailyWords';
import type { Rng } from '@/domain/random';
import type { ProgressMap, Word } from '@/domain/types';

interface ReviewState {
  /** Tous les mots du jour figés au démarrage de la révision (RG-102). */
  snapshot: readonly Word[];
  /** Progression au démarrage, uniquement pour ordonner les passes (lecture seule). */
  progress: ProgressMap;
  pass: ReviewPass | null;
  /** Nouvelle passe sur l'instantané des mots du jour (RG-110). */
  startDaily: (words: readonly Word[], progress: ProgressMap, rng?: Rng) => void;
  /** « Refaire tous les mots » : même instantané, nouvel ordre. */
  restartAll: (rng?: Rng) => void;
  /** « Refaire les mots difficiles » (RG-114) ; sans effet s'il n'y en a aucun. */
  startHard: (rng?: Rng) => void;
  /** Choix sur la carte courante (RG-112). */
  answer: (retained: boolean) => void;
  clear: () => void;
}

export const useReviewStore = create<ReviewState>()((set, get) => ({
  snapshot: [],
  progress: {},
  pass: null,

  startDaily: (words, progress, rng = Math.random) =>
    set({ snapshot: words, progress, pass: startReviewPass(words, progress, 'daily', rng) }),

  restartAll: (rng = Math.random) => {
    const { snapshot, progress } = get();
    if (snapshot.length === 0) return;
    set({ pass: startReviewPass(snapshot, progress, 'daily', rng) });
  },

  startHard: (rng = Math.random) => {
    const { pass, progress } = get();
    if (!pass) return;
    const hard = hardWords(pass);
    if (hard.length === 0) return;
    set({ pass: startReviewPass(hard, progress, 'hard', rng) });
  },

  answer: (retained) => {
    const { pass } = get();
    if (pass) set({ pass: answerReviewCard(pass, retained) });
  },

  clear: () => set({ snapshot: [], progress: {}, pass: null }),
}));
