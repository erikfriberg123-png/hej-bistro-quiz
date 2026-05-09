import React, { useEffect, useState } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeLobby'>;

export default function ChallengeLobbyScreen({ route, navigation }: Props) {
  const { preselectedFriendId, preselectedFriendName } = route.params ?? {};

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(
    preselectedFriendId && preselectedFriendName
      ? { user_id: preselectedFriendId, username: preselectedFriendName }
      : null,
  );
  const [creating, setCreating] = useState(false);
  const [findingRandom, setFindingRandom] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [myBattles, setMyBattles] = useState<Battle[]>([]);
  const [pendingBattles, setPendingBattles] = useState<Battle[]>([]);

  useEffect(() => {
    getFriends().then(setFriends).catch(() => {});
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      getMyBattles().then(setMyBattles).catch(() => {});
      getPendingBattlesForMe().then(setPendingBattles).catch(() => {});
    }, []),
  );

  const handleCreate = async () => {
    if (!selectedFriend) return;
    setCreating(true);
    try {
      const name = (await getUsername()) ?? 'Anonym';

      const existing = await findActiveBattleBetween(selectedFriend.user_id);
      if (existing) {
        const { data: { user } } = await supabase.auth.getUser();
        const role: 'creator' | 'opponent' = existing.creator_id === user?.id ? 'creator' : 'opponent';
        Alert.alert(
          'Battle pågår redan',
          `Du har redan en pågående battle med ${selectedFriend.username}. Vill du öppna den?`,
          [
            { text: 'Avbryt', style: 'cancel' },
            {
              text: 'Öppna battle',
              onPress: () => navigation.navigate('BattleBoard', {
                battleId: existing.id,
                code: existing.code,
                role,
              }),
            },
          ],
        );
        return;
      }

      const battle = await createBattle(name, selectedFriend.user_id, 'friend');
      navigation.navigate('BattlePickCategory', {
        battleId: battle.id,
        code: battle.code,
        role: 'creator',
        roundNumber: 1,
        creatorScore: 0,
        opponentScore: 0,
        creatorName: name,
        opponentName: selectedFriend.username,
      });
    } catch {
      Alert.alert('Fel', 'Kunde inte skapa battle. Kontrollera anslutningen och försök igen.');
    } finally {
      setCreating(false);
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
          navigation.navigate('BattleBoard', {
            battleId: openBattle.id,
            code: openBattle.code,
            role: 'opponent',
          });
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

      const role: 'creator' | 'opponent' =
        user.id === battle.creator_id ? 'creator' : 'opponent';

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
          navigation.navigate('BattleBoard', {
            battleId: battle.id,
            code: battle.code,
            role: 'opponent',
          });
        }
        return;
      }

      navigation.navigate('BattleBoard', {
        battleId: battle.id,
        code: battle.code,
        role,
      });
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta battle. Försök igen.');
    } finally {
      setJoining(false);
    }
  };

  const resumeBattle = async (battle: Battle) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const role: 'creator' | 'opponent' =
      user.id === battle.creator_id ? 'creator' : 'opponent';
    navigation.navigate('BattleBoard', {
      battleId: battle.id,
      code: battle.code,
      role,
    });
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
        navigation.navigate('BattleBoard', {
          battleId: battle.id,
          code: battle.code,
          role: 'opponent',
        });
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
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚔️  Battle</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
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
        {/* Create panel */}
        {tab === 'create' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Ny battle</Text>
            <Text style={styles.panelSub}>
              Utmana en vän eller hitta en slumpmässig motståndare. Du väljer kategori i varje omgång.
            </Text>

            {friends.length > 0 ? (
              <>
                <Text style={styles.subLabel}>Utmana en vän</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsRow}
                >
                  {friends.map(f => (
                    <TouchableOpacity
                      key={f.user_id}
                      onPress={() =>
                        setSelectedFriend(
                          selectedFriend?.user_id === f.user_id ? null : f,
                        )
                      }
                      style={[
                        styles.friendPill,
                        selectedFriend?.user_id === f.user_id && styles.friendPillActive,
                      ]}
                    >
                      <Text style={styles.friendAvatar}>
                        {f.username.charAt(0).toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.friendPillText,
                          selectedFriend?.user_id === f.user_id && styles.friendPillTextActive,
                        ]}
                      >
                        {f.username}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  onPress={handleCreate}
                  style={[
                    styles.actionBtn,
                    (!selectedFriend || creating) && styles.actionBtnDisabled,
                  ]}
                  disabled={!selectedFriend || creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {selectedFriend
                        ? `Utmana ${selectedFriend.username}  ⚔️`
                        : 'Välj en vän ovan'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ELLER</Text>
                  <View style={styles.orLine} />
                </View>
              </>
            ) : (
              <Text style={styles.noFriendsHint}>
                Lägg till vänner under fliken Vänner för att utmana dem direkt.
              </Text>
            )}

            <TouchableOpacity
              onPress={handleFindRandom}
              style={[styles.randomBtn, findingRandom && styles.actionBtnDisabled]}
              disabled={findingRandom}
            >
              {findingRandom ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>Slumpmässig motståndare  🎲</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Join panel */}
        {tab === 'join' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Gå med</Text>
            <Text style={styles.panelSub}>
              Ange den 6-teckens kod du fått från din motståndare.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={v => setCode(v.toUpperCase())}
              placeholder="XXXXXX"
              placeholderTextColor="#6050A0"
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleJoin}
              style={[
                styles.actionBtn,
                (joining || code.trim().length < 6) && styles.actionBtnDisabled,
              ]}
              disabled={joining || code.trim().length < 6}
            >
              {joining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>Gå med i battle  →</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Incoming challenges */}
        {pendingBattles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>UTMANINGAR ({pendingBattles.length})</Text>
            {pendingBattles.map(b => (
              <View key={b.id} style={styles.challengeCard}>
                <View style={styles.challengeCardLeft}>
                  <Text style={styles.challengeCardName}>{b.creator_name} utmanar dig!</Text>
                  <Text style={styles.challengeCardCode}>Kod: {b.code}</Text>
                </View>
                <View style={styles.challengeCardBtns}>
                  <TouchableOpacity
                    onPress={() => handleDeclineChallenge(b)}
                    style={styles.declineBtn}
                  >
                    <Text style={styles.declineBtnText}>Avböj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAcceptChallenge(b)}
                    style={styles.acceptBtn}
                  >
                    <Text style={styles.acceptBtnText}>Acceptera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active battles */}
        {myBattles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PÅGÅENDE BATTLES</Text>
            {myBattles.map(b => (
              <ActiveBattleCard
                key={b.id}
                battle={b}
                onPress={() => resumeBattle(b)}
              />
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
  safe: { flex: 1, backgroundColor: '#12082A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: '#B0A8C8', fontSize: 22 },
  title: { color: '#FFFFFF', fontSize: 20, fontFamily: 'DMSans_700Bold' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#1E1040',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#9B5DE5' },
  tabText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  tabTextActive: { color: '#FFFFFF' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  panel: {
    backgroundColor: '#1E1040',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
  },
  panelSub: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 22,
    marginTop: -8,
  },
  subLabel: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  friendsRow: { gap: 8, paddingBottom: 4 },
  friendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A50',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  friendPillActive: {
    borderColor: '#9B5DE5',
    backgroundColor: '#2A1860',
  },
  friendAvatar: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
  },
  friendPillText: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  friendPillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
  },
  actionBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
  },
  randomBtn: {
    backgroundColor: '#00C896',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: -4,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A1860',
  },
  orText: {
    color: '#6050A0',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
  },
  noFriendsHint: {
    color: '#6050A0',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  codeInput: {
    backgroundColor: '#2A1A50',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    borderWidth: 1,
    borderColor: '#3D2870',
    textAlign: 'center',
    letterSpacing: 8,
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  battleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A1860',
    gap: 12,
  },
  battleCardLeft: { flex: 1 },
  battleCardOpponent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 2,
  },
  battleCardMeta: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  battleCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  battleCardCode: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 2,
  },
  battleCardArrow: {
    color: '#9B5DE5',
    fontSize: 18,
    fontFamily: 'DMSans_600SemiBold',
  },
  challengeCard: {
    backgroundColor: '#0D2A2A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#2EC4B6',
    gap: 12,
  },
  challengeCardLeft: { flex: 1 },
  challengeCardName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 2,
  },
  challengeCardCode: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  challengeCardBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#2A1A50',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#2EC4B6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
  },
});
