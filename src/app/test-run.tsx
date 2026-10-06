/**
 * Déroulé du test hebdomadaire (design v2 §5.7) — US-07 (RG-62 → RG-69).
 */
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { FeedbackSheet } from '@/components/FeedbackSheet';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { ProgressBar } from '@/components/ProgressBar';
import { WORDS, WORDS_BY_ID } from '@/data/words';
import type { Word } from '@/domain/types';
import { generateTest, getTestStatus, type TestAnswer, type TestQuestion } from '@/domain/weeklyTest';
import { confirmDestructive } from '@/services/confirm';
import { useLearnerStore } from '@/store/useLearnerStore';
import { useResultsStore } from '@/store/useResultsStore';
import { colors, MAX_FONT_MULTIPLIER, MIN_TOUCH, spacing, typography } from '@/theme/tokens';

interface DrawnTest {
  questions: TestQuestion[];
  /** Instant de démarrage : le test est rattaché à cette semaine ISO (décision PM post-QA, OBS-01). */
  startedAt: Date;
}

/** Tire un nouveau test si (et seulement si) il est disponible (RG-60, RG-67). */
function drawTest(): DrawnTest {
  const { progress, testHistory } = useLearnerStore.getState();
  const startedAt = new Date();
  if (getTestStatus(WORDS, progress, testHistory, startedAt).kind !== 'available') {
    return { questions: [], startedAt };
  }
  return { questions: generateTest(WORDS, progress, startedAt, Math.random), startedAt };
}

/** Abandon : toujours vers l'onglet Test, quel que soit le point d'entrée (BUG-04, design §4.7). */
function backToTestTab() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/test');
}

export default function TestRunScreen() {
  const [{ questions, startedAt }] = useState<DrawnTest>(drawTest);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const answers = useRef<TestAnswer[]>([]);
  const finished = useRef(false);
  const answeredIndex = useRef(-1);
  const completeTest = useLearnerStore((s) => s.completeTest);
  const setLastTest = useResultsStore((s) => s.setLastTest);
  const insets = useSafeAreaInsets();

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
    const record = completeTest(all, new Date(), startedAt); // RG-69, RG-71 : appliqué en une fois.
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={quit} accessibilityRole="button" accessibilityLabel="Quitter" style={styles.quit} testID="test-quit">
          <Text style={styles.quitText}>✕ Quitter</Text>
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar value={qIndex / total} height={16} accessibilityLabel={`Question ${qIndex + 1} sur ${total}`} />
        </View>
        <Text style={styles.counter} testID="test-counter" accessibilityLabel={`Question ${qIndex + 1} sur ${total}`}>
          {qIndex + 1}/{total}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, selected === null && { paddingBottom: spacing.lg + insets.bottom }]}>
        <View style={styles.instructionRow}>
          <Text style={styles.instruction}>
            {enToFr ? 'Quelle est la traduction de ce mot ?' : 'Comment dit-on ce mot en anglais ?'}
          </Text>
          <Badge label={enToFr ? 'EN → FR' : 'FR → EN'} variant="level" />
        </View>
        <Card radius={26} contentStyle={styles.promptFace}>
          <Text style={styles.language}>{enToFr ? '🇬🇧 Anglais' : '🇫🇷 Français'}</Text>
          <Text
            style={styles.prompt}
            maxFontSizeMultiplier={MAX_FONT_MULTIPLIER}
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

      {selected !== null ? (
        <FeedbackSheet
          key={qIndex}
          correct={answeredCorrectly}
          answer={correctLabel}
          prompt={question.prompt}
          direction={question.direction}
          actionLabel={isLast ? 'Voir le résultat' : 'Suivant'}
          onNext={next}
          bottomInset={insets.bottom}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    minHeight: 52,
  },
  quit: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center' },
  quitText: { fontSize: 15, lineHeight: 20, fontWeight: '900', color: colors.primary },
  bar: { flex: 1 },
  counter: { fontSize: 15, lineHeight: 20, fontWeight: '900', color: colors.inkMuted, minWidth: 38, textAlign: 'right' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  instructionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  instruction: { ...typography.caption, fontSize: 15, lineHeight: 20, color: colors.ink, flexShrink: 1 },
  promptFace: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: spacing.lg, gap: 6 },
  language: { ...typography.overline, color: colors.inkMuted },
  prompt: { ...typography.wordL, color: colors.ink, textAlign: 'center' },
  options: { gap: spacing.md, marginTop: spacing.xs },
});
