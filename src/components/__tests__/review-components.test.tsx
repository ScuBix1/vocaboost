/**
 * Composants v1.1 (design §v1.1.3, §v1.1.9) : DailyWordRow, InfoNote, Badge « review », Button « link ».
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { Badge } from '../Badge';
import { BUTTON_VARIANTS, Button } from '../Button';
import { DailyWordRow } from '../DailyWordRow';
import { InfoNote } from '../InfoNote';
import { dailyCountLabel, REVIEW_NOTE } from '../messages';

const hidden = { includeHiddenElements: true } as const;
const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const word = { id: 'luggage', en: 'luggage', fr: 'bagages', example: 'I packed my luggage.', level: 'A2', categoryLabel: 'Voyage', category: 'travel' as const };

describe('DailyWordRow (RG-105, RG-116)', () => {
  it('affiche glyphe + mot du badge et un label de ligne complet', async () => {
    await render(<DailyWordRow word={word} status="toReview" testID="row" />);
    expect(screen.getByText('À revoir', hidden)).toBeTruthy();
    expect(screen.getByText('↻', hidden)).toBeTruthy();
    expect(
      screen.getByLabelText('luggage, bagages. Exemple : I packed my luggage.. Catégorie Voyage, niveau A2. À revoir.'),
    ).toBeTruthy();
    await render(<DailyWordRow word={word} status="known" />);
    expect(screen.getByText('✓', hidden)).toBeTruthy();
  });

  it('les 🔊 sont masqués sans callbacks, et déclenchent les callbacks sinon', async () => {
    const { rerender } = await render(<DailyWordRow word={word} status="known" />);
    expect(screen.queryByLabelText('Écouter le mot luggage')).toBeNull();
    const onWord = jest.fn();
    const onExample = jest.fn();
    await rerender(<DailyWordRow word={word} status="known" onSpeakWord={onWord} onSpeakExample={onExample} />);
    await fireEvent.press(screen.getByLabelText('Écouter le mot luggage'));
    await fireEvent.press(screen.getByLabelText("Écouter l'exemple"));
    expect(onWord).toHaveBeenCalledTimes(1);
    expect(onExample).toHaveBeenCalledTimes(1);
  });
});

describe('InfoNote, Badge review, Button link, libellés', () => {
  it('InfoNote : texte statique, rôle texte, jamais une alerte', async () => {
    await render(<InfoNote testID="n">{REVIEW_NOTE}</InfoNote>);
    const note = screen.getByTestId('n');
    expect(note.props.accessibilityRole).toBe('text');
    expect(note.props.accessibilityLiveRegion).toBeUndefined();
    expect(flat(note).backgroundColor).toBe(colors.primarySoft);
  });

  it('Badge review : fond sunSoft, texte sunInk', async () => {
    await render(<Badge label="À revoir" variant="review" emoji="↻" />);
    expect(flat(screen.getByText('À revoir')).color).toBe(colors.sunInk);
  });

  it('Button link : sans face ni lèvre, 44 pt, actionnable', async () => {
    const onPress = jest.fn();
    await render(<Button label="Revoir les mots du jour" variant="link" onPress={onPress} testID="l" />);
    expect(BUTTON_VARIANTS.link.text).toBe(colors.primary);
    expect(screen.queryByTestId('l-face')).toBeNull();
    expect(flat(screen.getByTestId('l')).minHeight).toBe(44);
    await fireEvent.press(screen.getByTestId('l'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dailyCountLabel : singulier et pluriel (RG-105)', () => {
    expect(dailyCountLabel(1)).toBe("1 mot étudié aujourd'hui");
    expect(dailyCountLabel(12)).toBe("12 mots étudiés aujourd'hui");
  });
});
