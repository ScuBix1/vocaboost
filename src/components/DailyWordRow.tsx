/**
 * Ligne de la liste « Mots du jour » (design v1.1 §v1.1.3, RG-105, RG-107, RG-116).
 * Le badge d'état porte glyphe + mot (jamais la couleur seule).
 */
import { StyleSheet, Text, View } from 'react-native';

import type { DailyStatus } from '@/domain/dailyWords';
import type { CategoryId } from '@/domain/types';
import { categoryColors, colors, typography } from '@/theme/tokens';

import { Badge } from './Badge';
import { Card } from './Card';
import { FR_TEXT_PROPS, frenchQuote, SpeakButton } from './Flashcard';

export interface DailyWordRowProps {
  word: {
    id: string;
    en: string;
    fr: string;
    example: string;
    /** Traduction française de l'exemple (RG-155) ; absente ou vide → ligne non rendue (RG-164). */
    exampleFr?: string;
    level: string;
    categoryLabel: string;
    category?: CategoryId;
  };
  status: DailyStatus;
  /** P2 : absents → boutons 🔊 masqués. */
  onSpeakWord?: () => void;
  onSpeakExample?: () => void;
  testID?: string;
}

const STATUS_LABEL: Record<DailyStatus, string> = { known: 'Su', toReview: 'À revoir' };

export function DailyWordRow({ word, status, onSpeakWord, onSpeakExample, testID }: DailyWordRowProps) {
  const c = word.category ? categoryColors[word.category] : undefined;
  const exampleFr = word.exampleFr?.trim() ? word.exampleFr : '';
  const translation = exampleFr ? ` Traduction de l’exemple\u00A0: ${exampleFr}.` : '';
  const label = `${word.en}, ${word.fr}. Exemple\u00A0: ${word.example}.${translation} Catégorie ${word.categoryLabel}, niveau ${word.level}. ${STATUS_LABEL[status]}.`;
  const hidden = { importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true } as const;
  return (
    <Card contentStyle={styles.face} testID={testID}>
      <View style={styles.meta} {...hidden}>
        <View style={[styles.chip, { backgroundColor: c?.soft ?? colors.primarySoft }]}>
          {c ? <Text style={styles.chipText}>{c.emoji}</Text> : null}
          <Text style={[styles.chipText, { color: c?.ink ?? colors.ink }]}>{word.categoryLabel}</Text>
        </View>
        <Badge label={word.level} variant="level" />
        <View style={styles.status}>
          <Badge
            label={STATUS_LABEL[status]}
            variant={status === 'known' ? 'success' : 'review'}
            emoji={status === 'known' ? '✓' : '↻'}
          />
        </View>
      </View>
      {/* Un seul bloc lisible ; les deux 🔊 sont des éléments séparés (design §v1.1.3). */}
      <View style={styles.line}>
        <Text style={styles.en} accessible accessibilityLabel={label} accessibilityLanguage="en-US">
          {word.en}
        </Text>
        {onSpeakWord ? <SpeakButton label={`Écouter le mot ${word.en}`} onPress={onSpeakWord} /> : null}
      </View>
      <Text style={styles.fr} {...hidden}>
        {word.fr}
      </Text>
      <View style={styles.exampleGroup}>
        <View style={styles.line}>
          <Text style={styles.example} {...hidden}>
            “{word.example}”
          </Text>
          {onSpeakExample ? <SpeakButton label="Écouter l'exemple" onPress={onSpeakExample} /> : null}
        </View>
        {/* RG-159 / 160 : traduction toujours visible, sous l'exemple, sans 🔊 (RG-162). */}
        {exampleFr ? (
          <View style={styles.frLine} testID="row-example-fr" {...hidden}>
            <Text style={styles.frFlag} accessible={false}>
              🇫🇷
            </Text>
            <Text style={styles.frText} {...FR_TEXT_PROPS}>
              {frenchQuote(exampleFr)}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  face: { padding: 14, gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  status: { marginLeft: 'auto' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 },
  chipText: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  en: { ...typography.h2, color: colors.ink, flexShrink: 1 },
  fr: { ...typography.bodyStrong, fontSize: 16, color: colors.primary },
  exampleGroup: { gap: 4 },
  frLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingRight: 52 },
  frFlag: { fontSize: 14, lineHeight: 22 },
  frText: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.primaryInk, flex: 1 },
  example: { ...typography.body, fontStyle: 'italic', color: colors.inkMuted, flex: 1 },
});
