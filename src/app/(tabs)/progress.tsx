/**
 * Progrès (design §4.5) — US-04 (vus, maîtrisés, %, par catégorie), US-05 (séries).
 * Les filtres n'ont aucun effet ici (AC-04.5).
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen, ScreenTitle, SectionTitle } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { CATEGORY_LABELS } from '@/domain/types';
import { useCategoryStats, useGlobalStats, useStreaks } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { colors, MAX_FONT_MULTIPLIER, spacing, typography } from '@/theme/tokens';

export default function ProgressScreen() {
  const now = useNow();
  const stats = useGlobalStats();
  const categories = useCategoryStats();
  const streaks = useStreaks(now);

  return (
    <Screen edges={['top']}>
      <ScreenTitle title="Progrès" />

      <Card accessibilityLabel={`Progression globale : ${stats.percent} pour cent`}>
        <Text style={styles.percent} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} testID="progress-percent">
          {stats.percent} %
        </Text>
        <Text style={styles.caption}>Progression globale</Text>
        <ProgressBar
          value={stats.mastered / stats.total}
          color="success"
          height={12}
          accessibilityLabel="Progression globale"
        />
      </Card>

      <View style={styles.grid}>
        <View style={styles.row}>
          <StatTile emoji="👀" value={stats.seen} label="Mots vus" sublabel={`sur ${stats.total}`} testID="progress-seen" />
          <StatTile
            emoji="✅"
            value={stats.mastered}
            label="Mots maîtrisés"
            sublabel={`sur ${stats.total}`}
            tone="success"
            testID="progress-mastered"
          />
        </View>
        <View style={styles.row}>
          <StatTile emoji="🔥" value={streaks.current} label="Série actuelle" tone="warning" />
          <StatTile emoji="🏆" value={streaks.best} label="Meilleure série" />
        </View>
      </View>

      {stats.seen === 0 ? (
        <Card>
          <EmptyState
            emoji="🌱"
            title="Ta progression apparaîtra ici"
            message="Fais ta première session pour commencer."
            actionLabel="Commencer une session"
            actionVariant="primary"
            onAction={() => router.push('/session')}
            compact
          />
        </Card>
      ) : null}

      <View style={styles.list}>
        <SectionTitle>Par catégorie</SectionTitle>
        {categories.map((c) => {
          const label = CATEGORY_LABELS[c.category];
          return (
            <Card
              key={c.category}
              accessibilityLabel={`${label} : ${c.seen} mots vus sur ${c.total}, ${c.mastered} maîtrisés, ${c.percent} pour cent`}
              style={styles.categoryCard}
            >
              <View style={styles.categoryHeader}>
                <Text style={styles.strong}>{label}</Text>
                <Text style={styles.strong}>{c.percent} %</Text>
              </View>
              <ProgressBar value={c.mastered / c.total} color="success" accessibilityLabel={`Maîtrise ${label}`} />
              <Text style={styles.caption}>
                {c.seen}/{c.total} vus · {c.mastered}/{c.total} maîtrisés
              </Text>
            </Card>
          );
        })}
      </View>

      <Text style={styles.caption}>Un mot est maîtrisé quand tu l'as su plusieurs fois de suite.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  percent: { ...typography.stat, color: colors.primary },
  caption: { ...typography.caption, color: colors.textMuted },
  grid: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  list: { gap: spacing.md },
  categoryCard: { gap: spacing.sm },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  strong: { ...typography.bodyStrong, color: colors.text, flexShrink: 1 },
});
