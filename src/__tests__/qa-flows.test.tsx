/**
 * Tests QA adversariaux — parcours d'écrans (abandon du test, réinitialisation, double tap, hydratation).
 */
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { WORDS } from '@/data/words';
import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';
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

/**
 * Laisse s'écouler le verrou anti-double-tap (BUG-01/BUG-02) entre deux taps délibérés.
 * renderRouter active les faux timers de Jest (Date.now compris) : on avance l'horloge.
 */
const waitGuard = () => act(() => jest.advanceTimersByTime(ACTION_GUARD_MS + 20));

type AlertButton = { text?: string; style?: string; onPress?: () => void };

function seedSeen(n: number) {
  const now = new Date();
  for (const w of WORDS.slice(0, n)) useLearnerStore.getState().evaluateCard(w.id, true, now);
}

let alertSpy: jest.SpyInstance;
beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => alertSpy.mockRestore());

function lastAlertButton(label: string): AlertButton {
  const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const buttons = call[2] as AlertButton[];
  const b = buttons.find((x) => x.text === label);
  if (!b) throw new Error(`Bouton ${label} absent`);
  return b;
}

describe('QA — abandon du test (RG-67, AC-07.11)', () => {
  it('Quitter → « Continuer le test » : on reste sur la question ; « Abandonner » : rien enregistré, test disponible', async () => {
    seedSeen(12);
    const boxesBefore = JSON.stringify(useLearnerStore.getState().progress);
    await renderRouter(routes, { initialUrl: '/test' });
    await fireEvent.press(screen.getByTestId('test-start'));
    await waitFor(() => expect(screen.getByTestId('test-counter')).toHaveTextContent(/^1\/12$/));
    for (let i = 0; i < 3; i++) {
      await fireEvent.press(screen.getByTestId('test-option-1'));
      await fireEvent.press(screen.getByTestId('test-next'));
      await waitGuard(); // réponse délibérée après le verrou de « Suivant » (V2-01)
    }
    await fireEvent.press(screen.getByTestId('test-quit'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Abandonner le test ?',
      expect.stringContaining('Ta progression dans ce test sera perdue'),
      expect.any(Array),
      expect.anything(),
    );
    await act(() => lastAlertButton('Continuer le test').onPress?.());
    expect(screen.getByTestId('test-counter')).toHaveTextContent(/^4\/12$/);

    await fireEvent.press(screen.getByTestId('test-quit'));
    await act(() => lastAlertButton('Abandonner').onPress?.());
    await waitFor(() => expect(screen.getByTestId('test-available')).toBeTruthy());
    expect(useLearnerStore.getState().testHistory).toEqual([]);
    expect(JSON.stringify(useLearnerStore.getState().progress)).toBe(boxesBefore);
  });

  // BUG-04 (mineur, design §1.2) : lancé depuis l'Accueil (« Passer le test »), l'abandon revient à l'Accueil.
  test('BUG-04 : abandon d’un test lancé depuis l’Accueil → retour à l’onglet Test', async () => {
    seedSeen(10);
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByText('Passer le test'));
    await waitFor(() => expect(screen.getByTestId('test-counter')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('test-quit'));
    await act(() => lastAlertButton('Abandonner').onPress?.());
    await waitFor(() => expect(screen.getByTestId('test-available')).toBeTruthy());
  });

  it('accès direct à /test-run quand le test de la semaine est déjà terminé → redirection vers /test', async () => {
    seedSeen(10);
    const answers = WORDS.slice(0, 10).map((w) => ({ wordId: w.id, correct: true }));
    useLearnerStore.getState().completeTest(answers);
    await renderRouter(routes, { initialUrl: '/test-run' });
    await waitFor(() => expect(screen.getByTestId('test-done')).toBeTruthy());
    expect(useLearnerStore.getState().testHistory).toHaveLength(1);
  });

  it('double tap sur une option et sur « Voir le résultat » : une seule réponse / un seul enregistrement', async () => {
    seedSeen(10);
    await renderRouter(routes, { initialUrl: '/test-run' });
    for (let i = 1; i <= 10; i++) {
      await fireEvent.press(screen.getByTestId('test-option-0'));
      await fireEvent.press(screen.getByTestId('test-option-1'));
      await fireEvent.press(screen.getByTestId('test-next'));
      await waitGuard(); // réponse délibérée après le verrou de « Suivant » (V2-01)
    }
    await waitFor(() => expect(screen.getByText('Résultat du test')).toBeTruthy());
    const [record] = useLearnerStore.getState().testHistory;
    expect(useLearnerStore.getState().testHistory).toHaveLength(1);
    expect(record.total).toBe(10);
  });
});

describe('QA — session', () => {
  it('double tap sur « Je savais » : une seule évaluation', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await fireEvent.press(screen.getByTestId('session-flip'));
    await waitGuard(); // tap délibéré après la fin du verrou de retournement
    const known = screen.getByTestId('session-known');
    await fireEvent.press(known);
    await fireEvent.press(known);
    const cards = Object.values(useLearnerStore.getState().cardsPerDay);
    expect(cards).toEqual([1]);
    expect(screen.getAllByText('Carte 2 / 15').length).toBeGreaterThan(0);
  });

  // BUG-01 (majeur, design §5.4) : « Retourner » (pleine largeur) est remplacé au même endroit par
  // « Je savais » / « Je ne savais pas ». Un double tap sur « Retourner » évalue la carte sans que
  // l'utilisateur ait lu le verso (reproduit sur le web avec Playwright : dblclick → +1 carte évaluée).
  // Ici : 2e tap immédiat (quelques ms) à l'emplacement de « Je savais ».
  test('BUG-01 : un tap sur « Je savais » arrivant juste après « Retourner » (double tap) est ignoré', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await fireEvent.press(screen.getByTestId('session-flip'));
    await fireEvent.press(screen.getByTestId('session-known'));
    expect(useLearnerStore.getState().cardsPerDay).toEqual({});
  });

  // BUG-02 (mineur) : double tap sur « Je savais » → le 2e tap tombe sur « Retourner » de la carte suivante,
  // qui est retournée immédiatement (traduction révélée avant que l'utilisateur ait cherché).
  test('BUG-02 : un tap sur « Retourner » arrivant juste après « Je savais » (double tap) est ignoré', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await fireEvent.press(screen.getByTestId('session-flip'));
    await waitGuard(); // « Je savais » délibéré (sinon bloqué par le correctif BUG-01)
    await fireEvent.press(screen.getByTestId('session-known'));
    await fireEvent.press(screen.getByTestId('session-flip')); // 2e tap immédiat du double tap
    expect(screen.queryByTestId('session-known')).toBeNull();
    expect(Object.values(useLearnerStore.getState().cardsPerDay)).toEqual([1]);
  });

  it('quitter sans évaluer : aucune donnée modifiée (RG-34)', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByTestId('home-start-session'));
    await fireEvent.press(screen.getByTestId('session-flip'));
    await fireEvent.press(screen.getByTestId('session-quit'));
    await waitFor(() => expect(screen.getByTestId('home-start-session')).toBeTruthy());
    expect(useLearnerStore.getState().progress).toEqual({});
    expect(useLearnerStore.getState().activeDays).toEqual([]);
  });

  it('session complète → « Nouvelle session » tire 15 nouvelles cartes (5 nouveaux + 10 révisions)', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    for (let i = 0; i < 15; i++) {
      await fireEvent.press(screen.getByTestId('session-flip'));
      await waitGuard();
      await fireEvent.press(screen.getByTestId('session-known'));
      await waitGuard();
    }
    await waitFor(() => expect(screen.getByText('Session terminée !')).toBeTruthy());
    await waitGuard(); // tap délibéré : le résultat ignore les taps des 300 premières ms
    await fireEvent.press(screen.getByTestId('result-new-session'));
    await waitFor(() => expect(screen.getAllByText('Carte 1 / 15').length).toBeGreaterThan(0));
  });
});

