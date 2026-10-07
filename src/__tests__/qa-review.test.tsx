/**
 * Tests QA — recette v1.1 « Mots du jour » (docs/05-rapport-qa.md, « Recette v1.1 — Mots du jour »).
 * Intégrité (lecture seule), cas limites de la définition et bug V11-01 (double tap « Réviser ces mots »).
 */
import { Dimensions } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { WORDS } from '@/data/words';
import { applyTestAnswers } from '@/domain/weeklyTest';
import { answerReviewCard, buildReviewQueue, getTodayWords, hardWords, startReviewPass } from '@/domain/dailyWords';
import { createInitialData } from '@/domain/learnerState';
import { createSeededRng } from '@/domain/random';
import type { ProgressMap } from '@/domain/types';
import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useReviewStore } from '@/store/useReviewStore';
import { useResultsStore } from '@/store/useResultsStore';

import HomeScreen from '@/app/(tabs)/index';
import TabsLayout from '@/app/(tabs)/_layout';
import LearnScreen from '@/app/(tabs)/learn';
import ProgressScreen from '@/app/(tabs)/progress';
import TestScreen from '@/app/(tabs)/test';
import RootLayout from '@/app/_layout';
import ReviewScreen from '@/app/review';
import ReviewResultScreen from '@/app/review-result';
import ReviewRunScreen from '@/app/review-run';
import SessionScreen from '@/app/session';
import SessionResultScreen from '@/app/session-result';

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeScreen,
  '(tabs)/learn': LearnScreen,
  '(tabs)/progress': ProgressScreen,
  '(tabs)/test': TestScreen,
  session: SessionScreen,
  'session-result': SessionResultScreen,
  review: ReviewScreen,
  'review-run': ReviewRunScreen,
  'review-result': ReviewResultScreen,
};
const waitGuard = () => act(() => jest.advanceTimersByTime(ACTION_GUARD_MS + 20));

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

const iso = (s: string) => new Date(s).toISOString();

beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
  useReviewStore.getState().clear();
  useResultsStore.setState({ lastSession: null, lastTest: null });
  jest.clearAllMocks();
});

describe('QA v1.1 — domaine : lecture seule et définition', () => {
  const now = new Date(2026, 9, 7, 15, 0, 0);
  const today = new Date(2026, 9, 7, 9, 0, 0).toISOString();
  const yesterday = new Date(2026, 9, 6, 22, 0, 0).toISOString();
  const progress: ProgressMap = {
    [WORDS[0].id]: { box: 0, seenCount: 2, firstSeenAt: yesterday, lastSeenAt: today },
    [WORDS[1].id]: { box: 3, seenCount: 1, firstSeenAt: today, lastSeenAt: today },
    [WORDS[2].id]: { box: 4, seenCount: 3, firstSeenAt: yesterday, lastSeenAt: yesterday },
  };

  it('RG-120 : les fonctions pures acceptent une progression gelée en profondeur (aucune mutation)', () => {
    deepFreeze(progress);
    const words = getTodayWords(WORDS, progress, now).map((d) => d.word);
    const pass = startReviewPass(words, progress, 'daily', createSeededRng(3));
    const after = answerReviewCard(answerReviewCard(pass, false), true);
    expect(hardWords(after)).toHaveLength(1);
    expect(buildReviewQueue(words, progress, createSeededRng(1))).toHaveLength(2);
  });

  it('AC-11.2 / RG-69 : un test fait aujourd’hui sur un mot vu hier ne crée aucun mot du jour', () => {
    const after = applyTestAnswers(progress, [
      { wordId: WORDS[2].id, correct: false },
      { wordId: WORDS[1].id, correct: true },
    ]);
    expect(after[WORDS[2].id].lastSeenAt).toBe(yesterday);
    expect(after[WORDS[2].id].seenCount).toBe(3);
    expect(getTodayWords(WORDS, after, now).map((d) => d.word.id).sort()).toEqual([WORDS[0].id, WORDS[1].id].sort());
  });

  it('RG-100 : seenCount 0 avec lastSeenAt aujourd’hui (donnée incohérente) est ignoré ; date future ignorée', () => {
    const odd: ProgressMap = {
      a: { box: 0, seenCount: 0, firstSeenAt: today, lastSeenAt: today },
      [WORDS[3].id]: { box: 1, seenCount: 1, firstSeenAt: today, lastSeenAt: new Date(2026, 9, 8, 0, 0, 1).toISOString() },
    };
    expect(getTodayWords(WORDS, odd, now)).toHaveLength(0);
  });

  it('RG-102 : bornes de minuit en heure locale (23:59:59.999 / 00:00:00.000)', () => {
    const p: ProgressMap = { [WORDS[0].id]: { box: 1, seenCount: 1, firstSeenAt: null, lastSeenAt: new Date(2026, 9, 7, 23, 59, 59, 999).toISOString() } };
    expect(getTodayWords(WORDS, p, new Date(2026, 9, 7, 23, 59, 59, 999))).toHaveLength(1);
    expect(getTodayWords(WORDS, p, new Date(2026, 9, 8, 0, 0, 0, 0))).toHaveLength(0);
    expect(iso('2026-10-07T00:00:00Z')).toBeTruthy();
  });
});

