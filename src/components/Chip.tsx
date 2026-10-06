/**
 * Chip de filtre 3D (design §4.9).
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, depth, radius, spacing, typography } from '@/theme/tokens';

import { PressableRaised } from './Raised';

export interface ChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** Dernier élément sélectionné du groupe : le tap n'a pas d'effet (RG-50). */
  locked?: boolean;
  /** Emoji décoratif avant le libellé (catégories). */
  emoji?: string;
  testID?: string;
}

export function Chip({ label, selected, onToggle, locked = false, emoji, testID }: ChipProps) {
  const color = selected ? colors.primaryInk : colors.ink;
  return (
    <PressableRaised
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      accessibilityHint={locked ? 'Garde au moins un élément sélectionné.' : undefined}
      testID={testID}
      lipColor={selected ? colors.primary : colors.border}
      depth={depth.sm}
      radius={radius.pill}
      faceStyle={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      <View style={styles.row}>
        {selected ? <Text style={[styles.label, { color }]}>✓</Text> : null}
        {emoji ? (
          <Text style={styles.label} accessible={false}>
            {emoji}
          </Text>
        ) : null}
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </PressableRaised>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: spacing.lg, borderWidth: 2, justifyContent: 'center' },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { ...typography.bodyStrong },
});
