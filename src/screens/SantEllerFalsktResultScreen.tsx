import React, { useEffect, useMemo, useState } from 'react';
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
import { getTofHighscores } from '../lib/tofHighscores';
import { submitTofScore } from '../lib/scores';
import { useGameStore } from '../store/gameStore';
import { fonts, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SantEllerFalsktResult'>;

function roundTitle(correct: number): string {
  const max = TOF_QUESTIONS_PER_ROUND;
  if (correct === max) return '🏆 Perfekt runda!';
  if (correct >= max * 0.8) return '🎯 Riktigt bra!';
  if (correct >= max * 0.6) return '👏 Godkänt!';
  if (correct >= max * 0.4) return '💪 Fortsätt öva!';
  return '🤔 Tufft det här!';
}

export default function SantEllerFalsktResultScreen({ route, navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { round, score, correctAnswers, isNewBest, previousBest, cumulativeScore } = route.params;
  const isLastRound = round >= TOF_TOTAL_ROUNDS;
  const currentArea = useGameStore(s => s.currentArea);
  const [allBests, setAllBests] = useState<Record<number, number>>({});

  useEffect(() => {
    getTofHighscores().then(setAllBests);
    if (isLastRound) submitTofScore(cumulativeScore, currentArea);
  }, []);

  const maxScore = TOF_QUESTIONS_PER_ROUND * TOF_POINTS_PER_CORRECT;
  const percentage = Math.round((score / maxScore) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.container}>
        <Text style={styles.modeLabel}>Sant eller Falskt</Text>
        <Text style={styles.roundLabel}>Runda {round} — {TOF_DIFFICULTY_LABEL[TOF_ROUND_DIFFICULTIES[round - 1]]}</Text>

        {isNewBest && (
          <View style={styles.newBestBanner}>
            <Text style={styles.newBestText}>🏅 Nytt rekord!</Text>
            {previousBest > 0 && (
              <Text style={styles.prevBestText}>Tidigare: {previousBest} p</Text>
            )}
          </View>
        )}

        {/* Score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.roundTitle}>{roundTitle(correctAnswers)}</Text>
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

        {/* Round progress */}
        <View style={styles.roundProgress}>
          {Array.from({ length: TOF_TOTAL_ROUNDS }).map((_, i) => {
            const r = i + 1;
            const best = r === round ? score : (allBests[r] ?? 0);
            const done = r < round || (r === round);
            const isCurrent = r === round;
            return (
              <View key={r} style={[styles.roundPip, isCurrent && styles.roundPipCurrent, done && !isCurrent && styles.roundPipDone]}>
                <Text style={styles.roundPipNum}>{r}</Text>
                {done && <Text style={styles.roundPipScore}>{best}p</Text>}
              </View>
            );
          })}
        </View>

        {/* Total score on last round */}
        {isLastRound && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Totalt alla rundor</Text>
            <Text style={styles.totalScore}>{cumulativeScore} <Text style={styles.totalUnit}>p</Text></Text>
          </View>
        )}

        {/* Actions */}
        {!isLastRound ? (
          <TouchableOpacity
            onPress={() => navigation.replace('SantEllerFalskt', { round: round + 1, cumulativeScore })}
            style={styles.btnPrimary}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Nästa runda  →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.replace('SantEllerFalskt', { round: 1 })}
            style={styles.btnPrimary}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Spela igen  ↺</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.btnSecondary}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Fortsätt senare</Text>
        </TouchableOpacity>
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
  roundLabel: {
    color: colors.text1,
    fontSize: 22,
    fontFamily: fonts.display700,
    marginTop: -6,
  },
  newBestBanner: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.yellow,
    backgroundColor: `${colors.yellow}14`,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 2,
  },
  newBestText: { color: colors.yellow, fontSize: 16, fontFamily: fonts.display700 },
  prevBestText: { color: colors.text3, fontSize: 12, fontFamily: fonts.display400 },

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
  roundTitle: { color: colors.text2, fontSize: 14, fontFamily: fonts.display600, marginBottom: 6 },
  scoreValue: { color: colors.pink, fontSize: 64, fontFamily: fonts.display700, lineHeight: 70 },
  scoreUnit: { color: colors.text2, fontSize: 13, fontFamily: fonts.display600, marginBottom: 16 },
  statRow: { flexDirection: 'row', width: '100%', marginTop: 4 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: colors.text1, fontSize: 20, fontFamily: fonts.display700 },
  statLabel: { color: colors.text3, fontSize: 11, fontFamily: fonts.display400, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.lineStrong, marginVertical: 4 },

  roundProgress: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  roundPip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg3,
    gap: 2,
  },
  roundPipCurrent: { borderColor: colors.pink, backgroundColor: `${colors.pink}18` },
  roundPipDone: { borderColor: colors.correct, backgroundColor: `${colors.correct}14` },
  roundPipNum: { color: colors.text2, fontSize: 13, fontFamily: fonts.display700 },
  roundPipScore: { color: colors.text3, fontSize: 10, fontFamily: fonts.display500 },

  totalCard: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.pink,
    backgroundColor: `${colors.pink}14`,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 2,
  },
  totalLabel: { color: colors.text2, fontSize: 11, fontFamily: fonts.display600, letterSpacing: 1, textTransform: 'uppercase' },
  totalScore: { color: colors.pink, fontSize: 40, fontFamily: fonts.display700, lineHeight: 46 },
  totalUnit: { fontSize: 18, color: colors.text2 },

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
