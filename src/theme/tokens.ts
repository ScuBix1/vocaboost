/**
 * Tokens du design system (design §2). Mode clair uniquement.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F6',
  border: '#D9DCE5',
  borderStrong: '#6B7280',
  text: '#111827',
  textMuted: '#4B5563',
  textOnColor: '#FFFFFF',
  primary: '#4338CA',
  primaryPressed: '#3730A3',
  primarySoft: '#E0E7FF',
  success: '#15803D',
  successPressed: '#166534',
  successSoft: '#DCFCE7',
  successText: '#14532D',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  dangerText: '#7F1D1D',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  warningText: '#78350F',
  disabledBg: '#E5E7EB',
  disabledText: '#6B7280',
  overlay: 'rgba(17,24,39,0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: '700' },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  stat: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

const shadow = (opacity: number, blur: number, offsetY: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    web: { boxShadow: `0px ${offsetY}px ${blur}px rgba(17,24,39,${opacity})` },
    android: { elevation },
    default: {
      shadowColor: colors.text,
      shadowOpacity: opacity,
      shadowRadius: blur,
      shadowOffset: { width: 0, height: offsetY },
    },
  });

export const shadows = {
  sm: shadow(0.06, 4, 1, 1),
  md: shadow(0.1, 12, 4, 4),
} as const;

/** Cible tactile minimale (design §2.6). */
export const MIN_TOUCH = 44;
/** Multiplicateur de police maximal pour le mot de la Flashcard et les StatTile. */
export const MAX_FONT_MULTIPLIER = 1.6;
