/**
 * Réglages v2 (design §5.9) — objectif quotidien (RG-44), filtres (RG-50 → RG-53, US-06),
 * réinitialisation (RG-94, US-10).
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Notice } from '@/components/Notice';
import { Screen, SectionTitle } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Vobi } from '@/components/Vobi';
import { allCategoriesSelected } from '@/domain/filters';
import { CATEGORY_IDS, CATEGORY_LABELS, DAILY_GOAL_OPTIONS, LEVELS } from '@/domain/types';
import { useSessionPool } from '@/hooks/useLearnerSelectors';
import { confirmDestructive } from '@/services/confirm';
import { useLearnerStore } from '@/store/useLearnerStore';
import { categoryColors, colors, spacing, typography } from '@/theme/tokens';

const KEEP_ONE_MESSAGE = 'Garde au moins un élément sélectionné.';

export default function SettingsScreen() {
  const dailyGoal = useLearnerStore((s) => s.dailyGoal);
  const filters = useLearnerStore((s) => s.filters);
  const setDailyGoal = useLearnerStore((s) => s.setDailyGoal);
  const toggleCategory = useLearnerStore((s) => s.toggleCategory);
  const toggleLevel = useLearnerStore((s) => s.toggleLevel);
  const selectAllCategories = useLearnerStore((s) => s.selectAllCategories);
  const resetProgress = useLearnerStore((s) => s.resetProgress);
  const poolSize = useSessionPool().length;

  const [help, setHelp] = useState<'levels' | 'categories' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const hideHelp = useCallback(() => setHelp(null), []);
  const hideToast = useCallback(() => setToast(null), []);
  const allCategories = useMemo(() => allCategoriesSelected(filters), [filters]);

  const confirmReset = () =>
    confirmDestructive({
      title: 'Réinitialiser ma progression ?',
      message:
        'Cette action est irréversible. Tes mots vus, ta série et l’historique des tests seront effacés. Ton objectif et tes filtres sont conservés.',
      cancelLabel: 'Annuler',
      confirmLabel: 'Réinitialiser',
      onConfirm: () => {
        resetProgress();
        setToast('Progression réinitialisée');
      },
    });

  return (
    <Screen
      edges={['bottom']}
      // Bandeau hors du contenu défilant : toujours visible en haut de l'écran (BUG-05).
      header={
        toast ? (
          <View style={styles.toast}>
            <Notice message={toast} tone="success" onHide={hideToast} />
          </View>
        ) : null
      }
    >

      <View style={styles.section}>
        <SectionTitle>Objectif quotidien</SectionTitle>
        <Text style={styles.caption}>Nombre de cartes à réviser chaque jour</Text>
        <SegmentedControl
          options={DAILY_GOAL_OPTIONS}
          value={dailyGoal}
          onChange={setDailyGoal}
          accessibilityLabel="Objectif quotidien"
          formatA11yLabel={(v) => `${v} cartes par jour`}
        />
      </View>

      <View style={styles.section}>
        <SectionTitle>Filtres des sessions</SectionTitle>
        <Text style={styles.caption}>
          Ils s'appliquent uniquement aux sessions de cartes, pas au test ni aux statistiques.
        </Text>

        <Text style={styles.h3} accessibilityRole="header">
          Niveaux
        </Text>
        <View style={styles.chips}>
          {LEVELS.map((level) => {
            const selected = filters.levels.includes(level);
            return (
              <Chip
                key={level}
                label={level}
                selected={selected}
                locked={selected && filters.levels.length === 1}
                onToggle={() => {
                  if (!toggleLevel(level)) setHelp('levels');
                }}
                testID={`chip-level-${level}`}
              />
            );
          })}
        </View>
        {help === 'levels' ? <Notice message={KEEP_ONE_MESSAGE} onHide={hideHelp} /> : null}

        <View style={styles.subHeader}>
          <Text style={styles.h3} accessibilityRole="header">
            Catégories
          </Text>
          {allCategories ? null : (
            <Pressable onPress={selectAllCategories} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.link}>Tout sélectionner</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.chips}>
          {CATEGORY_IDS.map((category) => {
            const selected = filters.categories.includes(category);
            return (
              <Chip
                key={category}
                label={CATEGORY_LABELS[category]}
                emoji={categoryColors[category].emoji}
                selected={selected}
                locked={selected && filters.categories.length === 1}
                onToggle={() => {
                  if (!toggleCategory(category)) setHelp('categories');
                }}
                testID={`chip-category-${category}`}
              />
            );
          })}
        </View>
        {help === 'categories' ? <Notice message={KEEP_ONE_MESSAGE} onHide={hideHelp} /> : null}
        <Text style={styles.caption} testID="settings-pool-size">
          Mots disponibles : {poolSize}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>Données</SectionTitle>
        <Card>
          <Text style={styles.body}>📱 Données stockées uniquement sur cet appareil.</Text>
        </Card>
        <Button
          label="Réinitialiser ma progression"
          variant="danger"
          size="md"
          onPress={confirmReset}
          testID="settings-reset"
        />
      </View>

      <View style={styles.footer}>
        <Vobi mood="hello" size={36} />
        <Text style={styles.caption}>VocaBoost v1.0</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toast: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  section: { gap: spacing.md },
  caption: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.body, color: colors.text },
  h3: { ...typography.h3, color: colors.ink },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { ...typography.bodyStrong, fontWeight: '900', color: colors.primary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
