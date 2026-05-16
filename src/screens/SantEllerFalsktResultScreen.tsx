import React, { useEffect, useState } from 'react';
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
  const { round, score, correctAnswers, isNewBest, previousBest } = route.params;
  const isLastRound = round >= TOF_TOTAL_ROUNDS;
  const [allBests, setAllBests] = useState<Record<number, number>>({});

  useEffect(() => {
    getTofHighscores().then(setAllBests);
  }, []);

  const maxScore = TOF_QUESTIONS_PER_ROUND * TOF_POINTS_PER_CORRECT;
  const percentage = Math.round((score / maxScore) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

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

        {/* Actions */}
        {!isLastRound ? (
          <TouchableOpacity
            onPress={() => navigation.replace('SantEllerFalskt', { round: round + 1 })}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12082A' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  modeLabel: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  roundLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'DMSans_800ExtraBold',
    marginTop: -6,
  },
  newBestBanner: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F4C842',
    backgroundColor: 'rgba(244,200,66,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 2,
  },
  newBestText: { color: '#F4C842', fontSize: 16, fontFamily: 'DMSans_800ExtraBold' },
  prevBestText: { color: '#6050A0', fontSize: 12, fontFamily: 'DMSans_400Regular' },

  scoreCard: {
    width: '100%',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D2870',
    gap: 2,
  },
  roundTitle: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 },
  scoreValue: { color: '#9B5DE5', fontSize: 64, fontFamily: 'DMSans_800ExtraBold', lineHeight: 70 },
  scoreUnit: { color: '#B0A8C8', fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginBottom: 16 },
  statRow: { flexDirection: 'row', width: '100%', marginTop: 4 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: '#FFFFFF', fontSize: 20, fontFamily: 'DMSans_700Bold' },
  statLabel: { color: '#6050A0', fontSize: 11, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#3D2870', marginVertical: 4 },

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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2A1A50',
    backgroundColor: '#150B30',
    gap: 2,
  },
  roundPipCurrent: { borderColor: '#9B5DE5', backgroundColor: '#2A1060' },
  roundPipDone: { borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.08)' },
  roundPipNum: { color: '#B0A8C8', fontSize: 13, fontFamily: 'DMSans_700Bold' },
  roundPipScore: { color: '#6050A0', fontSize: 10, fontFamily: 'DMSans_500Medium' },

  btnPrimary: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#9B5DE5',
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'DMSans_700Bold' },
  btnSecondary: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  btnSecondaryText: { color: '#B0A8C8', fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
});
