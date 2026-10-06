/**
 * Composants clés de la direction artistique v2 (design §2.3, §4.1, §4.5, §4.6, §4.11, §4.12).
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { computeGoalStatus, getWeekDays } from '@/domain/streak';
import { colors, depth } from '@/theme/tokens';

import { BUTTON_VARIANTS, Button } from '../Button';
import { Confetti, CONFETTI_STILL_COUNT } from '../Confetti';
import { FeedbackSheet } from '../FeedbackSheet';
import { homeMessage, sessionResultSubtitle } from '../messages';
import { ProgressRing, ringAngles } from '../ProgressRing';
import { StreakChip, WeekStrip } from '../Streak';
import { Vobi, VOBI_MOODS, type VobiMood } from '../Vobi';

const hidden = { includeHiddenElements: true } as const;
const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

function mockReduceMotion(enabled: boolean) {
  return jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
}

afterEach(() => jest.restoreAllMocks());

describe('Vobi (design §2.3)', () => {
  const moods = Object.keys(VOBI_MOODS) as VobiMood[];

  it('les 8 expressions existent et chacune a son accessoire emoji', async () => {
    expect(moods).toEqual(['hello', 'correct', 'oops', 'streak', 'win', 'retry', 'empty', 'search']);
    for (const mood of moods) {
      const { unmount } = await render(<Vobi mood={mood} />);
      expect(screen.getByTestId(`vobi-${mood}`, hidden)).toBeTruthy();
      for (const acc of VOBI_MOODS[mood].accessories) {
        expect(screen.getByText(acc.emoji, hidden)).toBeTruthy();
      }
      await unmount();
    }
  });

  it('décoratif : masqué des lecteurs d’écran et non tactile', async () => {
    await render(<Vobi mood="hello" />);
    expect(screen.queryByTestId('vobi')).toBeNull(); // invisible pour l'accessibilité
    const root = screen.getByTestId('vobi', hidden);
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(root.props.pointerEvents).toBe('none');
  });

  it('grille 120 mise à l’échelle : size / 120', async () => {
    await render(<Vobi mood="correct" size={60} />);
    const root = screen.getByTestId('vobi', hidden);
    expect(flat(root)).toMatchObject({ width: 60, height: 60 });
    const transform = flat(screen.getByTestId('vobi-correct', hidden)).transform as Record<string, number>[];
    expect(transform).toContainEqual({ scale: 0.5 });
  });

  it('accessoire 🔥 sur la tête : l’étincelle ✦ est retirée (streak), atténuée (empty)', async () => {
    const { rerender } = await render(<Vobi mood="streak" />);
    expect(screen.queryByText('✦', hidden)).toBeNull();
    await rerender(<Vobi mood="hello" />);
    expect(screen.getByText('✦', hidden)).toBeTruthy();
    await rerender(<Vobi mood="empty" />);
    expect(flat(screen.getByText('✦', hidden)).opacity).toBe(0.45);
  });
});

describe('ProgressRing sans SVG (design §4.5)', () => {
  it('angles des deux demi-disques', () => {
    expect(ringAngles(0)).toEqual({ right: 0, left: 0 });
    expect(ringAngles(0.25)).toEqual({ right: 90, left: 0 });
    expect(ringAngles(0.5)).toEqual({ right: 180, left: 0 });
    expect(ringAngles(0.75)).toEqual({ right: 180, left: 90 });
    expect(ringAngles(1.5)).toEqual({ right: 180, left: 180 });
    expect(ringAngles(Number.NaN)).toEqual({ right: 0, left: 0 });
  });

  it('0 % : aucun demi-disque ; 40 % : moitié droite tournée de 144°', async () => {
    const { rerender } = await render(<ProgressRing value={0} accessibilityLabel="Objectif" />);
    expect(screen.queryByTestId('ring-right')).toBeNull();
    expect(screen.queryByTestId('ring-left')).toBeNull();
    await rerender(<ProgressRing value={0.4} accessibilityLabel="Objectif" />);
    const rotor = screen.getByTestId('ring-right').children[0] as never;
    expect(flat(rotor).transform).toEqual([{ rotate: '144deg' }]);
    expect(screen.queryByTestId('ring-left')).toBeNull();
    expect(screen.getByLabelText('Objectif').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  });

  it('objectif dépassé (15/10) : anneau plein `successBright`, valeur bornée à 100', async () => {
    await render(<ProgressRing value={1.5} color={colors.primary} accessibilityLabel="Objectif" />);
    const right = screen.getByTestId('ring-right').children[0] as never as { children: never[] };
    expect(flat(right.children[0]).backgroundColor).toBe(colors.successBright);
    expect(screen.getByLabelText('Objectif').props.accessibilityValue.now).toBe(100);
  });
});

describe('Button 3D (design §4.1)', () => {
  it('variantes : face et lèvre pleine de la bonne couleur', async () => {
    for (const variant of ['primary', 'sun', 'secondary', 'success', 'softDanger', 'danger'] as const) {
      const { unmount } = await render(<Button label="Go" variant={variant} onPress={() => undefined} testID="b" />);
      expect(flat(screen.getByTestId('b-face')).backgroundColor).toBe(BUTTON_VARIANTS[variant].face);
      expect(flat(screen.getByTestId('b-face-lip')).backgroundColor).toBe(BUTTON_VARIANTS[variant].lip);
      expect(flat(screen.getByTestId('b-face-lip')).top).toBe(depth.md);
      await unmount();
    }
    expect(BUTTON_VARIANTS.primary).toMatchObject({ face: colors.primary, lip: colors.primaryLip });
    expect(BUTTON_VARIANTS.sun).toMatchObject({ face: colors.sun, lip: colors.sunLip, text: colors.ink });
  });

  it('`tone="success"` (compatibilité v1) = variante success', async () => {
    await render(<Button label="Je savais" tone="success" onPress={() => undefined} testID="b" />);
    expect(flat(screen.getByTestId('b-face')).backgroundColor).toBe(colors.success);
  });

  it('enfoncement : la face descend de la profondeur de la lèvre à l’appui puis remonte', async () => {
    mockReduceMotion(true); // transition instantanée (design §6)
    await render(<Button label="Go" onPress={() => undefined} testID="b" />);
    await act(async () => undefined);
    const translate = () => (flat(screen.getByTestId('b-face')).transform as { translateY: number }[])[0].translateY;
    expect(translate()).toBe(0);
    await fireEvent(screen.getByTestId('b'), 'pressIn');
    await waitFor(() => expect(translate()).toBe(depth.md));
    await fireEvent(screen.getByTestId('b'), 'pressOut');
    await waitFor(() => expect(translate()).toBe(0));
  });

  it('désactivé : face grisée, aucun appel ; anti-double-tap conservé', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Go" disabled onPress={onPress} testID="b" />);
    expect(flat(screen.getByTestId('b-face')).backgroundColor).toBe(colors.disabledBg);
    expect(screen.getByTestId('b')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    await rerender(<Button label="Go" onPress={onPress} testID="b" />);
    await fireEvent.press(screen.getByTestId('b'));
    await fireEvent.press(screen.getByTestId('b'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Série : StreakChip et WeekStrip (design §4.6)', () => {
  it('chip éteinte à 0, allumée sinon, avec libellé d’accessibilité', async () => {
    const { rerender } = await render(<StreakChip streak={0} />);
    expect(screen.getByLabelText('Série actuelle : 0 jour')).toBeTruthy();
    await rerender(<StreakChip streak={5} />);
    expect(screen.getByLabelText('Série actuelle : 5 jours')).toBeTruthy();
  });

  it('pastilles de la semaine issues de getWeekDays', async () => {
    const days = getWeekDays(['2026-10-05', '2026-10-06'], '2026-10-06');
    const { rerender } = await render(<WeekStrip days={days} />);
    expect(screen.getByLabelText('Cette semaine : 2 jours actifs')).toBeTruthy();
    expect(screen.getAllByTestId('week-day-active', hidden)).toHaveLength(2);
    expect(screen.getAllByTestId('week-day-inactive', hidden)).toHaveLength(5);
    await rerender(<WeekStrip days={days} variant="large" />);
    expect(screen.getAllByText('🔥', hidden)).toHaveLength(2);
    expect(screen.getAllByText('M', hidden)).toHaveLength(2);
  });
});

describe('FeedbackSheet (design §4.11)', () => {
  it('bonne réponse : titre, « EN = FR » et bouton success', async () => {
    const onNext = jest.fn();
    await render(
      <FeedbackSheet correct answer="cuisine" prompt="kitchen" direction="en-fr" actionLabel="Suivant" onNext={onNext} />,
    );
    expect(screen.getByText('✓ Bonne réponse !')).toBeTruthy();
    expect(screen.getByText('kitchen = cuisine')).toBeTruthy();
    expect(flat(screen.getByTestId('test-next-face')).backgroundColor).toBe(colors.success);
    await fireEvent.press(screen.getByTestId('test-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('mauvaise réponse : « Pas tout à fait… », bonne réponse et bouton danger', async () => {
    await render(
      <FeedbackSheet
        correct={false}
        answer="tomorrow"
        prompt="demain"
        direction="fr-en"
        actionLabel="Voir le résultat"
        onNext={() => undefined}
      />,
    );
    expect(screen.getByText('Pas tout à fait…')).toBeTruthy();
    expect(screen.getByText('✗ La bonne réponse était : tomorrow')).toBeTruthy();
    expect(screen.getByText('Voir le résultat')).toBeTruthy();
    expect(flat(screen.getByTestId('test-next-face')).backgroundColor).toBe(colors.danger);
  });
});

describe('Confetti (design §4.12)', () => {
  it('« Réduire les animations » : 10 confettis immobiles', async () => {
    mockReduceMotion(true);
    await render(<Confetti />);
    await act(async () => undefined);
    await fireEvent(screen.getByTestId('confetti', hidden), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } },
    });
    const pieces = screen.getAllByTestId('confetti-piece', hidden);
    expect(pieces).toHaveLength(CONFETTI_STILL_COUNT);
    expect(flat(pieces[0]).opacity).toBeUndefined();
  });

  it('animations actives : 24 confettis, non tactiles et masqués des lecteurs d’écran', async () => {
    mockReduceMotion(false);
    await render(<Confetti />);
    const layer = screen.getByTestId('confetti', hidden);
    expect(layer.props.pointerEvents).toBe('none');
    expect(layer.props.accessibilityElementsHidden).toBe(true);
    await fireEvent(layer, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } });
    expect(screen.getAllByTestId('confetti-piece', hidden)).toHaveLength(24);
  });
});

describe('Micro-textes v2 (design §2.4, §5.1, §5.4)', () => {
  const goal = (done: number) => computeGoalStatus(done, 10);
  it('message de Vobi par priorité décroissante', () => {
    expect(homeMessage(0, goal(0), 0)).toBe('Salut ! Prêt pour tes 10 premiers mots ?');
    expect(homeMessage(12, goal(10), 3)).toBe('Objectif atteint ✅ Chaque carte en plus compte !');
    expect(homeMessage(12, goal(0), 3)).toBe("🔥 3 jours ! Une carte aujourd'hui et la flamme continue.");
    expect(homeMessage(12, goal(4), 3)).toBe("Encore 6 cartes et l'objectif du jour est dans la poche 💪");
    expect(homeMessage(12, goal(9), 0)).toBe("Encore 1 carte et l'objectif du jour est dans la poche 💪");
  });

  it('sous-titre du résultat de session selon la part de « Je savais »', () => {
    expect(sessionResultSubtitle(5, 10)).toBe("Excellent rythme, tes mots s'accrochent.");
    expect(sessionResultSubtitle(4, 10)).toBe('Bel effort ! Chaque carte te rapproche du but.');
  });
});
