/**
 * Bandeau temporaire (toast simple sans librairie, design §4.9 et §3.6).
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface NoticeProps {
  message: string | null;
  tone?: 'success' | 'info';
  /** Appelé après `durationMs` pour masquer le bandeau. */
  onHide: () => void;
  durationMs?: number;
}

export function Notice({ message, tone = 'info', onHide, durationMs = 3000 }: NoticeProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [message, onHide, durationMs]);

  if (!message) return null;
  const success = tone === 'success';
  return (
    <View
      style={[styles.notice, { backgroundColor: success ? colors.successSoft : colors.warningSoft }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: success ? colors.successText : colors.warningText }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  text: { ...typography.bodyStrong },
});
