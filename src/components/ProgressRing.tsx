/**
 * Anneau de progression sans SVG (design §4.5), technique « deux demi-disques » :
 * - moitié droite : un demi-disque coloré, posé à gauche de son cadre, tourne de min(v, ½) × 360°
 *   et entre dans la fenêtre droite par le haut (0 → 50 %) ;
 * - moitié gauche : un demi-disque coloré, posé à droite de son cadre, tourne de max(v − ½, 0) × 360°
 *   et entre dans la fenêtre gauche par le bas (50 → 100 %) ;
 * - un disque blanc central crée l'épaisseur.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

export interface ProgressRingProps {
  /** 0–1 ; borné. Une valeur ≥ 1 donne un anneau plein `successBright`. */
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Couleur du disque central. */
  innerColor?: string;
  children?: ReactNode;
  accessibilityLabel: string;
  testID?: string;
}

/** Angles (en degrés) des deux demi-disques pour une valeur donnée. */
export function ringAngles(value: number): { right: number; left: number } {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return { right: Math.min(v, 0.5) * 360, left: Math.max(v - 0.5, 0) * 360 };
}

export function ProgressRing({
  value,
  size = 64,
  thickness = 9,
  color = colors.primary,
  trackColor = colors.surfaceAlt,
  innerColor = colors.surface,
  children,
  accessibilityLabel,
  testID,
}: ProgressRingProps) {
  const full = Number.isFinite(value) && value >= 1;
  const fill = full ? colors.successBright : color;
  const { right, left } = ringAngles(value);
  const half = size / 2;
  const disc = { width: size, height: size, borderRadius: half };
  const halfDisc = { width: half, height: size, backgroundColor: fill };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, value || 0)) * 100) }}
      testID={testID}
      style={[disc, { backgroundColor: trackColor }]}
    >
      {right > 0 ? (
        <View style={[styles.window, { left: half, width: half, height: size }]} testID="ring-right">
          <View style={[styles.rotor, disc, { left: -half, transform: [{ rotate: `${right}deg` }] }]}>
            <View style={[halfDisc, { borderTopLeftRadius: half, borderBottomLeftRadius: half }]} />
          </View>
        </View>
      ) : null}
      {left > 0 ? (
        <View style={[styles.window, { left: 0, width: half, height: size }]} testID="ring-left">
          <View style={[styles.rotor, disc, { left: 0, transform: [{ rotate: `${left}deg` }] }]}>
            <View
              style={[halfDisc, { marginLeft: half, borderTopRightRadius: half, borderBottomRightRadius: half }]}
            />
          </View>
        </View>
      ) : null}
      <View
        style={[
          styles.inner,
          {
            left: thickness,
            top: thickness,
            width: size - 2 * thickness,
            height: size - 2 * thickness,
            borderRadius: half - thickness,
            backgroundColor: innerColor,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { position: 'absolute', top: 0, overflow: 'hidden' },
  rotor: { position: 'absolute', top: 0, flexDirection: 'row' },
  inner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
