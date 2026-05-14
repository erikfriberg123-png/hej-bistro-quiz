import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CategoryId } from '../types';
import { getCategoryById } from '../data/categories';

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
  const accentColor = category?.color ?? '#E84393';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

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
  safe: { flex: 1, backgroundColor: '#12082A' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: { color: '#B0A8C8', fontSize: 13, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1.5, textTransform: 'uppercase' },
  subtitle: { color: '#FFFFFF', fontSize: 28, fontFamily: 'DMSans_800ExtraBold', marginTop: -8 },
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
    fontFamily: 'DMSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  previousHighscoreText: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  scoreCard: {
    width: '100%',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D2870',
    gap: 4,
  },
  streakTitle: { color: '#B0A8C8', fontSize: 15, fontFamily: 'DMSans_600SemiBold', marginBottom: 8 },
  scoreValue: { fontSize: 64, fontFamily: 'DMSans_800ExtraBold', lineHeight: 72 },
  scoreLabel: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_600SemiBold', marginBottom: 20 },
  statRow: { flexDirection: 'row', width: '100%', marginTop: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: '#FFFFFF', fontSize: 22, fontFamily: 'DMSans_700Bold' },
  statLabel: { color: '#6050A0', fontSize: 11, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#3D2870', marginVertical: 4 },
  btn: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'DMSans_700Bold' },
  btnSecondary: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: '#1E1040', borderWidth: 1, borderColor: '#3D2870' },
  btnSecondaryText: { color: '#B0A8C8', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
});
