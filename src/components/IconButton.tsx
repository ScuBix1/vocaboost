/**
 * Bouton icône 44 × 44 (design §4.13), ex. ⚙️ Réglages.
 */
import { StyleSheet, Text } from 'react-native';

import { colors, depth } from '@/theme/tokens';

import { PressableRaised } from './Raised';

export function IconButton({
  emoji,
  onPress,
  accessibilityLabel,
  testID,
}: {
  emoji: string;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  return (
    <PressableRaised
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      lipColor={colors.border}
      depth={depth.sm}
      radius={14}
      faceStyle={styles.face}
    >
      <Text style={styles.emoji} accessible={false}>
        {emoji}
      </Text>
    </PressableRaised>
  );
}

const styles = StyleSheet.create({
  face: {
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
});
