/**
 * Traduction française de l'exemple (v1.2) : affichage et exclusions
 * (RG-159 → RG-164, AC-20.1 → AC-20.7, AC-21.1, AC-21.2, AC-22.1, AC-22.2).
 */
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { act, fireEvent as routerFireEvent, renderRouter, screen as routerScreen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';

import { WORDS } from '@/data/words';
import { createInitialData } from '@/domain/learnerState';
import { ACTION_GUARD_MS } from '@/hooks/useActionGuard';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useReviewStore } from '@/store/useReviewStore';
import { useResultsStore } from '@/store/useResultsStore';
import { colors } from '@/theme/tokens';

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

import { backAnnouncement, Flashcard, frenchQuote } from '@/components/Flashcard';
import { DailyWordRow } from '@/components/DailyWordRow';

const hidden = { includeHiddenElements: true } as const;
const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const waitGuard = () => act(() => jest.advanceTimersByTime(ACTION_GUARD_MS + 20));

const BASE = {
  en: 'stairs',
  fr: 'escalier',
  example: 'Be careful, the stairs are very steep.',
  exampleFr: 'Fais attention, l’escalier est très raide.',
  level: 'A2',
  categoryLabel: 'Maison',
  category: 'house' as const,
};
const card = (over: Partial<typeof BASE> = {}, flipped = true, onSpeak?: (t: string) => void) => (
  <Flashcard word={{ ...BASE, ...over }} index={1} total={15} flipped={flipped} onFlip={() => undefined} onSpeak={onSpeak} />
);

afterEach(() => jest.restoreAllMocks());

describe('Flashcard : verso avec traduction de l’exemple (AC-20.1, RG-160, RG-161)', () => {
  it('verso : phrase anglaise puis traduction entre guillemets français, libellé « En français »', async () => {
    await render(card());
    const fr = screen.getByTestId('flashcard-example-fr');
    expect(within(fr).getByText('En français')).toBeTruthy();
    expect(within(fr).getByText(`« ${BASE.exampleFr} »`)).toBeTruthy();
    expect(screen.getByText(`“${BASE.example}”`, hidden)).toBeTruthy();
    expect(frenchQuote('Salut !')).toBe('« Salut ! »');
  });

  it('recto (non retourné) : aucune trace de la traduction, ni dans l’arbre ni pour les lecteurs d’écran', async () => {
    await render(card({}, false));
    expect(screen.queryByTestId('flashcard-example-fr', hidden)).toBeNull();
    expect(screen.queryByText('En français', hidden)).toBeNull();
    expect(screen.queryByText(BASE.exampleFr, { ...hidden, exact: false })).toBeNull();
    expect(screen.getByTestId('flashcard-back', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('texte français : langue fr-FR, libellé « Traduction de l’exemple : … », style secondaire non italique', async () => {
    await render(card());
    const text = screen.getByText(`« ${BASE.exampleFr} »`);
    expect(text.props.accessibilityLanguage).toBe('fr-FR');
    expect(text.props.lang).toBe('fr-FR');
    expect(text.props.accessibilityLabel).toBe(`Traduction de l’exemple : ${BASE.exampleFr}`);
    const style = flat(text);
    expect(style.fontStyle).toBeUndefined();
    expect(style.color).toBe(colors.primaryInk);
    expect(style.fontSize).toBe(15);
    expect(text.props.numberOfLines).toBeUndefined();
    // l'anglais garde sa langue
    expect(screen.getByText(`“${BASE.example}”`, hidden).props.accessibilityLanguage).toBe('en-US');
  });

  it('AC-22.1 : annonce au retournement avec « Traduction de l’exemple : … »', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(card());
    expect(announce).toHaveBeenCalledWith(
      `Traduction : escalier. Exemple : ${BASE.example}. Traduction de l’exemple : ${BASE.exampleFr}.`,
    );
    expect(backAnnouncement({ fr: 'a', example: 'b', exampleFr: '' })).toBe('Traduction : a. Exemple : b.');
  });

  it('AC-20.3 / RG-162 : aucun bouton 🔊 pour la traduction ; les 🔊 lisent le mot et la phrase anglaise seulement', async () => {
    const onSpeak = jest.fn();
    await render(card({}, true, onSpeak));
    const buttons = screen.getAllByRole('button', hidden).filter((b) => /^Écouter/.test(String(b.props.accessibilityLabel)));
    expect(buttons.map((b) => b.props.accessibilityLabel).sort()).toEqual(["Écouter la phrase d'exemple", 'Écouter le mot']);
    for (const b of buttons) await fireEvent.press(b);
    expect(onSpeak.mock.calls.map((c) => c[0]).sort()).toEqual([BASE.example, BASE.en].sort());
    // le bloc français ne contient aucun élément interactif
    const fr = screen.getByTestId('flashcard-example-fr');
    expect(within(fr).queryAllByRole('button', hidden)).toHaveLength(0);
    expect(onSpeak).not.toHaveBeenCalledWith(BASE.exampleFr);
  });

  it.each([
    ['absent', undefined],
    ['vide', ''],
    ['espaces', '   '],
  ])('AC-20.7 : exampleFr %s → aucun bloc, aucun libellé, aucun plantage', async (_l, exampleFr) => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(card({ exampleFr: exampleFr as string }));
    expect(screen.queryByTestId('flashcard-example-fr', hidden)).toBeNull();
    expect(screen.queryByText('En français', hidden)).toBeNull();
    expect(screen.getByText('escalier')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith(`Traduction : escalier. Exemple : ${BASE.example}.`);
  });

  it('RG-164 : verso défilant — zone de défilement présente, mot et boutons 🔊 hors du défilement ; phrase de 120 caractères entière', async () => {
    const longest = [...WORDS].sort((a, b) => b.exampleFr.length - a.exampleFr.length)[0];
    await render(card({ en: longest.en, fr: longest.fr, example: longest.example, exampleFr: longest.exampleFr }));
    const scroll = screen.getByTestId('flashcard-back-scroll');
    expect(scroll).toBeTruthy();
    expect(within(scroll).getByText(`« ${longest.exampleFr} »`)).toBeTruthy();
    expect(within(scroll).getByText('Traduction')).toBeTruthy();
    expect(within(scroll).getByText('Exemple')).toBeTruthy();
    // le mot (en tête de carte) reste hors de la zone défilante
    expect(within(scroll).queryByText(longest.en, hidden)).toBeNull();
  });

  it('RG-164 : indice de défilement visible seulement tant qu’il reste du contenu', async () => {
    await render(card());
    expect(screen.queryByTestId('flashcard-scroll-hint')).toBeNull(); // pas encore mesuré : rien à indiquer
    const scroll = screen.getByTestId('flashcard-back-scroll');
    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: 200 } } });
    await fireEvent(scroll, 'contentSizeChange', 300, 400);
    expect(screen.getByTestId('flashcard-scroll-hint')).toBeTruthy();
    expect(screen.getByTestId('flashcard-scroll-hint').props.pointerEvents).toBe('none');
    await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(screen.queryByTestId('flashcard-scroll-hint')).toBeNull();
  });
});

