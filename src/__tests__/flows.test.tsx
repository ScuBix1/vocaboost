/**
 * Parcours d'écrans avec expo-router (routes réelles de src/app).
 */
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';

import { WORDS } from '@/data/words';
import { createInitialData } from '@/domain/learnerState';
import { useLearnerStore } from '@/store/useLearnerStore';

import HomeScreen from '@/app/(tabs)/index';
import TabsLayout from '@/app/(tabs)/_layout';
import LearnScreen from '@/app/(tabs)/learn';
import ProgressScreen from '@/app/(tabs)/progress';
import TestScreen from '@/app/(tabs)/test';
import RootLayout from '@/app/_layout';
import SessionScreen from '@/app/session';
import SessionResultScreen from '@/app/session-result';
import SettingsScreen from '@/app/settings';
import TestResultScreen from '@/app/test-result';
import TestRunScreen from '@/app/test-run';

/**
 * Laisse s'écouler le verrou anti-double-tap (BUG-01/BUG-02) entre deux taps délibérés.
 * renderRouter active les faux timers de Jest (Date.now compris) : on avance l'horloge.
 */
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
  'test-run': TestRunScreen,
  'test-result': TestResultScreen,
  settings: SettingsScreen,
};

beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
});

describe('Parcours Accueil → session → résultat (US-01, US-03)', () => {
  it('AC-01.1 : 1 tap sur « Commencer une session » affiche la 1re carte (recto)', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('Prêt pour tes 10 premiers mots ?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-start-session'));
    await waitFor(() => expect(screen.getByTestId('flashcard-front')).toBeTruthy());
    expect(screen.getAllByText('Carte 1 / 10').length).toBeGreaterThan(0);
  });

  it('AC-03.3 / AC-03.6 / AC-03.8 : évaluation après retournement, puis récap', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    for (let i = 1; i <= 10; i++) {
      // Boutons d'évaluation absents avant le retournement.
      expect(screen.queryByTestId('session-known')).toBeNull();
      await fireEvent.press(screen.getByTestId('session-flip'));
      await waitGuard();
      await fireEvent.press(screen.getByTestId(i <= 6 ? 'session-known' : 'session-unknown'));
      await waitGuard();
    }
    await waitFor(() => expect(screen.getByText('Session terminée')).toBeTruthy());
    expect(screen.getByTestId('result-score')).toHaveTextContent('6 / 10');
    expect(screen.getByText('Objectif du jour atteint 🎯')).toBeTruthy();
    expect(screen.getByTestId('goal-value')).toHaveTextContent('10 / 10');
    expect(Object.keys(useLearnerStore.getState().progress)).toHaveLength(10);
  });

  it('BUG-01 : boutons d’évaluation désactivés pendant le retournement, actifs ensuite', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await fireEvent.press(screen.getByTestId('session-flip'));
    expect(screen.getByTestId('session-known')).toBeDisabled();
    expect(screen.getByTestId('session-unknown')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('session-unknown'));
    expect(useLearnerStore.getState().progress).toEqual({});
    await waitGuard();
    expect(screen.getByTestId('session-known')).toBeEnabled();
    await fireEvent.press(screen.getByTestId('session-unknown'));
    expect(Object.keys(useLearnerStore.getState().progress)).toHaveLength(1);
  });

  it('AC-03.7 : quitter après 4 cartes conserve les 4 évaluations', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByTestId('session-flip'));
      await waitGuard();
      await fireEvent.press(screen.getByTestId('session-known'));
      await waitGuard();
    }
    await fireEvent.press(screen.getByTestId('session-flip'));
    await fireEvent.press(screen.getByTestId('session-quit'));
    const state = useLearnerStore.getState();
    expect(Object.keys(state.progress)).toHaveLength(4);
    expect(Object.values(state.cardsPerDay)).toEqual([4]);
  });

  it('AC-06.1 : avec Maison + A1 seulement, la session contient les 5 mots Maison A1', async () => {
    useLearnerStore.setState({ filters: { categories: ['house'], levels: ['A1'] } });
    await renderRouter(routes, { initialUrl: '/session' });
    expect(screen.getAllByText('Carte 1 / 5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maison').length).toBeGreaterThan(0);
  });
});

describe('Test hebdomadaire (US-07, US-08)', () => {
  it('AC-08.4 / AC-07.1 : historique vide et test verrouillé', async () => {
    await renderRouter(routes, { initialUrl: '/test' });
    expect(screen.getByText("Aucun test pour l'instant")).toBeTruthy();
    expect(screen.getByTestId('test-locked')).toBeTruthy();
  });

  it('AC-07.7 / AC-07.9 : parcours complet de 10 questions puis résultat et historique', async () => {
    const now = new Date();
    for (const w of WORDS.slice(0, 10)) useLearnerStore.getState().evaluateCard(w.id, true, now);
    await renderRouter(routes, { initialUrl: '/test-run' });
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByTestId('test-counter')).toHaveTextContent(`Question ${i} / 10`);
      expect(screen.queryByTestId('test-next')).toBeNull(); // pas de « passer »
      await fireEvent.press(screen.getByTestId('test-option-0'));
      await fireEvent.press(screen.getByTestId('test-next'));
    }
    await waitFor(() => expect(screen.getByText('Résultat du test')).toBeTruthy());
    const history = useLearnerStore.getState().testHistory;
    expect(history).toHaveLength(1);
    expect(screen.getByTestId('test-result-score')).toHaveTextContent(`${history[0].correct} / 10`);
  });
});

describe('Réglages (RG-44, RG-50)', () => {
  it('AC-05.6 : objectif modifiable en 10/20/30', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(screen.getByTestId('segment-20'));
    expect(useLearnerStore.getState().dailyGoal).toBe(20);
  });

  it('AC-06.2 : décocher le dernier niveau affiche l’aide et ne change rien', async () => {
    useLearnerStore.setState({ filters: { ...createInitialData().filters, levels: ['B1'] } });
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(screen.getByTestId('chip-level-B1'));
    expect(screen.getByText('Garde au moins un élément sélectionné.')).toBeTruthy();
    expect(useLearnerStore.getState().filters.levels).toEqual(['B1']);
  });
});
