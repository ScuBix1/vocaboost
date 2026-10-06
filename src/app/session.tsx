/**
 * Session de cartes (design v2 §5.3) — US-01, US-02, US-03, US-09.
 * Tirage : RG-20 → RG-26 ; déroulé : RG-30 → RG-35 ; TTS : RG-80 → RG-82.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Flashcard } from '@/components/Flashcard';
import { ProgressBar } from '@/components/ProgressBar';
import { Vobi } from '@/components/Vobi';
import { WORDS } from '@/data/words';
import { toLocalDateKey } from '@/domain/dates';
import { filterPool } from '@/domain/filters';
import { getWordProgress } from '@/domain/leitner';
import { becameMastered, composeSession } from '@/domain/session';
import { cardsOnDay } from '@/domain/streak';
import { CATEGORY_LABELS, type Word } from '@/domain/types';
import { useActionGuard } from '@/hooks/useActionGuard';
import { useClientReady } from '@/hooks/useClientReady';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { speakEnglish, stopSpeaking } from '@/services/speech';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useResultsStore } from '@/store/useResultsStore';
import { colors, MIN_TOUCH, spacing, typography } from '@/theme/tokens';

/** Au-delà, les deux boutons d'évaluation passent l'un sous l'autre (design §8.3). */
const LARGE_FONT_SCALE = 1.3;

/** Tire une nouvelle session à partir de l'état courant du store (RG-21). */
function drawSession(): Word[] {
  const { filters, progress } = useLearnerStore.getState();
  return composeSession(filterPool(WORDS, filters), progress, Math.random);
}

function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Écran neutre tant que le tirage ne peut pas se faire (V2-07 / RT-03). */
export default function SessionScreen() {
  const ready = useClientReady();
  return ready ? <SessionRun /> : <View style={styles.safe} testID="session-pending" />;
}

