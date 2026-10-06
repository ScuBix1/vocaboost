/**
 * Tokens du design system v2 (design §3). Mode clair uniquement.
 * Les clés v1 sont conservées (valeurs v2) ; les nouvelles clés s'ajoutent.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import type { CategoryId } from '@/domain/types';

const palette = {
  // Marque : Grape / Sun / Flame
  primary: '#6B3CF5',
  primaryLip: '#4B22C2',
  primarySoft: '#EFE9FF',
  primaryInk: '#3D1A9E',
  speakLip: '#D9CCFF',
  sun: '#FFC83D',
  sunLip: '#E0A21A',
  sunSoft: '#FFF4D6',
  sunInk: '#6B4500',
  sunBorder: '#F5DE9C',
  flame: '#FF6B4A',
  flameSoft: '#FFF0EB',
  flameInk: '#B83A1E',
  flameBorder: '#FFD9CC',
  // Feedback : Mint / Berry
  success: '#0B7F5E',
  successLip: '#075C44',
  successBright: '#1FC496',
  successSoft: '#E3F8EF',
  successInk: '#0B6E52',
  danger: '#D9364A',
  dangerLip: '#A8202F',
  dangerSoft: '#FFE8EA',
  dangerInk: '#9E1B30',
  // Neutres : Ink
  bg: '#F7F5FF',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBFA',
  border: '#E3DEF5',
  borderStrong: '#8F88AD',
  ink: '#1E1442',
  inkMuted: '#5B5577',
  textOnColor: '#FFFFFF',
  disabledBg: '#ECE9F5',
  disabledLip: '#D9D4EA',
  disabledText: '#6E6890',
  overlay: 'rgba(30,20,66,0.55)',
  cheek: '#FF8FA3',
  onPrimaryTrack: 'rgba(255,255,255,0.25)',
  onPrimaryTile: 'rgba(255,255,255,0.16)',
} as const;

export const colors = {
  ...palette,
  // Clés héritées v1 (design §3.1, colonne « Clé héritée »).
  text: palette.ink,
  textMuted: palette.inkMuted,
  primaryPressed: palette.primaryLip,
  successPressed: palette.successLip,
  successText: palette.successInk,
  dangerText: palette.dangerInk,
  warning: palette.flameInk,
  warningSoft: palette.sunSoft,
  warningText: palette.sunInk,
} as const;

export interface CategoryColor {
  /** Barres, pastilles (≥ 3:1 sur blanc). */
  base: string;
  /** Fond de carte. */
  soft: string;
  /** Texte sur `soft` (≥ 6,9:1). */
  ink: string;
  emoji: string;
}

/** Couleurs et emoji par catégorie (design §3.1, ordre RG-04). */
export const categoryColors: Record<CategoryId, CategoryColor> = {
  house: { emoji: '🏠', base: '#E5620F', soft: '#FFEEDD', ink: '#8A3A00' },
  food: { emoji: '🍎', base: '#E8384F', soft: '#FFE6EA', ink: '#8C1426' },
  travel: { emoji: '✈️', base: '#1C8CEB', soft: '#E2F1FF', ink: '#0A4C87' },
  work: { emoji: '💼', base: '#4C5BD4', soft: '#E7E9FF', ink: '#28308A' },
  school: { emoji: '🎒', base: '#B97F00', soft: '#FFF3D1', ink: '#6E4A00' },
  body: { emoji: '🩺', base: '#E0458F', soft: '#FFE6F2', ink: '#8A1752' },
  nature: { emoji: '🌿', base: '#1E9E57', soft: '#DFF6E8', ink: '#0C5B30' },
  emotions: { emoji: '💜', base: '#9B4DE8', soft: '#F3E8FF', ink: '#5A1E9A' },
  time: { emoji: '⏰', base: '#0E9AA7', soft: '#DDF6F7', ink: '#065A62' },
  verbs: { emoji: '⚡', base: '#6E9A0E', soft: '#EEF6D8', ink: '#3D5A00' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Rayons v2, plus généreux (design §3.3). */
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

/** Profondeur « 3D » : hauteur de la lèvre pleine sous l'élément (design §3.3). */
export const depth = {
  sm: 3,
  md: 4,
  lg: 6,
} as const;

/** Durées d'animation (design §6). */
export const motion = {
  pressIn: 60,
  pressOut: 120,
  flip: 320,
  fade: 150,
  bar: 300,
  sheet: 220,
  pop: 180,
  shake: 300,
  mascot: 400,
  count: 600,
} as const;

/** Typographie v2 : police système, graisses 800-900 (design §3.2). */
export const typography = {
  wordXL: { fontSize: 44, lineHeight: 52, fontWeight: '900', letterSpacing: -0.5 },
  score: { fontSize: 52, lineHeight: 58, fontWeight: '900' },
  wordL: { fontSize: 38, lineHeight: 44, fontWeight: '900' },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.3 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '900' },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '800' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  stat: { fontSize: 30, lineHeight: 36, fontWeight: '900' },
  /** Clé v1 conservée (= wordXL). */
  display: { fontSize: 44, lineHeight: 52, fontWeight: '900', letterSpacing: -0.5 },
} as const satisfies Record<string, TextStyle>;

const shadow = (opacity: number, blur: number, offsetY: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    web: { boxShadow: `0px ${offsetY}px ${blur}px rgba(30,20,66,${opacity})` },
    android: { elevation },
    default: {
      shadowColor: colors.ink,
      shadowOpacity: opacity,
      shadowRadius: blur,
      shadowOffset: { width: 0, height: offsetY },
    },
  });

/** Ombres floues : réservées aux éléments flottants (bandeau feedback, toast). */
export const shadows = {
  sm: shadow(0.06, 4, 1, 1),
  md: shadow(0.12, 16, -2, 6),
} as const;

/** Cible tactile minimale (design §7). */
export const MIN_TOUCH = 44;
/** Multiplicateur de police maximal pour les mots, scores et tuiles. */
export const MAX_FONT_MULTIPLIER = 1.6;
