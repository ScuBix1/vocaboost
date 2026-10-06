/**
 * Déroulé du test hebdomadaire (design §4.7) — US-07 (RG-62 → RG-69).
 */
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { ProgressBar } from '@/components/ProgressBar';
import { WORDS, WORDS_BY_ID } from '@/data/words';
import type { Word } from '@/domain/types';
import { generateTest, getTestStatus, type TestAnswer, type TestQuestion } from '@/domain/weeklyTest';
import { confirmDestructive } from '@/services/confirm';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useResultsStore } from '@/store/useResultsStore';
import { colors, MIN_TOUCH, spacing, typography } from '@/theme/tokens';

/** Tire un nouveau test si (et seulement si) il est disponible (RG-60, RG-67). */
function drawTest(): TestQuestion[] {
  const { progress, testHistory } = useLearnerStore.getState();
  const now = new Date();
  if (getTestStatus(WORDS, progress, testHistory, now).kind !== 'available') return [];
  return generateTest(WORDS, progress, now, Math.random);
}

function backToTestTab() {
  if (router.canGoBack()) router.back();
  else router.replace('/test');
}

export default function TestRunScreen() {
  const [questions] = useState<TestQuestion[]>(drawTest);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const answers = useRef<TestAnswer[]>([]);
  const finished = useRef(false);
  const answeredIndex = useRef(-1);
  const completeTest = useLearnerStore((s) => s.completeTest);
  const setLastTest = useResultsStore((s) => s.setLastTest);

  // Abandon : confirmation, rien n'est enregistré (RG-67).
  const quit = useCallback(() => {
    confirmDestructive({
      title: 'Abandonner le test ?',
      message: 'Ta progression dans ce test sera perdue. Tu pourras le recommencer plus tard cette semaine.',
      cancelLabel: 'Continuer le test',
      confirmLabel: 'Abandonner',
      onConfirm: backToTestTab,
    });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      quit();
      return true;
    });
    return () => sub.remove();
  }, [quit]);

  if (questions.length === 0) return <Redirect href="/test" />;

  const total = questions.length;
  const question = questions[qIndex];
  const isLast = qIndex + 1 >= total;
  const correctLabel = question.options[question.correctIndex].label;

  const choose = (optionIndex: number) => {
    // Réponse non modifiable (RG-66) ; un double tap rapide ne compte qu'une fois (design §5.4).
    if (selected !== null || answeredIndex.current === qIndex) return;
    answeredIndex.current = qIndex;
    const correct = optionIndex === question.correctIndex;
    answers.current[qIndex] = { wordId: question.wordId, correct };
    setSelected(optionIndex);
    AccessibilityInfo.announceForAccessibility(
      correct ? 'Bonne réponse !' : `La bonne réponse était : ${correctLabel}`,
    );
  };

  const next = () => {
    if (selected === null) return;
    if (!isLast) {
      setSelected(null);
      setQIndex(qIndex + 1);
      return;
    }
    if (finished.current) return;
    finished.current = true;
    const all = answers.current.slice(0, total);
    const record = completeTest(all); // RG-69, RG-71 : appliqué en une fois.
    if (!record) {
      router.replace('/test');
      return;
    }
    const missed = all
      .filter((a) => !a.correct)
      .map((a) => WORDS_BY_ID.get(a.wordId))
      .filter((w): w is Word => w !== undefined);
    setLastTest({ record, missed });
    router.replace('/test-result');
  };

  const stateOf = (i: number): OptionState => {
    if (selected === null) return 'idle';
    if (i === question.correctIndex) return 'correct';
    if (i === selected) return 'incorrect';
    return 'disabled';
  };

  const enToFr = question.direction === 'en-fr';
  const answeredCorrectly = selected !== null && selected === question.correctIndex;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={quit} accessibilityRole="button" accessibilityLabel="Quitter" style={styles.quit} testID="test-quit">
          <Text style={styles.quitText}>Quitter</Text>
        </Pressable>
        <Text style={styles.counter} testID="test-counter">
          Question {qIndex + 1} / {total}
        </Text>
        <View style={styles.quit} />
      </View>
      <View style={styles.bar}>
        <ProgressBar value={qIndex / total} accessibilityLabel={`Question ${qIndex + 1} sur ${total}`} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.instruction}>
          {enToFr ? 'Quelle est la traduction de ce mot ?' : 'Comment dit-on ce mot en anglais ?'}
        </Text>
        <Card style={styles.promptCard}>
          <Badge label={enToFr ? 'EN' : 'FR'} />
          <Text
            style={styles.prompt}
            accessibilityLanguage={enToFr ? 'en-US' : 'fr-FR'}
            testID="test-prompt"
          >
            {question.prompt}
          </Text>
        </Card>
        <View style={styles.options}>
          {question.options.map((option, i) => (
            <OptionButton
              key={`${qIndex}-${option.wordId}`}
              label={option.label}
              index={i + 1}
              state={stateOf(i)}
              language={enToFr ? 'fr-FR' : 'en-US'}
              onPress={() => choose(i)}
              testID={`test-option-${i}`}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {selected !== null ? (
          <>
            <Text
              style={[styles.feedback, { color: answeredCorrectly ? colors.success : colors.danger }]}
              accessibilityLiveRegion="polite"
            >
              {answeredCorrectly ? '✓ Bonne réponse !' : `✗ La bonne réponse était : ${correctLabel}`}
            </Text>
            <Button label={isLast ? 'Voir le résultat' : 'Suivant'} onPress={next} testID="test-next" />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  quit: { minHeight: MIN_TOUCH, minWidth: 64, justifyContent: 'center' },
  quitText: { ...typography.bodyStrong, color: colors.primary },
  counter: { ...typography.caption, color: colors.textMuted },
  bar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.lg },
  instruction: { ...typography.caption, color: colors.textMuted },
  promptCard: { padding: spacing.xl, alignItems: 'center' },
  prompt: { ...typography.h2, color: colors.text, textAlign: 'center' },
  options: { gap: spacing.md },
  footer: { minHeight: 76, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  feedback: { ...typography.bodyStrong },
});
