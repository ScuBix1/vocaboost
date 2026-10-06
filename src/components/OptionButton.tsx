/**
 * Option de QCM 3D (design §4.10) : pastille lettre A-D, états correct / incorrect.
 * Pop sur la bonne réponse, secousse sur l'erreur (aucune si « Réduire les animations »).
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion, typography } from '@/theme/tokens';

import { PressableRaised } from './Raised';

export type OptionState = 'idle' | 'correct' | 'incorrect' | 'disabled';

export interface OptionButtonProps {
  label: string;
  state: OptionState;
  onPress: () => void;
  /**
   * Verrou anti-double-tap (V2-01) : l'option ignore les taps sans changer d'apparence
   * (300 ms, juste après « Suivant » ; un grisé clignoterait à chaque question).
   */
  locked?: boolean;
  /** Position 1-based, pour l'étiquette d'accessibilité et la lettre (1 → A). */
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

const LOOK: Record<OptionState, { bg: string; border: string; text: string; key: string | null; keyText: string }> = {
  idle: { bg: colors.surface, border: colors.border, text: colors.ink, key: null, keyText: colors.inkMuted },
  disabled: { bg: colors.surface, border: colors.border, text: colors.inkMuted, key: null, keyText: colors.inkMuted },
  correct: { bg: colors.successSoft, border: colors.success, text: colors.successInk, key: colors.success, keyText: colors.textOnColor },
  incorrect: { bg: colors.dangerSoft, border: colors.danger, text: colors.dangerInk, key: colors.danger, keyText: colors.textOnColor },
};

export function optionLetter(index: number): string {
  return String.fromCharCode(64 + index);
}

export function OptionButton({ label, state, onPress, locked = false, index, language, testID }: OptionButtonProps) {
  const interactive = state === 'idle' && !locked;
  const reduceMotion = useReduceMotion();
  const feedback = useRef(new Animated.Value(0)).current;
  const look = LOOK[state];

  useEffect(() => {
    if (reduceMotion || (state !== 'correct' && state !== 'incorrect')) return;
    feedback.setValue(0);
    Animated.timing(feedback, {
      toValue: 1,
      duration: state === 'correct' ? motion.pop : motion.shake,
      easing: state === 'correct' ? Easing.out(Easing.quad) : Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [state, reduceMotion, feedback]);

  const animStyle =
    state === 'correct'
      ? { transform: [{ scale: feedback.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] }) }] }
      : state === 'incorrect'
        ? {
            transform: [
              {
                translateX: feedback.interpolate({
                  inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                  outputRange: [0, -6, 6, -4, 4, 0],
                }),
              },
            ],
          }
        : null;

  return (
    <Animated.View style={[animStyle, state === 'disabled' && styles.dim]}>
      <PressableRaised
        onPress={interactive ? onPress : undefined}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel={`Option ${index} : ${label}${SUFFIX[state]}`}
        accessibilityState={{ disabled: !interactive }}
        accessibilityLanguage={language}
        testID={testID}
        lipColor={state === 'correct' || state === 'incorrect' ? look.border : colors.border}
        depth={state === 'disabled' ? 2 : depth.md}
        radius={18}
        faceStyle={(pressed) => [
          styles.base,
          { backgroundColor: look.bg, borderColor: look.border },
          interactive && pressed && styles.pressed,
        ]}
      >
        <View
          accessible={false}
          style={[
            styles.key,
            look.key ? { backgroundColor: look.key, borderColor: look.key } : { borderColor: colors.border },
          ]}
        >
          <Text style={[styles.keyText, { color: look.keyText }]}>{optionLetter(index)}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.label, { color: look.text }]}>
          {label}
        </Text>
        {state === 'correct' || state === 'incorrect' ? (
          <View accessible={false}>
            <Text style={[styles.marker, { color: look.text }]}>{state === 'correct' ? '✓' : '✗'}</Text>
          </View>
        ) : null}
      </PressableRaised>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 60,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  dim: { opacity: 0.75 },
  key: { width: 32, height: 32, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '800', flex: 1 },
  marker: { ...typography.h3, fontSize: 18 },
});
