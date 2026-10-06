/**
 * Résultat du test (design §4.8) — RG-70, AC-07.8, AC-07.9.
 */
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { ResultBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen, SectionTitle } from '@/components/Screen';
import { useResultsStore } from '@/store/useResultsStore';
import { colors, MAX_FONT_MULTIPLIER, spacing, typography } from '@/theme/tokens';

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

export default function TestResultScreen() {
  const result = useResultsStore((s) => s.lastTest);

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
    <Screen footer={<Button label="Retour à l'accueil" onPress={goHome} testID="test-result-home" />}>
      <View style={styles.hero}>
        <Text style={styles.emoji} accessible={false}>
          {record.passed ? '🏅' : '📖'}
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Résultat du test
        </Text>
        <View accessible accessibilityLabel={`Score : ${record.correct} sur ${record.total}, ${record.percent} pour cent`}>
          <Text style={styles.score} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} testID="test-result-score">
            {record.correct} / {record.total}
          </Text>
          <Text style={styles.percent}>{record.percent} %</Text>
        </View>
        <ResultBadge passed={record.passed} size="lg" />
        <Text style={styles.caption}>Seuil de réussite : 70 %</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>{`Mots à revoir (${missed.length})`}</SectionTitle>
        <Card>
          {missed.length === 0 ? (
            <Text style={styles.body}>Aucune erreur, bravo ! 🎉</Text>
          ) : (
            missed.map((w) => (
              <Text key={w.id} style={styles.body} accessibilityLabel={`${w.en}, ${w.fr}`}>
                <Text style={styles.en}>{w.en}</Text> — {w.fr}
              </Text>
            ))
          )}
        </Card>
        <Text style={styles.caption}>Les mots ratés reviendront plus souvent dans tes sessions.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 48, lineHeight: 56 },
  title: { ...typography.h1, color: colors.text },
  score: { ...typography.display, color: colors.text, textAlign: 'center' },
  percent: { ...typography.h2, color: colors.text, textAlign: 'center' },
  caption: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  section: { gap: spacing.md },
  body: { ...typography.body, color: colors.text },
  en: { fontWeight: '600' },
});
