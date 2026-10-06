/**
 * Progrès v2 (design §5.5) — US-04 (vus, maîtrisés, %, par catégorie), US-05 (séries).
 * Les filtres n'ont aucun effet ici (AC-04.5).
 */
import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card } from '@/components/Card';
import { CategoryCard } from '@/components/CategoryCard';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Raised } from '@/components/Raised';
import { Screen, ScreenTitle, SectionTitle } from '@/components/Screen';
import { WeekStrip } from '@/components/Streak';
import { dayUnit } from '@/domain/format';
import { CATEGORY_LABELS } from '@/domain/types';
import { useCategoryStats, useGlobalStats, useStreaks, useWeekDays } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { colors, MAX_FONT_MULTIPLIER, spacing, typography } from '@/theme/tokens';

/** Au-delà, la grille des catégories passe sur 1 colonne (design §4.8). */
const LARGE_FONT_SCALE = 1.3;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export default function ProgressScreen() {
  const now = useNow();
  const stats = useGlobalStats();
  const categories = useCategoryStats();
  const streaks = useStreaks(now);
  const week = useWeekDays(now);
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > LARGE_FONT_SCALE ? 1 : 2;

  return (
    <Screen edges={['top']} contentStyle={styles.content}>
      <ScreenTitle title="Progrès" />

      <Raised
        lipColor={colors.primaryLip}
        depth={5}
        radius={24}
        faceStyle={styles.hero}
        accessible
        accessibilityLabel={`Progression globale : ${stats.percent} pour cent de la banque maîtrisée. ${stats.seen} mots vus sur ${stats.total}, ${stats.mastered} mots maîtrisés sur ${stats.total}`}
      >
        <View style={styles.heroHead}>
          <View>
            <Text style={styles.heroPercent} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} testID="progress-percent">
              {stats.percent} %
            </Text>
            <Text style={styles.heroCaption}>de la banque maîtrisée</Text>
          </View>
          <Text style={styles.rocket}>🚀</Text>
        </View>
        <ProgressBar value={stats.mastered / stats.total} color="sun" track="onPrimary" height={16} accessibilityLabel="Progression globale" />
        <View style={styles.heroTiles}>
          <View style={styles.heroTile} testID="progress-seen">
            <Text style={styles.heroTileValue}>
              👀 {stats.seen} <Text style={styles.heroTileTotal}>/ {stats.total}</Text>
            </Text>
            <Text style={styles.heroTileLabel}>Mots vus</Text>
          </View>
          <View style={styles.heroTile} testID="progress-mastered">
            <Text style={styles.heroTileValue}>
              ✅ {stats.mastered} <Text style={styles.heroTileTotal}>/ {stats.total}</Text>
            </Text>
            <Text style={styles.heroTileLabel}>Mots maîtrisés</Text>
          </View>
        </View>
      </Raised>

      <Card
        contentStyle={styles.streakFace}
        accessibilityLabel={`Série actuelle : ${streaks.current} ${dayUnit(streaks.current)}. Meilleure série : ${streaks.best} ${dayUnit(streaks.best)}`}
        testID="progress-streaks"
      >
        <View style={styles.streakHead}>
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={[styles.h3, { color: colors.flameInk }]}>
                {streaks.current} {dayUnit(streaks.current)}
              </Text>
              <Text style={styles.caption}>Série actuelle</Text>
            </View>
          </View>
          <View style={styles.streakItem}>
            <Text style={styles.streakEmoji}>🏆</Text>
            <View>
              <Text style={styles.h3}>
                {streaks.best} {dayUnit(streaks.best)}
              </Text>
              <Text style={styles.caption}>Meilleure série</Text>
            </View>
          </View>
        </View>
        <WeekStrip days={week} variant="large" testID="progress-week" />
      </Card>

      {stats.seen === 0 ? (
        <Card>
          <EmptyState
            mood="empty"
            title="Ta progression apparaîtra ici"
            message="Fais ta première session pour commencer."
            actionLabel="Commencer une session"
            actionVariant="primary"
            onAction={() => router.push('/session')}
            compact
          />
        </Card>
      ) : null}

      <SectionTitle>Par catégorie</SectionTitle>
      <View style={styles.grid}>
        {chunk(categories, columns).map((row) => (
          <View key={row[0].category} style={styles.gridRow}>
            {row.map((c) => (
              <CategoryCard
                key={c.category}
                category={c.category}
                label={CATEGORY_LABELS[c.category]}
                seen={c.seen}
                mastered={c.mastered}
                total={c.total}
                percent={c.percent}
              />
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.caption}>Un mot est maîtrisé quand tu l'as su plusieurs fois de suite.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  hero: { backgroundColor: colors.primary, padding: spacing.lg, gap: 12 },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroPercent: { fontSize: 44, lineHeight: 48, fontWeight: '900', color: colors.textOnColor },
  heroCaption: { fontSize: 14, lineHeight: 18, fontWeight: '800', color: colors.textOnColor },
  rocket: { fontSize: 34 },
  heroTiles: { flexDirection: 'row', gap: 10 },
  heroTile: { flex: 1, backgroundColor: colors.onPrimaryTile, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  heroTileValue: { fontSize: 18, lineHeight: 23, fontWeight: '900', color: colors.textOnColor },
  heroTileTotal: { fontSize: 13 },
  heroTileLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', color: colors.textOnColor },
  streakFace: { padding: 14, gap: 12 },
  streakHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  streakItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakEmoji: { fontSize: 24 },
  h3: { ...typography.h3, color: colors.ink },
  caption: { ...typography.caption, color: colors.inkMuted },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
});
