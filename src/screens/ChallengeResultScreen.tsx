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
import { colors, fonts, radius, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeResult'>;

export default function ChallengeResultScreen({ route, navigation }: Props) {
  const { mode, categoryId, myScore, challengeCode, challengerName, challengerScore, targetFriendName } = route.params;
  const category = getCategoryById(categoryId);
  const accentColor = category?.color ?? colors.cyan;

  const handleShare = async () => {
    if (!challengeCode) return;
    try {
      await Share.share({
        message: `Jag fick ${myScore} XP i Quizine! Kan du slå det? Använd koden ${challengeCode} för att svara på min utmaning 🍽️`,
      });
    } catch {}
  };

  const didWin = challengerScore !== undefined ? myScore > challengerScore : null;
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
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

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

            <View style={[styles.codeBox, { borderColor: accentColor }]}>
              <Text style={styles.codeLabel}>KOD</Text>
              <Text style={[styles.code, { color: accentColor }]}>{challengeCode}</Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Din poäng</Text>
              <Text style={[styles.scoreValue, { color: colors.yellow }]}>{myScore} XP</Text>
            </View>

            <TouchableOpacity
              onPress={handleShare}
              style={[styles.primaryBtn, { borderColor: accentColor }]}
            >
              <Text style={[styles.primaryBtnText, { color: accentColor }]}>Dela kod  ↗</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {resultText ? <Text style={styles.heading}>{resultText}</Text> : null}

            <View style={styles.scoreCard}>
              <View style={styles.scoreCol}>
                <Text style={styles.playerLabel}>Du</Text>
                <Text style={[styles.playerScore, { color: colors.yellow }]}>{myScore}</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
              <Text style={styles.vs}>VS</Text>
              <View style={styles.scoreCol}>
                <Text style={styles.playerLabel} numberOfLines={1}>
                  {challengerName ?? 'Motståndare'}
                </Text>
                <Text style={[styles.playerScore, { color: colors.text2 }]}>
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

        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Tillbaka till menyn</Text>
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
    paddingHorizontal: spacing.s7,
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  heading: {
    color: colors.text1,
    fontSize: 28,
    fontFamily: fonts.display700,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sub: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  codeBox: {
    borderWidth: 1.5,
    borderRadius: radius.xl,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    backgroundColor: colors.bg2,
  },
  codeLabel: {
    color: colors.text3,
    fontSize: 10.5,
    fontFamily: fonts.mono700,
    letterSpacing: 0.2 * 10.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  code: {
    fontSize: 38,
    fontFamily: fonts.mono700,
    letterSpacing: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  scoreLabel: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display500,
  },
  scoreValue: {
    fontSize: 22,
    fontFamily: fonts.mono700,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.xl,
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
    color: colors.text2,
    fontSize: 13,
    fontFamily: fonts.display500,
  },
  playerScore: {
    fontSize: 42,
    fontFamily: fonts.mono700,
    lineHeight: 50,
  },
  xpLabel: {
    color: colors.text3,
    fontSize: 12,
    fontFamily: fonts.mono500,
  },
  vs: {
    color: colors.lineStrong,
    fontSize: 14,
    fontFamily: fonts.mono700,
    letterSpacing: 2,
  },
  pendingSub: {
    color: colors.text2,
    fontSize: 13,
    fontFamily: fonts.display400,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    backgroundColor: colors.bg2,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: fonts.display700,
  },
  outlineBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(54, 224, 224, 0.5)',
    backgroundColor: 'rgba(54, 224, 224, 0.06)',
    marginBottom: 12,
  },
  outlineBtnText: {
    color: colors.cyan,
    fontSize: 16,
    fontFamily: fonts.display600,
  },
  ghostBtn: { paddingVertical: 10 },
  ghostBtnText: {
    color: colors.text3,
    fontSize: 14,
    fontFamily: fonts.display500,
  },
});
