import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CategoryId } from '../types';
import { getCategoryById } from '../data/categories';
import { colors, fonts, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'SurvivalResult'>;

function streakTitle(maxStreak: number): string {
  if (maxStreak >= 15) return '🔥 Legendarisk!';
  if (maxStreak >= 10) return '⚡ Oslagbar!';
  if (maxStreak >= 5) return '🎯 Imponerande!';
  if (maxStreak >= 3) return '👏 Bra jobbat!';
  return '💪 Försök igen!';
}

export default function SurvivalResultScreen({ route, navigation }: Props) {
  const { score, correctAnswers, maxStreak, categoryId, isNewHighscore, previousHighscore } = route.params;
  const category = categoryId !== 'all' ? getCategoryById(categoryId as CategoryId) : null;
  const accentColor = category?.color ?? colors.pink;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.container}>
        <Text style={styles.title}>Överlevnadsläge</Text>
        <Text style={styles.subtitle}>Game over!</Text>

        {isNewHighscore && (
          <View style={[styles.newHighscoreBanner, { borderColor: accentColor }]}>
            <Text style={[styles.newHighscoreText, { color: accentColor }]}>
              🏆 Nytt rekord!
            </Text>
            {previousHighscore > 0 && (
              <Text style={styles.previousHighscoreText}>
                Tidigare: {previousHighscore.toLocaleString('sv-SE')} XP
              </Text>
            )}
          </View>
        )}

        <View style={styles.scoreCard}>
          <Text style={styles.streakTitle}>{streakTitle(maxStreak)}</Text>
          <Text style={[styles.scoreValue, { color: accentColor }]}>
            {score.toLocaleString('sv-SE')}
          </Text>
          <Text style={styles.scoreLabel}>XP</Text>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{correctAnswers}</Text>
              <Text style={styles.statLabel}>Rätta svar</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: accentColor }]}>{maxStreak}</Text>
              <Text style={styles.statLabel}>Längsta svit</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {maxStreak >= 15 ? '3×' : maxStreak >= 10 ? '2×' : maxStreak >= 5 ? '1.5×' : '1×'}
              </Text>
              <Text style={styles.statLabel}>Max multipel</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.replace('Survival', { categoryId })}
          style={[styles.btn, { backgroundColor: accentColor }]}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Spela igen  ↺</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.btnSecondary}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>← Tillbaka till menyn</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: { color: colors.text2, fontSize: 13, fontFamily: fonts.display600, letterSpacing: 1.5, textTransform: 'uppercase' },
  subtitle: { color: colors.text1, fontSize: 28, fontFamily: fonts.display700, marginTop: -8 },
  newHighscoreBanner: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 4,
  },
  newHighscoreText: {
    fontSize: 18,
    fontFamily: fonts.display700,
    letterSpacing: 0.5,
  },
  previousHighscoreText: {
    color: colors.text3,
    fontSize: 12,
    fontFamily: fonts.display400,
  },
  scoreCard: {
    width: '100%',
    backgroundColor: colors.bg2,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    gap: 4,
  },
  streakTitle: { color: colors.text2, fontSize: 15, fontFamily: fonts.display600, marginBottom: 8 },
  scoreValue: { fontSize: 64, fontFamily: fonts.display700, lineHeight: 72 },
  scoreLabel: { color: colors.text2, fontSize: 14, fontFamily: fonts.display600, marginBottom: 20 },
  statRow: { flexDirection: 'row', width: '100%', marginTop: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: colors.text1, fontSize: 22, fontFamily: fonts.display700 },
  statLabel: { color: colors.text3, fontSize: 11, fontFamily: fonts.display400, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.lineStrong, marginVertical: 4 },
  btn: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: colors.text1, fontSize: 17, fontFamily: fonts.display700 },
  btnSecondary: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.lineStrong },
  btnSecondaryText: { color: colors.text2, fontSize: 16, fontFamily: fonts.display600 },
});