describe('QA re-test — verrou anti-double-tap (300 ms) et usage rapide normal', () => {
  const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  it('usage rapide mais délibéré (évaluation 350 ms après le retournement, retournement 350 ms après l’évaluation) : 15 cartes sans tap perdu', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    for (let i = 0; i < 15; i++) {
      await advance(350);
      await fireEvent.press(screen.getByTestId('session-flip'));
      await advance(350);
      await fireEvent.press(screen.getByTestId('session-known'));
    }
    await waitFor(() => expect(screen.getByText('Session terminée !')).toBeTruthy());
    expect(Object.values(useLearnerStore.getState().cardsPerDay)).toEqual([15]);
  });

  it('les boutons d’évaluation sont désactivés pendant le verrou puis réactivés', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await fireEvent.press(screen.getByTestId('session-flip'));
    expect(screen.getByTestId('session-known')).toBeDisabled();
    await advance(310);
    expect(screen.getByTestId('session-known')).toBeEnabled();
  });

  it('tap sur la carte (et non sur « Retourner ») pendant le verrou : ignoré, puis fonctionne', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await fireEvent.press(screen.getByTestId('session-flip'));
    await advance(350);
    await fireEvent.press(screen.getByTestId('session-known'));
    await fireEvent.press(screen.getByTestId('flashcard-front'));
    expect(screen.queryByTestId('session-known')).toBeNull();
    await advance(350);
    await fireEvent.press(screen.getByTestId('flashcard-front'));
    expect(screen.getByTestId('session-known')).toBeTruthy();
  });

  // RT-01 (mineur) : un tap sur « Retourner » ignoré pendant le verrou de 300 ms arme quand même la garde
  // propre au Button (400 ms) : un 2e tap légitime juste après la fin du verrou est lui aussi avalé.
  test('RT-01 : tap « Retourner » à +200 ms (verrou) puis à +450 ms (verrou expiré) → la carte se retourne', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    await fireEvent.press(screen.getByTestId('session-flip'));
    await advance(350);
    await fireEvent.press(screen.getByTestId('session-known'));
    await advance(200);
    await fireEvent.press(screen.getByTestId('session-flip')); // ignoré (verrou écran) — attendu
    await advance(250); // t = +450 ms : verrou de 300 ms expiré
    await fireEvent.press(screen.getByTestId('session-flip'));
    expect(screen.queryByTestId('session-known')).toBeTruthy(); // obtenu : null (tap avalé par la garde du Button)
  });
});

