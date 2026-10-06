import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { Chip } from '../Chip';
import { Flashcard } from '../Flashcard';
import { OptionButton } from '../OptionButton';
import { ProgressBar } from '../ProgressBar';

const word = {
  en: 'kitchen',
  fr: 'cuisine',
  example: 'We usually eat breakfast in the kitchen.',
  level: 'A1',
  categoryLabel: 'Maison',
};

function FlashcardHarness({ onSpeak }: { onSpeak?: (text: string) => void }) {
  const [flipped, setFlipped] = useState(false);
  return <Flashcard word={word} index={3} total={10} flipped={flipped} onFlip={() => setFlipped(true)} onSpeak={onSpeak} />;
}

describe('Flashcard (RG-30, RG-31, US-03)', () => {
  it('AC-03.1 : le recto montre le mot, le niveau, la catégorie et « Carte n / N », sans la traduction', async () => {
    await render(<FlashcardHarness />);
    expect(screen.getAllByText('kitchen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Carte 3 / 10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('A1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maison').length).toBeGreaterThan(0);
    expect(screen.queryByText('cuisine')).toBeNull();
    expect(screen.queryByText(word.example)).toBeNull();
  });

  it('AC-03.2 : un tap sur la carte révèle la traduction et l’exemple', async () => {
    await render(<FlashcardHarness />);
    await fireEvent.press(screen.getByTestId('flashcard-front'));
    expect(screen.getByText('cuisine')).toBeTruthy();
    expect(screen.getByText(word.example)).toBeTruthy();
  });

  it('AC-09.1 : boutons 🔊 pour le mot (recto) puis mot et phrase (verso)', async () => {
    const onSpeak = jest.fn();
    await render(<FlashcardHarness onSpeak={onSpeak} />);
    await fireEvent.press(screen.getByLabelText('Écouter le mot'));
    expect(onSpeak).toHaveBeenLastCalledWith('kitchen');
    await fireEvent.press(screen.getByTestId('flashcard-front'));
    await fireEvent.press(screen.getByLabelText("Écouter la phrase d'exemple"));
    expect(onSpeak).toHaveBeenLastCalledWith(word.example);
  });
});

describe('OptionButton (RG-66, design §3.7)', () => {
  it('libellés d’accessibilité selon l’état et inactif après réponse', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<OptionButton label="cuisine" index={1} state="idle" onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Option 1 : cuisine'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<OptionButton label="cuisine" index={1} state="correct" onPress={onPress} />);
    expect(screen.getByLabelText('Option 1 : cuisine, bonne réponse')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Option 1 : cuisine, bonne réponse'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<OptionButton label="cuisine" index={1} state="incorrect" onPress={onPress} />);
    expect(screen.getByLabelText('Option 1 : cuisine, ta réponse, incorrecte')).toBeTruthy();
    expect(screen.getByText('✗')).toBeTruthy();
  });
});

describe('Chip (RG-50)', () => {
  it('rôle checkbox avec état coché', async () => {
    const onToggle = jest.fn();
    await render(<Chip label="Voyage" selected onToggle={onToggle} />);
    const chip = screen.getByRole('checkbox', { name: 'Voyage' });
    expect(chip.props.accessibilityState).toEqual({ checked: true });
    await fireEvent.press(chip);
    expect(onToggle).toHaveBeenCalled();
  });
});

describe('ProgressBar (design §3.4)', () => {
  it('valeur bornée à 100 % quand l’objectif est dépassé (15/10)', async () => {
    await render(<ProgressBar value={1.5} accessibilityLabel="Objectif" />);
    expect(screen.getByLabelText('Objectif').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });
});
