/**
 * Carte de vocabulaire retournable (design §3.3, RG-30 → RG-32, RG-80).
 * Retournement à sens unique ; remonter la carte via `key` pour repartir du recto.
 */
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, MAX_FONT_MULTIPLIER, radius, shadows, spacing, typography } from '@/theme/tokens';

import { Badge } from './Badge';

export interface FlashcardWord {
  en: string;
  fr: string;
  example: string;
  level: string;
  categoryLabel: string;
}

export interface FlashcardProps {
  word: FlashcardWord;
  index: number;
  total: number;
  flipped: boolean;
  onFlip: () => void;
  /** P2 : absent → boutons 🔊 masqués. */
  onSpeak?: (text: string) => void;
}

/** Au-delà, le mot passe de `display` à `h1` (design §5.4). */
const LONG_WORD_LENGTH = 14;

function SpeakButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.speak, pressed && styles.speakPressed]}
    >
      <Text style={styles.speakIcon} accessible={false}>
        🔊
      </Text>
    </Pressable>
  );
}

export function Flashcard({ word, index, total, flipped, onFlip, onSpeak }: FlashcardProps) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(flipped ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration: reduceMotion ? 150 : 300,
      useNativeDriver: true,
    }).start();
    if (flipped) {
      AccessibilityInfo.announceForAccessibility(`Traduction : ${word.fr}. Exemple : ${word.example}`);
    }
  }, [flipped, progress, reduceMotion, word.fr, word.example]);

  const frontStyle = reduceMotion
    ? { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
    : { transform: [{ perspective: 1000 }, { rotateY: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] };
  const backStyle = reduceMotion
    ? { opacity: progress }
    : { transform: [{ perspective: 1000 }, { rotateY: progress.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }] };

  const isLong = word.en.length > LONG_WORD_LENGTH;
  const meta = (
    <View style={styles.metaRow}>
      <Text style={styles.caption}>
        Carte {index} / {total}
      </Text>
      <View style={styles.badges}>
        <Badge label={word.level} />
        <Text style={styles.caption}>{word.categoryLabel}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {/* Recto (RG-30) */}
      <Animated.View
        style={[styles.face, styles.front, frontStyle]}
        pointerEvents={flipped ? 'none' : 'auto'}
        importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={flipped}
      >
        <Pressable
          onPress={onFlip}
          disabled={flipped}
          accessibilityRole="button"
          accessibilityLabel={`Mot anglais : ${word.en}. Niveau ${word.level}, ${word.categoryLabel}. Carte ${index} sur ${total}`}
          accessibilityHint="Touchez deux fois pour voir la traduction"
          testID="flashcard-front"
          style={styles.pressArea}
        >
          {meta}
          <View style={styles.center}>
            <Text
              style={[isLong ? styles.wordLong : styles.word]}
              maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}
              accessibilityLanguage="en-US"
            >
              {word.en}
            </Text>
          </View>
          <Text style={[styles.caption, styles.hint]}>Touchez la carte pour la retourner</Text>
        </Pressable>
        {onSpeak && !flipped ? (
          <View style={styles.speakFront}>
            <SpeakButton label="Écouter le mot" onPress={() => onSpeak(word.en)} />
          </View>
        ) : null}
      </Animated.View>

      {/* Verso (RG-31) */}
      <Animated.View
        style={[styles.face, styles.back, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
        importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!flipped}
        testID="flashcard-back"
      >
        {meta}
        <View style={styles.center}>
          <View style={styles.inlineRow}>
            <Text style={styles.backWord} accessibilityLanguage="en-US">
              {word.en}
            </Text>
            {onSpeak ? <SpeakButton label="Écouter le mot" onPress={() => onSpeak(word.en)} /> : null}
          </View>
          <View style={styles.separator} />
          <Text style={styles.translation}>{flipped ? word.fr : ''}</Text>
          <View style={styles.inlineRow}>
            <Text style={styles.example} accessibilityLanguage="en-US">
              {flipped ? word.example : ''}
            </Text>
            {onSpeak ? <SpeakButton label="Écouter la phrase d'exemple" onPress={() => onSpeak(word.example)} /> : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { minHeight: 320, width: '100%' },
  face: {
    minHeight: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    backfaceVisibility: 'hidden',
    ...shadows.md,
  },
  front: { ...StyleSheet.absoluteFill },
  back: { gap: spacing.md },
  pressArea: { flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  caption: { ...typography.caption, color: colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  word: { ...typography.display, color: colors.text, textAlign: 'center' },
  wordLong: { ...typography.h1, color: colors.text, textAlign: 'center' },
  hint: { textAlign: 'center' },
  speakFront: { position: 'absolute', bottom: spacing.xxxl + spacing.md, alignSelf: 'center' },
  speak: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakPressed: { opacity: 0.7 },
  speakIcon: { fontSize: 18 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  backWord: { ...typography.h2, color: colors.text, textAlign: 'center' },
  separator: { height: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  translation: { ...typography.h2, color: colors.primary, textAlign: 'center' },
  example: { ...typography.body, fontStyle: 'italic', color: colors.textMuted, textAlign: 'center', flexShrink: 1 },
});
