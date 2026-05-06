import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getCategoryById } from '../data/categories';

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeResult'>;

export default function ChallengeResultScreen({ route, navigation }: Props) {
  const { mode, categoryId, myScore, challengeCode, challengerName, challengerScore, targetFriendName } = route.params;
  const category = getCategoryById(categoryId);

  const handleShare = async () => {
    if (!challengeCode) return;
    try {
      await Share.share({
        message: `Jag fick ${myScore} XP i Quizine! Kan du slå det? Använd koden ${challengeCode} för att svara på min utmaning 🍽️`,
      });
    } catch {}
  };

  const didWin =
    challengerScore !== undefined
      ? myScore > challengerScore
      : null;

  const isTie = challengerScore !== undefined && myScore === challengerScore;

  const resultEmoji = isTie ? '🤝' : didWin === true ? '🏆' : didWin === false ? '💪' : '⚔️';
  const resultText = isTie
    ? 'Oavgjort!'
    : didWin === true
    ? 'Du vann!'
    : didWin === false
    ? 'Bättre lycka nästa gång!'
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.container}>
        <Text style={styles.emoji}>{resultEmoji}</Text>

        {mode === 'create' ? (
          <>
            <Text style={styles.heading}>Utmaning skapad!</Text>
            <Text style={styles.sub}>
              {targetFriendName
                ? `${targetFriendName} kan nu hitta din utmaning i sitt utmaningsläge`
                : 'Din vän behöver den här koden för att svara'}
            </Text>

            <View style={[styles.codeBox, { borderColor: category?.color ?? '#2EC4B6' }]}>
              <Text style={styles.codeLabel}>KOD</Text>
              <Text style={[styles.code, { color: category?.color ?? '#2EC4B6' }]}>
                {challengeCode}
              </Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Din poäng</Text>
              <Text style={[styles.scoreValue, { color: category?.color ?? '#2EC4B6' }]}>
                {myScore} XP
              </Text>
            </View>

            <TouchableOpacity onPress={handleShare} style={[styles.primaryBtn, { backgroundColor: category?.color ?? '#2EC4B6' }]}>
              <Text style={styles.primaryBtnText}>Dela kod  ↗</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {resultText ? (
              <Text style={styles.heading}>{resultText}</Text>
            ) : null}

            <View style={styles.scoreCard}>
              <View style={styles.scoreCol}>
                <Text style={styles.playerLabel}>Du</Text>
                <Text style={[styles.playerScore, { color: category?.color ?? '#2EC4B6' }]}>
                  {myScore}
                </Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
              <Text style={styles.vs}>VS</Text>
              <View style={styles.scoreCol}>
                <Text style={styles.playerLabel} numberOfLines={1}>
                  {challengerName ?? 'Motståndare'}
                </Text>
                <Text style={[styles.playerScore, { color: '#B0A8C8' }]}>
                  {challengerScore ?? '?'}
                </Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
            </View>

            {challengerScore === undefined && (
              <Text style={styles.pendingSub}>
                Motståndaren har inte spelat än — resultatet uppdateras när de är klara.
              </Text>
            )}
          </>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('ChallengeLobby', {})}
          style={styles.outlineBtn}
        >
          <Text style={styles.outlineBtnText}>Ny utmaning ⚔️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.ghostBtn}
        >
          <Text style={styles.ghostBtnText}>Tillbaka till menyn</Text>
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
    paddingHorizontal: 28,
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Poppins_800ExtraBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  codeBox: {
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  codeLabel: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 3,
    marginBottom: 6,
  },
  code: {
    fontSize: 40,
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  scoreLabel: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  scoreValue: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 28,
    gap: 16,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  playerLabel: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  playerScore: {
    fontSize: 42,
    fontFamily: 'Poppins_800ExtraBold',
  },
  xpLabel: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  vs: {
    color: '#3D2870',
    fontSize: 16,
    fontFamily: 'Poppins_800ExtraBold',
  },
  pendingSub: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  outlineBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2EC4B6',
    marginBottom: 12,
  },
  outlineBtnText: {
    color: '#2EC4B6',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  ghostBtn: { paddingVertical: 10 },
  ghostBtnText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
});
