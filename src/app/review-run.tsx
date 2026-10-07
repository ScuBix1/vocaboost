/**
 * Passe de révision (design v1.1 §v1.1.4, §v1.1.5) — US-12, US-13, US-16.
 * Même carte que la session, mais en lecture seule : « Retenu » / « À revoir encore » ne font
 * qu'alimenter l'état éphémère de useReviewStore (RG-112, RG-120) ; rien n'est persisté.
 */
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Flashcard } from '@/components/Flashcard';
import { ProgressBar } from '@/components/ProgressBar';
import { Vobi } from '@/components/Vobi';
import { currentCard } from '@/domain/dailyWords';
import { CATEGORY_LABELS } from '@/domain/types';
import { useActionGuard, useArrivalGuard } from '@/hooks/useActionGuard';
import { useClientReady } from '@/hooks/useClientReady';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { speakEnglish, stopSpeaking } from '@/services/speech';
import { useReviewStore } from '@/store/useReviewStore';
import { colors, MIN_TOUCH, spacing, typography } from '@/theme/tokens';

/** Au-delà, les deux boutons passent l'un sous l'autre (design §v1.1.4). */
const LARGE_FONT_SCALE = 1.3;

function quitToList() {
  stopSpeaking();
  if (router.canGoBack()) router.back();
  else router.replace('/review');
}

export default function ReviewRunScreen() {
  const ready = useClientReady();
  return ready ? <ReviewRun /> : <View style={styles.safe} testID="review-run-pending" />;
}

function ReviewRun() {
  const pass = useReviewStore((s) => s.pass);
  const answer = useReviewStore((s) => s.answer);
  const [flipped, setFlipped] = useState(false);
  const reduceMotion = useReduceMotion();
  const { fontScale } = useWindowDimensions();
  const guard = useActionGuard();
  const justArrived = useArrivalGuard();
  const { lock } = guard;
  const slide = useRef(new Animated.Value(1)).current;
  const handledIndex = useRef(-1);

  const total = pass?.queue.length ?? 0;
  const index = pass?.index ?? 0;
  const word = pass ? currentCard(pass) : undefined;
  const finished = pass !== null && index >= total && total > 0;

  // Retour Android = « Quitter » (retour à la liste, sans confirmation).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      quitToList();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Changer de carte arrête la lecture (RG-116).
  useEffect(() => {
    stopSpeaking();
    if (total > 0 && index < total) AccessibilityInfo.announceForAccessibility(`Carte ${index + 1} sur ${total}`);
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: reduceMotion ? 150 : 200, useNativeDriver: true }).start();
    return stopSpeaking;
  }, [index, total, slide, reduceMotion]);

  // Dernière carte : une seule navigation (le verrou couvre le double tap).
  useEffect(() => {
    if (finished) router.replace('/review-result');
  }, [finished]);

  const flip = useCallback(() => {
    // V11-01 : le 2e tap d'un double tap sur « Réviser ces mots » ne doit pas retourner la carte 1.
    if (flipped || justArrived() || guard.isLocked()) return;
    setFlipped(true);
    lock();
  }, [flipped, guard, lock, justArrived]);

  const choose = (retained: boolean) => {
    if (!flipped || !word || guard.isLocked() || handledIndex.current === index) return;
    handledIndex.current = index;
    lock();
    setFlipped(false);
    answer(retained);
  };

  if (!pass || total === 0) return <Redirect href="/review" />;
  if (!word) return <View style={styles.safe} testID="review-run-finishing" />;

  const slideStyle = reduceMotion
    ? { opacity: slide }
    : { opacity: slide, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] };
  const column = fontScale > LARGE_FONT_SCALE;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={quitToList}
          accessibilityRole="button"
          accessibilityLabel="Quitter"
          testID="review-quit"
          style={styles.quit}
        >
          <Text style={styles.quitText}>✕ Quitter</Text>
        </Pressable>
        <View style={styles.headerBar}>
          <ProgressBar
            // Grandes passes : barre fine mais visible (design §v1.1.4, valeur mini 6 %).
            value={total >= 50 ? Math.max(index / total, 0.06) : index / total}
            height={16}
            accessibilityLabel={`Progression de la révision : carte ${index + 1} sur ${total}`}
          />
        </View>
        <Text
          style={styles.counter}
          accessible
          accessibilityLabel={`Carte ${index + 1} sur ${total}`}
          testID="review-counter"
        >
          {index + 1}/{total}
        </Text>
      </View>
      <Text style={styles.mode} testID="review-mode">
        {pass.mode === 'hard' ? 'RÉVISION · MOTS DIFFICILES' : 'RÉVISION · MOTS DU JOUR'}
      </Text>
      <View style={styles.body}>
        <Animated.View style={[styles.cardWrap, slideStyle]}>
          <Flashcard
            key={word.id}
            word={{ ...word, categoryLabel: CATEGORY_LABELS[word.category], category: word.category }}
            index={index + 1}
            total={total}
            flipped={flipped}
            onFlip={flip}
            onSpeak={speakEnglish}
          />
        </Animated.View>
      </View>
      <View style={styles.actions}>
        {flipped ? (
          // RG-112 : choix uniquement après retournement.
          <>
            <Text style={styles.hint}>Réponds sans pression, personne ne note 😉</Text>
            <View style={[styles.row, column && styles.column]}>
              <Button
                label="✓ Retenu"
                accessibilityLabel="Retenu"
                variant="success"
                onPress={() => choose(true)}
                style={column ? undefined : styles.choice}
                testID="review-retained"
              />
              <Button
                label="↻ À revoir encore"
                accessibilityLabel="À revoir encore"
                variant="secondary"
                onPress={() => choose(false)}
                style={column ? undefined : styles.choice}
                testID="review-hard"
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.hintRow}>
              <Vobi mood="hello" size={36} />
              <Text style={[styles.hint, styles.hintInk]}>Tu te souviens de la traduction ?</Text>
            </View>
            <Button label="Retourner" onPress={flip} testID="review-flip" />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    minHeight: 52,
  },
  quit: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center' },
  quitText: { fontSize: 15, lineHeight: 20, fontWeight: '900', color: colors.primary },
  headerBar: { flex: 1 },
  counter: { fontSize: 15, lineHeight: 20, fontWeight: '900', color: colors.inkMuted, minWidth: 38, textAlign: 'right' },
  mode: { ...typography.overline, color: colors.inkMuted, textAlign: 'center', marginTop: 2 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 6 },
  cardWrap: { flex: 1, width: '100%' },
  actions: {
    minHeight: 120,
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  hint: { ...typography.caption, color: colors.inkMuted, textAlign: 'center' },
  hintInk: { color: colors.ink, flexShrink: 1 },
  // « Retenu » est lu en premier mais affiché à droite, comme « Je savais » (design §v1.1.4).
  row: { flexDirection: 'row-reverse', gap: spacing.md },
  column: { flexDirection: 'column' },
  choice: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
});
