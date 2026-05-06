import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Battle, computeBattleState, forfeitBattle, getBattleById, normalizeBattle } from '../lib/battles';
import { CATEGORIES } from '../data/categories';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'BattleBoard'>;

function RoundResultCard({ correct, total }: { correct: number; total: number }) {
  const stars = Array.from({ length: total }, (_, i) => i < correct ? '⭐' : '○');
  return (
    <View style={roundCardStyles.card}>
      <Text style={roundCardStyles.stars}>{stars.join('  ')}</Text>
      <Text style={roundCardStyles.text}>
        Du klarade <Text style={roundCardStyles.highlight}>{correct}</Text> av {total} frågor
      </Text>
    </View>
  );
}

const roundCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#2A1860',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#9B5DE5',
  },
  stars: { fontSize: 20, letterSpacing: 4 },
  text: { color: '#B0A8C8', fontSize: 14, fontFamily: 'Poppins_400Regular' },
  highlight: { color: '#FFFFFF', fontFamily: 'Poppins_700Bold' },
});

export default function BattleBoardScreen({ route, navigation }: Props) {
  const { battleId, code, role, lastRoundCorrect, lastRoundTotal } = route.params;
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [forfeitConfirm, setForfeitConfirm] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const loadBattle = useCallback(async () => {
    try {
      const b = await getBattleById(battleId);
      setBattle(b);
    } catch {
      // keep previous state if refresh fails
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadBattle();
  }, [loadBattle]));

  // Realtime subscription — updates instantly when the other player finishes their turn
  useEffect(() => {
    const channel = supabase
      .channel(`battle:${battleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'battles', filter: `id=eq.${battleId}` },
        payload => { setBattle(normalizeBattle(payload.new)); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [battleId]);

  // Detect when opponent forfeits or finishes — show congrats banner
  useEffect(() => {
    if (!battle) return;
    const prev = prevStatusRef.current;
    if (prev !== null && prev !== 'finished' && battle.status === 'finished') {
      setJustFinished(true);
    }
    prevStatusRef.current = battle.status;
  }, [battle]);

  const handlePlayRound = () => {
    if (!battle) return;
    const state = computeBattleState(battle);

    if (role === 'creator') {
      navigation.navigate('BattlePickCategory', {
        battleId,
        code,
        role,
        roundNumber: battle.creator_turns.length + 1,
        creatorScore: state.creatorScore,
        opponentScore: state.opponentScore,
        creatorName: battle.creator_name,
        opponentName: battle.opponent_name ?? 'Motståndare',
      });
    } else {
      const opponentRoundsPlayed = battle.opponent_turns.length;
      const creatorTurn = battle.creator_turns[opponentRoundsPlayed];
      if (!creatorTurn) return;
      navigation.navigate('BattleRound', {
        battleId,
        code,
        role,
        roundNumber: opponentRoundsPlayed + 1,
        category: creatorTurn.category,
        creatorScore: state.creatorScore,
        opponentScore: state.opponentScore,
        creatorName: battle.creator_name,
        opponentName: battle.opponent_name ?? 'Motståndare',
        questionIds: creatorTurn.questionIds,
      });
    }
  };

  const handleSeeResult = () => {
    if (!battle) return;
    const state = computeBattleState(battle);
    navigation.replace('BattleResult', {
      battleId,
      role,
      creatorScore: state.creatorScore,
      opponentScore: state.opponentScore,
      creatorName: battle.creator_name,
      opponentName: battle.opponent_name ?? 'Motståndare',
      winner: state.winner ?? 'draw',
      totalRounds: Math.max(battle.creator_turns.length, battle.opponent_turns.length),
    });
  };

  const doForfeit = async () => {
    setForfeiting(true);
    try {
      await forfeitBattle(battleId, role);
      const b = battle;
      navigation.replace('BattleResult', {
        battleId,
        role,
        creatorScore: b ? b.creator_turns.reduce((s, t) => s + t.score, 0) : 0,
        opponentScore: b ? b.opponent_turns.reduce((s, t) => s + t.score, 0) : 0,
        creatorName: b?.creator_name ?? '',
        opponentName: b?.opponent_name ?? 'Motståndare',
        winner: role === 'creator' ? 'opponent' : 'creator',
        totalRounds: b ? Math.max(b.creator_turns.length, b.opponent_turns.length) : 0,
      });
    } catch {
      setForfeiting(false);
      setForfeitConfirm(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#9B5DE5" size="large" />
      </View>
    );
  }

  if (!battle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Kunde inte ladda battle.</Text>
        <TouchableOpacity onPress={loadBattle} style={styles.retryBtn}>
          <Text style={styles.retryText}>Försök igen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const state = computeBattleState(battle);
  const myName = role === 'creator' ? battle.creator_name : (battle.opponent_name ?? 'Du');
  const theirName = role === 'creator' ? (battle.opponent_name ?? 'Motståndare') : battle.creator_name;
  const myScore = role === 'creator' ? state.creatorScore : state.opponentScore;
  const theirScore = role === 'creator' ? state.opponentScore : state.creatorScore;
  const myTurns = role === 'creator' ? battle.creator_turns : battle.opponent_turns;
  const theirTurns = role === 'creator' ? battle.opponent_turns : battle.creator_turns;

  const isMyTurn =
    (role === 'creator' && state.nextTurn === 'creator') ||
    (role === 'opponent' && state.nextTurn === 'opponent');
  const isWaitingOpponent = battle.status === 'waiting_opponent';
  const iWon = state.winner === role;
  const wasForfeited = state.isFinished &&
    (battle.creator_turns.length < 4 || battle.opponent_turns.length < 4);

  const maxRounds = Math.max(myTurns.length, theirTurns.length);
  const roundRows = Array.from({ length: maxRounds }, (_, i) => ({
    roundNum: i + 1,
    myTurn: myTurns[i] ?? null,
    theirTurn: theirTurns[i] ?? null,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.homeBtn}>
          <Text style={styles.homeBtnText}>Hem</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚔️  Battle</Text>
        <View style={styles.codePill}>
          <Text style={styles.codeText}>{code}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Round result */}
        {lastRoundCorrect !== undefined && lastRoundTotal !== undefined && (
          <RoundResultCard correct={lastRoundCorrect} total={lastRoundTotal} />
        )}

        {/* Score */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCol}>
            <Text style={styles.scoreName} numberOfLines={1}>{myName}</Text>
            <Text style={[styles.scoreNum, styles.scoreNumMe]}>{myScore}</Text>
            <Text style={styles.scoreXP}>XP</Text>
          </View>
          <Text style={styles.scoreDash}>–</Text>
          <View style={styles.scoreCol}>
            <Text style={styles.scoreName} numberOfLines={1}>{theirName}</Text>
            <Text style={styles.scoreNum}>{theirScore}</Text>
            <Text style={styles.scoreXP}>XP</Text>
          </View>
        </View>

        {/* Round history */}
        {roundRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>OMGÅNGAR</Text>
            {roundRows.map(row => {
              const myCat = row.myTurn ? CATEGORIES.find(c => c.id === row.myTurn!.category) : null;
              const theirCat = row.theirTurn ? CATEGORIES.find(c => c.id === row.theirTurn!.category) : null;
              return (
                <View key={row.roundNum} style={styles.roundRow}>
                  <Text style={styles.roundNum}>#{row.roundNum}</Text>
                  <View style={styles.roundHalf}>
                    {row.myTurn ? (
                      <>
                        <Text style={styles.roundCat} numberOfLines={1}>
                          {myCat?.icon ?? '?'} {myCat?.name ?? ''}
                        </Text>
                        <Text style={styles.roundScore}>{row.myTurn.score} XP</Text>
                      </>
                    ) : (
                      <Text style={styles.roundPending}>–</Text>
                    )}
                  </View>
                  <View style={styles.roundDivider} />
                  <View style={styles.roundHalf}>
                    {row.theirTurn ? (
                      <>
                        <Text style={styles.roundCat} numberOfLines={1}>
                          {theirCat?.icon ?? '?'} {theirCat?.name ?? ''}
                        </Text>
                        <Text style={styles.roundScore}>{row.theirTurn.score} XP</Text>
                      </>
                    ) : (
                      <Text style={styles.roundPending}>–</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* CTA */}
        <View style={[styles.ctaBox, justFinished && iWon && styles.ctaBoxWin]}>
          {state.isFinished ? (
            justFinished ? (
              <>
                <Text style={styles.ctaEmoji}>{iWon ? '🎉' : state.winner === 'draw' ? '🤝' : '💪'}</Text>
                <Text style={styles.ctaTitle}>
                  {iWon
                    ? wasForfeited ? 'Motståndaren gav upp!' : 'Du vinner!'
                    : state.winner === 'draw' ? 'Oavgjort!'
                    : 'Motståndaren vann!'}
                </Text>
                <Text style={styles.ctaSub}>
                  {iWon ? 'Grattis — du är den bästa!' : 'Dags för en revanche?'}
                </Text>
                <TouchableOpacity onPress={handleSeeResult} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Se resultat  →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.ctaTitle}>Battle klar! 🏆</Text>
                <TouchableOpacity onPress={handleSeeResult} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Se resultat  →</Text>
                </TouchableOpacity>
              </>
            )
          ) : isWaitingOpponent ? (
            <>
              <Text style={styles.ctaTitle}>Väntar på motståndare ⏳</Text>
              <Text style={styles.ctaSub}>
                Din motståndare ser utmaningen i sin app. Koden är{' '}
                <Text style={{ color: '#9B5DE5', fontFamily: 'Poppins_700Bold' }}>{code}</Text>
                {' '}om de behöver ange den manuellt.
              </Text>
            </>
          ) : isMyTurn ? (
            <>
              <Text style={styles.ctaTitle}>Din tur! ⚡</Text>
              <Text style={styles.ctaSub}>Välj en kategori och spela omgång {myTurns.length + 1}.</Text>
              <TouchableOpacity onPress={handlePlayRound} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Spela omgång {myTurns.length + 1}  →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.ctaTitle}>Väntar på {theirName}...</Text>
              <Text style={styles.ctaSub}>
                Det är {theirName}s tur. Sidan uppdateras automatiskt var 5:e sekund.
              </Text>
              <TouchableOpacity onPress={loadBattle} style={styles.refreshBtn}>
                <Text style={styles.refreshBtnText}>↻  Uppdatera nu</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </ScrollView>

      {!state.isFinished && !forfeitConfirm && (
        <TouchableOpacity
          onPress={() => setForfeitConfirm(true)}
          style={styles.forfeitBtn}
          activeOpacity={0.5}
        >
          <Text style={styles.forfeitText}>Ge upp</Text>
        </TouchableOpacity>
      )}

      {!state.isFinished && forfeitConfirm && (
        <View style={styles.forfeitConfirmBox}>
          <Text style={styles.forfeitConfirmLabel}>
            Motståndaren räknas som vinnare.
          </Text>
          <View style={styles.forfeitConfirmRow}>
            <TouchableOpacity
              onPress={() => setForfeitConfirm(false)}
              style={styles.forfeitCancelBtn}
              disabled={forfeiting}
            >
              <Text style={styles.forfeitCancelText}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={doForfeit}
              style={styles.forfeitConfirmBtn}
              disabled={forfeiting}
            >
              <Text style={styles.forfeitConfirmBtnText}>
                {forfeiting ? 'Avslutar...' : 'Ja, ge upp'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12082A' },
  centered: {
    flex: 1,
    backgroundColor: '#12082A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2A1A50',
    borderRadius: 12,
  },
  retryText: { color: '#9B5DE5', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  homeBtn: { padding: 8, minWidth: 48 },
  homeBtnText: { color: '#B0A8C8', fontSize: 14, fontFamily: 'Poppins_500Medium' },
  title: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  codePill: {
    backgroundColor: '#2A1860',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'flex-end',
  },
  codeText: {
    color: '#9B5DE5',
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 2,
  },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 16,
  },
  scoreCol: { flex: 1, alignItems: 'center', gap: 2 },
  scoreName: { color: '#B0A8C8', fontSize: 12, fontFamily: 'Poppins_500Medium' },
  scoreNum: { color: '#FFFFFF', fontSize: 40, fontFamily: 'Poppins_800ExtraBold' },
  scoreNumMe: { color: '#9B5DE5' },
  scoreXP: { color: '#6050A0', fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  scoreDash: { color: '#3D2870', fontSize: 18, fontFamily: 'Poppins_800ExtraBold' },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 12,
  },
  roundNum: {
    color: '#3D2870',
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    width: 24,
  },
  roundHalf: { flex: 1 },
  roundCat: { color: '#B0A8C8', fontSize: 11, fontFamily: 'Poppins_400Regular' },
  roundScore: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins_700Bold' },
  roundPending: { color: '#3D2870', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  roundDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2A1860',
  },
  ctaBox: {
    backgroundColor: '#1E1040',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  ctaBoxWin: {
    backgroundColor: '#0D2A1A',
    borderWidth: 1.5,
    borderColor: '#2EC45C',
  },
  ctaEmoji: { fontSize: 40 },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  ctaSub: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  refreshBtn: {
    borderWidth: 1.5,
    borderColor: '#3D2870',
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshBtnText: { color: '#B0A8C8', fontSize: 15, fontFamily: 'Poppins_500Medium' },
  forfeitBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E1040',
  },
  forfeitText: {
    color: '#6B4A6B',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    textDecorationLine: 'underline',
  },
  forfeitConfirmBox: {
    borderTopWidth: 1,
    borderTopColor: '#1E1040',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  forfeitConfirmLabel: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  forfeitConfirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  forfeitCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2A1A50',
    alignItems: 'center',
  },
  forfeitCancelText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  forfeitConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3D0A0A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  forfeitConfirmBtnText: {
    color: '#FF453A',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
});
