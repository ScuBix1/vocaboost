/**
 * Bandeau de feedback du test (design §4.11), fixé en bas, glisse depuis le bas.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, shadows, typography } from '@/theme/tokens';

import { Button } from './Button';
import { Vobi } from './Vobi';

export interface FeedbackSheetProps {
  correct: boolean;
  /** Bonne réponse (libellé de l'option correcte). */
  answer: string;
  /** Mot de la question, pour « {mot EN} = {mot FR} ». */
  prompt: string;
  /** Sens de la question : le mot anglais est toujours affiché en premier. */
  direction: 'en-fr' | 'fr-en';
  actionLabel: string;
  onNext: () => void;
  /** Marge basse (inset de la zone sûre). */
  bottomInset?: number;
}

export function FeedbackSheet({ correct, answer, prompt, direction, actionLabel, onNext, bottomInset = 0 }: FeedbackSheetProps) {
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: reduceMotion ? motion.fade : motion.sheet,
      easing: reduceMotion ? Easing.linear : Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, [enter, reduceMotion]);

  const animStyle = reduceMotion
    ? { opacity: enter }
    : { transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [220, 0] }) }] };
  const ink = correct ? colors.successInk : colors.dangerInk;
  const en = direction === 'en-fr' ? prompt : answer;
  const fr = direction === 'en-fr' ? answer : prompt;

  return (
    <Animated.View
      style={[
        styles.sheet,
        { backgroundColor: correct ? colors.successSoft : colors.dangerSoft, paddingBottom: 18 + bottomInset },
        animStyle,
      ]}
      testID={correct ? 'feedback-correct' : 'feedback-incorrect'}
    >
      <View style={styles.row}>
        <Vobi mood={correct ? 'correct' : 'oops'} size={56} animateIn />
        <View style={styles.texts} accessibilityLiveRegion="polite">
          {correct ? (
            <>
              <Text style={[styles.title, { color: ink }]}>✓ Bonne réponse !</Text>
              <Text style={[styles.caption, { color: ink }]}>
                {en} = {fr}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: ink }]}>Pas tout à fait…</Text>
              <Text style={[styles.strong, { color: ink }]}>✗ La bonne réponse était : {answer}</Text>
            </>
          )}
        </View>
      </View>
      <Button label={actionLabel} variant={correct ? 'success' : 'danger'} onPress={onNext} testID="test-next" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 16,
    gap: 12,
    ...shadows.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1, gap: 2 },
  title: { ...typography.h2 },
  caption: { ...typography.caption },
  strong: { ...typography.bodyStrong },
});
