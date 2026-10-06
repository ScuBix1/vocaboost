/**
 * Chip de filtre (design §3.6).
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface ChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** Dernier élément sélectionné du groupe : le tap n'a pas d'effet (RG-50). */
  locked?: boolean;
  testID?: string;
}

export function Chip({ label, selected, onToggle, locked = false, testID }: ChipProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      accessibilityHint={locked ? 'Garde au moins un élément sélectionné.' : undefined}
      testID={testID}
      style={({ pressed }) => [styles.chip, selected ? styles.selected : styles.idle, pressed && styles.pressed]}
    >
      <Text style={[styles.label, { color: selected ? colors.primaryPressed : colors.text }]}>
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pressed: { opacity: 0.85 },
  label: { ...typography.bodyStrong },
});
