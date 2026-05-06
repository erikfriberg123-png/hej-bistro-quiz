import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  HeadToHeadStats,
  getBattleById,
  getHeadToHeadStats,
} from '../lib/battles';

type Props = NativeStackScreenProps<RootStackParamList, 'BattleResult'>;

export default function BattleResultScreen({ route, navigation }: Props) {
  const {
    battleId,
    role,
    creatorScore,
    opponentScore,
    creatorName,
    opponentName,
    winner,
    totalRounds,
  } = route.params;

  const [stats, setStats] = useState<HeadToHeadStats | null>(null);

  useEffect(() => {
    getBattleById(battleId).then(b => {
      if (!b) return;
      const opponentId = role === 'creator' ? b.opponent_id : b.creator_id;
      if (opponentId) getHeadToHeadStats(opponentId).then(setStats);
    });
  }, [battleId, role]);

  const myScore = role === 'creator' ? creatorScore : opponentScore;
  const theirScore = role === 'creator' ? opponentScore : creatorScore;
  const myName = role === 'creator' ? creatorName : opponentName;
  const theirName = role === 'creator' ? opponentName : creatorName;

  const didWin = winner === role;
  const isDraw = winner === 'draw';

  const emoji = isDraw ? '🤝' : didWin ? '🏆' : '💪';
  const heading = isDraw
    ? 'Oavgjort!'
    : didWin
    ? 'Du vann!'
    : 'Bättre lycka nästa gång!';
  const sub = isDraw
    ? 'Ni var precis lika bra — en revanche kanske?'
    : didWin
    ? `Du slog ${theirName} med ${myScore - theirScore} XP!`
    : `${theirName} vann den här gången. Dags för en revanche!`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.sub}>{sub}</Text>

        <View style={styles.scoreCard}>
          <View style={styles.scoreCol}>
            <Text style={styles.playerName} numberOfLines={1}>{myName}</Text>
            <Text style={[styles.playerScore, { color: '#9B5DE5' }]}>{myScore}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.scoreCol}>
            <Text style={styles.playerName} numberOfLines={1}>{theirName}</Text>
            <Text style={styles.playerScore}>{theirScore}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        </View>

        <Text style={styles.rounds}>{totalRounds} omgångar spelade</Text>

        {stats && stats.total > 0 && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Er statistik</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statNum}>{stats.myWins}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  {role === 'creator' ? creatorName : opponentName}
                </Text>
              </View>
              {stats.draws > 0 && (
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, styles.statNumDraw]}>{stats.draws}</Text>
                  <Text style={styles.statLabel}>Oavgjort</Text>
                </View>
              )}
              <View style={styles.statCol}>
                <Text style={styles.statNum}>{stats.theirWins}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  {role === 'creator' ? opponentName : creatorName}
                </Text>
              </View>
            </View>
            <Text style={styles.statsTotal}>{stats.total} matcher totalt</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('ChallengeLobby', {})}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Ny battle  ⚔️</Text>
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
    lineHeight: 22,
    marginBottom: 28,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 12,
    gap: 16,
  },
  scoreCol: { flex: 1, alignItems: 'center', gap: 4 },
  playerName: { color: '#B0A8C8', fontSize: 13, fontFamily: 'Poppins_500Medium' },
  playerScore: {
    color: '#FFFFFF',
    fontSize: 42,
    fontFamily: 'Poppins_800ExtraBold',
  },
  xpLabel: { color: '#6050A0', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  vs: { color: '#3D2870', fontSize: 16, fontFamily: 'Poppins_800ExtraBold' },
  rounds: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 16,
  },
  statsCard: {
    width: '100%',
    backgroundColor: '#1E1040',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  statsTitle: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: { alignItems: 'center', gap: 2, flex: 1 },
  statNum: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'Poppins_800ExtraBold',
  },
  statNumDraw: { color: '#6050A0', fontSize: 24 },
  statLabel: {
    color: '#6050A0',
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  statsTotal: {
    color: '#3D2870',
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
  },
  primaryBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 14,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  ghostBtn: { paddingVertical: 10 },
  ghostBtnText: { color: '#B0A8C8', fontSize: 14, fontFamily: 'Poppins_500Medium' },
});
