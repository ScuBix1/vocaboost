/**
 * Série (design §4.6) : StreakChip (en-tête Accueil) et WeekStrip (pastilles de la semaine ISO).
 * Pur affichage des données existantes (RG-45 → RG-48).
 */
import { StyleSheet, Text, View } from 'react-native';

import type { WeekDay } from '@/domain/streak';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function StreakChip({ streak, testID }: { streak: number; testID?: string }) {
  const off = streak === 0;
  return (
    <View
      style={[styles.chip, off ? styles.chipOff : styles.chipOn]}
      accessible
      accessibilityLabel={`Série actuelle : ${streak} ${streak <= 1 ? 'jour' : 'jours'}`}
      testID={testID}
    >
      <Text style={[styles.chipFlame, off && styles.flameOff]} accessible={false}>
        🔥
      </Text>
      <Text style={[styles.chipValue, { color: off ? colors.inkMuted : colors.flameInk }]}>{streak}</Text>
    </View>
  );
}

export interface WeekStripProps {
  days: WeekDay[];
  /** `compact` : pastilles 16 (Accueil) ; `large` : cercles 28 + initiales (Progrès). */
  variant?: 'compact' | 'large';
  testID?: string;
}

export function WeekStrip({ days, variant = 'compact', testID }: WeekStripProps) {
  const count = days.filter((d) => d.active).length;
  const label = `Cette semaine : ${count} ${count <= 1 ? 'jour actif' : 'jours actifs'}`;

  if (variant === 'compact') {
    return (
      <View style={styles.compactRow} accessible accessibilityLabel={label} testID={testID}>
        {days.map((d) => (
          <View
            key={d.key}
            testID={d.active ? 'week-day-active' : 'week-day-inactive'}
            style={[
              styles.dot,
              { backgroundColor: d.active ? colors.flame : colors.surfaceAlt },
              d.isToday && styles.dotToday,
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.largeRow} accessible accessibilityLabel={label} testID={testID}>
      {days.map((d) => (
        <View key={d.key} style={styles.day}>
          <View style={[styles.todayRing, d.isToday && styles.todayRingOn]}>
            <View
              testID={d.active ? 'week-day-active' : 'week-day-inactive'}
              style={[styles.circle, d.active ? styles.circleOn : styles.circleOff]}
            >
              {d.active ? <Text style={styles.circleFlame}>🔥</Text> : null}
            </View>
          </View>
          <Text style={[styles.initial, d.isToday && styles.initialToday]}>{d.initial}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 40,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipOn: { backgroundColor: colors.flameSoft, borderColor: colors.flameBorder },
  chipOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  chipFlame: { fontSize: 16 },
  flameOff: { opacity: 0.6 },
  chipValue: { ...typography.h3 },
  compactRow: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotToday: { borderWidth: 2, borderColor: colors.flameInk },
  largeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 36, alignItems: 'center', gap: spacing.xs },
  todayRing: { padding: 2, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  todayRingOn: { borderColor: colors.flame, borderStyle: 'dashed' },
  circle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  circleOn: { backgroundColor: colors.flameSoft, borderWidth: 2, borderColor: colors.flame },
  circleOff: { backgroundColor: colors.surfaceAlt },
  circleFlame: { fontSize: 13, lineHeight: 16 },
  initial: { fontSize: 11, lineHeight: 14, fontWeight: '900', color: colors.inkMuted },
  initialToday: { color: colors.ink },
});
