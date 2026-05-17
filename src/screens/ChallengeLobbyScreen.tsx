import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getFriends, FriendProfile } from '../lib/friends';
import {
  Battle,
  computeBattleState,
  createBattle,
  declineBattle,
  findActiveBattleBetween,
  findOpenRandomBattle,
  getBattleByCode,
  getMyBattles,
  getPendingBattlesForMe,
} from '../lib/battles';
import { getUsername } from '../lib/scores';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeLobby'>;

export default function ChallengeLobbyScreen({ route, navigation }: Props) {
  const { preselectedFriendId, preselectedFriendName } = route.params ?? {};

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [findingRandom, setFindingRandom] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [myBattles, setMyBattles] = useState<Battle[]>([]);
  const [pendingBattles, setPendingBattles] = useState<Battle[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const refreshAll = useCallback(async () => {
    const [battles, pending] = await Promise.all([
      getMyBattles().catch((): Battle[] => []),
      getPendingBattlesForMe().catch((): Battle[] => []),
    ]);
    setMyBattles(battles);
    setPendingBattles(pending);
  }, []);

  useEffect(() => {
    getFriends().then(setFriends).catch(() => {});
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { userIdRef.current = user.id; setUserId(user.id); }
    });
  }, []);

  useFocusEffect(
    useCallback(() => { refreshAll(); }, [refreshAll]),
  );

  useEffect(() => {
    const uid = userId;
    if (!uid) return;
    const suffix = Date.now();
    const ch1 = supabase
      .channel(`lobby-cr-${uid}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `creator_id=eq.${uid}` }, refreshAll)
      .subscribe();
    const ch2 = supabase
      .channel(`lobby-op-${uid}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `opponent_id=eq.${uid}` }, refreshAll)
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId, refreshAll]);

  const handleChallengeFriend = async (friend: FriendProfile) => {
    setCreatingFor(friend.user_id);
    try {
      const name = (await getUsername()) ?? 'Anonym';
      const existing = await findActiveBattleBetween(friend.user_id);
      if (existing) {
        const { data: { user } } = await supabase.auth.getUser();
        const role: 'creator' | 'opponent' = existing.creator_id === user?.id ? 'creator' : 'opponent';
        Alert.alert(
          'Battle pågår redan',
          `Du har redan en pågående battle med ${friend.username}. Vill du öppna den?`,
          [
            { text: 'Avbryt', style: 'cancel' },
            { text: 'Öppna battle', onPress: () => navigation.navigate('BattleBoard', { battleId: existing.id, code: existing.code, role }) },
          ],
        );
        return;
      }
      const battle = await createBattle(name, friend.user_id, 'friend');
      navigation.navigate('BattlePickCategory', {
        battleId: battle.id,
        code: battle.code,
        role: 'creator',
        roundNumber: 1,
        creatorScore: 0,
        opponentScore: 0,
        creatorName: name,
        opponentName: friend.username,
      });
    } catch {
      Alert.alert('Fel', 'Kunde inte skapa battle. Kontrollera anslutningen och försök igen.');
    } finally {
      setCreatingFor(null);
    }
  };

  const handleFindRandom = async () => {
    setFindingRandom(true);
    try {
      const name = (await getUsername()) ?? 'Anonym';
      const openBattle = await findOpenRandomBattle();

      if (openBattle) {
        const state = computeBattleState(openBattle);
        const opponentRoundsPlayed = openBattle.opponent_turns.length;
        const creatorTurn = openBattle.creator_turns[opponentRoundsPlayed];

        if (creatorTurn) {
          navigation.navigate('BattleRound', {
            battleId: openBattle.id,
            code: openBattle.code,
            role: 'opponent',
            roundNumber: opponentRoundsPlayed + 1,
            category: creatorTurn.category,
            creatorScore: state.creatorScore,
            opponentScore: state.opponentScore,
            creatorName: openBattle.creator_name,
            opponentName: name,
            questionIds: creatorTurn.questionIds,
          });
        } else {
          navigation.navigate('BattleBoard', { battleId: openBattle.id, code: openBattle.code, role: 'opponent' });
        }
      } else {
        const battle = await createBattle(name, undefined, 'random');
        navigation.navigate('BattlePickCategory', {
          battleId: battle.id,
          code: battle.code,
          role: 'creator',
          roundNumber: 1,
          creatorScore: 0,
          opponentScore: 0,
          creatorName: name,
          opponentName: 'Slumpmässig motståndare',
        });
      }
    } catch {
      Alert.alert('Fel', 'Kunde inte hitta en motståndare. Försök igen.');
    } finally {
      setFindingRandom(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) return;
    setJoining(true);
    try {
      const battle = await getBattleByCode(trimmed);
      if (!battle) {
        Alert.alert('Hittades inte', 'Ingen battle med den koden. Kontrollera koden och försök igen.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const role: 'creator' | 'opponent' = user.id === battle.creator_id ? 'creator' : 'opponent';

      if (battle.status === 'finished') {
        const state = computeBattleState(battle);
        navigation.navigate('BattleResult', {
          battleId: battle.id,
          role,
          creatorScore: state.creatorScore,
          opponentScore: state.opponentScore,
          creatorName: battle.creator_name,
          opponentName: battle.opponent_name ?? 'Motståndare',
          winner: state.winner ?? 'draw',
          totalRounds: Math.max(battle.creator_turns.length, battle.opponent_turns.length),
        });
        return;
      }

      if (battle.status === 'waiting_opponent' && role === 'opponent') {
        const myName = (await getUsername()) ?? 'Anonym';
        const state = computeBattleState(battle);
        const opponentRoundsPlayed = battle.opponent_turns.length;
        const creatorTurn = battle.creator_turns[opponentRoundsPlayed];

        if (creatorTurn) {
          navigation.navigate('BattleRound', {
            battleId: battle.id,
            code: battle.code,
            role: 'opponent',
            roundNumber: opponentRoundsPlayed + 1,
            category: creatorTurn.category,
            creatorScore: state.creatorScore,
            opponentScore: state.opponentScore,
            creatorName: battle.creator_name,
            opponentName: myName,
            questionIds: creatorTurn.questionIds,
          });
        } else {
          navigation.navigate('BattleBoard', { battleId: battle.id, code: battle.code, role: 'opponent' });
        }
        return;
      }

      navigation.navigate('BattleBoard', { battleId: battle.id, code: battle.code, role });
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta battle. Försök igen.');
    } finally {
      setJoining(false);
    }
  };

  const resumeBattle = async (battle: Battle) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const role: 'creator' | 'opponent' = user.id === battle.creator_id ? 'creator' : 'opponent';
    navigation.navigate('BattleBoard', { battleId: battle.id, code: battle.code, role });
  };

  const handleAcceptChallenge = async (battle: Battle) => {
    try {
      const myName = (await getUsername()) ?? 'Anonym';
      const opponentRoundsPlayed = battle.opponent_turns.length;
      const creatorTurn = battle.creator_turns[opponentRoundsPlayed];
      const state = computeBattleState(battle);

      if (creatorTurn) {
        navigation.navigate('BattleRound', {
          battleId: battle.id,
          code: battle.code,
          role: 'opponent',
          roundNumber: opponentRoundsPlayed + 1,
          category: creatorTurn.category,
          creatorScore: state.creatorScore,
          opponentScore: state.opponentScore,
          creatorName: battle.creator_name,
          opponentName: myName,
          questionIds: creatorTurn.questionIds,
        });
      } else {
        navigation.navigate('BattleBoard', { battleId: battle.id, code: battle.code, role: 'opponent' });
      }
    } catch {
      Alert.alert('Fel', 'Kunde inte acceptera utmaningen.');
    }
  };

  const handleDeclineChallenge = async (battle: Battle) => {
    try {
      await declineBattle(battle.id);
      setPendingBattles(prev => prev.filter(b => b.id !== battle.id));
    } catch {
      Alert.alert('Fel', 'Kunde inte avböja utmaningen.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚔️  Battle</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'create' && styles.tabActive]}
          onPress={() => setTab('create')}
        >
          <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>Skapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'join' && styles.tabActive]}
          onPress={() => setTab('join')}
        >
          <Text style={[styles.tabText, tab === 'join' && styles.tabTextActive]}>Gå med</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'create' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Ny battle</Text>
            <Text style={styles.panelSub}>
              Utmana en vän eller hitta en slumpmässig motståndare. Du väljer kategori i varje omgång.
            </Text>

            {friends.length > 0 ? (
              <>
                <Text style={styles.subLabel}>Utmana en vän</Text>
                {friends.map(f => (
                  <TouchableOpacity
                    key={f.user_id}
                    style={[styles.friendRow, !!creatingFor && creatingFor !== f.user_id && styles.friendRowDim]}
                    onPress={() => handleChallengeFriend(f)}
                    disabled={!!creatingFor}
                    activeOpacity={0.75}
                  >
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>{f.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.friendName}>{f.username}</Text>
                    <View style={styles.challengeBtn}>
                      {creatingFor === f.user_id ? (
                        <ActivityIndicator color={colors.bg0} size="small" />
                      ) : (
                        <Text style={styles.challengeBtnText}>Utmana ⚔️</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ELLER</Text>
                  <View style={styles.orLine} />
                </View>
              </>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('Friends')} style={styles.addFriendsBtn}>
                <Text style={styles.addFriendsBtnText}>👥  Lägg till vänner</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleFindRandom}
              style={[styles.randomBtn, findingRandom && styles.btnDisabled]}
              disabled={findingRandom}
            >
              {findingRandom ? (
                <ActivityIndicator color="#1a0010" />
              ) : (
                <Text style={styles.primaryBtnText}>Slumpmässig motståndare  🎲</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {tab === 'join' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Gå med</Text>
            <Text style={styles.panelSub}>Ange den 6-teckens kod du fått från din motståndare.</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={v => setCode(v.toUpperCase())}
              placeholder="XXXXXX"
              placeholderTextColor={colors.text4}
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleJoin}
              style={[styles.joinBtn, (joining || code.trim().length < 6) && styles.btnDisabled]}
              disabled={joining || code.trim().length < 6}
            >
              {joining ? (
                <ActivityIndicator color={colors.bg0} />
              ) : (
                <Text style={styles.primaryBtnText}>Gå med i battle  →</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {myBattles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pågående battles</Text>
            {myBattles.map(b => (
              <ActiveBattleCard key={b.id} battle={b} onPress={() => resumeBattle(b)} />
            ))}
          </View>
        )}

        {pendingBattles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Utmaningar ({pendingBattles.length})</Text>
            {pendingBattles.map(b => (
              <View key={b.id} style={styles.challengeCard}>
                <View style={styles.challengeCardLeft}>
                  <Text style={styles.challengeCardName}>{b.creator_name} utmanar dig!</Text>
                  <Text style={styles.challengeCardCode}>Kod: {b.code}</Text>
                </View>
                <View style={styles.challengeCardBtns}>
                  <TouchableOpacity onPress={() => handleDeclineChallenge(b)} style={styles.declineBtn}>
                    <Text style={styles.declineBtnText}>Avböj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleAcceptChallenge(b)} style={styles.acceptBtn}>
                    <Text style={styles.acceptBtnText}>Acceptera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveBattleCard({ battle, onPress }: { battle: Battle; onPress: () => void }) {
  const state = computeBattleState(battle);
  const opponent = battle.opponent_name ?? 'Väntar på motståndare...';
  const rounds = Math.max(battle.creator_turns.length, battle.opponent_turns.length);
  return (
    <TouchableOpacity style={styles.battleCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.battleCardLeft}>
        <Text style={styles.battleCardOpponent} numberOfLines={1}>vs {opponent}</Text>
        <Text style={styles.battleCardMeta}>
          {rounds} omgångar · {state.creatorScore} – {state.opponentScore} XP
        </Text>
      </View>
      <View style={styles.battleCardRight}>
        <Text style={styles.battleCardCode}>{battle.code}</Text>
        <Text style={styles.battleCardArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s2,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: colors.text2, fontSize: 22 },
  title: { color: colors.text1, fontSize: 20, fontFamily: fonts.display700, letterSpacing: -0.4 },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.s4,
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.s4,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: 'rgba(54, 224, 224, 0.15)', borderWidth: 1, borderColor: 'rgba(54, 224, 224, 0.4)' },
  tabText: { color: colors.text3, fontSize: 14, fontFamily: fonts.display600 },
  tabTextActive: { color: colors.cyan },

  scroll: { paddingHorizontal: spacing.s4, paddingBottom: 48 },

  panel: {
    backgroundColor: colors.bg2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.s5,
    gap: spacing.s4,
    marginBottom: 24,
  },
  panelTitle: { color: colors.text1, fontSize: 18, fontFamily: fonts.display700, letterSpacing: -0.3 },
  panelSub: { color: colors.text3, fontSize: 13.5, fontFamily: fonts.display400, lineHeight: 21, marginTop: -8 },

  subLabel: {
    color: colors.text3,
    fontSize: 10.5,
    fontFamily: fonts.mono700,
    letterSpacing: 0.22 * 10.5,
    textTransform: 'uppercase',
  },

  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg3,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  friendRowDim: { opacity: 0.45 },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(54, 224, 224, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(54, 224, 224, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: { color: colors.cyan, fontSize: 15, fontFamily: fonts.display700 },
  friendName: { flex: 1, color: colors.text1, fontSize: 15, fontFamily: fonts.display500 },
  challengeBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeBtnText: { color: colors.bg0, fontSize: 12.5, fontFamily: fonts.display700 },

  addFriendsBtn: {
    backgroundColor: colors.bg3,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  addFriendsBtnText: { color: colors.text2, fontSize: 15, fontFamily: fonts.display600 },

  randomBtn: {
    backgroundColor: colors.pink,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    shadowColor: colors.pink,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  joinBtn: {
    backgroundColor: colors.cyan,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#1a0010', fontSize: 16, fontFamily: fonts.display700 },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: -4 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.lineStrong },
  orText: { color: colors.text4, fontSize: 10.5, fontFamily: fonts.mono700, letterSpacing: 1.5 },

  codeInput: {
    backgroundColor: colors.bg3,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text1,
    fontSize: 28,
    fontFamily: fonts.mono700,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    textAlign: 'center',
    letterSpacing: 8,
  },

  section: { marginBottom: 24 },
  sectionLabel: {
    color: colors.text3,
    fontSize: 10.5,
    fontFamily: fonts.mono700,
    letterSpacing: 0.22 * 10.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  battleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    gap: 12,
  },
  battleCardLeft: { flex: 1 },
  battleCardOpponent: { color: colors.text1, fontSize: 14, fontFamily: fonts.display600, marginBottom: 2 },
  battleCardMeta: { color: colors.text3, fontSize: 12, fontFamily: fonts.display400 },
  battleCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  battleCardCode: { color: colors.text4, fontSize: 12, fontFamily: fonts.mono700, letterSpacing: 2 },
  battleCardArrow: { color: colors.cyan, fontSize: 18, fontFamily: fonts.display600 },

  challengeCard: {
    backgroundColor: 'rgba(54, 224, 224, 0.05)',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(54, 224, 224, 0.45)',
    gap: 12,
  },
  challengeCardLeft: { flex: 1 },
  challengeCardName: { color: colors.cyan, fontSize: 14, fontFamily: fonts.display600, marginBottom: 2 },
  challengeCardCode: { color: colors.text3, fontSize: 12, fontFamily: fonts.mono500 },
  challengeCardBtns: { flexDirection: 'row', gap: 8 },
  declineBtn: {
    flex: 1,
    backgroundColor: colors.bg3,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  declineBtnText: { color: colors.text2, fontSize: 13, fontFamily: fonts.display600 },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptBtnText: { color: colors.bg0, fontSize: 13, fontFamily: fonts.display700 },
});
