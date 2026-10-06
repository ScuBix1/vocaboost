/**
 * Résultat du test v2 (design §5.8) — RG-70, AC-07.8, AC-07.9.
 * Réussi : confettis + Vobi `win` ; à retravailler : Vobi `retry`, ton encourageant.
 */
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { ResultBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Confetti } from '@/components/Confetti';
import { CountUp } from '@/components/CountUp';
import { Screen } from '@/components/Screen';
import { Vobi } from '@/components/Vobi';
import { formatWeekLabel } from '@/domain/dates';
import { useArrivalGuard } from '@/hooks/useActionGuard';
import { useResultsStore } from '@/store/useResultsStore';
import { categoryColors, colors, MAX_FONT_MULTIPLIER, spacing, typography } from '@/theme/tokens';

const VOBI_SIZE = 120;

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

export default function TestResultScreen() {
  const result = useResultsStore((s) => s.lastTest);
  const justArrived = useArrivalGuard();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!result) return <Redirect href="/" />;
  const { record, missed } = result;

  return (
    <Screen
      contentStyle={styles.content}
      footer={<Button label="Retour à l'accueil" onPress={() => !justArrived() && goHome()} testID="test-result-home" />}
    >
      {/* Confettis limités à la zone de Vobi, jamais derrière le titre ni le score (V2-02). */}
      <View style={styles.hero}>
        {record.passed ? <Confetti clearWidth={VOBI_SIZE + 24} /> : null}
        <Vobi mood={record.passed ? 'win' : 'retry'} size={VOBI_SIZE} animateIn style={styles.vobi} />
      </View>
      <View style={styles.titles}>
        <Text style={styles.overline}>{formatWeekLabel(record.weekId)}</Text>
        <Text style={styles.title} accessibilityRole="header">
          Résultat du test
        </Text>
      </View>

      <View
        style={styles.scoreRow}
        accessible
        accessibilityLabel={`Score : ${record.correct} sur ${record.total}, ${record.percent} pour cent, ${record.passed ? 'Réussi' : 'À retravailler'}`}
      >
        <Text style={styles.score} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} testID="test-result-score">
          <CountUp value={record.correct} /> / {record.total}
        </Text>
        <View style={styles.scoreSide}>
          <Text style={[styles.percent, { color: record.passed ? colors.successInk : colors.dangerInk }]}>
            {record.percent} %
          </Text>
          <ResultBadge passed={record.passed} size="lg" />
        </View>
      </View>
      <Text style={styles.caption}>Seuil de réussite : 70 %</Text>

      <Card style={styles.full} contentStyle={styles.missFace}>
        <Text style={styles.h3} accessibilityRole="header">{`Mots à revoir (${missed.length})`}</Text>
        {missed.length === 0 ? (
          <View style={styles.noMiss}>
            <Vobi mood="correct" size={56} />
            <Text style={styles.body}>Aucune erreur, bravo ! 🎉</Text>
          </View>
        ) : (
          missed.map((w, i) => {
            const c = categoryColors[w.category];
            return (
              <View
                key={w.id}
                style={[styles.miss, i < missed.length - 1 && styles.missSeparator]}
                accessible
                accessibilityLabel={`${w.en}, ${w.fr}`}
              >
                <View style={[styles.missDot, { backgroundColor: c.soft }]}>
                  <Text style={styles.missEmoji}>{c.emoji}</Text>
                </View>
                <Text style={styles.body}>
                  <Text style={styles.en} accessibilityLanguage="en-US">
                    {w.en}
                  </Text>{' '}
                  — {w.fr}
                </Text>
              </View>
            );
          })
        )}
      </Card>
      <Text style={styles.caption}>
        {missed.length === 0
          ? 'Continue tes sessions pour garder ce niveau.' // V2-06 : aucun mot à revoir
          : `${record.passed ? '' : 'On y retourne ! '}Ces mots reviendront plus souvent dans tes sessions.`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 10, paddingTop: spacing.md },
  hero: { alignSelf: 'stretch', alignItems: 'center', marginHorizontal: -spacing.lg, paddingVertical: spacing.sm },
  vobi: { zIndex: 1 },
  titles: { alignItems: 'center', gap: 2 },
  overline: { ...typography.overline, color: colors.inkMuted },
  title: { ...typography.h1, color: colors.ink },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  score: { ...typography.score, color: colors.ink },
  scoreSide: { gap: 6, alignItems: 'flex-start' },
  percent: { fontSize: 22, lineHeight: 26, fontWeight: '900' },
  caption: { ...typography.caption, color: colors.inkMuted, textAlign: 'center' },
  full: { alignSelf: 'stretch' },
  missFace: { paddingVertical: 12, gap: 0 },
  h3: { ...typography.h3, color: colors.ink, marginBottom: 2 },
  noMiss: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  miss: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  missSeparator: { borderBottomWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  missDot: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  missEmoji: { fontSize: 15 },
  body: { ...typography.body, color: colors.ink, flexShrink: 1 },
  en: { fontWeight: '900' },
});
