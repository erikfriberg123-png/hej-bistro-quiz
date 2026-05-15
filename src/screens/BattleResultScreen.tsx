import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  createBattle,
  getBattleById,
  getHeadToHeadStats,
} from '../lib/battles';
import { FriendStatus, getFriendStatus, sendFriendRequest } from '../lib/friends';
import { getUsername } from '../lib/scores';
import { colors, fonts, radius } from '../theme/tokens';

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
  const [opponentUserId, setOpponentUserId] = useState<string | null>(null);
  const [isRandomBattle, setIsRandomBattle] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [addingFriend, setAddingFriend] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);

  useEffect(() => {
    getBattleById(battleId).then(b => {
      if (!b) return;
      const oppId = role === 'creator' ? b.opponent_id : b.creator_id;
      setOpponentUserId(oppId);
      setIsRandomBattle(b.match_type === 'random');
      if (oppId) {
        getHeadToHeadStats(oppId).then(setStats);
        getFriendStatus(oppId).then(setFriendStatus);
      }
    });
  }, [battleId, role]);

  const myScore = role === 'creator' ? creatorScore : opponentScore;
  const theirScore = role === 'creator' ? opponentScore : creatorScore;
  const myName = role === 'creator' ? creatorName : opponentName;
  const theirName = role === 'creator' ? opponentName : creatorName;

  const handleRematch = async () => {
    if (!opponentUserId) return;
    setRematchLoading(true);
    try {
      const name = (await getUsername()) ?? 'Anonym';
      const battle = await createBattle(name, opponentUserId, isRandomBattle ? 'random' : 'friend');
      navigation.replace('BattlePickCategory', {
        battleId: battle.id,
        code: battle.code,
        role: 'creator',
        roundNumber: 1,
        creatorScore: 0,
        opponentScore: 0,
        creatorName: name,
        opponentName: theirName,
      });
    } catch {
      Alert.alert('Fel', 'Kunde inte starta revanche. Försök igen.');
    } finally {
      setRematchLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!opponentUserId) return;
    setAddingFriend(true);
    try {
      await sendFriendRequest(opponentUserId);
      setFriendStatus('pending_sent');
    } catch {
      Alert.alert('Fel', 'Kunde inte skicka vänförfrågan. Försök igen.');
    } finally {
      setAddingFriend(false);
    }
  };

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
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.sub}>{sub}</Text>

        <View style={styles.scoreCard}>
          <View style={styles.scoreCol}>
            <Text style={styles.playerName} numberOfLines={1}>{myName}</Text>
            <Text style={[styles.playerScore, { color: colors.pink }]}>{myScore}</Text>
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

        {opponentUserId && (
          <TouchableOpacity
            onPress={handleRematch}
            style={[styles.primaryBtn, rematchLoading && styles.btnDisabled]}
            disabled={rematchLoading}
          >
            {rematchLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Revanche  ⚔️</Text>
            )}
          </TouchableOpacity>
        )}

        {isRandomBattle && opponentUserId && friendStatus === 'none' && (
          <TouchableOpacity
            onPress={handleAddFriend}
            style={[styles.friendBtn, addingFriend && styles.btnDisabled]}
            disabled={addingFriend}
          >
            {addingFriend ? (
              <ActivityIndicator color={colors.pink} />
            ) : (
              <Text style={styles.friendBtnText}>Lägg till {theirName} som vän  👋</Text>
            )}
          </TouchableOpacity>
        )}

        {isRandomBattle && opponentUserId && friendStatus === 'pending_sent' && (
          <View style={styles.friendSentBadge}>
            <Text style={styles.friendSentText}>Vänförfrågan skickad  ✓</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('ChallengeLobby', {})}
          style={!opponentUserId ? styles.primaryBtn : styles.ghostBtn}
        >
          <Text style={!opponentUserId ? styles.primaryBtnText : styles.ghostBtnText}>
            Ny battle  ⚔️
          </Text>
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
  safe: { flex: 1, backgroundColor: colors.bg1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  heading: {
    color: colors.text1,
    fontSize: 28,
    fontFamily: fonts.display700,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 12,
    gap: 16,
  },
  scoreCol: { flex: 1, alignItems: 'center', gap: 4 },
  playerName: { color: colors.text2, fontSize: 13, fontFamily: fonts.display500 },
  playerScore: {
    color: colors.text1,
    fontSize: 42,
    fontFamily: fonts.display700,
  },
  xpLabel: { color: colors.text3, fontSize: 12, fontFamily: fonts.display600 },
  vs: { color: colors.lineStrong, fontSize: 16, fontFamily: fonts.display700 },
  rounds: {
    color: colors.text3,
    fontSize: 12,
    fontFamily: fonts.display500,
    marginBottom: 16,
  },
  statsCard: {
    width: '100%',
    backgroundColor: colors.bg2,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  statsTitle: {
    color: colors.text2,
    fontSize: 11,
    fontFamily: fonts.display600,
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
    color: colors.text1,
    fontSize: 32,
    fontFamily: fonts.display700,
  },
  statNumDraw: { color: colors.text3, fontSize: 24 },
  statLabel: {
    color: colors.text3,
    fontSize: 11,
    fontFamily: fonts.display500,
    textAlign: 'center',
  },
  statsTotal: {
    color: colors.lineStrong,
    fontSize: 11,
    fontFamily: fonts.display400,
  },
  primaryBtn: {
    backgroundColor: colors.pink,
    borderRadius: 14,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  primaryBtnText: { color: colors.text1, fontSize: 16, fontFamily: fonts.display700 },
  ghostBtn: { paddingVertical: 10 },
  ghostBtnText: { color: colors.text2, fontSize: 14, fontFamily: fonts.display500 },
  friendBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.pink,
    minHeight: 50,
    justifyContent: 'center',
  },
  friendBtnText: { color: colors.pink, fontSize: 15, fontFamily: fonts.display600 },
  friendSentBadge: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  friendSentText: { color: '#00C896', fontSize: 14, fontFamily: fonts.display600 },
  btnDisabled: { opacity: 0.5 },
});
