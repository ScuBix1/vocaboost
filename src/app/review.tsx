/**
 * Mots du jour (design v1.1 §v1.1.3, §v1.1.8) — US-11, US-15, US-16.
 * Liste en lecture seule (RG-100 → RG-107) ; lance la passe de révision (RG-110).
 * Recalculée à chaque focus (RG-102) ; aucune écriture dans le store persisté (RG-120).
 */
import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DailyWordRow } from '@/components/DailyWordRow';
import { EmptyState } from '@/components/EmptyState';
import { InfoNote } from '@/components/InfoNote';
import { dailyCountLabel, REVIEW_NOTE } from '@/components/messages';
import { Vobi } from '@/components/Vobi';
import type { DailyWord } from '@/domain/dailyWords';
import { CATEGORY_LABELS } from '@/domain/types';
import { useActionGuard, useArrivalGuard } from '@/hooks/useActionGuard';
import { useClientReady } from '@/hooks/useClientReady';
import { getTodayWords } from '@/domain/dailyWords';
import { WORDS } from '@/data/words';
import { useTodayWords } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { speakEnglish, stopSpeaking } from '@/services/speech';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useReviewStore } from '@/store/useReviewStore';
import { colors, MIN_TOUCH, spacing, typography } from '@/theme/tokens';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Écran neutre tant que le store n'est pas réhydraté (évite l'écart d'hydratation web). */
export default function ReviewScreen() {
  const ready = useClientReady();
  return ready ? <ReviewList /> : <View style={styles.safe} testID="review-pending" />;
}

function BackBar({ justArrived }: { justArrived: () => boolean }) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => !justArrived() && goBack()}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        testID="review-back"
        style={styles.back}
      >
        <Text style={styles.backText}>‹ Retour</Text>
      </Pressable>
    </View>
  );
}

function ReviewList() {
  const now = useNow();
  const items = useTodayWords(now);
  const justArrived = useArrivalGuard();
  const guard = useActionGuard();
  const n = items.length;

  useEffect(() => stopSpeaking, []);

  // V11-05 : quitter la liste vide l'état éphémère de la passe (rien n'est persisté).
  useEffect(() => () => useReviewStore.getState().clear(), []);

  const start = () => {
    if (justArrived() || guard.isLocked() || n === 0) return;
    // V11-02 : l'instantané est pris sur la date courante, pas sur celle de l'affichage (minuit passé).
    const progress = useLearnerStore.getState().progress;
    const fresh = getTodayWords(WORDS, progress, new Date());
    if (fresh.length === 0) return; // minuit passé : plus de mot du jour, la liste se rafraîchit seule
    guard.lock();
    useReviewStore.getState().startDaily(
      fresh.map((i) => i.word),
      progress,
    );
    router.push('/review-run');
  };

  const renderItem = useCallback(
    ({ item }: { item: DailyWord }) => (
      <DailyWordRow
        word={{ ...item.word, categoryLabel: CATEGORY_LABELS[item.word.category] }}
        status={item.status}
        onSpeakWord={() => speakEnglish(item.word.en)}
        onSpeakExample={() => speakEnglish(item.word.example)}
        testID={`review-row-${item.word.id}`}
      />
    ),
    [],
  );

  const title = (
    <View style={styles.titleRow}>
      <View style={styles.titleText}>
        <Text style={styles.title} accessibilityRole="header">
          Mots du jour
        </Text>
        {n > 0 ? (
          <Text style={styles.subtitle} accessibilityLiveRegion="polite" testID="review-count">
            {dailyCountLabel(n)}
          </Text>
        ) : null}
      </View>
      {n > 0 ? <Vobi mood="hello" size={56} /> : null}
    </View>
  );

  if (n === 0) {
    // État vide (RG-133) : aucune passe lançable.
    return (
      <SafeAreaView style={styles.safe} testID="review-empty">
        <BackBar justArrived={justArrived} />
        <View style={styles.pad}>{title}</View>
        <View style={styles.emptyWrap}>
          <EmptyState
            mood="empty"
            title="Aucun mot étudié aujourd'hui"
            message="Fais une session pour retrouver ici les mots du jour."
            actionLabel="Commencer une session"
            actionVariant="primary"
            onAction={() => !justArrived() && router.replace('/session')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <BackBar justArrived={justArrived} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.word.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            {title}
            <InfoNote testID="review-note">{REVIEW_NOTE}</InfoNote>
          </View>
        }
        contentContainerStyle={styles.list}
        style={styles.flex}
        initialNumToRender={8}
        testID="review-list"
      />
      <View style={styles.footer}>
        <View style={styles.fade} pointerEvents="none" />
        <Button label="Réviser ces mots" onPress={start} testID="review-start" />
      </View>
    </SafeAreaView>
  );
}

const Separator = () => <View style={{ height: 12 }} />;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pad: { paddingHorizontal: spacing.lg },
  bar: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, minHeight: 52, justifyContent: 'center' },
  back: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { fontSize: 15, lineHeight: 20, fontWeight: '900', color: colors.primary },
  header: { gap: 14, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleText: { flex: 1 },
  title: { ...typography.h1, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkMuted, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg, backgroundColor: colors.bg },
  fade: { position: 'absolute', left: 0, right: 0, top: -16, height: 16, backgroundColor: 'rgba(247,245,255,0.85)' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
});
