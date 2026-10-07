/**
 * Fin de passe (design v1.1 §v1.1.6) — RG-113, RG-114, AC-12.5, AC-13.1, AC-13.2.
 * Sans confettis ni note : un bilan et la suite. Aucune écriture dans le store persisté (RG-120).
 */
import { Redirect, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoNote } from '@/components/InfoNote';
import { REVIEW_NOTE, REVIEW_NOTE_HARD } from '@/components/messages';
import { Screen } from '@/components/Screen';
import { Vobi } from '@/components/Vobi';
import { hardWords, isPassDone, type ReviewPass } from '@/domain/dailyWords';
import { useActionGuard, useArrivalGuard } from '@/hooks/useActionGuard';
import { useReviewStore } from '@/store/useReviewStore';
import { categoryColors, colors, MAX_FONT_MULTIPLIER, spacing, typography } from '@/theme/tokens';

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

export default function ReviewResultScreen() {
  const current = useReviewStore((s) => s.pass);
  const justArrived = useArrivalGuard();
  const guard = useActionGuard();
  // On garde la passe terminée affichée : « Refaire … » remplace le store avant que l'écran
  // ne soit démonté, sans le faire rediriger vers la liste.
  const finished = useRef<ReviewPass | null>(null);
  if (current && isPassDone(current) && current.queue.length > 0) finished.current = current;
  const pass = finished.current;
  const total = pass?.queue.length ?? 0;
  const retained = pass?.retainedIds.length ?? 0;
  const done = pass !== null;

  useEffect(() => {
    if (done) AccessibilityInfo.announceForAccessibility(`Révision terminée : ${retained} sur ${total} retenus.`);
  }, [done, retained, total]);

  if (!pass) return <Redirect href="/review" />;

  const hard = hardWords(pass);
  const allRetained = hard.length === 0;

  // « Refaire … » remplace l'écran de fin par la nouvelle passe ; un seul déclenchement (verrou).
  const redo = (kind: 'hard' | 'all') => {
    if (justArrived() || guard.isLocked()) return;
    guard.lock();
    if (kind === 'hard') useReviewStore.getState().startHard();
    else useReviewStore.getState().restartAll();
    router.replace('/review-run');
  };

  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <>
          {allRetained ? null : (
            <Button label="Refaire les mots difficiles" size="md" onPress={() => redo('hard')} testID="review-redo-hard" />
          )}
          <Button
            label="Refaire tous les mots"
            size="md"
            variant={allRetained ? 'primary' : 'secondary'}
            onPress={() => redo('all')}
            testID="review-redo-all"
          />
          <Button
            label="Accueil"
            size="md"
            variant="secondary"
            onPress={() => !justArrived() && goHome()}
            testID="review-home"
          />
        </>
      }
    >
      <Vobi mood={allRetained ? 'correct' : 'hello'} size={120} animateIn />
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header" testID="review-result-title">
          {allRetained ? 'Bravo, tout est retenu' : 'Révision terminée !'}
        </Text>
        <Text style={styles.subtitle}>
          {allRetained ? 'Tes mots du jour sont bien installés.' : 'Voici les mots à relire encore.'}
        </Text>
      </View>

      {/* Un seul Text : la chaîne « x / N retenus » reste cherchable (design §v1.1.6). */}
      <Text
        style={styles.score}
        maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}
        accessibilityLabel={`${retained} sur ${total} retenus`}
        testID="review-score"
      >
        {retained} / {total} <Text style={styles.scoreUnit}>retenus</Text>
      </Text>

      <InfoNote testID="review-note">{allRetained ? REVIEW_NOTE : `${REVIEW_NOTE} ${REVIEW_NOTE_HARD}`}</InfoNote>

      {allRetained ? null : (
        <Card style={styles.full} contentStyle={styles.hardFace} testID="review-hard-list">
          <Text style={styles.h3} accessibilityRole="header">{`À revoir encore (${hard.length})`}</Text>
          {hard.map((w, i) => {
            const c = categoryColors[w.category];
            return (
              <View
                key={w.id}
                style={[styles.item, i < hard.length - 1 && styles.separator]}
                accessible
                accessibilityLabel={`${w.en}, ${w.fr}`}
              >
                <View style={[styles.dot, { backgroundColor: c.soft }]}>
                  <Text style={styles.dotEmoji}>{c.emoji}</Text>
                </View>
                <Text style={styles.body}>
                  <Text style={styles.en} accessibilityLanguage="en-US">
                    {w.en}
                  </Text>{' '}
                  — {w.fr}
                </Text>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 10, paddingTop: spacing.md },
  titles: { alignItems: 'center', gap: 2 },
  title: { ...typography.h1, color: colors.ink, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.inkMuted, textAlign: 'center' },
  score: { ...typography.score, fontSize: 56, lineHeight: 62, color: colors.ink, textAlign: 'center' },
  scoreUnit: { ...typography.h3, color: colors.ink },
  full: { alignSelf: 'stretch' },
  hardFace: { paddingVertical: 12, gap: 0 },
  h3: { ...typography.h3, color: colors.ink, marginBottom: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  separator: { borderBottomWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  dot: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dotEmoji: { fontSize: 15 },
  body: { ...typography.body, color: colors.ink, flexShrink: 1 },
  en: { fontWeight: '900' },
});
