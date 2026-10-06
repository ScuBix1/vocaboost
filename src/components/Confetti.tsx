/**
 * Confettis de célébration (design §4.12) : `Animated` natif, une seule fois, derrière le contenu.
 * « Réduire les animations » : 10 confettis immobiles déjà posés.
 *
 * Recette V2-02 : le calque remplit son parent (la zone de Vobi sur les écrans de résultat, et non
 * plus tout l'écran) et laisse libre une colonne centrale `clearWidth` : les confettis restent
 * autour de Vobi et ne passent jamais derrière le titre ni le score, animés ou immobiles.
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

export interface ConfettiProps {
  /** Largeur de la colonne centrale laissée libre (Vobi), en pt. */
  clearWidth?: number;
}

const PIECE_MAX = 16;
const EDGE = 6;

/** Abscisse d'un confetti : sur toute la largeur, ou d'un côté de la colonne libre (alterné). */
export function confettiLeft(x: number, i: number, width: number, clearWidth: number): number {
  if (clearWidth <= 0) return 12 + x * (width - 34);
  const side = Math.max(0, (width - clearWidth) / 2 - EDGE - PIECE_MAX);
  const offset = EDGE + x * side;
  return i % 2 === 0 ? offset : width - offset - PIECE_MAX;
}

export function Confetti({ clearWidth = 0 }: ConfettiProps) {
  const reduceMotion = useReduceMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pieces = useMemo(() => makePieces(reduceMotion ? CONFETTI_STILL_COUNT : CONFETTI_COUNT), [reduceMotion]);
  // Toujours CONFETTI_COUNT valeurs : le réglage peut changer après le montage (10 ↔ 24 confettis).
  const progress = useRef(Array.from({ length: CONFETTI_COUNT }, () => new Animated.Value(0))).current;
  const fade = useRef(Array.from({ length: CONFETTI_COUNT }, () => new Animated.Value(1))).current;

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
      aria-hidden
      onLayout={onLayout}
      testID="confetti"
    >
      {size.width > 0
        ? pieces.map((p, i) => {
            const left = confettiLeft(p.x, i, size.width, clearWidth);
            // Point d'arrivée dans la hauteur du calque (bord bas compris) : rien ne déborde dessous.
            const endY = clearWidth > 0 ? (0.1 + p.fall * 1.9) * (size.height - PIECE_MAX) : p.fall * size.height + 40;
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
