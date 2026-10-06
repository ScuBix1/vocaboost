/**
 * Gabarits d'écran : contenu défilant + zone d'actions fixée en bas (design v2 §5).
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme/tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Actions fixées en bas de l'écran. */
  footer?: ReactNode;
  /** Élément au-dessus du contenu défilant (header custom). */
  header?: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Calque décoratif derrière le contenu (confettis). */
  background?: ReactNode;
}

export function Screen({ children, footer, header, scroll = true, edges = ['top', 'bottom'], contentStyle, background }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {background}
      {header}
      {scroll ? (
        <ScrollView
          style={background ? styles.above : undefined}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, background ? styles.above : null, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, background ? styles.above : null]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Titre d'onglet en `h1` (design §3.9). */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.flex}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Écran neutre affiché tant que le store n'est pas réhydraté (design §4, conventions). */
export function LoadingScreen() {
  return (
    <View style={styles.loading} accessibilityLabel="Chargement" testID="loading-screen">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  // Contenu au-dessus du calque décoratif (confettis), y compris sur le web.
  above: { zIndex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: 14 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  title: { ...typography.h1, color: colors.ink },
  subtitle: { ...typography.overline, color: colors.inkMuted, marginTop: 2 },
  section: { ...typography.h2, color: colors.ink, marginTop: 2 },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
