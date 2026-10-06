/**
 * Confettis de célébration (design §4.12) : `Animated` natif, une seule fois, derrière le contenu.
 * « Réduire les animations » : 10 confettis immobiles déjà posés.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors } from '@/theme/tokens';

const PALETTE = [colors.primary, colors.sun, colors.flame, colors.successBright, '#1C8CEB', '#E0458F'];
export const CONFETTI_COUNT = 24;
export const CONFETTI_STILL_COUNT = 10;
const FADE_MS = 300;

interface Piece {
  x: number;
  color: string;
  round: boolean;
  turns: number;
  duration: number;
  delay: number;
  /** Hauteur finale (fraction de l'écran) et rotation de départ. */
  fall: number;
  tilt: number;
}

/** Positions pseudo-aléatoires mais stables (déterministes) pour un rendu reproductible. */
function makePieces(count: number): Piece[] {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: rnd(),
    color: PALETTE[i % PALETTE.length],
    round: i % 3 === 1,
    turns: 1 + rnd() * 2,
    duration: 1400 + rnd() * 400,
    delay: rnd() * 150,
    fall: 0.08 + rnd() * 0.37,
    tilt: rnd() * 90 - 45,
  }));
}

export function Confetti() {
  const reduceMotion = useReduceMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pieces = useMemo(() => makePieces(reduceMotion ? CONFETTI_STILL_COUNT : CONFETTI_COUNT), [reduceMotion]);
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;
  const fade = useRef(pieces.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (reduceMotion || size.height === 0) return;
    // Chute (out-quad) et fondu sur les 300 dernières ms (design §4.12).
    const anims = pieces.flatMap((p, i) => [
      Animated.timing(progress[i], {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(fade[i], {
        toValue: 0,
        duration: FADE_MS,
        delay: p.delay + p.duration - FADE_MS,
        useNativeDriver: true,
      }),
    ]);
    Animated.parallel(anims).start();
  }, [reduceMotion, size.height, pieces, progress, fade]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.layer]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={onLayout}
      testID="confetti"
    >
      {size.width > 0
        ? pieces.map((p, i) => {
            const left = 12 + p.x * (size.width - 34);
            const endY = p.fall * size.height + 40;
            const pieceStyle = reduceMotion
              ? { transform: [{ translateY: endY }, { rotate: `${p.tilt}deg` }] }
              : {
                  opacity: fade[i],
                  transform: [
                    { translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [-20, endY] }) },
                    {
                      rotate: progress[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [`${p.tilt}deg`, `${p.tilt + p.turns * 360}deg`],
                      }),
                    },
                  ],
                };
            return (
              <Animated.View
                key={i}
                testID="confetti-piece"
                style={[styles.piece, p.round ? styles.round : styles.rect, { left, backgroundColor: p.color }, pieceStyle]}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 0, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0 },
  rect: { width: 10, height: 16, borderRadius: 3 },
  round: { width: 11, height: 11, borderRadius: 6 },
});
