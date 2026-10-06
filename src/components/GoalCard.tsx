/**
 * Card « Objectif du jour » partagée par l'Accueil et le résultat de session (RG-44, design §4.1 / §4.4).
 */
import { StyleSheet, Text, View } from 'react-native';

import { plural } from '@/domain/format';
import type { GoalStatus } from '@/domain/streak';
import { colors, typography } from '@/theme/tokens';

import { Card } from './Card';
import { ProgressBar } from './ProgressBar';

export function goalMessage(status: GoalStatus): string {
  return status.reached
    ? 'Objectif atteint ✅'
    : `Encore ${status.remaining} ${plural(status.remaining, 'carte')} pour atteindre ton objectif`;
}

export function GoalCard({ status, title }: { status: GoalStatus; title?: string }) {
  return (
    <Card title={title}>
      <View style={styles.row} accessible accessibilityLabel={`Objectif du jour : ${status.done} sur ${status.goal}`}>
        <Text style={styles.label}>Objectif du jour</Text>
        <Text style={styles.value} testID="goal-value">
          {status.done} / {status.goal}
        </Text>
      </View>
      <ProgressBar
        value={status.ratio}
        color={status.reached ? 'success' : 'primary'}
        accessibilityLabel="Progression de l'objectif du jour"
      />
      <Text style={styles.message}>{goalMessage(status)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...typography.body, color: colors.text },
  value: { ...typography.bodyStrong, color: colors.text },
  message: { ...typography.caption, color: colors.textMuted },
});
