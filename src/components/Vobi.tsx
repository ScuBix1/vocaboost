/**
 * Vobi, la mascotte (design §2.3) : une bulle de parole jaune Sun dessinée en `View`
 * sur une grille 120 × 120, mise à l'échelle par `transform: scale`.
 * Toujours décorative : le texte voisin porte le sens.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion } from '@/theme/tokens';

export type VobiMood = 'hello' | 'correct' | 'oops' | 'streak' | 'win' | 'retry' | 'empty' | 'search';

type Eyes = 'open' | 'happy' | 'closed' | 'up';
type Brows = 'none' | 'determined' | 'worried';
type Mouth = 'smile' | 'grin' | 'o' | 'flat' | 'sleepy';

interface Accessory {
  emoji: string;
  style: TextStyle;
}

interface MoodSpec {
  eyes: Eyes;
  brows: Brows;
  mouth: Mouth;
  tilt?: boolean;
  band?: boolean;
  /** Étincelle masquée (accessoire sur la tête) ou atténuée. */
  spark?: 'on' | 'off' | 'dim';
  accessories: Accessory[];
}

/** Expressions (design §2.3, tableau « Expressions »). */
export const VOBI_MOODS: Record<VobiMood, MoodSpec> = {
  hello: {
    eyes: 'open',
    brows: 'none',
    mouth: 'smile',
    accessories: [{ emoji: '👋', style: { left: -6, top: 60, fontSize: 28, transform: [{ rotate: '-15deg' }] } }],
  },
  correct: {
    eyes: 'happy',
    brows: 'none',
    mouth: 'grin',
    accessories: [{ emoji: '✨', style: { left: -6, top: 4, fontSize: 22 } }],
  },
  oops: {
    eyes: 'up',
    brows: 'worried',
    mouth: 'o',
    tilt: true,
    accessories: [{ emoji: '💧', style: { left: 100, top: 34, fontSize: 20 } }],
  },
  streak: {
    eyes: 'open',
    brows: 'determined',
    mouth: 'grin',
    spark: 'off',
    accessories: [{ emoji: '🔥', style: { left: 44, top: -8, fontSize: 32 } }],
  },
  win: {
    eyes: 'happy',
    brows: 'none',
    mouth: 'grin',
    accessories: [
      { emoji: '🏆', style: { left: 88, top: 70, fontSize: 32 } },
      { emoji: '🎉', style: { left: -6, top: 4, fontSize: 22 } },
    ],
  },
  retry: {
    eyes: 'open',
    brows: 'determined',
    mouth: 'flat',
    band: true,
    spark: 'off',
    accessories: [{ emoji: '💪', style: { left: -8, top: 62, fontSize: 28 } }],
  },
  empty: {
    eyes: 'closed',
    brows: 'none',
    mouth: 'sleepy',
    spark: 'dim',
    accessories: [{ emoji: '💤', style: { left: 96, top: -2, fontSize: 22 } }],
  },
  search: {
    eyes: 'up',
    brows: 'none',
    mouth: 'o',
    accessories: [{ emoji: '🔎', style: { left: 90, top: 64, fontSize: 28 } }],
  },
};

