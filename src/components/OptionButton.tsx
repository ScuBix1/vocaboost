/**
 * Option de QCM (design §3.7).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

export type OptionState = 'idle' | 'correct' | 'incorrect' | 'disabled';

export interface OptionButtonProps {
  label: string;
  state: OptionState;
  onPress: () => void;
  /** Position 1-based, pour l'étiquette d'accessibilité. */
  index: number;
  /** Langue de l'option, pour la lecture d'écran des mots anglais. */
  language?: 'en-US' | 'fr-FR';
  testID?: string;
}

const SUFFIX: Record<OptionState, string> = {
  idle: '',
  disabled: '',
  correct: ', bonne réponse',
  incorrect: ', ta réponse, incorrecte',
};

export function OptionButton({ label, state, onPress, index, language, testID }: OptionButtonProps) {
  const interactive = state === 'idle';
  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityLabel={`Option ${index} : ${label}${SUFFIX[state]}`}
      accessibilityState={{ disabled: !interactive }}
      accessibilityLanguage={language}
      testID={testID}
      style={({ pressed }) => [styles.base, styles[state], interactive && pressed && styles.idlePressed]}
    >
      <Text
        numberOfLines={2}
        style={[
          styles.label,
          state === 'correct' && styles.labelCorrect,
          state === 'incorrect' && styles.labelIncorrect,
          state === 'disabled' && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
      {state === 'correct' || state === 'incorrect' ? (
        <View accessible={false}>
          <Text style={[styles.marker, { color: state === 'correct' ? colors.success : colors.danger }]}>
            {state === 'correct' ? '✓' : '✗'}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  idle: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong },
  idlePressed: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  correct: { backgroundColor: colors.successSoft, borderWidth: 2, borderColor: colors.success },
  incorrect: { backgroundColor: colors.dangerSoft, borderWidth: 2, borderColor: colors.danger },
  disabled: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  label: { ...typography.body, color: colors.text, flex: 1 },
  labelCorrect: { color: colors.successText, fontWeight: '600' },
  labelIncorrect: { color: colors.dangerText, fontWeight: '600' },
  labelDisabled: { color: colors.textMuted },
  marker: { ...typography.h3 },
});
