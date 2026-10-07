/**
 * Carte de vocabulaire retournable v2 (design §4.3, RG-30 → RG-32, RG-80).
 * Carte épaisse (lèvre 6), chip de catégorie colorée, badge niveau.
 * Retournement à sens unique ; remonter la carte via `key` pour repartir du recto.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';

import type { CategoryId } from '@/domain/types';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { categoryColors, colors, depth, MAX_FONT_MULTIPLIER, motion, radius, typography } from '@/theme/tokens';

import { Badge } from './Badge';

export interface FlashcardWord {
  en: string;
  fr: string;
  example: string;
  level: string;
  categoryLabel: string;
  /** Pour la couleur et l'emoji de la chip ; absent → chip neutre. */
  category?: CategoryId;
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

/** Au-delà, le mot passe de `wordXL` à 32/38 (design §3.2). */
const LONG_WORD_LENGTH = 14;
const SPEAK_SIZE = 56;
const CARD_DEPTH = depth.lg;

export function SpeakButton({
  label,
  onPress,
  size = 44,
  white = false,
}: {
  label: string;
  onPress: () => void;
  size?: number;
  white?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.speak,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: white ? colors.surface : colors.primarySoft,
          borderBottomWidth: pressed ? 0 : size > 50 ? 4 : 3,
          marginTop: pressed ? (size > 50 ? 4 : 3) : 0,
        },
      ]}
    >
      <Text style={{ fontSize: size > 50 ? 24 : 19 }} accessible={false}>
        🔊
      </Text>
    </Pressable>
  );
}

function CategoryChip({ word }: { word: FlashcardWord }) {
  const c = word.category ? categoryColors[word.category] : null;
  return (
    <View style={[styles.catChip, { backgroundColor: c?.soft ?? colors.surfaceAlt }]}>
      {c ? (
        <Text style={styles.catText} accessible={false}>
          {c.emoji}
        </Text>
      ) : null}
      <Text style={[styles.catText, { color: c?.ink ?? colors.ink }]}>{word.categoryLabel}</Text>
    </View>
  );
}

