/**
 * Résultat de session v2 (design §5.4) — RG-35, AC-03.8.
 * Confettis si ≥ 50 % de « Je savais » ; compteurs animés 0 → valeur.
 */
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Confetti } from '@/components/Confetti';
import { CountUp } from '@/components/CountUp';
import { GoalRing, goalMessage } from '@/components/GoalCard';
import { sessionResultSubtitle } from '@/components/messages';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { Vobi } from '@/components/Vobi';
import { dayUnit } from '@/domain/format';
import { useGoalStatus, useStreaks } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { useResultsStore } from '@/store/useResultsStore';
import { colors, spacing, typography } from '@/theme/tokens';

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

export default function SessionResultScreen() {
  const summary = useResultsStore((s) => s.lastSession);
  const now = useNow();
  const goal = useGoalStatus(now);
  const streaks = useStreaks(now);

  // Retour natif = « Accueil » (design §1.2).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!summary) return <Redirect href="/" />;

  const celebrate = summary.total > 0 && summary.known / summary.total >= 0.5;

  return (
    <Screen
      background={celebrate ? <Confetti /> : null}
      contentStyle={styles.content}
      footer={
        <>
          <Button label="Nouvelle session" onPress={() => router.replace('/session')} testID="result-new-session" />
          <Button label="Accueil" variant="secondary" onPress={goHome} testID="result-home" />
        </>
      }
    >
      <Vobi mood={celebrate ? 'correct' : 'hello'} size={150} animateIn />
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header">
          Session terminée !
        </Text>
        <Text style={styles.subtitle}>{sessionResultSubtitle(summary.known, summary.total)}</Text>
      </View>

      <View style={styles.row}>
        <StatTile
          tone="success"
          value={
            <>
              <CountUp value={summary.known} /> / {summary.total}
            </>
          }
          a11yValue={`${summary.known} sur ${summary.total}`}
          label="mots que tu savais"
          valueTestID="result-score"
        />
        <StatTile
          tone={summary.newlyMastered > 0 ? 'sun' : 'default'}
          emoji={summary.newlyMastered > 0 ? '⭐' : undefined}
          value={summary.newlyMastered}
          label="nouveaux mots maîtrisés"
          valueTestID="result-mastered"
        />
      </View>

      <Card style={styles.full} contentStyle={styles.goalFace}>
        <GoalRing status={goal} countUp />
        <View style={styles.goalText}>
          <Text style={[styles.h3, goal.reached && styles.reached]}>
            {goal.reached ? 'Objectif du jour atteint 🎯' : goalMessage(goal)}
          </Text>
          <Text style={styles.caption}>
            Série : 🔥 {streaks.current} {dayUnit(streaks.current)} de suite
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  titles: { alignItems: 'center', gap: spacing.xs },
  title: { ...typography.h1, color: colors.ink, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.inkMuted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', alignItems: 'stretch', marginTop: 4 },
  full: { alignSelf: 'stretch' },
  goalFace: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  goalText: { flex: 1, gap: 2 },
  h3: { ...typography.h3, color: colors.ink },
  reached: { color: colors.successInk },
  caption: { ...typography.caption, color: colors.inkMuted },
});