describe('QA v1.1 — double tap « Réviser ces mots » (V11-01)', () => {
  // Le tap résiduel d'un double tap tombe sur « Retourner » de la 1re carte (même emplacement, bas d'écran).
  it('le 2e tap d’un double tap sur « Réviser ces mots » ne doit pas retourner la 1re carte', async () => {
    const t = new Date();
    WORDS.slice(0, 4).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, t));
    await renderRouter(routes, { initialUrl: '/review' });
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-start'));
    await fireEvent.press(screen.getByTestId('review-flip')); // 2e tap, dans les 300 ms
    expect(screen.queryByTestId('review-retained')).toBeNull();
  });
});

describe('Corrections recette v1.1 (V11-02, V11-03, V11-05)', () => {
  const realNow = Date.now();
  afterEach(() => {
    jest.setSystemTime(realNow);
  });

  it('V11-02 : une liste laissée ouverte à minuit se vide d’elle-même (état vide, pas de passe de la veille)', async () => {
    jest.setSystemTime(new Date(2026, 9, 7, 23, 58, 0));
    WORDS.slice(0, 3).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, new Date()));
    await renderRouter(routes, { initialUrl: '/review' });
    await waitGuard();
    expect(screen.getByTestId('review-count')).toBeTruthy();
    jest.setSystemTime(new Date(2026, 9, 8, 0, 0, 5));
    await act(() => jest.advanceTimersByTime(3 * 60 * 1000));
    expect(screen.getByTestId('review-empty')).toBeTruthy();
    expect(screen.queryByTestId('review-start')).toBeNull();
  });

  it('V11-02 : « Réviser ces mots » recalcule sur la date courante et ne lance pas les mots de la veille', async () => {
    jest.setSystemTime(new Date(2026, 9, 7, 23, 58, 0));
    WORDS.slice(0, 3).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, new Date()));
    await renderRouter(routes, { initialUrl: '/review' });
    await waitGuard();
    jest.setSystemTime(new Date(2026, 9, 8, 0, 0, 5)); // minuit passé, minuteur pas encore déclenché
    await fireEvent.press(screen.getByTestId('review-start'));
    expect(useReviewStore.getState().pass).toBeNull();
    expect(screen.queryByTestId('review-run-pending')).toBeNull();
    expect(screen.queryByTestId('review-counter')).toBeNull();
  });

  it('V11-03 : à 320×568, la liste « À revoir encore » et les trois boutons sont dans la zone défilante', async () => {
    const t = new Date();
    WORDS.slice(0, 3).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, t));
    Dimensions.set({ window: { width: 320, height: 568, scale: 2, fontScale: 1 } });
    try {
      await renderRouter(routes, { initialUrl: '/review' });
      await waitGuard();
      await fireEvent.press(screen.getByTestId('review-start'));
      for (const retained of [true, false, false]) {
        await waitGuard();
        await fireEvent.press(screen.getByTestId('review-flip'));
        await waitGuard();
        await fireEvent.press(screen.getByTestId(retained ? 'review-retained' : 'review-hard'));
      }
      expect(await screen.findByTestId('review-hard-list')).toBeTruthy();
      for (const id of ['review-redo-hard', 'review-redo-all', 'review-home']) expect(screen.getByTestId(id)).toBeTruthy();
    } finally {
      Dimensions.set({ window: { width: 390, height: 844, scale: 2, fontScale: 1 } });
    }
  });

  it('V11-05 : quitter la liste vide l’état éphémère de la révision', async () => {
    const t = new Date();
    WORDS.slice(0, 2).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, t));
    await renderRouter(routes, { initialUrl: '/review' });
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-start'));
    expect(useReviewStore.getState().pass).not.toBeNull();
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-quit')); // retour à la liste : la passe reste en mémoire
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-back')); // sortie de la liste : état vidé
    expect(useReviewStore.getState().pass).toBeNull();
  });
});
