/**
 * Card 3D (design §4.2) : face blanche, bordure 2 et lèvre 4 ; tons `sun`, `success`, `primary`.
 * Pressable : la face s'enfonce de 2 pt.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, depth as depthTokens, radius as radii, spacing, typography } from '@/theme/tokens';

import { PressableRaised, Raised } from './Raised';

export type CardTone = 'default' | 'sun' | 'success' | 'primary';

export interface CardProps {
  children?: ReactNode;
  title?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Style de la face (padding, gap, alignement). */
  contentStyle?: StyleProp<ViewStyle>;
  tone?: CardTone;
  radius?: number;
  depth?: number;
  testID?: string;
}

const TONES: Record<CardTone, { face: string; border: string; lip: string; title: string }> = {
  default: { face: colors.surface, border: colors.border, lip: colors.border, title: colors.ink },
  sun: { face: colors.sunSoft, border: colors.sunBorder, lip: colors.sunBorder, title: colors.ink },
  success: { face: colors.successSoft, border: colors.successSoft, lip: '#BFEBD8', title: colors.successInk },
  primary: { face: colors.primary, border: colors.primary, lip: colors.primaryLip, title: colors.textOnColor },
};

export function Card({
  children,
  title,
  onPress,
  accessibilityLabel,
  style,
  contentStyle,
  tone = 'default',
  radius = radii.lg,
  depth = depthTokens.md,
  testID,
}: CardProps) {
  const t = TONES[tone];
  const faceStyle = [styles.face, { backgroundColor: t.face, borderColor: t.border }, contentStyle];
  const header = title ? (
    <View style={styles.header}>
      <Text style={[styles.title, { color: t.title }]} accessibilityRole="header">
        {title}
      </Text>
      {onPress ? (
        <Text style={styles.chevron} accessible={false}>
          ›
        </Text>
      ) : null}
    </View>
  ) : null;

  if (onPress) {
    return (
      <PressableRaised
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        lipColor={t.lip}
        depth={depth}
        travel={2}
        radius={radius}
        style={style}
        faceStyle={faceStyle}
      >
        {header}
        {children}
      </PressableRaised>
    );
  }

  return (
    <Raised
      style={style}
      accessible={accessibilityLabel ? true : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      lipColor={t.lip}
      depth={depth}
      radius={radius}
      faceStyle={faceStyle}
    >
      {header}
      {children}
    </Raised>
  );
}

const styles = StyleSheet.create({
  face: { borderWidth: 2, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h3, flex: 1 },
  chevron: { ...typography.h2, color: colors.inkMuted, marginLeft: spacing.sm },
});
