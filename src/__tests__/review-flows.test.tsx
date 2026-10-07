/**
 * « Revoir le vocabulaire du jour » v1.1 : parcours d'écrans et intégrité de la progression
 * (AC-11.4, AC-12.1 → 12.7, AC-13.x, AC-14.1 → 14.5, AC-15.x, AC-16.1).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';

import { WORDS } from '@/data/words';
import { createInitialData } from '@/domain/learnerState';
import { createSeededRng } from '@/domain/random';
import { composeSession } from '@/domain/session';
import { selectTestWords } from '@/domain/weeklyTest';
import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';
import { STORAGE_VERSION, useLearnerStore } from '@/store/useLearnerStore';
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

const waitGuard = () => act(() => jest.advanceTimersByTime(ACTION_GUARD_MS + 20));

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

/** Données persistées uniquement (sans actions ni hasHydrated), sérialisées. */
const persisted = () => {
  const s = useLearnerStore.getState();
  return JSON.stringify({
    progress: s.progress,
    activeDays: s.activeDays,
    cardsPerDay: s.cardsPerDay,
    bestStreak: s.bestStreak,
    testHistory: s.testHistory,
    filters: s.filters,
    dailyGoal: s.dailyGoal,
  });
};

/** Évalue `count` mots aujourd'hui : les 2 premiers « Je ne savais pas » (boîte 0), les autres « Je savais ». */
function studyToday(count: number, firstUnknown = 2) {
  const now = new Date();
  WORDS.slice(0, count).forEach((w, i) => useLearnerStore.getState().evaluateCard(w.id, i >= firstUnknown, now));
}

beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
  useReviewStore.getState().clear();
  useResultsStore.setState({ lastSession: null, lastTest: null });
  jest.clearAllMocks();
});

async function startPassFromList() {
  await renderRouter(routes, { initialUrl: '/review' });
  await waitGuard(); // verrou d'arrivée
  await fireEvent.press(screen.getByTestId('review-start'));
}

/** Parcourt toute la passe avec une liste de verdicts (true = Retenu). */
async function playPass(verdicts: boolean[]) {
  for (const retained of verdicts) {
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-flip'));
    await waitGuard();
    await fireEvent.press(screen.getByTestId(retained ? 'review-retained' : 'review-hard'));
  }
}

