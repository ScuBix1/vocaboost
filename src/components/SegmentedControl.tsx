/**
 * Contrôle segmenté 3D (design §4.13), utilisé pour l'objectif quotidien.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, depth, radius, typography } from '@/theme/tokens';

import { Raised } from './Raised';

export interface SegmentedControlProps<T extends string | number> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  formatLabel?: (value: T) => string;
  formatA11yLabel?: (value: T) => string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  formatLabel = String,
  formatA11yLabel,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={String(option)}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityLabel={formatA11yLabel ? formatA11yLabel(option) : formatLabel(option)}
            accessibilityState={{ checked: active, selected: active }}
            testID={`segment-${String(option)}`}
            style={styles.segment}
          >
            {active ? (
              <Raised lipColor={colors.primaryLip} depth={depth.sm} radius={12} style={styles.fill} faceStyle={styles.activeFace}>
                <Text style={[styles.label, { color: colors.textOnColor }]}>{formatLabel(option)}</Text>
              </Raised>
            ) : (
              <View style={[styles.fill, styles.idleFace]}>
                <Text style={[styles.label, { color: colors.ink }]}>{formatLabel(option)}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 48 },
  fill: { flex: 1 },
  activeFace: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', minHeight: 41 },
  idleFace: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  label: { ...typography.h3 },
});
