/**
 * Accueil v2 (design §5.1) — US-01 (session en 1 tap), AC-04.1, AC-06.5 / RG-53, statut du test (RG-72).
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResultBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GoalRing } from '@/components/GoalCard';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Raised } from '@/components/Raised';
import { Screen } from '@/components/Screen';
import { StreakChip, WeekStrip } from '@/components/Streak';
import { homeMessage } from '@/components/messages';
import { Vobi } from '@/components/Vobi';
import { formatFilterSummary } from '@/domain/filters';
import { dayUnit, plural } from '@/domain/format';
import { TEST_MIN_SEEN } from '@/domain/weeklyTest';
import { useGlobalStats, useGoalStatus, useStreaks, useTestStatus, useWeekDays } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { useLearnerStore } from '@/store/useLearnerStore';
import { colors, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const now = useNow();
  const stats = useGlobalStats();
  const streaks = useStreaks(now);
  const goal = useGoalStatus(now);
  const week = useWeekDays(now);
  const testStatus = useTestStatus(now);
  const filters = useLearnerStore((s) => s.filters);
  const filterSummary = formatFilterSummary(filters);
  const streakOff = streaks.current === 0;

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.wordmark} accessibilityRole="header" accessibilityLabel="VocaBoost">
          voca<Text style={styles.wordmarkBoost}>boost</Text>
        </Text>
        <View style={styles.headerRight}>
          <StreakChip streak={streaks.current} testID="home-streak-chip" />
          <IconButton emoji="⚙️" accessibilityLabel="Réglages" onPress={() => router.push('/settings')} testID="home-settings" />
        </View>
      </View>

      {/* Hero Grape : Vobi + bulle + action principale (AC-01.1) */}
      <Raised lipColor={colors.primaryLip} depth={5} radius={26} faceStyle={styles.hero}>
        <View style={styles.blob} pointerEvents="none" />
        <View style={styles.heroRow}>
          <Vobi mood={goal.reached ? 'streak' : 'hello'} size={94} sparkColor={colors.textOnColor} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText} testID="home-vobi-message">
              {homeMessage(stats.seen, goal, streaks.current)}
            </Text>
          </View>
        </View>
        <Button label="Commencer une session" variant="sun" onPress={() => router.push('/session')} testID="home-start-session" />
        {filterSummary ? (
          <View style={styles.filterRow}>
            <Text style={styles.filterText} testID="home-filter-summary">
              🎛️ {filterSummary}
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
      </Raised>

      <View style={styles.tiles}>
        <Card style={styles.tile} contentStyle={styles.tileFace} testID="home-goal">
          <Text style={styles.overline}>Objectif du jour</Text>
          <View style={styles.tileRow}>
            <GoalRing status={goal} />
            {goal.reached ? (
              <Text style={[styles.tileText, styles.reached]}>Objectif atteint ✅</Text>
            ) : (
              <Text style={styles.tileText}>
                Plus que{' '}
                <Text style={styles.bold}>
                  {goal.remaining} {plural(goal.remaining, 'carte')}
                </Text>
                {'\u00A0!'}
              </Text>
            )}
          </View>
        </Card>
        <Card
          style={styles.tile}
          contentStyle={[styles.tileFace, styles.streakFace]}
          accessibilityLabel={`Série actuelle : ${streaks.current} ${dayUnit(streaks.current)} de suite`}
          testID="home-streak"
        >
          <Text style={styles.overline}>Série</Text>
          <View style={styles.streakRow}>
            <Text style={[styles.streakFlame, streakOff && styles.flameOff]}>🔥</Text>
            <Text style={[styles.streakValue, streakOff && styles.streakValueOff]}>{streaks.current}</Text>
            <Text style={styles.streakUnit}>
              {dayUnit(streaks.current)}
              {streakOff ? '' : '\nde suite'}
            </Text>
          </View>
          {streakOff ? <Text style={styles.streakHint}>Lance ta série aujourd'hui</Text> : null}
          <WeekStrip days={week} testID="home-week" />
        </Card>
      </View>

      <Card
        onPress={() => router.navigate('/progress')}
        accessibilityLabel={`Mots maîtrisés : ${stats.percent} %, ${stats.mastered} sur ${stats.total}. Ouvrir Progrès`}
        contentStyle={styles.masteredFace}
        testID="home-mastered"
      >
        <View style={styles.targetBox}>
          <Text style={styles.targetEmoji}>🎯</Text>
        </View>
        <View style={styles.masteredBody}>
          <View style={styles.masteredHead}>
            <Text style={styles.h3}>{stats.percent} % maîtrisés</Text>
            <Text style={styles.caption}>
              {stats.mastered} / {stats.total}
            </Text>
          </View>
          <ProgressBar value={stats.mastered / stats.total} color="success" accessibilityLabel="Mots maîtrisés" />
        </View>
        <Text style={styles.chevron}>›</Text>
      </Card>

      {testStatus.kind === 'locked' ? (
        <Card
          onPress={() => router.navigate('/test')}
          accessibilityLabel="Test de la semaine, ouvrir l'onglet Test"
          contentStyle={styles.testFace}
        >
          <Text style={styles.h3}>
            🔒 Étudie encore {testStatus.remaining} {plural(testStatus.remaining, 'mot')} pour débloquer le test de la
            semaine
          </Text>
          <ProgressBar value={testStatus.seen / TEST_MIN_SEEN} color="sun" accessibilityLabel="Mots vus pour débloquer le test" />
        </Card>
      ) : testStatus.kind === 'available' ? (
        <Card
          tone="sun"
          onPress={() => router.navigate('/test')}
          accessibilityLabel="Test de la semaine disponible, ouvrir l'onglet Test"
          contentStyle={styles.testFace}
        >
          <View style={styles.testRow}>
            <Text style={styles.sparkle}>✨</Text>
            <View style={styles.flex}>
              <Text style={styles.h3}>Ton test de la semaine est disponible</Text>
              <Text style={[styles.caption, { color: colors.sunInk }]}>
                {testStatus.questionCount} questions · pas de chrono · 1 essai
              </Text>
            </View>
          </View>
          <Button
            label="Passer le test"
            variant="secondary"
            size="sm"
            textColor={colors.ink}
            onPress={() => router.push('/test-run')}
          />
        </Card>
      ) : (
        <Card
          onPress={() => router.navigate('/test')}
          accessibilityLabel="Test de la semaine terminé, ouvrir l'onglet Test"
          contentStyle={styles.testFace}
        >
          <Text style={styles.h3}>
            ✅ Test de la semaine terminé : {testStatus.record.correct}/{testStatus.record.total}
          </Text>
          <ResultBadge passed={testStatus.record.passed} />
          <Text style={styles.caption}>Prochain test disponible lundi</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.5, color: colors.ink },
  wordmarkBoost: { color: colors.primary },
  hero: { backgroundColor: colors.primary, padding: 16, paddingBottom: 18, gap: 10, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -50,
    top: -60,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 22,
  },
  bubbleText: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.ink },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  filterText: { ...typography.caption, color: colors.textOnColor, flexShrink: 1 },
  link: { ...typography.caption, fontWeight: '900', color: colors.textOnColor, textDecorationLine: 'underline' },
  tiles: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  tile: { flex: 1 },
  tileFace: { padding: 14, gap: 10 },
  streakFace: { gap: 8 },
  overline: { ...typography.overline, color: colors.inkMuted },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileText: { ...typography.caption, lineHeight: 17, color: colors.ink, flex: 1 },
  bold: { fontWeight: '900' },
  reached: { color: colors.successInk, fontWeight: '900' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakFlame: { fontSize: 28, lineHeight: 36 },
  flameOff: { opacity: 0.4 },
  streakValue: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: colors.flameInk },
  streakValueOff: { color: colors.inkMuted },
  streakUnit: { ...typography.caption, lineHeight: 15, color: colors.ink, flexShrink: 1 },
  streakHint: { ...typography.caption, fontSize: 12, lineHeight: 15, color: colors.inkMuted },
  masteredFace: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  targetBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetEmoji: { fontSize: 22 },
  masteredBody: { flex: 1, gap: 6 },
  masteredHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  h3: { ...typography.h3, color: colors.ink },
  caption: { ...typography.caption, color: colors.inkMuted },
  chevron: { fontSize: 22, fontWeight: '900', color: colors.inkMuted },
  testFace: { padding: 14, gap: 10 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sparkle: { fontSize: 26 },
});
