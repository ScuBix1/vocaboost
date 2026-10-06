/**
 * Résultat de session (design §4.4) — RG-35, AC-03.8.
 */
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { GoalCard } from '@/components/GoalCard';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { useGoalStatus } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { useResultsStore } from '@/store/useResultsStore';
import { colors, MAX_FONT_MULTIPLIER, spacing, typography } from '@/theme/tokens';

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

export default function SessionResultScreen() {
  const summary = useResultsStore((s) => s.lastSession);
  const now = useNow();
  const goal = useGoalStatus(now);

  // Retour natif = « Accueil » (design §1.2).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!summary) return <Redirect href="/" />;

  const goodRatio = summary.total > 0 ? summary.known / summary.total : 0;
  const reachedDuringSession = summary.cardsTodayBefore < goal.goal && goal.reached;

  return (
    <Screen
      footer={
        <>
          <Button label="Nouvelle session" onPress={() => router.replace('/session')} testID="result-new-session" />
          <Button label="Accueil" variant="secondary" onPress={goHome} testID="result-home" />
        </>
      }
    >
      <View style={styles.hero}>
        <Text style={styles.emoji} accessible={false}>
          {goodRatio >= 0.5 ? '🎉' : '💪'}
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Session terminée
        </Text>
        <View accessible accessibilityLabel={`${summary.known} sur ${summary.total} mots que tu savais`}>
          <Text style={styles.score} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} testID="result-score">
            {summary.known} / {summary.total}
          </Text>
          <Text style={styles.caption}>mots que tu savais</Text>
        </View>
      </View>

      <View style={styles.row}>
        <StatTile
          emoji="⭐"
          value={summary.newlyMastered}
          label="Nouveaux mots maîtrisés"
          tone={summary.newlyMastered > 0 ? 'success' : 'default'}
        />
      </View>

      {reachedDuringSession ? <Text style={styles.reached}>Objectif du jour atteint 🎯</Text> : null}
      <GoalCard status={goal} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 48, lineHeight: 56 },
  title: { ...typography.h1, color: colors.text },
  score: { ...typography.display, color: colors.text, textAlign: 'center' },
  caption: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  row: { flexDirection: 'row' },
  reached: { ...typography.bodyStrong, color: colors.success, textAlign: 'center' },
});
