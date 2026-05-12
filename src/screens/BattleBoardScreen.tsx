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
import { Battle, computeBattleState, computeBattlePhase, getChallengeForResponder, forfeitBattle, getBattleById, normalizeBattle, joinBattle } from '../lib/battles';
import { getUsername } from '../lib/scores';
import { CATEGORIES, getCategoryById } from '../data/categories';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { submitComplaint } from '../lib/submissions';
import { ComplaintModal } from '../components/ComplaintModal';

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
  text: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_400Regular' },
  highlight: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
});

export default function BattleBoardScreen({ route, navigation }: Props) {
  const { battleId, code, role, lastRoundCorrect, lastRoundTotal, lastRoundResults } = route.params;
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [forfeitConfirm, setForfeitConfirm] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [complainedIds, setComplainedIds] = useState<Set<string>>(new Set());
  const [complaintTarget, setComplaintTarget] = useState<{ id: string; question: string; category: string } | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const { questions: lastRoundQuestions } = useGameStore();

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

  // Realtime subscription — unique name per mount so remounting never hits an already-subscribed channel
  useEffect(() => {
    const channelName = `battle-${battleId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
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

  const handleChallenge = () => {
    if (!battle) return;
    const state = computeBattleState(battle);
    const ct = battle.creator_turns.length;
    const ot = battle.opponent_turns.length;
    const roundNumber = Math.min(ct, ot) + 1;
    navigation.replace('BattlePickCategory', {
      battleId,
      code,
      role,
      roundNumber,
      creatorScore: state.creatorScore,
      opponentScore: state.opponentScore,
      creatorName: battle.creator_name,
      opponentName: battle.opponent_name ?? 'Motståndare',
    });
  };

  const handleAcceptChallenge = async () => {
    if (!battle) return;
    let current = battle;

    if (role === 'opponent' && !battle.opponent_id) {
      const name = await getUsername() ?? 'Anonym';
      try {
        current = await joinBattle(battleId, name);
        setBattle(current);
      } catch {
        return;
      }
    }

    const state = computeBattleState(current);
    const challenge = getChallengeForResponder(current);
    if (!challenge) return;
    const ct = current.creator_turns.length;
    const ot = current.opponent_turns.length;
    const roundNumber = Math.max(ct, ot);
    navigation.replace('BattleRound', {
      battleId,
      code,
      role,
      roundNumber,
      category: challenge.category,
      creatorScore: state.creatorScore,
      opponentScore: state.opponentScore,
      creatorName: current.creator_name,
      opponentName: current.opponent_name ?? 'Motståndare',
      questionIds: challenge.questionIds,
    });
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

  const iWon = state.winner === role;
  const wasForfeited = state.isFinished &&
    (battle.creator_turns.length < 4 || battle.opponent_turns.length < 4);

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

      <View style={styles.scoreCard}>
        <View style={styles.scoreCol}>
          <Text style={styles.scoreName} numberOfLines={1}>{myName}</Text>
          <Text style={[styles.scoreNum, styles.scoreNumMe]}>
            {role === 'creator' ? state.creatorScore : state.opponentScore}
          </Text>
          <Text style={styles.scoreXP}>XP</Text>
        </View>
        <Text style={styles.scoreDash}>–</Text>
        <View style={styles.scoreCol}>
          <Text style={styles.scoreName} numberOfLines={1}>{theirName}</Text>
          <Text style={styles.scoreNum}>
            {role === 'creator' ? state.opponentScore : state.creatorScore}
          </Text>
          <Text style={styles.scoreXP}>XP</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Round result */}
        {lastRoundCorrect !== undefined && lastRoundTotal !== undefined && (
          <>
            <RoundResultCard correct={lastRoundCorrect} total={lastRoundTotal} />

            {lastRoundQuestions.length > 0 && (
              <View style={resultCards.container}>
                {lastRoundQuestions.map((q, i) => {
                  const correct = lastRoundResults ? lastRoundResults[i] : undefined;
                  const isCorrect = correct === true;
                  const isExpanded = expandedCard === q.id;

                  return (
                    <TouchableOpacity
                      key={q.id}
                      activeOpacity={0.85}
                      onPress={() => setExpandedCard(isExpanded ? null : q.id)}
                      style={[
                        resultCards.card,
                        isCorrect ? resultCards.cardCorrect : resultCards.cardWrong,
                      ]}
                    >
                      {/* Header row */}
                      <View style={resultCards.cardHeader}>
                        <Text style={resultCards.cardIcon}>{isCorrect ? '✓' : '✗'}</Text>
                        <Text
                          style={[resultCards.cardQuestion, isCorrect ? resultCards.textCorrect : resultCards.textWrong]}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          {q.question}
                        </Text>
                        <Text style={resultCards.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                      </View>

                      {/* Expanded content */}
                      {isExpanded && (
                        <View style={resultCards.expanded}>
                          <Text style={resultCards.correctLabel}>Rätt svar:</Text>
                          <Text style={resultCards.correctAnswer}>
                            {q.answers[q.correctIndex]}
                          </Text>
                          {complainedIds.has(q.id) ? (
                            <Text style={resultCards.sentText}>Klagomål skickat ✓</Text>
                          ) : (
                            <TouchableOpacity
                              onPress={() => setComplaintTarget({ id: q.id, question: q.question, category: q.category })}
                              style={resultCards.complainBtn}
                            >
                              <Text style={resultCards.complainBtnText}>⚠️  Klaga på frågan</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* CTA */}
        {(() => {
          if (!battle) return null;
          const phase = computeBattlePhase(battle);
          const challenge = getChallengeForResponder(battle);
          const challengeCat = challenge ? getCategoryById(challenge.category) : null;
          const ct = battle.creator_turns.length;
          const ot = battle.opponent_turns.length;
          const nextRound = Math.min(ct, ot) + 1;

          if (state.isFinished) {
            return (
              <View style={[styles.ctaBox, justFinished && iWon && styles.ctaBoxWin]}>
                {justFinished ? (
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
                  </>
                ) : (
                  <Text style={styles.ctaTitle}>Battle klar! 🏆</Text>
                )}
                <TouchableOpacity onPress={handleSeeResult} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Se resultat  →</Text>
                </TouchableOpacity>
              </View>
            );
          }

          if (phase === 'waiting_opponent') {
            return (
              <View style={styles.ctaBox}>
                <Text style={styles.ctaTitle}>Väntar på motståndare ⏳</Text>
                <Text style={styles.ctaSub}>
                  Dela koden{' '}
                  <Text style={{ color: '#9B5DE5', fontFamily: 'DMSans_700Bold' }}>{code}</Text>
                  {' '}med din motståndare.
                </Text>
              </View>
            );
          }

          // My turn to pick a category and challenge
          if ((phase === 'creator_challenge' && role === 'creator') ||
              (phase === 'opponent_challenge' && role === 'opponent')) {
            return (
              <View style={styles.ctaBox}>
                <Text style={styles.ctaEmoji}>⚔️</Text>
                <Text style={styles.ctaTitle}>Din tur att utmana!</Text>
                <Text style={styles.ctaSub}>Välj en kategori och ge din motståndare en utmaning – omgång {nextRound} av 4.</Text>
                <TouchableOpacity onPress={handleChallenge} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Välj kategori  →</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // Opponent is challenging — I need to wait
          if ((phase === 'creator_challenge' && role === 'opponent') ||
              (phase === 'opponent_challenge' && role === 'creator')) {
            return (
              <View style={styles.ctaBox}>
                <Text style={styles.ctaTitle}>Väntar på {theirName}... ⏳</Text>
                <Text style={styles.ctaSub}>{theirName} väljer kategori för omgång {nextRound}.</Text>
                <TouchableOpacity onPress={loadBattle} style={styles.refreshBtn}>
                  <Text style={styles.refreshBtnText}>↻  Uppdatera nu</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // My turn to RESPOND — accept or decline the challenge
          if ((phase === 'opponent_respond' && role === 'opponent') ||
              (phase === 'creator_respond' && role === 'creator')) {
            return (
              <View style={[styles.ctaBox, styles.ctaBoxChallenge]}>
                <Text style={styles.ctaChallengeFrom}>{challenge?.challengerName ?? theirName} utmanar dig!</Text>
                {challengeCat && (
                  <View style={[styles.challengeCatBadge, { borderColor: challengeCat.color }]}>
                    <Text style={styles.challengeCatIcon}>{challengeCat.icon}</Text>
                    <Text style={[styles.challengeCatName, { color: challengeCat.color }]}>{challengeCat.name}</Text>
                  </View>
                )}
                <Text style={styles.ctaSub}>Tre frågor inom kategorin. Klarar du det?</Text>
                <TouchableOpacity onPress={handleAcceptChallenge} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Acceptera utmaning  ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setForfeitConfirm(true)} style={styles.declineBtn}>
                  <Text style={styles.declineBtnText}>Tacka nej (ge upp)</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // Other player needs to respond — I wait
          if ((phase === 'opponent_respond' && role === 'creator') ||
              (phase === 'creator_respond' && role === 'opponent')) {
            return (
              <View style={styles.ctaBox}>
                <Text style={styles.ctaTitle}>Väntar på {theirName}... ⏳</Text>
                <Text style={styles.ctaSub}>{theirName} avgör om de accepterar din utmaning.</Text>
                {challengeCat && (
                  <View style={[styles.challengeCatBadge, { borderColor: challengeCat.color }]}>
                    <Text style={styles.challengeCatIcon}>{challengeCat.icon}</Text>
                    <Text style={[styles.challengeCatName, { color: challengeCat.color }]}>{challengeCat.name}</Text>
                  </View>
                )}
                <TouchableOpacity onPress={loadBattle} style={styles.refreshBtn}>
                  <Text style={styles.refreshBtnText}>↻  Uppdatera nu</Text>
                </TouchableOpacity>
              </View>
            );
          }

          return null;
        })()}

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

      <ComplaintModal
        visible={complaintTarget !== null}
        questionText={complaintTarget?.question ?? ''}
        onClose={() => setComplaintTarget(null)}
        onSubmit={async (message) => {
          if (!complaintTarget) return;
          const { error } = await submitComplaint(complaintTarget.id, complaintTarget.question, complaintTarget.category, message);
          if (!error) setComplainedIds(prev => new Set(prev).add(complaintTarget.id));
          setComplaintTarget(null);
        }}
      />

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
    fontFamily: 'DMSans_400Regular',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2A1A50',
    borderRadius: 12,
  },
  retryText: { color: '#9B5DE5', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  homeBtn: { padding: 8, minWidth: 48 },
  homeBtnText: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  title: { color: '#FFFFFF', fontSize: 18, fontFamily: 'DMSans_700Bold' },
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
    fontFamily: 'DMSans_700Bold',
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
  scoreName: { color: '#B0A8C8', fontSize: 12, fontFamily: 'DMSans_500Medium' },
  scoreNum: { color: '#FFFFFF', fontSize: 40, fontFamily: 'DMSans_800ExtraBold' },
  scoreNumMe: { color: '#9B5DE5' },
  scoreXP: { color: '#6050A0', fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  scoreDash: { color: '#3D2870', fontSize: 18, fontFamily: 'DMSans_800ExtraBold' },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
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
    fontFamily: 'DMSans_700Bold',
    width: 24,
  },
  roundHalf: { flex: 1 },
  roundCat: { color: '#B0A8C8', fontSize: 11, fontFamily: 'DMSans_400Regular' },
  roundScore: { color: '#FFFFFF', fontSize: 14, fontFamily: 'DMSans_700Bold' },
  roundPending: { color: '#3D2870', fontSize: 18, fontFamily: 'DMSans_700Bold' },
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
  ctaBoxChallenge: {
    borderWidth: 1.5,
    borderColor: '#9B5DE5',
  },
  ctaChallengeFrom: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
  },
  challengeCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'center',
  },
  challengeCatIcon: { fontSize: 28 },
  challengeCatName: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
  },
  declineBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#6B4A6B',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    textDecorationLine: 'underline',
  },
  ctaEmoji: { fontSize: 40 },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
  },
  ctaSub: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
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
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  refreshBtn: {
    borderWidth: 1.5,
    borderColor: '#3D2870',
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshBtnText: { color: '#B0A8C8', fontSize: 15, fontFamily: 'DMSans_500Medium' },
  forfeitBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E1040',
  },
  forfeitText: {
    color: '#6B4A6B',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_400Regular',
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
    fontFamily: 'DMSans_600SemiBold',
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
    fontFamily: 'DMSans_700Bold',
  },
});

const resultCards = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 0,
  },
  cardCorrect: {
    backgroundColor: '#0A2A18',
    borderColor: '#2EC45C',
  },
  cardWrong: {
    backgroundColor: '#2A0A0A',
    borderColor: '#FF453A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardIcon: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    marginTop: 1,
    width: 18,
  },
  cardQuestion: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    lineHeight: 19,
  },
  textCorrect: {
    color: '#7DFFA8',
  },
  textWrong: {
    color: '#FF8A80',
  },
  chevron: {
    color: '#6050A0',
    fontSize: 10,
    marginTop: 4,
  },
  expanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A1A50',
    gap: 8,
  },
  correctLabel: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  correctAnswer: {
    color: '#2EC45C',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    lineHeight: 20,
  },
  complainBtn: {
    marginTop: 4,
    backgroundColor: '#2A1A50',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  complainBtnText: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  sentText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
    marginTop: 4,
  },
});
