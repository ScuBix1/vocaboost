/**
 * Note d'information statique (design v1.1 §v1.1.3) : fond Grape pâle, jamais masquée,
 * ni toast ni alerte (non annoncée comme telle).
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

export interface InfoNoteProps {
  emoji?: string;
  children: string;
  testID?: string;
}

export function InfoNote({ emoji = '💡', children, testID }: InfoNoteProps) {
  return (
    <View style={styles.note} accessible accessibilityRole="text" accessibilityLabel={children} testID={testID}>
      <Text style={styles.emoji} accessible={false}>
        {emoji}
      </Text>
      <Text style={styles.text} accessible={false}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  emoji: { fontSize: 18, lineHeight: 24 },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '800', color: colors.primaryInk },
});
