/**
 * Apprendre v2 (design §5.2) — point d'entrée des sessions et résumé des filtres (US-01, US-06).
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen, ScreenTitle } from '@/components/Screen';
import { Vobi } from '@/components/Vobi';
import { describeCategories, describeLevels } from '@/domain/filters';
import { SESSION_SIZE } from '@/domain/session';
import { CATEGORY_IDS, CATEGORY_LABELS } from '@/domain/types';
import { useSessionPool } from '@/hooks/useLearnerSelectors';
import { useLearnerStore } from '@/store/useLearnerStore';
import { categoryColors, colors, spacing, typography } from '@/theme/tokens';

const STEPS = [
  'Lis le mot anglais et cherche sa traduction.',
  'Retourne la carte pour vérifier.',
  "Dis honnêtement si tu savais : l'app adapte tes révisions.",
];

export default function LearnScreen() {
  const pool = useSessionPool();
  const filters = useLearnerStore((s) => s.filters);
  const resetFilters = useLearnerStore((s) => s.resetFilters);
  const poolSize = pool.length;

  return (
    <Screen
      edges={['top']}
      footer={
        <Button
          label="Commencer une session"
          onPress={() => router.push('/session')}
          disabled={poolSize === 0}
          testID="learn-start-session"
        />
      }
    >
      <ScreenTitle title="Apprendre" right={<Vobi mood="hello" size={56} />} />

      {poolSize === 0 ? (
        <Card>
          <EmptyState
            mood="search"
            title="Aucun mot ne correspond à tes filtres"
            actionLabel="Réinitialiser les filtres"
            onAction={resetFilters}
            compact
          />
        </Card>
      ) : (
        <Card tone="primary" title="Ta prochaine session">
          <Text style={styles.onPrimary}>
            10 cartes tirées au hasard, en priorité les mots que tu ne maîtrises pas encore.
          </Text>
          <Text style={styles.onPrimaryCaption}>Mots disponibles avec tes filtres : {poolSize}</Text>
          {poolSize < SESSION_SIZE ? (
            <Text style={styles.onPrimaryCaption}>Ta session contiendra {poolSize} cartes.</Text>
          ) : null}
        </Card>
      )}

      <Card title="Filtres">
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Catégories : ${describeCategories(filters)}`}
        >
          {CATEGORY_IDS.map((id) => {
            const on = filters.categories.includes(id);
            const c = categoryColors[id];
            return (
              <View
                key={id}
                style={[styles.dot, { backgroundColor: c.soft }, !on && styles.dotOff]}
                accessibilityLabel={CATEGORY_LABELS[id]}
              >
                <Text style={styles.dotEmoji}>{c.emoji}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.body}>Catégories : {describeCategories(filters)}</Text>
        <Text style={styles.body}>Niveaux : {describeLevels(filters)}</Text>
        <Button label="Modifier les filtres" variant="secondary" size="md" onPress={() => router.push('/settings')} />
      </Card>

      <Card title="Comment ça marche">
        {STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={[styles.body, styles.flex]}>{step}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { ...typography.body, color: colors.ink },
  onPrimary: { ...typography.body, color: colors.textOnColor },
  onPrimaryCaption: { ...typography.caption, color: colors.textOnColor },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dot: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dotOff: { opacity: 0.35 },
  dotEmoji: { fontSize: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { ...typography.h3, color: colors.primaryInk },
});
