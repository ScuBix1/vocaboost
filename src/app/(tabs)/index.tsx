/**
 * Accueil (design §4.1) — US-01 (session en 1 tap), AC-04.1, AC-06.5, statut du test (RG-72).
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GoalCard } from '@/components/GoalCard';
import { Screen, ScreenTitle } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { formatFilterSummary } from '@/domain/filters';
import { dayUnit, plural } from '@/domain/format';
import { useGlobalStats, useGoalStatus, useStreaks, useTestStatus } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { useLearnerStore } from '@/store/useLearnerStore';
import { colors, MIN_TOUCH, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const now = useNow();
  const stats = useGlobalStats();
  const streaks = useStreaks(now);
  const goal = useGoalStatus(now);
  const testStatus = useTestStatus(now);
  const filters = useLearnerStore((s) => s.filters);
  const filterSummary = formatFilterSummary(filters);

  const settingsButton = (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Réglages"
      testID="home-settings"
      style={styles.settings}
    >
      <Text style={styles.settingsIcon} accessible={false}>
        ⚙️
      </Text>
    </Pressable>
  );

  return (
    <Screen edges={['top']}>
      <ScreenTitle
        title="Bonjour 👋"
        subtitle={stats.seen === 0 ? 'Prêt pour tes 10 premiers mots ?' : undefined}
        right={settingsButton}
      />

      <GoalCard status={goal} title="Aujourd'hui" />

      <View style={styles.grid}>
        <StatTile
          emoji="🔥"
          value={streaks.current}
          label="Série actuelle"
          sublabel={dayUnit(streaks.current)}
          tone="warning"
          testID="home-streak"
        />
        <StatTile
          value={`${stats.percent} %`}
          label="Mots maîtrisés"
          sublabel={`${stats.mastered} / ${stats.total}`}
          onPress={() => router.navigate('/progress')}
          testID="home-mastered"
        />
      </View>

      <View style={styles.cta}>
        <Button
          label="Commencer une session"
          onPress={() => router.push('/session')}
          testID="home-start-session"
        />
        {filterSummary ? (
          <View style={styles.filterRow}>
            <Text style={styles.filterText} testID="home-filter-summary">
              {filterSummary}
            </Text>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="link"
              accessibilityLabel="Modifier les filtres"
              hitSlop={12}
            >
              <Text style={styles.link}>Modifier</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Card
        title="Test de la semaine"
        onPress={() => router.navigate('/test')}
        accessibilityLabel="Test de la semaine, ouvrir l'onglet Test"
      >
        {testStatus.kind === 'locked' ? (
          <Text style={styles.body}>
            🔒 Étudie encore {testStatus.remaining} {plural(testStatus.remaining, 'mot')} pour débloquer le test de la
            semaine
          </Text>
        ) : testStatus.kind === 'available' ? (
          <>
            <Text style={styles.body}>✨ Ton test de la semaine est disponible</Text>
            <Button label="Passer le test" variant="secondary" size="md" onPress={() => router.push('/test-run')} />
          </>
        ) : (
          <>
            <Text style={styles.body}>
              ✅ Test de la semaine terminé : {testStatus.record.correct}/{testStatus.record.total}
            </Text>
            <Text style={styles.caption}>Prochain test disponible lundi</Text>
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settings: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 24 },
  grid: { flexDirection: 'row', gap: spacing.md },
  cta: { gap: spacing.sm },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  filterText: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
  link: { ...typography.caption, color: colors.primary, textDecorationLine: 'underline' },
  body: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted },
});
