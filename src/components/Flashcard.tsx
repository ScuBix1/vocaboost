/**
 * Carte de vocabulaire retournable v2 (design §4.3, RG-30 → RG-32, RG-80).
 * Carte épaisse (lèvre 6), chip de catégorie colorée, badge niveau.
 * Retournement à sens unique ; remonter la carte via `key` pour repartir du recto.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutRectangle,
} from 'react-native';

import type { CategoryId } from '@/domain/types';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { categoryColors, colors, depth, MAX_FONT_MULTIPLIER, motion, radius, typography } from '@/theme/tokens';

import { Badge } from './Badge';

export interface FlashcardWord {
  en: string;
  fr: string;
  example: string;
  /** Traduction française de l'exemple (RG-155) ; absente ou vide → bloc non rendu (RG-164). */
  exampleFr?: string;
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
/** Sous cette hauteur d'écran, la traduction du mot passe de 34/40 à 28/34 (design v1.2 §v1.2.1). */
const SMALL_SCREEN_HEIGHT = 640;
/** Bandes du dégradé « il reste du contenu » (blanc → transparent, sans librairie). */
const FADE_BANDS = [0.9, 0.65, 0.35, 0.1] as const;
/** Guillemets français avec espaces insécables internes (ajoutés à l'affichage, RG-156). */
export const frenchQuote = (text: string) => `«\u00A0${text}\u00A0»`;
/** Langue du texte français : lecteurs d'écran iOS (`accessibilityLanguage`) et attribut `lang` sur le web. */
export const FR_TEXT_PROPS = { accessibilityLanguage: 'fr-FR', lang: 'fr-FR' } as object;
/** Annonce au retournement (RG-163). */
export function backAnnouncement(word: Pick<FlashcardWord, 'fr' | 'example' | 'exampleFr'>): string {
  const base = `Traduction\u00A0: ${word.fr}. Exemple\u00A0: ${word.example}.`;
  return word.exampleFr ? `${base} Traduction de l’exemple\u00A0: ${word.exampleFr}.` : base;
}

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
  // Verso défilant (RG-164) : le dégradé n'apparaît que tant qu'il reste du contenu sous la zone visible.
  const { height: windowHeight } = useWindowDimensions();
  const smallScreen = windowHeight < SMALL_SCREEN_HEIGHT;
  const scrollRef = useRef<ScrollView>(null);
  const [scrollMetrics, setScrollMetrics] = useState({ viewport: 0, content: 0, offset: 0 });
  const hasMore = scrollMetrics.content - scrollMetrics.viewport - scrollMetrics.offset > 2;
  const exampleFr = word.exampleFr?.trim() ? word.exampleFr : '';
  const onScrollLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const viewport = e.nativeEvent.layout.height;
    setScrollMetrics((m) => (m.viewport === viewport ? m : { ...m, viewport }));
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration: reduceMotion ? motion.fade : motion.flip,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (flipped) {
      AccessibilityInfo.announceForAccessibility(backAnnouncement({ fr: word.fr, example: word.example, exampleFr }));
      scrollRef.current?.flashScrollIndicators?.();
    }
  }, [flipped, progress, reduceMotion, word.fr, word.example, exampleFr]);

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
          <View style={styles.backWordRow}>
            <Text style={styles.backWord} accessibilityLanguage="en-US">
              {word.en}
            </Text>
            {onSpeak ? <SpeakButton label="Écouter le mot" onPress={() => onSpeak(word.en)} /> : null}
          </View>
          <View style={styles.separator} />
          <View style={styles.scrollArea}>
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              scrollEventThrottle={16}
              onLayout={onScrollLayout}
              onContentSizeChange={(_w, content) => setScrollMetrics((m) => ({ ...m, content }))}
              onScroll={(e) => {
                const offset = e.nativeEvent.contentOffset.y;
                setScrollMetrics((m) => (m.offset === offset ? m : { ...m, offset }));
              }}
              testID="flashcard-back-scroll"
            >
              <View style={styles.block}>
                <Text style={styles.overline}>Traduction</Text>
                <Text style={smallScreen ? styles.translationSmall : styles.translation}>{flipped ? word.fr : ''}</Text>
              </View>
              <View style={[styles.block, styles.exampleBlock]}>
                <Text style={styles.overline}>Exemple</Text>
                <View style={styles.example}>
                  <View style={styles.exampleRow}>
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
                  {/* RG-160 → 164 : traduction toujours visible, texte non interactif (aucun 🔊, RG-162). */}
                  {flipped && exampleFr ? (
                    <View style={styles.frBlock} testID="flashcard-example-fr">
                      <View style={styles.frLabelRow}>
                        <Text style={styles.frFlag} accessible={false}>
                          🇫🇷
                        </Text>
                        <Text style={styles.overline}>En français</Text>
                      </View>
                      <Text
                        style={styles.frText}
                        {...FR_TEXT_PROPS}
                        accessibilityLabel={`Traduction de l’exemple\u00A0: ${exampleFr}`}
                      >
                        {frenchQuote(exampleFr)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </ScrollView>
            {hasMore ? (
              <View style={styles.fade} pointerEvents="none" testID="flashcard-scroll-hint">
                {[...FADE_BANDS].reverse().map((alpha) => (
                  <View key={alpha} style={[styles.fadeBand, { backgroundColor: `rgba(255,255,255,${alpha})` }]} />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minHeight: 280, width: '100%' },
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
  backFace: { padding: 18, gap: 12 },
  backWordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  backWord: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: colors.ink, flexShrink: 1 },
  separator: { borderTopWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  scrollArea: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, gap: 12, paddingBottom: 6 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 30 },
  fadeBand: { flex: 1 },
  block: { gap: 4 },
  exampleBlock: { gap: 8, marginTop: 6 },
  overline: { ...typography.overline, color: colors.inkMuted },
  translation: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: colors.primary },
  translationSmall: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: colors.primary },
  example: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 14,
  },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  frBlock: { marginTop: 12, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.speakLip, paddingTop: 10, gap: 4 },
  frLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  frFlag: { fontSize: 14, lineHeight: 16 },
  frText: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: colors.primaryInk },
  exampleText: { fontSize: 16, lineHeight: 23, fontWeight: '600', fontStyle: 'italic', color: colors.ink, flex: 1 },
});
