/**
 * v1.2 : textes dérivés de SESSION_SIZE, récap « x / N », Réglages à 4 options, objectif 15
 * (AC-17.7, AC-17.8, AC-18.1 → AC-18.3, AC-18.10, AC-19.1, AC-19.2).
 */
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { WORDS } from '@/data/words';
import { createInitialData } from '@/domain/learnerState';
import { SESSION_SIZE } from '@/domain/session';
import { getTestStatus, questionCountFor } from '@/domain/weeklyTest';
import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';
import { useLearnerStore } from '@/store/useLearnerStore';
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
import SettingsScreen from '@/app/settings';
import TestResultScreen from '@/app/test-result';
import TestRunScreen from '@/app/test-run';

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
  settings: SettingsScreen,
  review: ReviewScreen,
  'review-run': ReviewRunScreen,
  'review-result': ReviewResultScreen,
  'test-run': TestRunScreen,
  'test-result': TestResultScreen,
};

beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
  useResultsStore.setState({ lastSession: null, lastTest: null });
});

async function playAll(count: number) {
  for (let i = 0; i < count; i++) {
    await waitGuard();
    await fireEvent.press(screen.getByTestId('session-flip'));
    await waitGuard();
    await fireEvent.press(screen.getByTestId('session-known'));
  }
}

describe('Textes liés à la session (AC-17.7, RG-145)', () => {
  it('Apprendre : « 15 cartes tirées au hasard… », pas de « Ta session contiendra » avec le pool complet', async () => {
    expect(SESSION_SIZE).toBe(15);
    await renderRouter(routes, { initialUrl: '/learn' });
    expect(screen.getByText('15 cartes tirées au hasard, en priorité les mots que tu ne maîtrises pas encore.')).toBeTruthy();
    expect(screen.queryByText(/Ta session contiendra/)).toBeNull();
    expect(screen.queryByText(/\b10 cartes/)).toBeNull();
  });

  it('Apprendre : « Ta session contiendra {k} cartes » seulement si k < 15', async () => {
    // Voyage + A1 + A2 = 11 mots
    useLearnerStore.setState({ filters: { categories: ['travel'], levels: ['A1', 'A2'] } });
    await renderRouter(routes, { initialUrl: '/learn' });
    expect(screen.getByText('Ta session contiendra 11 cartes.')).toBeTruthy();
  });

  it('Apprendre : un pool de 15 mots exactement n’affiche pas le message (seuil strict)', async () => {
    useLearnerStore.setState({ filters: { categories: ['travel', 'food'], levels: ['A1'] } }); // 5 + 5 = 10
    await renderRouter(routes, { initialUrl: '/learn' });
    expect(screen.getByText('Ta session contiendra 10 cartes.')).toBeTruthy();
  });
});

describe('Récap de session : N dérivé de la session (AC-17.8)', () => {
  it('pool réduit de 11 mots → « 11 / 11 », objectif « 11 / 15 »', async () => {
    useLearnerStore.setState({ filters: { categories: ['travel'], levels: ['A1', 'A2'] } });
    await renderRouter(routes, { initialUrl: '/session' });
    expect(screen.getAllByText('Carte 1 / 11').length).toBeGreaterThan(0);
    await playAll(11);
    await waitFor(() => expect(screen.getByText('Session terminée !')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('result-score')).toHaveTextContent(/^11 \/ 11$/));
    await waitFor(() => expect(screen.getByTestId('goal-value')).toHaveTextContent(/^11 \/ 15$/));
  });

  it('AC-18.2 : quitter après 10 cartes → « 10 / 15 » à l’accueil (Encore 5 cartes)', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByTestId('home-start-session'));
    await playAll(10);
    await fireEvent.press(screen.getByTestId('session-flip'));
    await fireEvent.press(screen.getByTestId('session-quit'));
    await waitFor(() => expect(screen.getByTestId('home-start-session')).toBeTruthy());
    expect(Object.values(useLearnerStore.getState().cardsPerDay)).toEqual([10]);
    expect(screen.getByText(/Encore 5 cartes/)).toBeTruthy();
  });

  it('AC-18.3 : dépassement sans plafond (20 / 15) ; AC-18.10 : 10 cartes déjà faites → 10 / 15', async () => {
    const now = new Date();
    WORDS.slice(0, 10).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, now));
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText(/Encore 5 cartes/)).toBeTruthy();
    await act(async () => {
      WORDS.slice(10, 20).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, now));
    });
    expect(Object.values(useLearnerStore.getState().cardsPerDay)).toEqual([20]);
  });
});

describe('Réglages : objectif quotidien à 4 options (AC-18.1)', () => {
  it('propose 10, 15, 20, 30 dans l’ordre, 15 sélectionné par défaut, choisir 10 est possible', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
    const group = screen.getByLabelText('Objectif quotidien');
    expect(group).toBeTruthy();
    for (const v of [10, 15, 20, 30]) expect(screen.getByLabelText(`${v} cartes par jour`)).toBeTruthy();
    expect(screen.getByLabelText('15 cartes par jour').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByLabelText('10 cartes par jour').props.accessibilityState?.selected).toBeFalsy();
    await fireEvent.press(screen.getByLabelText('10 cartes par jour'));
    expect(useLearnerStore.getState().dailyGoal).toBe(10);
    expect(screen.getByLabelText('10 cartes par jour').props.accessibilityState?.selected).toBe(true);
  });
});

describe('Test hebdomadaire inchangé (AC-19.1, AC-19.2, RG-152)', () => {
  it('questionCountFor : 10 → 10, 15 → 15, 50 → 20 ; 9 vus verrouillé, 10 vus disponible', () => {
    expect(questionCountFor(10)).toBe(10);
    expect(questionCountFor(15)).toBe(15);
    expect(questionCountFor(50)).toBe(20);
    const now = new Date(2026, 9, 7, 12);
    const progress = (n: number) =>
      Object.fromEntries(WORDS.slice(0, n).map((w) => [w.id, { box: 1, seenCount: 1, firstSeenAt: now.toISOString(), lastSeenAt: now.toISOString() }]));
    expect(getTestStatus(WORDS, progress(9), [], now).kind).not.toBe('available');
    expect(getTestStatus(WORDS, progress(10), [], now)).toEqual({ kind: 'available', questionCount: 10 });
    expect(getTestStatus(WORDS, progress(15), [], now)).toEqual({ kind: 'available', questionCount: 15 });
  });

  it('AC-19.2 : après une première session de 15 nouveaux, le test est disponible avec 15 questions', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await playAll(15);
    await waitFor(() => expect(screen.getByText('Session terminée !')).toBeTruthy());
    const status = getTestStatus(WORDS, useLearnerStore.getState().progress, [], new Date());
    expect(status).toEqual({ kind: 'available', questionCount: 15 });
  });
});