describe('Liste « Mots du jour » (US-11)', () => {
  it('AC-11.4 : mot, traduction, exemple, catégorie, niveau et badge ; en-tête et note', async () => {
    studyToday(3, 1); // WORDS[0] boîte 0, deux autres boîte 1
    await renderRouter(routes, { initialUrl: '/review' });
    expect(screen.getByText('Mots du jour')).toBeTruthy();
    expect(screen.getByText('3 mots étudiés aujourd’hui'.replace('’', "'"))).toBeTruthy();
    expect(screen.getByTestId('review-note')).toBeTruthy();
    const first = WORDS[0];
    expect(screen.getByText(first.fr, { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(`“${first.example}”`, { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByText('À revoir', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getAllByText('Su', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getByTestId('review-start')).toBeTruthy();
  });

  it('1 mot : libellé au singulier', async () => {
    studyToday(1, 0);
    await renderRouter(routes, { initialUrl: '/review' });
    expect(screen.getByText("1 mot étudié aujourd'hui")).toBeTruthy();
  });

  it('AC-11.6 : les filtres restrictifs ne masquent aucun mot du jour', async () => {
    studyToday(4, 0);
    useLearnerStore.setState({ filters: { categories: ['travel'], levels: ['B2'] } });
    await renderRouter(routes, { initialUrl: '/review' });
    expect(screen.getByText("4 mots étudiés aujourd'hui")).toBeTruthy();
  });

  it('AC-16.1 : les 🔊 de la ligne lisent le mot puis l’exemple (en-US, 0,9)', async () => {
    studyToday(1, 0);
    await renderRouter(routes, { initialUrl: '/review' });
    await fireEvent.press(screen.getByLabelText(`Écouter le mot ${WORDS[0].en}`));
    expect(Speech.speak).toHaveBeenLastCalledWith(WORDS[0].en, expect.objectContaining({ language: 'en-US', rate: 0.9 }));
    await fireEvent.press(screen.getByLabelText("Écouter l'exemple"));
    expect(Speech.speak).toHaveBeenLastCalledWith(WORDS[0].example, expect.anything());
  });

  it('AC-15.2 / RG-133 : état vide avec « Commencer une session » fonctionnel, sans bouton de révision', async () => {
    await renderRouter(routes, { initialUrl: '/review' });
    expect(screen.getByText("Aucun mot étudié aujourd'hui")).toBeTruthy();
    expect(screen.getByText('Fais une session pour retrouver ici les mots du jour.')).toBeTruthy();
    expect(screen.queryByTestId('review-start')).toBeNull();
    await waitGuard();
    await fireEvent.press(screen.getByText('Commencer une session'));
    await waitFor(() => expect(screen.getByTestId('flashcard-front')).toBeTruthy());
  });

  it('AC-11.8 : après réinitialisation, la liste est vide', async () => {
    studyToday(3);
    useLearnerStore.getState().resetProgress();
    await renderRouter(routes, { initialUrl: '/review' });
    expect(screen.getByTestId('review-empty')).toBeTruthy();
  });
});

describe('Passe de révision (US-12, US-13)', () => {
  it('AC-12.1 / AC-12.2 : première carte au recto, sans traduction visible ni boutons de choix', async () => {
    studyToday(3);
    await startPassFromList();
    await waitFor(() => expect(screen.getByTestId('flashcard-front')).toBeTruthy());
    expect(screen.getByTestId('review-counter')).toHaveTextContent('1/3');
    expect(screen.getByTestId('review-mode')).toHaveTextContent('RÉVISION · MOTS DU JOUR');
    expect(screen.queryByTestId('review-retained')).toBeNull();
    expect(screen.queryByTestId('review-hard')).toBeNull();
    expect(screen.getByText('Tu te souviens de la traduction ?')).toBeTruthy();
  });

  it('AC-12.2 : après retournement, « Retenu » et « À revoir encore » apparaissent', async () => {
    studyToday(3);
    await startPassFromList();
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-flip'));
    expect(screen.getByTestId('review-retained')).toBeTruthy();
    expect(screen.getByLabelText('À revoir encore')).toBeTruthy();
    expect(screen.getByText('Réponds sans pression, personne ne note 😉')).toBeTruthy();
  });

  it('AC-12.4 / AC-12.5 / RG-113 : passe complète, « x / N retenus » et liste des mots à revoir', async () => {
    studyToday(3);
    await startPassFromList();
    await playPass([true, false, false]);
    await waitFor(() => expect(screen.getByText('Révision terminée !')).toBeTruthy());
    expect(screen.getByTestId('review-score')).toHaveTextContent('1 / 3 retenus');
    expect(screen.getByText('À revoir encore (2)')).toBeTruthy();
    expect(screen.getByText('Voici les mots à relire encore.')).toBeTruthy();
    expect(screen.getByTestId('review-redo-hard')).toBeTruthy();
    expect(screen.getByTestId('review-redo-all')).toBeTruthy();
    expect(screen.getByTestId('review-home')).toBeTruthy();
    expect(screen.getByTestId('review-note')).toHaveTextContent(/Les mots à revoir encore sont juste signalés ici\.$/);
  });

  it('AC-13.1 : « Refaire les mots difficiles » reprend exactement les mots marqués', async () => {
    studyToday(4);
    await startPassFromList();
    await playPass([true, false, true, false]);
    await waitFor(() => expect(screen.getByTestId('review-redo-hard')).toBeTruthy());
    const hardIds = useReviewStore.getState().pass!.hardIds;
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-redo-hard'));
    await waitFor(() => expect(screen.getByTestId('review-mode')).toHaveTextContent('RÉVISION · MOTS DIFFICILES'));
    expect(screen.getByTestId('review-counter')).toHaveTextContent('1/2');
    expect(new Set(useReviewStore.getState().pass!.queue.map((w) => w.id))).toEqual(new Set(hardIds));
  });

  it('AC-13.2 : tout retenu → « Bravo, tout est retenu », pas de bouton difficiles, refaire tous disponible', async () => {
    studyToday(2);
    await startPassFromList();
    await playPass([true, true]);
    await waitFor(() => expect(screen.getByText('Bravo, tout est retenu')).toBeTruthy());
    expect(screen.getByTestId('review-score')).toHaveTextContent('2 / 2 retenus');
    expect(screen.queryByTestId('review-redo-hard')).toBeNull();
    expect(screen.queryByText(/À revoir encore \(/)).toBeNull();
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-redo-all'));
    await waitFor(() => expect(screen.getByTestId('review-counter')).toHaveTextContent('1/2'));
    expect(screen.getByTestId('review-mode')).toHaveTextContent('RÉVISION · MOTS DU JOUR');
  });

  it('AC-12.6 : un seul mot → « 1/1 » puis « 0 / 1 retenus »', async () => {
    studyToday(1, 0);
    await startPassFromList();
    expect(screen.getByTestId('review-counter')).toHaveTextContent('1/1');
    await playPass([false]);
    await waitFor(() => expect(screen.getByTestId('review-score')).toHaveTextContent('0 / 1 retenus'));
  });

  it('AC-12.6 : 200 mots, passe complète sans erreur', async () => {
    const now = new Date();
    for (const w of WORDS) useLearnerStore.getState().evaluateCard(w.id, true, now);
    useReviewStore.getState().startDaily(WORDS, useLearnerStore.getState().progress, createSeededRng(1));
    for (let i = 0; i < 200; i++) useReviewStore.getState().answer(i % 2 === 0);
    expect(useReviewStore.getState().pass!.retainedIds).toHaveLength(100);
    await renderRouter(routes, { initialUrl: '/review-result' });
    expect(screen.getByTestId('review-score')).toHaveTextContent('100 / 200 retenus');
  });

  it('AC-12.7 : « Quitter » revient à la liste sans confirmation et sans rien modifier', async () => {
    studyToday(3);
    const before = persisted();
    await startPassFromList();
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-flip'));
    await fireEvent.press(screen.getByTestId('review-quit'));
    await waitFor(() => expect(screen.getByTestId('review-list')).toBeTruthy());
    expect(persisted()).toBe(before);
  });

  it('RG-116 / AC-16.1 : le 🔊 du recto lit le mot en en-US ; le changement de carte coupe la lecture', async () => {
    studyToday(2);
    await startPassFromList();
    const first = useReviewStore.getState().pass!.queue[0];
    await fireEvent.press(screen.getByLabelText('Écouter le mot'));
    expect(Speech.speak).toHaveBeenLastCalledWith(first.en, expect.objectContaining({ language: 'en-US', rate: 0.9 }));
    (Speech.stop as jest.Mock).mockClear();
    await playPass([true]);
    expect(Speech.stop).toHaveBeenCalled();
  });

  it('garde-fou : double tap sur « Retourner » → une seule carte retournée, « Retenu » non déclenché', async () => {
    studyToday(3);
    await startPassFromList();
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-flip'));
    await fireEvent.press(screen.getByTestId('review-retained')); // tap résiduel pendant le verrou
    expect(useReviewStore.getState().pass!.index).toBe(0);
    await act(() => jest.advanceTimersByTime(500)); // verrou de la page + garde interne du bouton
    await fireEvent.press(screen.getByTestId('review-retained'));
    expect(useReviewStore.getState().pass!.index).toBe(1);
  });

  it('garde-fou : double tap sur le dernier « Retenu » → une seule navigation, « Accueil » de la fin non actionné', async () => {
    studyToday(1, 0);
    await startPassFromList();
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-flip'));
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-retained'));
    await waitFor(() => expect(screen.getByTestId('review-home')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('review-home')); // tap résiduel, dans le verrou d'arrivée
    expect(screen.getByTestId('review-home')).toBeTruthy();
  });
});

describe('Lecture seule (US-14, RG-120)', () => {
  it('AC-14.1 / AC-14.2 / AC-14.4 : 2 passes complètes (100 % Retenu, puis 100 % À revoir) ne changent rien et n’écrivent rien', async () => {
    studyToday(5);
    useLearnerStore.getState().setDailyGoal(20);
    const before = persisted();
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    setItem.mockClear();

    await startPassFromList();
    await playPass([true, true, true, true, true]);
    await waitFor(() => expect(screen.getByText('Bravo, tout est retenu')).toBeTruthy());
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-redo-all'));
    await waitFor(() => expect(screen.getByTestId('review-counter')).toHaveTextContent('1/5'));
    await playPass([false, false, false, false, false]);
    await waitFor(() => expect(screen.getByTestId('review-score')).toHaveTextContent('0 / 5 retenus'));
    // 3e passe sur les mots difficiles, puis retour à la liste.
    await waitGuard();
    await fireEvent.press(screen.getByTestId('review-redo-hard'));
    await waitFor(() => expect(screen.getByTestId('review-mode')).toHaveTextContent(/MOTS DIFFICILES$/));
    await playPass([true, false, true, false, true]);

    expect(persisted()).toBe(before);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('AC-14.3 : tirage de session et sélection du test identiques avant/après (même graine)', async () => {
    studyToday(12, 3);
    const now = new Date();
    const draw = () => ({
      session: composeSession(WORDS, useLearnerStore.getState().progress, createSeededRng(42)).map((w) => w.id),
      test: selectTestWords(WORDS, useLearnerStore.getState().progress, now, createSeededRng(42)).map((w) => w.id),
    });
    const before = draw();
    await startPassFromList();
    await playPass(Array(12).fill(false));
    await waitFor(() => expect(screen.getByTestId('review-score')).toBeTruthy());
    expect(draw()).toEqual(before);
  });

  it('AC-14.5 (remplacé par AC-18.4, v1.2) : STORAGE_VERSION passe à 2, la révision n’écrit toujours rien', () => {
    expect(STORAGE_VERSION).toBe(2);
  });

  it('RG-120 : le store de révision est éphémère (jamais persisté) et vidable', () => {
    studyToday(2);
    useReviewStore.getState().startDaily(WORDS.slice(0, 2), useLearnerStore.getState().progress);
    expect((useReviewStore as unknown as { persist?: unknown }).persist).toBeUndefined();
    useReviewStore.getState().clear();
    expect(useReviewStore.getState().pass).toBeNull();
  });
});

describe('Points d’entrée (US-15)', () => {
  it('AC-15.1 : l’Accueil n’affiche pas la carte à n = 0, « Commencer une session » reste en 1 tap', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.queryByTestId('home-daily-words')).toBeNull();
    await fireEvent.press(screen.getByTestId('home-start-session'));
    await waitFor(() => expect(screen.getByTestId('flashcard-front')).toBeTruthy());
  });

  it('AC-15.1 : carte « Mots du jour : n » + « Revoir » à n ≥ 1', async () => {
    studyToday(3);
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('Mots du jour : 3')).toBeTruthy();
    expect(screen.getByText('Relis-les pour mieux les retenir')).toBeTruthy();
    expect(screen.getByTestId('home-start-session')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Revoir les mots du jour (3)'));
    await waitFor(() => expect(screen.getByText('Réviser ces mots')).toBeTruthy());
    expect(screen.getByText("3 mots étudiés aujourd'hui")).toBeTruthy();
  });

  it('AC-15.2 : onglet Apprendre, entrée « Mots du jour (n) » toujours présente', async () => {
    await renderRouter(routes, { initialUrl: '/learn' });
    expect(screen.getByText('Mots du jour (0)')).toBeTruthy();
    expect(screen.getByText('Rien pour l’instant : fais une session.'.replace('’', "'"))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('learn-daily-words'));
    await waitFor(() => expect(screen.getByTestId('review-empty')).toBeTruthy());
  });

  it('AC-15.2 : à n ≥ 1, l’entrée affiche le compte et ouvre la liste', async () => {
    studyToday(2);
    await renderRouter(routes, { initialUrl: '/learn' });
    expect(screen.getByText('Mots du jour (2)')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('learn-daily-words'));
    await waitFor(() => expect(screen.getByTestId('review-start')).toBeTruthy());
  });

  it('AC-15.3 : récap de session, « Revoir les mots du jour » ouvre tous les mots du jour ; les autres boutons sont inchangés', async () => {
    studyToday(6); // 6 mots étudiés plus tôt aujourd'hui
    await renderRouter(routes, { initialUrl: '/session' });
    for (let i = 0; i < 15; i++) {
      await waitGuard();
      await fireEvent.press(screen.getByTestId('session-flip'));
      await waitGuard();
      await fireEvent.press(screen.getByTestId('session-known'));
    }
    await waitFor(() => expect(screen.getByText('Session terminée !')).toBeTruthy());
    expect(screen.getByTestId('result-new-session')).toBeTruthy();
    expect(screen.getByTestId('result-home')).toBeTruthy();
    await waitGuard();
    await fireEvent.press(screen.getByTestId('result-review-daily'));
    const n = Object.keys(useLearnerStore.getState().progress).length;
    expect(n).toBeGreaterThanOrEqual(10);
    await waitFor(() => expect(screen.getByText(`${n} mots étudiés aujourd'hui`)).toBeTruthy());
  });
});
