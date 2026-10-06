/**
 * Carte de catégorie colorée (design §4.8, écran Progrès) — RG-43.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { CategoryId } from '@/domain/types';
import { categoryColors, MAX_FONT_MULTIPLIER } from '@/theme/tokens';

import { ProgressBar } from './ProgressBar';

export interface CategoryCardProps {
  category: CategoryId;
  label: string;
  seen: number;
  mastered: number;
  total: number;
  percent: number;
}

export function CategoryCard({ category, label, seen, mastered, total, percent }: CategoryCardProps) {
  const c = categoryColors[category];
  return (
    <View
      style={[styles.card, { backgroundColor: c.soft }]}
      accessible
      accessibilityLabel={`${label} : ${seen} mots vus sur ${total}, ${mastered} maîtrisés, ${percent} pour cent`}
      testID={`category-${category}`}
    >
      <View style={styles.head}>
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{c.emoji}</Text>
        </View>
        <Text style={[styles.name, { color: c.ink }]}>{label}</Text>
      </View>
      <View style={styles.barRow}>
        <View style={styles.bar}>
          <ProgressBar value={mastered / total} color={c.base} track="white" height={10} accessibilityLabel={`Maîtrise ${label}`} />
        </View>
        <Text style={[styles.percent, { color: c.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}>
          {percent} %
        </Text>
      </View>
      <View>
        <Text style={[styles.caption, { color: c.ink }]}>
          {seen}/{total} vus
        </Text>
        <Text style={[styles.caption, { color: c.ink }]}>
          {mastered}/{total} maîtrisés
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 12, gap: 8, flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emojiBox: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 18 },
  name: { fontSize: 14, lineHeight: 17, fontWeight: '900', flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1 },
  percent: { fontSize: 19, lineHeight: 24, fontWeight: '900', flexShrink: 0 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
});