export function Flashcard({ word, index, total, flipped, onFlip, onSpeak }: FlashcardProps) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  // Position du 🔊 du recto : mesurée sur l'emplacement réservé sous le mot (bouton hors de la zone tactile).
  const [center, setCenter] = useState<LayoutRectangle | null>(null);
  const [slot, setSlot] = useState<LayoutRectangle | null>(null);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration: reduceMotion ? motion.fade : motion.flip,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (flipped) {
      AccessibilityInfo.announceForAccessibility(`Traduction : ${word.fr}. Exemple : ${word.example}`);
    }
  }, [flipped, progress, reduceMotion, word.fr, word.example]);

  const frontStyle = reduceMotion
    ? { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
    : {
        transform: [
          { perspective: 1000 },
          { rotateY: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
          { scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.03, 1] }) },
        ],
      };
  const backStyle = reduceMotion
    ? { opacity: progress }
    : {
        transform: [
          { perspective: 1000 },
          { rotateY: progress.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) },
          { scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.03, 1] }) },
        ],
      };

  const isLong = word.en.length > LONG_WORD_LENGTH;
  const metaRow = (
    <View style={styles.metaRow}>
      <CategoryChip word={word} />
      <Badge label={word.level} variant="level" />
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {/* Recto (RG-30) */}
      <Animated.View
        style={[styles.faceWrap, frontStyle]}
        pointerEvents={flipped ? 'none' : 'auto'}
        importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={flipped}
      >
        <View style={styles.lip} />
        <View style={styles.face}>
          <Pressable
            onPress={onFlip}
            disabled={flipped}
            accessibilityRole="button"
            accessibilityLabel={`Mot anglais : ${word.en}. Niveau ${word.level}, ${word.categoryLabel}. Carte ${index} sur ${total}`}
            accessibilityHint="Touchez deux fois pour voir la traduction"
            testID="flashcard-front"
            style={styles.pressArea}
          >
            {metaRow}
            <Text style={[styles.caption, styles.counter]}>
              Carte {index} / {total}
            </Text>
            <View style={styles.center} onLayout={(e) => setCenter(e.nativeEvent.layout)}>
              <Text
                style={isLong ? styles.wordLong : styles.word}
                maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}
                accessibilityLanguage="en-US"
              >
                {word.en}
              </Text>
              {onSpeak ? <View style={styles.speakSlot} onLayout={(e) => setSlot(e.nativeEvent.layout)} /> : null}
            </View>
            <View style={styles.hintRow}>
              <Text style={styles.hint} accessible={false}>
                👆
              </Text>
              <Text style={styles.hint}>Touche la carte pour la retourner</Text>
            </View>
          </Pressable>
          {onSpeak && !flipped ? (
            <View
              style={[
                styles.speakFront,
                center && slot ? { left: center.x + slot.x, top: center.y + slot.y } : styles.speakFallback,
              ]}
            >
              <SpeakButton label="Écouter le mot" size={SPEAK_SIZE} onPress={() => onSpeak(word.en)} />
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* Verso (RG-31) */}
      <Animated.View
        style={[styles.faceWrap, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
        importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!flipped}
        testID="flashcard-back"
      >
        <View style={styles.lip} />
        <View style={[styles.face, styles.backFace]}>
          {metaRow}
          <View style={styles.backBody}>
            <View style={styles.backWordRow}>
              <Text style={styles.backWord} accessibilityLanguage="en-US">
                {word.en}
              </Text>
              {onSpeak ? <SpeakButton label="Écouter le mot" onPress={() => onSpeak(word.en)} /> : null}
            </View>
            <View style={styles.separator} />
            <View style={styles.block}>
              <Text style={styles.overline}>Traduction</Text>
              <Text style={styles.translation}>{flipped ? word.fr : ''}</Text>
            </View>
            <View style={[styles.block, styles.exampleBlock]}>
              <Text style={styles.overline}>Exemple</Text>
              <View style={styles.example}>
                <Text style={styles.exampleText} accessibilityLanguage="en-US">
                  {flipped ? (
                    <>
                      “<Text>{word.example}</Text>”
                    </>
                  ) : (
                    ''
                  )}
                </Text>
                {onSpeak ? (
                  <SpeakButton label="Écouter la phrase d'exemple" white onPress={() => onSpeak(word.example)} />
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minHeight: 360, width: '100%' },
  faceWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backfaceVisibility: 'hidden' },
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CARD_DEPTH,
    bottom: 0,
    borderRadius: radius.xl,
    backgroundColor: colors.border,
  },
  face: {
    flex: 1,
    marginBottom: CARD_DEPTH,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pressArea: { flex: 1, padding: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, flexShrink: 1 },
  catText: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  counter: { marginTop: 10 },
  caption: { ...typography.caption, color: colors.inkMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  word: { ...typography.wordXL, color: colors.ink, textAlign: 'center' },
  wordLong: { fontSize: 32, lineHeight: 38, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  speakSlot: { width: SPEAK_SIZE, height: SPEAK_SIZE + 4 },
  speakFront: { position: 'absolute' },
  speakFallback: { alignSelf: 'center', top: '55%' },
  speak: { alignItems: 'center', justifyContent: 'center', borderBottomColor: colors.speakLip },
  hintRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  hint: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: colors.inkMuted },
  backFace: { padding: 18, gap: 14 },
  backBody: { flex: 1, justifyContent: 'center', gap: 14 },
  backWordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  backWord: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: colors.ink, flexShrink: 1 },
  separator: { borderTopWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  block: { gap: 4 },
  exampleBlock: { gap: 8, marginTop: 6 },
  overline: { ...typography.overline, color: colors.inkMuted },
  translation: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: colors.primary },
  example: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exampleText: { fontSize: 16, lineHeight: 23, fontWeight: '600', fontStyle: 'italic', color: colors.ink, flex: 1 },
});
