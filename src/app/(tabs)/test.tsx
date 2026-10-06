/**
 * Test (onglet) v2 (design §5.6) — US-07 (état du test), US-08 (historique).
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ResultBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen, ScreenTitle, SectionTitle } from '@/components/Screen';
import { Vobi } from '@/components/Vobi';
import { formatDateFr, formatWeekLabel, getWeekId } from '@/domain/dates';
import { plural } from '@/domain/format';
import { sortHistory, TEST_MIN_SEEN } from '@/domain/weeklyTest';
import { useTestStatus } from '@/hooks/useLearnerSelectors';
import { useNow } from '@/hooks/useNow';
import { useLearnerStore } from '@/store/useLearnerStore';
import { colors, spacing, typography } from '@/theme/tokens';

export default function TestScreen() {
  const now = useNow();
  const status = useTestStatus(now);
  const history = useLearnerStore((s) => s.testHistory);
  const sorted = useMemo(() => sortHistory(history), [history]);

  return (
    <Screen edges={['top']}>
      <ScreenTitle title="Test de la semaine" subtitle={formatWeekLabel(getWeekId(now))} />

      {status.kind === 'locked' ? (
        <Card tone="sun" testID="test-locked">
          <Text style={[styles.body, { color: colors.sunInk }]}>
            🔒 Étudie encore {status.remaining} {plural(status.remaining, 'mot')} pour débloquer le test de la semaine
          </Text>
          <ProgressBar
            value={status.seen / TEST_MIN_SEEN}
            color="sun"
            track="white"
            accessibilityLabel="Mots vus pour débloquer le test"
          />
          <Button label="Commencer une session" onPress={() => router.push('/session')} />
        </Card>
      ) : status.kind === 'available' ? (
        <Card testID="test-available">
          <View style={styles.availableHead}>
            <Vobi mood="hello" size={72} />
            <Text style={[styles.h3, styles.flex]}>✨ Ton test est prêt</Text>
          </View>
          <Text style={styles.body}>
            {status.questionCount} questions à choix multiples sur les mots que tu as étudiés. Pas de limite de temps.
          </Text>
          <Text style={styles.caption}>Réussi à partir de 70 %. Un seul essai par semaine.</Text>
          <Button label="Commencer le test" onPress={() => router.push('/test-run')} testID="test-start" />
        </Card>
      ) : (
        <Card testID="test-done">
          <Text style={styles.h3}>
            ✅ Test de la semaine terminé : {status.record.correct}/{status.record.total}
          </Text>
          <ResultBadge passed={status.record.passed} />
          <Text style={styles.caption}>Prochain test disponible lundi</Text>
        </Card>
      )}

      <SectionTitle>Historique</SectionTitle>
      {sorted.length === 0 ? (
        <Card>
          <EmptyState mood="empty" title="Aucun test pour l'instant" message="Ton premier score s'affichera ici." compact />
        </Card>
      ) : (
        <View style={styles.list}>
          {sorted.map((r) => (
            <Card
              key={`${r.weekId}-${r.finishedAt}`}
              contentStyle={styles.row}
              accessibilityLabel={`${formatWeekLabel(r.weekId)}, terminé le ${formatDateFr(r.finishedAt)} : ${r.correct} sur ${r.total}, ${r.percent} pour cent, ${r.passed ? 'Réussi' : 'À retravailler'}`}
            >
              <View style={[styles.medal, { backgroundColor: r.passed ? colors.successSoft : colors.dangerSoft }]}>
                <Text style={styles.medalEmoji}>{r.passed ? '🏅' : '📖'}</Text>
              </View>
              <View style={styles.rowLeft}>
                <Text style={styles.strong}>{formatWeekLabel(r.weekId)}</Text>
                <Text style={styles.caption}>{formatDateFr(r.finishedAt)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.strong}>
                  {r.correct}/{r.total} · {r.percent} %
                </Text>
                <ResultBadge passed={r.passed} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  availableHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  h3: { ...typography.h3, color: colors.ink },
  body: { ...typography.body, color: colors.ink },
  caption: { ...typography.caption, color: colors.inkMuted },
  strong: { ...typography.bodyStrong, color: colors.ink },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 14 },
  medal: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  medalEmoji: { fontSize: 20 },
  rowLeft: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: spacing.xs },
});