describe('DailyWordRow : traduction dans la liste (AC-21.1, AC-21.2, AC-22.2)', () => {
  const word = { id: 'stairs', ...BASE };

  it('exemple anglais puis traduction, drapeau décoratif, non interactive', async () => {
    await render(<DailyWordRow word={word} status="known" testID="row" />);
    const fr = screen.getByTestId('row-example-fr', hidden);
    expect(within(fr).getByText(`« ${BASE.exampleFr} »`, hidden).props.accessibilityLanguage).toBe('fr-FR');
    expect(within(fr).getByText('🇫🇷', hidden).props.accessible).toBe(false);
    expect(within(fr).queryAllByRole('button', hidden)).toHaveLength(0);
    // ordre : l'exemple anglais est avant la traduction dans l'arbre
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf(BASE.example)).toBeGreaterThan(-1);
    expect(json.indexOf(BASE.example)).toBeLessThan(json.indexOf(BASE.exampleFr));
  });

  it('libellé d’accessibilité étendu, un seul bloc lisible (pas de double lecture)', async () => {
    await render(<DailyWordRow word={word} status="toReview" />);
    expect(
      screen.getByLabelText(
        `stairs, escalier. Exemple : ${BASE.example}. Traduction de l’exemple : ${BASE.exampleFr}. Catégorie Maison, niveau A2. À revoir.`,
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('row-example-fr', hidden).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('AC-21.2 : le 🔊 de la ligne lit l’exemple anglais ; pas de 🔊 supplémentaire', async () => {
    const onExample = jest.fn();
    await render(<DailyWordRow word={word} status="known" onSpeakWord={jest.fn()} onSpeakExample={onExample} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    await fireEvent.press(screen.getByLabelText("Écouter l'exemple"));
    expect(onExample).toHaveBeenCalledTimes(1);
  });

  it('exampleFr absent ou vide → ligne non rendue, libellé inchangé', async () => {
    await render(<DailyWordRow word={{ ...word, exampleFr: '' }} status="known" />);
    expect(screen.queryByTestId('row-example-fr', hidden)).toBeNull();
    expect(screen.getByLabelText(`stairs, escalier. Exemple : ${BASE.example}. Catégorie Maison, niveau A2. Su.`)).toBeTruthy();
  });
});

// --- Parcours d'écrans ---

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
  'test-run': TestRunScreen,
  'test-result': TestResultScreen,
  settings: SettingsScreen,
};

const frSet = new Set(WORDS.map((w) => frenchQuote(w.exampleFr)));
const anyFrenchExample = () => {
  // Textes et libellés d'accessibilité de tout l'arbre rendu (y compris éléments masqués).
  const texts: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') texts.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      const n = node as { props?: Record<string, unknown>; children?: unknown };
      if (typeof n.props?.accessibilityLabel === 'string') texts.push(n.props.accessibilityLabel);
      walk(n.children);
    }
  };
  walk(routerScreen.toJSON());
  const all = texts.join('\n');
  return WORDS.filter((w) => all.includes(w.exampleFr)).map((w) => w.id);
};

beforeEach(() => {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
  useReviewStore.getState().clear();
  useResultsStore.setState({ lastSession: null, lastTest: null });
  jest.clearAllMocks();
});

describe('Écrans : session et passe de révision (AC-20.1, AC-20.2, AC-20.3)', () => {
  it('session : recto sans traduction, verso avec la traduction du mot affiché, 🔊 en anglais uniquement', async () => {
    await renderRouter(routes, { initialUrl: '/session' });
    expect(anyFrenchExample()).toEqual([]); // recto : nulle part
    expect(routerScreen.queryByTestId('flashcard-example-fr', hidden)).toBeNull();
    await routerFireEvent.press(routerScreen.getByTestId('session-flip'));
    const frText = routerScreen.getByTestId('flashcard-example-fr');
    const shown = anyFrenchExample();
    expect(shown).toHaveLength(1);
    const word = WORDS.find((w) => w.id === shown[0])!;
    expect(frSet.has(`« ${word.exampleFr} »`)).toBe(true);
    expect(within(frText).getByText(`« ${word.exampleFr} »`)).toBeTruthy();
    // 🔊 : mot et phrase anglaise, jamais le français
    await routerFireEvent.press(routerScreen.getByLabelText("Écouter la phrase d'exemple"));
    await routerFireEvent.press(routerScreen.getByLabelText('Écouter le mot'));
    const spoken = (Speech.speak as jest.Mock).mock.calls.map((c) => c[0]);
    expect(spoken).toEqual([word.example, word.en]);
    expect(spoken.some((t) => WORDS.some((w) => w.exampleFr === t))).toBe(false);
    expect((Speech.speak as jest.Mock).mock.calls.every((c) => c[1].language === 'en-US')).toBe(true);
  });

  it('passe de révision : même verso (traduction visible après retournement, absente avant)', async () => {
    const now = new Date();
    WORDS.slice(0, 3).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, now));
    await renderRouter(routes, { initialUrl: '/review' });
    await waitGuard();
    await routerFireEvent.press(routerScreen.getByTestId('review-start'));
    expect(routerScreen.queryByTestId('flashcard-example-fr', hidden)).toBeNull();
    await waitGuard();
    await routerFireEvent.press(routerScreen.getByTestId('review-flip'));
    expect(routerScreen.getByTestId('flashcard-example-fr')).toBeTruthy();
    expect(routerScreen.getByText('En français')).toBeTruthy();
    const verso = routerScreen.getByTestId('flashcard-example-fr');
    const matches = WORDS.slice(0, 3).filter((w) => within(verso).queryByText(`«\u00A0${w.exampleFr}\u00A0»`));
    expect(matches).toHaveLength(1); // exactement la traduction du mot affiché (la liste reste dessous dans la pile)
  });

  it('liste « Mots du jour » : chaque ligne affichée porte sa traduction (AC-21.1)', async () => {
    const now = new Date();
    WORDS.slice(0, 4).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, now));
    await renderRouter(routes, { initialUrl: '/review' });
    for (const w of WORDS.slice(0, 4)) {
      const row = routerScreen.getByTestId(`review-row-${w.id}`);
      expect(within(row).getByText(`« ${w.exampleFr} »`, hidden)).toBeTruthy();
      expect(within(row).getByTestId('row-example-fr', hidden)).toBeTruthy();
    }
  });
});

describe('Écrans : jamais dans le test hebdomadaire (AC-20.5, RG-159)', () => {
  it('questions, retour de réponse, résultat et mots ratés : aucune traduction d’exemple', async () => {
    const now = new Date();
    WORDS.slice(0, 10).forEach((w) => useLearnerStore.getState().evaluateCard(w.id, true, now));
    await renderRouter(routes, { initialUrl: '/test-run' });
    expect(anyFrenchExample()).toEqual([]);
    for (let i = 0; i < 10; i++) {
      await routerFireEvent.press(routerScreen.getByTestId('test-option-0'));
      expect(anyFrenchExample()).toEqual([]); // bandeau de retour
      await routerFireEvent.press(routerScreen.getByTestId('test-next'));
      await waitGuard();
      if (routerScreen.queryByText('Résultat du test')) break;
    }
    expect(routerScreen.queryByText('Résultat du test')).toBeTruthy();
    expect(anyFrenchExample()).toEqual([]);
    expect(routerScreen.queryByText('En français', hidden)).toBeNull();
  });
});
