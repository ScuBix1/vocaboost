/**
 * Corrections de la recette design v2 (docs/05-rapport-qa.md §8) — tests du Développeur.
 * V2-01 (symétrie : arrivée sur les résultats), V2-02 (confettis hors titre/score), V2-06,
 * accessibilité web de Vobi.
 */
import { render } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { WORDS } from '@/data/words';
import { createInitialData } from '@/domain/learnerState';
import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useResultsStore } from '@/store/useResultsStore';
import { Confetti, confettiLeft, CONFETTI_STILL_COUNT } from '@/components/Confetti';
import { Vobi } from '@/components/Vobi';

import TabsLayout from '@/app/(tabs)/_layout';
import HomeScreen from '@/app/(tabs)/index';
import TestScreen from '@/app/(tabs)/test';
import RootLayout from '@/app/_layout';
import SessionScreen from '@/app/session';
import SessionResultScreen from '@/app/session-result';
import TestResultScreen from '@/app/test-result';

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeScreen,
  '(tabs)/test': TestScreen,
  session: SessionScreen,
  'session-result': SessionResultScreen,
  'test-result': TestResultScreen,
};
const hidden = { includeHiddenElements: true } as const;

function record(correct: number, total: number) {
  const percent = Math.round((correct / total) * 100);
  return { weekId: '2026-W41', finishedAt: new Date().toISOString(), total, correct, percent, passed: percent >= 70 };
}

beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
  useResultsStore.setState({ lastSession: null, lastTest: null });
});
afterEach(() => jest.restoreAllMocks());

describe('V2-01 par symétrie : un tap juste à l’arrivée sur un résultat est ignoré', () => {
  it('résultat de session : « Accueil » ignoré pendant le verrou, puis actif', async () => {
    useResultsStore.setState({ lastSession: { known: 8, total: 10, newlyMastered: 0, cardsTodayBefore: 0 } });
    await renderRouter(routes, { initialUrl: '/session-result' });
    await fireEvent.press(screen.getByTestId('result-home'));
    expect(screen.queryByTestId('home-start-session')).toBeNull(); // toujours sur le résultat
    await act(() => jest.advanceTimersByTime(ACTION_GUARD_MS + 150)); // au-delà du verrou et de la garde 400 ms du Button
    await fireEvent.press(screen.getByTestId('result-home'));
    await waitFor(() => expect(screen.getByTestId('home-start-session')).toBeTruthy());
  });

  it('résultat du test : « Retour à l’accueil » ignoré pendant le verrou, puis actif', async () => {
    useResultsStore.setState({ lastTest: { record: record(8, 10), missed: [WORDS[0], WORDS[1]] } });
    await renderRouter(routes, { initialUrl: '/test-result' });
    await fireEvent.press(screen.getByTestId('test-result-home'));
    expect(screen.queryByTestId('home-start-session')).toBeNull(); // toujours sur le résultat
    await act(() => jest.advanceTimersByTime(ACTION_GUARD_MS + 150)); // au-delà du verrou et de la garde 400 ms du Button
    await fireEvent.press(screen.getByTestId('test-result-home'));
    await waitFor(() => expect(screen.getByTestId('home-start-session')).toBeTruthy());
  });
});

describe('V2-06 : message sous « Mots à revoir »', () => {
  it('aucun mot à revoir : message positif, pas de « Ces mots reviendront… »', async () => {
    useResultsStore.setState({ lastTest: { record: record(10, 10), missed: [] } });
    await renderRouter(routes, { initialUrl: '/test-result' });
    await waitFor(() => expect(screen.getByText('Continue tes sessions pour garder ce niveau.')).toBeTruthy());
    expect(screen.queryByText(/reviendront/)).toBeNull();
  });

  it('des mots à revoir : la phrase v2 est conservée', async () => {
    useResultsStore.setState({ lastTest: { record: record(8, 10), missed: [WORDS[0], WORDS[1]] } });
    await renderRouter(routes, { initialUrl: '/test-result' });
    await waitFor(() => expect(screen.getByText('Ces mots reviendront plus souvent dans tes sessions.')).toBeTruthy());
  });
});

describe('V2-02 : confettis autour de Vobi', () => {
  it('colonne centrale libre : aucun confetti ne la recouvre', () => {
    for (let i = 0; i < 24; i++) {
      for (const x of [0, 0.5, 1]) {
        const left = confettiLeft(x, i, 360, 174);
        expect(left + 16 <= (360 - 174) / 2 || left >= (360 + 174) / 2).toBe(true);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + 16).toBeLessThanOrEqual(360);
      }
    }
  });

  it('« Réduire les animations » : confettis immobiles posés dans la hauteur de la zone de Vobi', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<Confetti clearWidth={174} />);
    await act(async () => undefined);
    await fireEvent(screen.getByTestId('confetti', hidden), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 166 } },
    });
    const pieces = screen.getAllByTestId('confetti-piece', hidden);
    expect(pieces).toHaveLength(CONFETTI_STILL_COUNT);
    for (const p of pieces) {
      const style = StyleSheet.flatten(p.props.style) as { transform: { translateY?: number }[] };
      const y = style.transform[0].translateY as number;
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + 16).toBeLessThanOrEqual(166);
    }
  });

  it('écrans de résultat : les confettis sont dans la zone de Vobi (même parent), pas en fond d’écran', async () => {
    useResultsStore.setState({ lastTest: { record: record(10, 10), missed: [] } });
    await renderRouter(routes, { initialUrl: '/test-result' });
    const layer = await screen.findByTestId('confetti', hidden);
    const zone = layer.parent;
    expect(zone).toBeTruthy();
    expect(screen.getAllByTestId('vobi', hidden).some((v) => v.parent === zone || v.parent?.parent === zone)).toBe(true);
  });
});

describe('Accessibilité web', () => {
  it('Vobi et les confettis portent aria-hidden (react-native-web ignore accessibilityElementsHidden)', async () => {
    await render(<Vobi mood="hello" />);
    expect(screen.getByTestId('vobi', hidden).props['aria-hidden']).toBe(true);
    await render(<Confetti />);
    expect(screen.getByTestId('confetti', hidden).props['aria-hidden']).toBe(true);
  });
});
