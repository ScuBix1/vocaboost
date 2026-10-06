/**
 * Barre de progression (design §3.4).
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, radius } from '@/theme/tokens';

export interface ProgressBarProps {
  /** 0–1 ; toute valeur > 1 (objectif dépassé) affiche une barre pleine. */
  value: number;
  color?: 'primary' | 'success';
  height?: 8 | 12;
  accessibilityLabel: string;
}

export function ProgressBar({ value, color = 'primary', height = 8, accessibilityLabel }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const reduceMotion = useReduceMotion();
  const width = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (reduceMotion) {
      width.setValue(clamped);
      return;
    }
    Animated.timing(width, { toValue: clamped, duration: 250, useNativeDriver: false }).start();
  }, [clamped, reduceMotion, width]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.floor(clamped * 100) }}
      style={[styles.track, { height }]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color === 'success' ? colors.success : colors.primary,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
