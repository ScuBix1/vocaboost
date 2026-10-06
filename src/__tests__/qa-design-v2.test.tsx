/**
 * Tests QA — recette de la direction artistique v2 (docs/05-rapport-qa.md, « Recette design v2 »).
 * Non-régression fonctionnelle des écrans refondus + bug V2-01 (double tap sur « Suivant » du test).
 */
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { WORDS } from '@/data/words';
import { createInitialData } from '@/domain/learnerState';
import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useResultsStore } from '@/store/useResultsStore';

import TabsLayout from '@/app/(tabs)/_layout';
import HomeScreen from '@/app/(tabs)/index';
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

const hidden = { includeHiddenElements: true } as const;

function seedSeen(n: number) {
  const now = new Date();
  for (const w of WORDS.slice(0, n)) useLearnerStore.getState().evaluateCard(w.id, true, now);
}

function testRecord(correct: number, total: number) {
  const percent = Math.round((correct / total) * 100);
  return {
    weekId: '2026-W41',
    finishedAt: new Date().toISOString(),
    total,
    correct,
    percent,
    passed: percent >= 70,
  };
}

beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
  useResultsStore.setState({ lastSession: null, lastTest: null });
});
afterEach(() => jest.restoreAllMocks());

describe('QA v2 — test hebdomadaire : bandeau de feedback', () => {
  it('l’annonce lecteur d’écran v1 est conservée (bonne et mauvaise réponse)', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    seedSeen(10);
    await renderRouter(routes, { initialUrl: '/test-run' });
    // On répond jusqu'à obtenir une bonne et une mauvaise réponse (l'option 0 n'est pas toujours la bonne).
    for (let i = 0; i < 10; i++) {
      await fireEvent.press(screen.getByTestId('test-option-0'));
      await fireEvent.press(screen.getByTestId('test-next'));
      if (screen.queryByText('Résultat du test')) break;
    }
    const messages = announce.mock.calls.map(([m]) => m);
    expect(messages.every((m) => m === 'Bonne réponse !' || m.startsWith('Question') || /^La bonne réponse était : .+/.test(m))).toBe(true);
    expect(messages.filter((m) => m === 'Bonne réponse !' || m.startsWith('La bonne réponse')).length).toBe(10);
  });

  it('Vobi du bandeau est masqué aux lecteurs d’écran ; le texte porte le sens', async () => {
    seedSeen(10);
    await renderRouter(routes, { initialUrl: '/test-run' });
    await fireEvent.press(screen.getByTestId('test-option-0'));
    expect(screen.queryByTestId('vobi')).toBeNull(); // absent de l'arbre accessible
    const vobi = screen.getByTestId('vobi', hidden);
    expect(vobi.props.accessible).toBe(false);
    expect(vobi.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(vobi.props.accessibilityElementsHidden).toBe(true);
  });

  // V2-01 (majeur) : le bandeau disparaît au tap sur « Suivant » ; sur petit écran (≤ 640 pt de haut),
  // l'option C ou D de la question suivante remonte sous le doigt et le 2e tap d'un double tap
  // y répond à l'aveugle (reproduit sur le web à 360×640 et 320×568 ; 0 cas en v1, dont le pied
  // de 76 pt restait réservé). Attendu : comme pour la session (BUG-02), un tap sur une option
  // arrivant moins de ACTION_GUARD_MS après « Suivant » est ignoré.
  test.failing('V2-01 : un tap sur une option juste après « Suivant » (double tap) est ignoré', async () => {
    seedSeen(10);
    await renderRouter(routes, { initialUrl: '/test-run' });
    await fireEvent.press(screen.getByTestId('test-option-0'));
    await fireEvent.press(screen.getByTestId('test-next'));
    // 2e tap du double tap : il tombe sur l'option qui a pris la place du bouton.
    await fireEvent.press(screen.getByTestId('test-option-3'));
    expect(screen.queryByTestId('test-next')).toBeNull(); // la question 2 n'est pas répondue
    await act(() => jest.advanceTimersByTime(ACTION_GUARD_MS + 20));
    await fireEvent.press(screen.getByTestId('test-option-3'));
    expect(screen.getByTestId('test-next')).toBeTruthy();
  });
});

describe('QA v2 — célébrations (design §5.4, §5.8)', () => {
  const session = (known: number, total: number) =>
    useResultsStore.setState({ lastSession: { known, total, newlyMastered: 0, cardsTodayBefore: 0 } });

  it('résultat de session à exactement 50 % de « Je savais » : confettis, masqués aux lecteurs d’écran', async () => {
    session(5, 10);
    await renderRouter(routes, { initialUrl: '/session-result' });
    expect(await screen.findByTestId('confetti', hidden)).toBeTruthy();
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  it('résultat de session à 40 % : pas de confettis, sous-titre encourageant', async () => {
    session(4, 10);
    await renderRouter(routes, { initialUrl: '/session-result' });
    await waitFor(() => expect(screen.getByText('Bel effort ! Chaque carte te rapproche du but.')).toBeTruthy());
    expect(screen.queryByTestId('confetti', hidden)).toBeNull();
  });

  it('session de k < 10 cartes (filtres restrictifs) : le seuil de 50 % porte sur k', async () => {
    session(3, 5);
    await renderRouter(routes, { initialUrl: '/session-result' });
    await waitFor(() => expect(screen.getByTestId('result-score')).toHaveTextContent(/^3 \/ 5$/));
    expect(screen.getByTestId('confetti', hidden)).toBeTruthy();
  });

  it('test réussi (70 %) : confettis et libellé de score complet pour le lecteur d’écran', async () => {
    useResultsStore.setState({ lastTest: { record: testRecord(7, 10), missed: [] } });
    await renderRouter(routes, { initialUrl: '/test-result' });
    await waitFor(() => expect(screen.getByLabelText('Score : 7 sur 10, 70 pour cent, Réussi')).toBeTruthy());
    expect(screen.getByTestId('confetti', hidden)).toBeTruthy();
  });

  it('test à retravailler (60 %) : pas de confettis, ton encourageant', async () => {
    useResultsStore.setState({ lastTest: { record: testRecord(6, 10), missed: [WORDS[0]] } });
    await renderRouter(routes, { initialUrl: '/test-result' });
    await waitFor(() => expect(screen.getByLabelText('Score : 6 sur 10, 60 pour cent, À retravailler')).toBeTruthy());
    expect(screen.queryByTestId('confetti', hidden)).toBeNull();
    expect(screen.getByText(/On y retourne !/)).toBeTruthy();
  });
});
