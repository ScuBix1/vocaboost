/**
 * Objectif du jour (RG-44, design §4.5) : anneau « x / objectif » partagé par l'Accueil
 * et le résultat de session.
 */
import { StyleSheet, Text } from 'react-native';

import { plural } from '@/domain/format';
import type { GoalStatus } from '@/domain/streak';
import { colors } from '@/theme/tokens';

import { useCountUp } from './CountUp';
import { ProgressRing } from './ProgressRing';

export function goalMessage(status: GoalStatus): string {
  return status.reached
    ? 'Objectif atteint ✅'
    : `Encore ${status.remaining} ${plural(status.remaining, 'carte')} pour atteindre ton objectif`;
}

export interface GoalRingProps {
  status: GoalStatus;
  size?: number;
  /** Compteur animé 0 → x (résultat de session, design §6). */
  countUp?: boolean;
}

export function GoalRing({ status, size = 64, countUp = false }: GoalRingProps) {
  const animated = useCountUp(countUp ? status.done : 0);
  const done = countUp ? animated : status.done;
  return (
    <ProgressRing
      value={status.ratio}
      size={size}
      thickness={9}
      accessibilityLabel={`Objectif du jour : ${status.done} sur ${status.goal}`}
      testID="goal-ring"
    >
      {/* Texte « x / objectif » sur deux lignes ; contenu textuel « x / objectif ». */}
      <Text style={styles.value} maxFontSizeMultiplier={1.3} testID="goal-value">
        {done}
        {'\n'}
        <Text style={styles.unit}>/ {status.goal}</Text>
      </Text>
    </ProgressRing>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 18, lineHeight: 19, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  unit: { fontSize: 11, lineHeight: 13, fontWeight: '800', color: colors.inkMuted },
});