function SessionRun() {
  const [cards, setCards] = useState<Word[]>(drawSession);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const evaluateCard = useLearnerStore((s) => s.evaluateCard);
  const resetFilters = useLearnerStore((s) => s.resetFilters);
  const setLastSession = useResultsStore((s) => s.setLastSession);
  const reduceMotion = useReduceMotion();
  const { fontScale } = useWindowDimensions();
  // Verrou commun à « Retourner », à la carte et aux boutons d'évaluation (BUG-01, BUG-02).
  const guard = useActionGuard();
  const { lock } = guard;

  // Compteurs de la session en cours, et carte déjà évaluée (anti-double-tap, design §5.4).
  const known = useRef(0);
  const newlyMastered = useRef(0);
  const handledIndex = useRef(-1);
  const cardsTodayBefore = useRef(cardsOnDay(useLearnerStore.getState().cardsPerDay, toLocalDateKey(new Date())));
  const slide = useRef(new Animated.Value(1)).current;

  const total = cards.length;
  const word = cards[index];

  const quit = useCallback(() => {
    // RG-34 : les cartes évaluées sont déjà enregistrées ; la carte en cours est ignorée.
    stopSpeaking();
    goHome();
  }, []);

  // Retour Android = « Quitter » (design §4.3).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      quit();
      return true;
    });
    return () => sub.remove();
  }, [quit]);

  // Changer de carte arrête la lecture (RG-81) ; annonce de la carte (design §5.3).
  useEffect(() => {
    stopSpeaking();
    if (total > 0) AccessibilityInfo.announceForAccessibility(`Carte ${index + 1} sur ${total}`);
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    return stopSpeaking;
  }, [index, total, slide]);

  // Révélation non réentrante : une seule fois par carte, jamais pendant le verrou.
  const flip = () => {
    if (flipped || guard.isLocked()) return;
    setFlipped(true);
    // Les boutons d'évaluation apparaissent désactivés pendant le verrou (BUG-01).
    lock();
  };

  const evaluate = (knew: boolean) => {
    if (!flipped || !word || guard.isLocked() || handledIndex.current === index) return;
    handledIndex.current = index;

    const boxBefore = getWordProgress(useLearnerStore.getState().progress, word.id).box;
    evaluateCard(word.id, knew); // RG-14 : persistance immédiate.
    const boxAfter = getWordProgress(useLearnerStore.getState().progress, word.id).box;
    if (knew) known.current += 1;
    if (becameMastered(boxBefore, boxAfter)) newlyMastered.current += 1;

    if (index + 1 >= total) {
      setLastSession({
        known: known.current,
        total,
        newlyMastered: newlyMastered.current,
        cardsTodayBefore: cardsTodayBefore.current,
      });
      router.replace('/session-result');
      return;
    }
    // Carte suivante : un tap résiduel (double tap sur « Je savais ») ne doit pas la retourner (BUG-02).
    lock();
    setFlipped(false);
    setIndex(index + 1);
  };

  const resetAndRedraw = () => {
    resetFilters();
    setCards(drawSession());
    setIndex(0);
    setFlipped(false);
    handledIndex.current = -1;
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={quit}
        accessibilityRole="button"
        accessibilityLabel="Quitter"
        testID="session-quit"
        style={styles.quit}
      >
        <Text style={styles.quitText}>✕ Quitter</Text>
      </Pressable>
      {total > 0 ? (
        <>
          <View style={styles.headerBar}>
            <ProgressBar
              value={index / total}
              height={16}
              accessibilityLabel={`Progression de la session : carte ${index + 1} sur ${total}`}
            />
          </View>
          <Text style={styles.counter} accessible={false} testID="session-counter">
            {index + 1}/{total}
          </Text>
        </>
      ) : null}
    </View>
  );

  if (!word) {
    // Pool vide (RG-22, AC-01.3).
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.emptyWrap}>
          <EmptyState
            mood="search"
            title="Aucun mot ne correspond à tes filtres"
            message="Élargis ta sélection de catégories ou de niveaux."
            actionLabel="Réinitialiser les filtres"
            actionVariant="primary"
            onAction={resetAndRedraw}
          />
        </View>
      </SafeAreaView>
    );
  }

  const slideStyle = reduceMotion
    ? { opacity: slide }
    : { opacity: slide, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] };

  return (
    <SafeAreaView style={styles.safe}>
      {header}
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
          // RG-32 : boutons d'évaluation uniquement après retournement.
          <>
            <Text style={styles.hint}>Sois honnête : l'app adapte tes révisions 😉</Text>
            <View style={[styles.evalRow, fontScale > LARGE_FONT_SCALE && styles.evalColumn]}>
              <Button
                label="✓ Je savais"
                accessibilityLabel="Je savais"
                variant="success"
                onPress={() => evaluate(true)}
                disabled={guard.locked}
                style={fontScale > LARGE_FONT_SCALE ? undefined : styles.evalButton}
                testID="session-known"
              />
              <Button
                label="✗ Je ne savais pas"
                accessibilityLabel="Je ne savais pas"
                variant="softDanger"
                onPress={() => evaluate(false)}
                disabled={guard.locked}
                style={fontScale > LARGE_FONT_SCALE ? undefined : styles.evalButton}
                testID="session-unknown"
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.hintRow}>
              <Vobi mood="hello" size={36} />
              <Text style={[styles.hint, styles.hintInk]}>Tu le connais ? Pense à la traduction…</Text>
            </View>
            <Button label="Retourner" onPress={flip} disabled={guard.locked} testID="session-flip" />
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
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 6 },
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
  // « Je savais » est lu en premier mais affiché à droite (design §5.3).
  evalRow: { flexDirection: 'row-reverse', gap: spacing.md },
  evalColumn: { flexDirection: 'column' },
  // Largeur selon le libellé (V2-03) : « ✗ Je ne savais pas » (contractuel) tient sur une ligne
  // jusqu'à 360 pt, la place restante étant partagée à parts égales.
  evalButton: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
});
