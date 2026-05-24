import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  AppState,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { play } from '../services/SoundManager';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { submitTurn, computeBattlePhase, computeBattleState } from '../lib/battles';
import { supabase } from '../lib/supabase';
import { getUsername } from '../lib/scores';
import { trackAttempt } from '../lib/stats';
import { sendPushToUser } from '../lib/pushNotifications';
import { getCategoryById } from '../data/categories';
import { shuffle } from '../utils/shuffle';
import { fetchQuestionsByIds } from '../lib/remoteQuestions';
import { SparklerTimer } from '../components/SparklerTimer';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerButton, AnswerState } from '../components/AnswerButton';
import { ScoreBadge } from '../components/ScoreBadge';
import { CelebrationOverlay, EffectType } from '../components/CelebrationOverlay';
import { fonts, radius } from '../theme/tokens'
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'BattleRound'>;

const TIMER_DURATION = 20000;

export default function BattleRoundScreen({ route, navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    battleId, code, role, roundNumber,
    category: categoryId, creatorScore, opponentScore,
  } = route.params;

  const {
    questions, currentQuestionIndex, score,
    startGame, startChallengeGame, startChallengeGameWithQuestions, submitAnswer, nextQuestion, endGame,
  } = useGameStore();
  const currentArea = useGameStore(s => s.currentArea);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [answerStates, setAnswerStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([0, 1, 2, 3]);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [celebrationEffects, setCelebrationEffects] = useState<EffectType[]>([]);
  const [showWow, setShowWow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questionStartRef = useRef<number>(Date.now());
  const isAdvancingRef = useRef(false);
  const streakRef = useRef(0);

  // Always-fresh snapshot — read by stable event listeners without stale closures
  const lockRef = useRef({ isTimerRunning: false, isAnswered: false });
  lockRef.current = { isTimerRunning, isAnswered };

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;
  const category = getCategoryById(categoryId);

  // Key for persisting mid-round progress across app exits
  const progressKey = `battle_round_${battleId}_${role}_${roundNumber}`;

  const nextBtnProgress = useSharedValue(0);
  const nextBtnStyle = useAnimatedStyle(() => ({
    opacity: nextBtnProgress.value,
  }));

  useEffect(() => {
    if (isAnswered) {
      nextBtnProgress.value = withDelay(350, withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.2)) }));
    } else {
      nextBtnProgress.value = 0;
    }
  }, [isAnswered]);

  // Load questions, then try to restore saved progress from a previous session
  useEffect(() => {
    const init = async () => {
      const { questionIds } = route.params;
      if (questionIds && questionIds.length > 0) {
        const fetched = await fetchQuestionsByIds(questionIds);
        if (fetched.length > 0) {
          startChallengeGameWithQuestions(categoryId, fetched);
        } else {
          startGame(categoryId, 3);
        }
      } else {
        startGame(categoryId, 3);
      }
      try {
        const saved = await AsyncStorage.getItem(progressKey);
        if (saved) {
          const { nextQuestionIndex, score: s, answers: a } = JSON.parse(saved);
          const { questions: qs } = useGameStore.getState();
          if (nextQuestionIndex > 0 && nextQuestionIndex < qs.length) {
            useGameStore.setState({ currentQuestionIndex: nextQuestionIndex, score: s, answers: a });
          }
        }
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    if (!currentQuestion) return;
    isAdvancingRef.current = false;
    setIsAnswered(false);
    setCelebrationEffects([]);
    setShowWow(false);
    setPointsAwarded(null);
    setAnswerStates(['default', 'default', 'default', 'default']);
    setShuffledIndices(shuffle([0, 1, 2, 3]));
    questionStartRef.current = Date.now();
    if (currentQuestionIndex === 0) {
      streakRef.current = 0;
      play('battle_start');
    }
    setIsTimerRunning(true);
  }, [currentQuestion?.id]);

  const finishRound = useCallback(async () => {
    setSubmitting(true);
    const { result } = endGame();
    const playedQuestionIds = useGameStore.getState().questions.map(q => q.id);
    // Round complete — clear saved progress
    AsyncStorage.removeItem(progressKey).catch(() => {});
    try {
      const [myName, { data: { user: me } }] = await Promise.all([
        role === 'opponent' ? getUsername() : Promise.resolve(undefined),
        supabase.auth.getUser(),
      ]);
      const myUserId = me?.id ?? null;

      const updatedBattle = await submitTurn(
        currentArea,
        battleId,
        role,
        { round: roundNumber, category: categoryId, score: result.totalScore, questionIds: playedQuestionIds },
        myName ?? undefined,
      );

      // Skip all push if we can't confirm who the current user is — avoids self-notification
      if (myUserId) {
        const phase = computeBattlePhase(updatedBattle);
        if (phase !== 'finished' && phase !== 'waiting_opponent') {
          const notifyOpponent = phase === 'opponent_respond' || phase === 'opponent_challenge';
          const targetId = notifyOpponent ? updatedBattle.opponent_id : updatedBattle.creator_id;
          const myDisplayName = role === 'creator' ? updatedBattle.creator_name : (updatedBattle.opponent_name ?? 'Motståndare');
          const isChallenge = phase === 'opponent_respond' || phase === 'creator_respond';
          if (targetId && targetId !== myUserId) {
            const title = 'Quizine ⚔️';
            const body = isChallenge
              ? `${myDisplayName} utmanade dig! Dags att svara.`
              : `${myDisplayName} svarade! Nu är det din tur att utmana.`;
            sendPushToUser(targetId, title, body, { battleId }).catch(() => {});
          }
        } else if (phase === 'finished') {
          const state = computeBattleState(updatedBattle);
          const otherPlayerId = role === 'creator' ? updatedBattle.opponent_id : updatedBattle.creator_id;
          const myDisplayName = role === 'creator' ? updatedBattle.creator_name : (updatedBattle.opponent_name ?? 'Motståndare');
          const otherRole = role === 'creator' ? 'opponent' : 'creator';
          if (otherPlayerId && otherPlayerId !== myUserId) {
            const otherWon =
              (state.winner === 'creator' && otherRole === 'creator') ||
              (state.winner === 'opponent' && otherRole === 'opponent');
            const body = state.winner === 'draw'
              ? `🤝 Oavgjort mot ${myDisplayName}! Se resultatet.`
              : otherWon
                ? `🏆 Du vann mot ${myDisplayName}! Se resultatet.`
                : `😔 ${myDisplayName} vann den här gången. Se resultatet.`;
            sendPushToUser(otherPlayerId, 'Quizine ⚔️', body, { battleId, type: 'battle_finished' }).catch(() => {});
          }
        }
      }
    } catch {
      Alert.alert('Nätverksfel', 'Omgången sparades inte. Kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
      const lastRoundResults = useGameStore.getState().answers.map(a => a === true);
      navigation.replace('BattleBoard', {
        battleId,
        code,
        role,
        lastRoundCorrect: result.correctAnswers,
        lastRoundTotal: result.totalQuestions,
        lastRoundResults,
      });
    }
  }, [battleId, code, role, roundNumber, categoryId, progressKey, endGame, navigation]);

  const advance = useCallback(() => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    if (isLastQuestion) {
      finishRound();
    } else {
      nextQuestion();
    }
  }, [isLastQuestion, finishRound, nextQuestion]);

  const handleTimerExpire = useCallback(() => {
    if (isAnswered) return;
    setIsTimerRunning(false);
    setIsAnswered(true);
    submitAnswer(-1, 0);
    setPointsAwarded(0);
    play('answer_timeout');
    streakRef.current = 0;

    trackAttempt(currentQuestion.id, false, 'battle');

    const correct = currentQuestion.correctIndex;
    const newStates: AnswerState[] = shuffledIndices.map((origIdx) =>
      origIdx === correct ? 'show-correct' : 'disabled',
    );
    setAnswerStates(newStates);

    // Persist so the user can resume from the next question
    const { score: s, answers: a } = useGameStore.getState();
    AsyncStorage.setItem(progressKey, JSON.stringify({
      nextQuestionIndex: currentQuestionIndex + 1,
      score: s,
      answers: a,
    })).catch(() => {});
  }, [isAnswered, currentQuestion, shuffledIndices, submitAnswer, currentQuestionIndex, progressKey]);

  // Keep a stable ref so event listeners always call the latest handleTimerExpire
  const handleTimerExpireRef = useRef(handleTimerExpire);
  handleTimerExpireRef.current = handleTimerExpire;

  // Block React Navigation back gesture / header back while a question is live
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!lockRef.current.isTimerRunning || lockRef.current.isAnswered) return;
      e.preventDefault();
      handleTimerExpireRef.current();
    });
    return unsub;
  }, [navigation]);

  // Auto-submit on native app backgrounding while timer is live
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && lockRef.current.isTimerRunning && !lockRef.current.isAnswered) {
        handleTimerExpireRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  // Auto-submit on web tab hide / close while timer is live
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => {
      if (document.hidden && lockRef.current.isTimerRunning && !lockRef.current.isAnswered) {
        handleTimerExpireRef.current();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const handleAnswer = useCallback(
    (displayIndex: number) => {
      if (isAnswered || !currentQuestion) return;
      setIsTimerRunning(false);
      setIsAnswered(true);

      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      const timeRemaining = Math.max(0, TIMER_DURATION / 1000 - elapsed);
      const actualIndex = shuffledIndices[displayIndex];
      const correct = currentQuestion.correctIndex;
      const points = submitAnswer(actualIndex, timeRemaining);
      setPointsAwarded(points);

      trackAttempt(currentQuestion.id, points > 0, 'battle');

      if (points > 0) {
        play('answer_correct');
        play('xp_gain');
        streakRef.current += 1;
        if (streakRef.current === 3) play('streak_3');
        else if (streakRef.current === 5) play('streak_5');
        else if (streakRef.current > 5 && streakRef.current % 5 === 0) play('streak_5');
        const all: EffectType[] = ['slowStars', 'bigBalloons', 'fireworks', 'champagne'];
        const count = Math.random() < 0.38 ? 2 : 1;
        const picked = [...all].sort(() => Math.random() - 0.5).slice(0, count);
        setCelebrationEffects(picked);
        setShowWow(currentQuestion.difficulty === 'hard');
      } else {
        play('answer_wrong');
        streakRef.current = 0;
      }

      const newStates: AnswerState[] = shuffledIndices.map((origIdx, dispIdx) => {
        if (origIdx === correct) return 'show-correct';
        if (dispIdx === displayIndex && origIdx !== correct) return 'wrong';
        return 'disabled';
      });
      if (points > 0) newStates[displayIndex] = 'correct';
      setAnswerStates(newStates);

      // Persist so the user can resume from the next question if they exit now
      const { score: s, answers: a } = useGameStore.getState();
      AsyncStorage.setItem(progressKey, JSON.stringify({
        nextQuestionIndex: currentQuestionIndex + 1,
        score: s,
        answers: a,
      })).catch(() => {});
    },
    [isAnswered, currentQuestion, shuffledIndices, submitAnswer, currentQuestionIndex, progressKey],
  );

  const handleTimerTick = useCallback((secondsLeft: number) => {
    play(secondsLeft <= 5 ? 'timer_warning' : 'timer_tick');
  }, []);

  if (!currentQuestion) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Laddar...</Text>
      </View>
    );
  }

  const myScore = role === 'creator' ? creatorScore : opponentScore;
  const theirScore = role === 'creator' ? opponentScore : creatorScore;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.topBar}>
        <View style={styles.battleInfo}>
          <View style={styles.roundPill}>
            <Text style={styles.roundPillText}>
              {roundNumber > 4 ? '⚡ SUDDEN DEATH' : `OMGÅNG ${roundNumber} / 4`}
            </Text>
          </View>
          <View style={styles.miniScoreRow}>
            <Text style={styles.miniScoreMe}>{myScore}</Text>
            <Text style={styles.miniScoreSep}>–</Text>
            <Text style={styles.miniScoreThem}>{theirScore}</Text>
          </View>
        </View>
        <ScoreBadge score={score} pointsAwarded={pointsAwarded} />
      </View>

      <View style={styles.gameArea}>
        <View style={styles.timerColumn}>
          <SparklerTimer
            duration={TIMER_DURATION}
            onExpire={handleTimerExpire}
            isRunning={isTimerRunning}
            onTick={handleTimerTick}
          />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <QuestionCard
            question={currentQuestion.question}
            questionNumber={currentQuestionIndex + 1}
            total={totalQuestions}
            imageUrl={currentQuestion.imageUrl}
          />

          <View style={styles.answersGrid}>
            {[0, 1, 2, 3].map(dispIdx => (
              <AnswerButton
                key={dispIdx}
                index={dispIdx}
                text={currentQuestion.answers[shuffledIndices[dispIdx]]}
                state={answerStates[dispIdx]}
                onPress={() => handleAnswer(dispIdx)}
              />
            ))}
          </View>

          <Animated.View
            style={[styles.nextBtnWrapper, nextBtnStyle, { pointerEvents: isAnswered ? 'auto' : 'none' }]}
          >
            {isAnswered && (
              <View style={[styles.explanationBox, { borderColor: category?.color ?? colors.pink }]}>
                <Text style={styles.explanationText}>
                  {!!currentQuestion.forklaring?.trim() && currentQuestion.forklaring.trim().toLowerCase() !== 'förklaring saknas'
                    ? currentQuestion.forklaring.trim()
                    : 'Ingen förklaring'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={advance}
              style={[
                styles.nextBtn,
                { backgroundColor: category?.color ?? colors.pink },
                submitting && styles.nextBtnDisabled,
              ]}
              activeOpacity={0.85}
              disabled={submitting}
            >
              <Text style={styles.nextBtnText}>
                {submitting
                  ? 'Sparar...'
                  : isLastQuestion
                  ? 'Klar med omgången  ✓'
                  : 'Nästa fråga  →'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>

      <CelebrationOverlay effects={celebrationEffects} showWow={showWow} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  loading: {
    flex: 1,
    backgroundColor: colors.bg1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text1,
    fontFamily: fonts.display400,
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  battleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundPill: {
    backgroundColor: colors.bg2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roundPillText: {
    color: colors.pink,
    fontSize: 10,
    fontFamily: fonts.display700,
    letterSpacing: 1,
  },
  miniScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniScoreMe: {
    color: colors.pink,
    fontSize: 16,
    fontFamily: fonts.display700,
  },
  miniScoreSep: {
    color: colors.lineStrong,
    fontSize: 14,
    fontFamily: fonts.display700,
  },
  miniScoreThem: {
    color: colors.text1,
    fontSize: 16,
    fontFamily: fonts.display700,
  },
  gameArea: {
    flex: 1,
    flexDirection: 'row',
  },
  timerColumn: {
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 4,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answersGrid: { gap: 8 },
  nextBtnWrapper: { marginTop: 'auto', paddingTop: 8 },
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: {
    color: colors.text1,
    fontSize: 17,
    fontFamily: fonts.display700,
    letterSpacing: 0.3,
  },
  explanationBox: {
    backgroundColor: colors.bg2,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  explanationText: {
    color: colors.text2,
    fontFamily: fonts.display400,
    fontSize: 14,
    lineHeight: 21,
  },
});
