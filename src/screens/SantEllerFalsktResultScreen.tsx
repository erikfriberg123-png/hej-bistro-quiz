import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  TOF_TOTAL_ROUNDS,
  TOF_QUESTIONS_PER_ROUND,
  TOF_POINTS_PER_CORRECT,
  TOF_DIFFICULTY_LABEL,
  TOF_ROUND_DIFFICULTIES,
} from '../lib/tofQuestions';
import { submitTofScore } from '../lib/scores';
import { useGameStore } from '../store/gameStore';
import { fonts, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SantEllerFalsktResult'>;

function resultTitle(correct: number, allCorrect: boolean, isLastRound: boolean): string {
  if (allCorrect && isLastRound) return '🏆 Du klarade allt!';
  if (allCorrect) return '🎉 Perfekt! Nästa nivå väntar!';
  const max = TOF_QUESTIONS_PER_ROUND;
  if (correct >= max * 0.8) return '🎯 Riktigt bra!';
  if (correct >= max * 0.6) return '👏 Godkänt!';
  if (correct >= max * 0.4) return '💪 Fortsätt öva!';
  return '🤔 Tufft det här!';
}

export default function SantEllerFalsktResultScreen({ route, navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { round, score, correctAnswers, cumulativeScore } = route.params;
  const isLastRound = round >= TOF_TOTAL_ROUNDS;
  const allCorrect = correctAnswers === TOF_QUESTIONS_PER_ROUND;
  const canAdvance = allCorrect && !isLastRound;
  const currentArea = useGameStore(s => s.currentArea);

  React.useEffect(() => {
    if (isLastRound) submitTofScore(cumulativeScore, currentArea);
  }, []);

  const maxScore = TOF_QUESTIONS_PER_ROUND * TOF_POINTS_PER_CORRECT;
  const percentage = Math.round((score / maxScore) * 100);
  const difficultyLabel = TOF_DIFFICULTY_LABEL[TOF_ROUND_DIFFICULTIES[round - 1]];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.container}>
        <Text style={styles.modeLabel}>Sant eller Falskt</Text>
        <Text style={styles.levelLabel}>Nivå {round} — {difficultyLabel}</Text>

        {/* Score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.resultTitle}>{resultTitle(correctAnswers, allCorrect, isLastRound)}</Text>
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.scoreUnit}>poäng</Text>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{correctAnswers}</Text>
              <Text style={styles.statLabel}>Rätta svar</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{TOF_QUESTIONS_PER_ROUND - correctAnswers}</Text>
              <Text style={styles.statLabel}>Fel svar</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{percentage}%</Text>
              <Text style={styles.statLabel}>Träffsäkerhet</Text>
            </View>
          </View>
        </View>

        {/* Level progress bar */}
        <View style={styles.levelRow}>
          {Array.from({ length: TOF_TOTAL_ROUNDS }).map((_, i) => {
            const lvl = i + 1;
            const isDone = lvl < round;
            const isCurrent = lvl === round;
            const isLocked = lvl > round;
            return (
              <View
                key={lvl}
                style={[
                  styles.levelPip,
                  isCurrent && styles.levelPipCurrent,
                  isDone && styles.levelPipDone,
                  isLocked && styles.levelPipLocked,
                ]}
              >
                <Text style={[styles.levelPipText, isLocked && styles.levelPipTextLocked]}>
                  {isDone ? '✓' : isLocked ? '🔒' : lvl}
                </Text>
                <Text style={[styles.levelPipLabel, isLocked && styles.levelPipTextLocked]}>
                  {TOF_DIFFICULTY_LABEL[TOF_ROUND_DIFFICULTIES[i]]}
                </Text>
              </View>
            );
          })}
        </View>

        {!allCorrect && !isLastRound && (
          <View style={styles.hintBanner}>
            <Text style={styles.hintText}>
              Svara rätt på alla {TOF_QUESTIONS_PER_ROUND} frågor för att låsa upp nästa nivå
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionGroup}>
          {canAdvance && (
            <TouchableOpacity
              onPress={() => navigation.replace('SantEllerFalskt', { round: round + 1, cumulativeScore })}
              style={styles.btnPrimary}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Nästa nivå  →</Text>
            </TouchableOpacity>
          )}

          {!canAdvance && !isLastRound && (
            <TouchableOpacity
              onPress={() => navigation.replace('SantEllerFalskt', { round, cumulativeScore: cumulativeScore - score })}
              style={styles.btnPrimary}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Försök igen  ↺</Text>
            </TouchableOpacity>
          )}

          {isLastRound && (
            <TouchableOpacity
              onPress={() => navigation.replace('SantEllerFalskt', { round: 1 })}
              style={styles.btnPrimary}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Börja om  ↺</Text>
            </TouchableOpacity>
          )}

          {!isLastRound && (
            <TouchableOpacity
              onPress={() => navigation.replace('SantEllerFalskt', { round: 1 })}
              style={styles.btnSecondary}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Börja om från nivå 1</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.btnSecondary}
            activeOpacity={0.85}
          >
            <Text style={styles.btnSecondaryText}>Huvudmeny</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  modeLabel: {
    color: colors.text2,
    fontSize: 12,
    fontFamily: fonts.display600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  levelLabel: {
    color: colors.text1,
    fontSize: 22,
    fontFamily: fonts.display700,
    marginTop: -6,
  },

  scoreCard: {
    width: '100%',
    backgroundColor: colors.bg2,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    gap: 2,
  },
  resultTitle: { color: colors.text2, fontSize: 14, fontFamily: fonts.display600, marginBottom: 6, textAlign: 'center' },
  scoreValue: { color: colors.pink, fontSize: 64, fontFamily: fonts.display700, lineHeight: 70 },
  scoreUnit: { color: colors.text2, fontSize: 13, fontFamily: fonts.display600, marginBottom: 16 },
  statRow: { flexDirection: 'row', width: '100%', marginTop: 4 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: colors.text1, fontSize: 20, fontFamily: fonts.display700 },
  statLabel: { color: colors.text3, fontSize: 11, fontFamily: fonts.display400, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.lineStrong, marginVertical: 4 },

  levelRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  levelPip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg3,
    gap: 3,
  },
  levelPipCurrent: { borderColor: colors.pink, backgroundColor: `${colors.pink}18` },
  levelPipDone: { borderColor: colors.correct, backgroundColor: `${colors.correct}14` },
  levelPipLocked: { borderColor: colors.line, backgroundColor: colors.bg3, opacity: 0.5 },
  levelPipText: { color: colors.text1, fontSize: 14, fontFamily: fonts.display700 },
  levelPipTextLocked: { color: colors.text3 },
  levelPipLabel: { color: colors.text2, fontSize: 10, fontFamily: fonts.display500 },

  hintBanner: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.yellow,
    backgroundColor: `${colors.yellow}12`,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  hintText: { color: colors.yellow, fontSize: 13, fontFamily: fonts.display500, textAlign: 'center' },

  actionGroup: { width: '100%', gap: 10 },

  btnPrimary: {
    width: '100%',
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.pink,
  },
  btnPrimaryText: { color: colors.text1, fontSize: 17, fontFamily: fonts.display700 },
  btnSecondary: {
    width: '100%',
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  btnSecondaryText: { color: colors.text2, fontSize: 15, fontFamily: fonts.display600 },
});
