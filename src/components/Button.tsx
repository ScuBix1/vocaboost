/**
 * Bouton du design system (design §3.1).
 */
import { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  tone?: 'default' | 'success';
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftEmoji?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Délai pendant lequel un second tap est ignoré (anti-double-tap, design §3.1 et §5.4). */
const DOUBLE_TAP_GUARD_MS = 400;

export function Button({
  label,
  onPress,
  variant = 'primary',
  tone = 'default',
  size = 'lg',
  disabled = false,
  loading = false,
  leftEmoji,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const lastPress = useRef(0);
  const inactive = disabled || loading;
  const isSuccess = variant === 'primary' && tone === 'success';

  const handlePress = () => {
    const now = Date.now();
    if (inactive || now - lastPress.current < DOUBLE_TAP_GUARD_MS) return;
    lastPress.current = now;
    onPress();
  };

  const textColor = inactive
    ? colors.disabledText
    : variant === 'secondary'
      ? colors.primary
      : colors.textOnColor;

  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        inactive
          ? styles.disabled
          : variant === 'primary'
            ? [
                isSuccess ? styles.success : styles.primary,
                pressed && (isSuccess ? styles.successPressed : styles.primaryPressed),
              ]
            : variant === 'secondary'
              ? [styles.secondary, pressed && styles.secondaryPressed]
              : [styles.danger, pressed && styles.dangerPressed],
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {leftEmoji ? (
            <Text style={[styles.label, { color: textColor }]} accessible={false}>
              {leftEmoji}
            </Text>
          ) : null}
          <Text style={[size === 'lg' ? styles.labelLg : styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  lg: { minHeight: 52 },
  md: { minHeight: 44 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.bodyStrong, textAlign: 'center' },
  labelLg: { ...typography.h3, textAlign: 'center' },
  primary: { backgroundColor: colors.primary, ...shadows.md },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  success: { backgroundColor: colors.success, ...shadows.md },
  successPressed: { backgroundColor: colors.successPressed },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong },
  secondaryPressed: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: colors.danger },
  dangerPressed: { opacity: 0.85 },
  disabled: { backgroundColor: colors.disabledBg },
});
