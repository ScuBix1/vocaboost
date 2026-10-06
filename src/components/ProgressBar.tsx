/**
 * Barre de progression v2 (design §4.4) : piste pill, remplissage coloré, reflet sur la version 16.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius } from '@/theme/tokens';

export type ProgressBarColor = 'primary' | 'success' | 'sun';

export interface ProgressBarProps {
  /** 0–1 ; toute valeur > 1 (objectif dépassé) affiche une barre pleine. */
  value: number;
  /** Couleur nommée ou couleur libre (catégorie). */
  color?: ProgressBarColor | (string & {});
  height?: 10 | 16;
  /** Piste : `default` (surfaceAlt), `onPrimary` (blanc 25 % sur fond Grape), `white` (cartes de catégorie). */
  track?: 'default' | 'onPrimary' | 'white';
  accessibilityLabel: string;
}

const NAMED: Record<ProgressBarColor, string> = {
  primary: colors.primary,
  success: colors.successBright,
  sun: colors.sun,
};

const TRACKS = { default: colors.surfaceAlt, onPrimary: colors.onPrimaryTrack, white: colors.surface } as const;

/** Largeur minimale visible d'une barre non vide (design §4.4). */
const MIN_VISIBLE = 0.06;

export function ProgressBar({ value, color = 'primary', height = 10, track = 'default', accessibilityLabel }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const shown = clamped > 0 ? Math.max(clamped, MIN_VISIBLE) : 0;
  const reduceMotion = useReduceMotion();
  const width = useRef(new Animated.Value(shown)).current;

  useEffect(() => {
    if (reduceMotion) {
      width.setValue(shown);
      return;
    }
    Animated.timing(width, {
      toValue: shown,
      duration: motion.bar,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [shown, reduceMotion, width]);

  const fill = color in NAMED ? NAMED[color as ProgressBarColor] : color;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.floor(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: TRACKS[track] }]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: fill, width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      >
        {height === 16 ? <View style={styles.shine} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  shine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 4,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
