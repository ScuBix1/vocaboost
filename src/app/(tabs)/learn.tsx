/**
 * Apprendre (design §4.2) — point d'entrée des sessions et résumé des filtres (US-01, US-06).
 */
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen, ScreenTitle } from '@/components/Screen';
import { describeCategories, describeLevels } from '@/domain/filters';
import { SESSION_SIZE } from '@/domain/session';
import { useSessionPool } from '@/hooks/useLearnerSelectors';
import { useLearnerStore } from '@/store/useLearnerStore';
import { colors, typography } from '@/theme/tokens';

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
      <ScreenTitle title="Apprendre" />

      {poolSize === 0 ? (
        <Card>
          <EmptyState
            emoji="🔎"
            title="Aucun mot ne correspond à tes filtres"
            actionLabel="Réinitialiser les filtres"
            onAction={resetFilters}
            compact
          />
        </Card>
      ) : (
        <Card title="Ta prochaine session">
          <Text style={styles.body}>
            10 cartes tirées au hasard, en priorité les mots que tu ne maîtrises pas encore.
          </Text>
          <Text style={styles.caption}>Mots disponibles avec tes filtres : {poolSize}</Text>
          {poolSize < SESSION_SIZE ? (
            <Text style={styles.caption}>Ta session contiendra {poolSize} cartes.</Text>
          ) : null}
        </Card>
      )}

      <Card title="Filtres">
        <Text style={styles.body}>Catégories : {describeCategories(filters)}</Text>
        <Text style={styles.body}>Niveaux : {describeLevels(filters)}</Text>
        <Button label="Modifier les filtres" variant="secondary" size="md" onPress={() => router.push('/settings')} />
      </Card>

      <Card title="Comment ça marche">
        <Text style={styles.body}>1. Lis le mot anglais et cherche sa traduction.</Text>
        <Text style={styles.body}>2. Retourne la carte pour vérifier.</Text>
        <Text style={styles.body}>3. Dis honnêtement si tu savais : l'app adapte tes révisions.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted },
});