export interface VobiProps {
  mood?: VobiMood;
  /** Côté du carré occupé, en pt (grille 120 mise à l'échelle). */
  size?: number;
  /** Couleur de l'étincelle (blanche sur fond Grape). */
  sparkColor?: string;
  /** Rebond d'entrée (résultats, bandeaux), désactivé si « Réduire les animations ». */
  animateIn?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const GRID = 120;

function Eye({ kind, side }: { kind: Eyes; side: 'l' | 'r' }) {
  if (kind === 'happy') return <View style={[styles.eyeHappy, { left: side === 'l' ? 36 : 68 }]} />;
  if (kind === 'closed') return <View style={[styles.eyeClosed, { left: side === 'l' ? 37 : 68 }]} />;
  return (
    <View style={[styles.eye, { left: side === 'l' ? 38 : 69 }]}>
      <View style={[styles.glint, kind === 'up' && styles.glintUp]} />
    </View>
  );
}

function MouthShape({ kind }: { kind: Mouth }) {
  const withTongue = kind === 'smile' || kind === 'grin';
  return (
    <View style={[styles.mouth, styles[`mouth_${kind}`]]}>
      {withTongue ? <View style={styles.tongue} /> : null}
    </View>
  );
}

export function Vobi({ mood = 'hello', size = 96, sparkColor = colors.primary, animateIn = false, style, testID }: VobiProps) {
  const spec = VOBI_MOODS[mood];
  const reduceMotion = useReduceMotion();
  const entrance = useRef(new Animated.Value(animateIn ? 0 : 1)).current;

  useEffect(() => {
    if (!animateIn) return;
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    Animated.timing(entrance, {
      toValue: 1,
      duration: motion.mascot,
      easing: Easing.out(Easing.back(1.8)),
      useNativeDriver: true,
    }).start();
  }, [animateIn, reduceMotion, entrance]);

  const k = size / GRID;
  const entranceStyle = animateIn
    ? {
        transform: [
          { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          { rotate: entrance.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) },
        ],
      }
    : null;

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      // Web : react-native-web ignore accessibilityElementsHidden ; les emoji ne sont pas lus.
      aria-hidden
      pointerEvents="none"
      testID={testID ?? 'vobi'}
    >
      <Animated.View style={[{ width: size, height: size }, entranceStyle]}>
        <View
          style={[
            styles.grid,
            // Mise à l'échelle depuis le coin haut-gauche : on recentre la grille 120 dans le carré.
            { transform: [{ translateX: (size - GRID) / 2 }, { translateY: (size - GRID) / 2 }, { scale: k }] },
          ]}
          testID={`vobi-${mood}`}
        >
          <View style={[styles.inner, spec.tilt && styles.tilt]}>
            <View style={styles.tail} />
            <View style={styles.body}>
              <View style={styles.bodyFace} />
            </View>
            {spec.spark === 'off' ? null : (
              <Text style={[styles.spark, { color: sparkColor }, spec.spark === 'dim' && styles.sparkDim]}>✦</Text>
            )}
            {spec.band ? (
              <View style={styles.band}>
                <View style={styles.bandTail} />
              </View>
            ) : null}
            {spec.brows !== 'none' ? (
              <>
                <View style={[styles.brow, { left: 36, transform: [{ rotate: spec.brows === 'determined' ? '16deg' : '-16deg' }] }]} />
                <View style={[styles.brow, { left: 68, transform: [{ rotate: spec.brows === 'determined' ? '-16deg' : '16deg' }] }]} />
              </>
            ) : null}
            <Eye kind={spec.eyes} side="l" />
            <Eye kind={spec.eyes} side="r" />
            <View style={[styles.cheek, { left: 24 }]} />
            <View style={[styles.cheek, { left: 83 }]} />
            <MouthShape kind={spec.mouth} />
            {spec.accessories.map((a) => (
              <Text key={a.emoji} style={[styles.accessory, a.style]}>
                {a.emoji}
              </Text>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const ink = colors.ink;

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, top: 0, width: GRID, height: GRID },
  inner: { position: 'absolute', left: 0, top: 0, width: GRID, height: GRID },
  tilt: { transform: [{ rotate: '-7deg' }] },
  tail: {
    position: 'absolute',
    left: 24,
    top: 84,
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.sunLip,
    transform: [{ rotate: '45deg' }],
  },
  body: {
    position: 'absolute',
    left: 10,
    top: 20,
    width: 100,
    height: 80,
    borderRadius: 38,
    backgroundColor: colors.sunLip,
    overflow: 'hidden',
  },
  // Lèvre basse 7 pt (équivalent de `inset 0 -7px 0 sunLip`) : copie Sun du corps remontée de 7.
  bodyFace: {
    position: 'absolute',
    left: 0,
    top: -7,
    width: 100,
    height: 80,
    borderRadius: 38,
    backgroundColor: colors.sun,
  },
  spark: {
    position: 'absolute',
    left: 88,
    top: 0,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    transform: [{ rotate: '14deg' }],
  },
  sparkDim: { opacity: 0.45 },
  eye: { position: 'absolute', top: 44, width: 13, height: 17, borderRadius: 7, backgroundColor: ink },
  glint: { position: 'absolute', left: 3, top: 3, width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  glintUp: { left: 5, top: 1.5 },
  eyeHappy: {
    position: 'absolute',
    top: 47,
    width: 16,
    height: 10,
    borderWidth: 4.5,
    borderBottomWidth: 0,
    borderColor: ink,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  eyeClosed: { position: 'absolute', top: 53, width: 15, height: 4.5, borderRadius: 3, backgroundColor: ink },
  brow: { position: 'absolute', top: 35, width: 16, height: 4.5, borderRadius: 3, backgroundColor: ink },
  cheek: { position: 'absolute', top: 66, width: 13, height: 7, borderRadius: 7, backgroundColor: colors.cheek, opacity: 0.8 },
  mouth: { position: 'absolute', backgroundColor: ink, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  mouth_smile: {
    left: 49,
    top: 66,
    width: 22,
    height: 11,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  mouth_grin: {
    left: 45,
    top: 64,
    width: 30,
    height: 17,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  mouth_o: { left: 54, top: 66, width: 12, height: 14, borderRadius: 7 },
  mouth_flat: {
    left: 52,
    top: 68,
    width: 16,
    height: 7,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  mouth_sleepy: { left: 55, top: 69, width: 10, height: 6, borderRadius: 5 },
  tongue: {
    width: '55%',
    height: '45%',
    backgroundColor: colors.flame,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  band: { position: 'absolute', left: 14, top: 30, width: 92, height: 9, borderRadius: 4, backgroundColor: colors.flame },
  bandTail: {
    position: 'absolute',
    right: -12,
    top: -2,
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.flame,
    transform: [{ rotate: '-25deg' }],
  },
  accessory: { position: 'absolute', lineHeight: undefined },
});
