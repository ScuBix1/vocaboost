/**
 * Contrôle segmenté (design §3.9), utilisé pour l'objectif quotidien.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme/tokens';

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
      {options.map((option, i) => {
        const active = option === value;
        return (
          <Pressable
            key={String(option)}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityLabel={formatA11yLabel ? formatA11yLabel(option) : formatLabel(option)}
            accessibilityState={{ checked: active, selected: active }}
            testID={`segment-${String(option)}`}
            style={[styles.segment, i > 0 && styles.separator, active && styles.active]}
          >
            <Text style={[styles.label, { color: active ? colors.textOnColor : colors.text }]}>
              {formatLabel(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  separator: { borderLeftWidth: 1.5, borderLeftColor: colors.borderStrong },
  active: { backgroundColor: colors.primary },
  label: { ...typography.bodyStrong },
});
