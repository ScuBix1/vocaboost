/**
 * Bouton 3D du design system (design §4.1) : face colorée + lèvre pleine, enfoncement à l'appui.
 */
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, depth, spacing, typography } from '@/theme/tokens';

import { PressableRaised } from './Raised';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'softDanger' | 'sun';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Compatibilité v1 : `tone="success"` = `variant="success"`. */
  tone?: 'default' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftEmoji?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Couleur de texte forcée (ex. secondaire sur carte Sun : `ink`). */
  textColor?: string;
}

/** Délai pendant lequel un second tap est ignoré (anti-double-tap, design §3.1 et §5.4). */
const DOUBLE_TAP_GUARD_MS = 400;

interface VariantStyle {
  face: string;
  lip: string;
  text: string;
  border?: string;
}

export const BUTTON_VARIANTS: Record<ButtonVariant | 'disabled', VariantStyle> = {
  primary: { face: colors.primary, lip: colors.primaryLip, text: colors.textOnColor },
  sun: { face: colors.sun, lip: colors.sunLip, text: colors.ink },
  secondary: { face: colors.surface, lip: colors.border, text: colors.primary, border: colors.border },
  success: { face: colors.success, lip: colors.successLip, text: colors.textOnColor },
  softDanger: { face: colors.surface, lip: colors.border, text: colors.danger, border: colors.border },
  danger: { face: colors.danger, lip: colors.dangerLip, text: colors.textOnColor },
  disabled: { face: colors.disabledBg, lip: colors.disabledLip, text: colors.disabledText },
};

const SIZES = {
  sm: { height: 44, radius: 14, font: 15 },
  md: { height: 48, radius: 14, font: 16 },
  lg: { height: 56, radius: 16, font: 17 },
} as const;

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
  textColor,
}: ButtonProps) {
  const lastPress = useRef(0);
  const inactive = disabled || loading;
  const resolved: ButtonVariant = variant === 'primary' && tone === 'success' ? 'success' : variant;
  const look = BUTTON_VARIANTS[inactive ? 'disabled' : resolved];
  const dims = SIZES[size];
  const color = inactive ? look.text : (textColor ?? look.text);

  const handlePress = () => {
    const now = Date.now();
    if (inactive || now - lastPress.current < DOUBLE_TAP_GUARD_MS) return;
    lastPress.current = now;
    onPress();
  };

  return (
    <PressableRaised
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      faceTestID={testID ? `${testID}-face` : undefined}
      lipColor={look.lip}
      depth={depth.md}
      radius={dims.radius}
      style={style}
      faceStyle={[
        styles.face,
        { minHeight: dims.height, backgroundColor: look.face },
        look.border ? { borderWidth: 2, borderColor: look.border } : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.content}>
          {leftEmoji ? (
            <Text style={[styles.label, { color, fontSize: dims.font }]} accessible={false}>
              {leftEmoji}
            </Text>
          ) : null}
          <Text style={[styles.label, { color, fontSize: dims.font }]} numberOfLines={2}>
            {label}
          </Text>
        </View>
      )}
    </PressableRaised>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.button, textAlign: 'center', flexShrink: 1 },
});