describe('QA — réinitialisation via Réglages (AC-10.2, AC-10.3)', () => {
  it('Annuler ne change rien ; Réinitialiser efface tout sauf objectif et filtres et affiche le bandeau', async () => {
    seedSeen(10);
    useLearnerStore.setState({ dailyGoal: 30, filters: { categories: ['travel'], levels: ['A1', 'A2'] } });
    const before = JSON.stringify(useLearnerStore.getState());
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(screen.getByTestId('settings-reset'));
    expect(alertSpy.mock.calls[0][0]).toBe('Réinitialiser ma progression ?');
    expect(alertSpy.mock.calls[0][1]).toContain('Cette action est irréversible');
    await act(() => lastAlertButton('Annuler').onPress?.());
    expect(JSON.stringify(useLearnerStore.getState())).toBe(before);

    await fireEvent.press(screen.getByTestId('settings-reset'));
    await act(() => lastAlertButton('Réinitialiser').onPress?.());
    const s = useLearnerStore.getState();
    expect(s.progress).toEqual({});
    expect(s.activeDays).toEqual([]);
    expect(s.bestStreak).toBe(0);
    expect(s.testHistory).toEqual([]);
    expect(s.dailyGoal).toBe(30);
    expect(s.filters).toEqual({ categories: ['travel'], levels: ['A1', 'A2'] });
    expect(screen.getByText('Progression réinitialisée')).toBeTruthy();
  });
});

describe('QA — hydratation', () => {
  it('écran neutre tant que le store n’est pas réhydraté, aucun chiffre affiché', async () => {
    useLearnerStore.setState({ hasHydrated: false });
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByTestId('loading-screen')).toBeTruthy();
    await act(() => useLearnerStore.setState({ hasHydrated: true }));
    expect(screen.queryByTestId('loading-screen')).toBeNull();
  });
});
