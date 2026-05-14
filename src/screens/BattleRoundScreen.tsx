import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { submitTurn, computeBattlePhase } from '../lib/battles';
import { getUsername } from '../lib/scores';
import { trackAttempt } from '../lib/stats';
import { sendPushToUser } from '../lib/pushNotifications';
import { getCategoryById } from '../data/categories';
import { shuffle } from '../utils/shuffle';
import { SparklerTimer } from '../components/SparklerTimer';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerButton, AnswerState } from '../components/AnswerButton';
import { ScoreBadge } from '../components/ScoreBadge';
import { CelebrationOverlay, EffectType } from '../components/CelebrationOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'BattleRound'>;

const TIMER_DURATION = 20000;

export default function BattleRoundScreen({ route, navigation }: Props) {
  const {
    battleId, code, role, roundNumber,
    category: categoryId, creatorScore, opponentScore,
  } = route.params;

  const {
    questions, currentQuestionIndex, score,
    startGame, startChallengeGame, submitAnswer, nextQuestion, endGame,
  } = useGameStore();

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
        startChallengeGame(categoryId, questionIds);
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
    setIsTimerRunning(true);
  }, [currentQuestion?.id]);

  const finishRound = useCallback(async () => {
    setSubmitting(true);
    const { result } = endGame();
    const playedQuestionIds = useGameStore.getState().questions.map(q => q.id);
    // Round complete — clear saved progress
    AsyncStorage.removeItem(progressKey).catch(() => {});
    try {
      const myName = role === 'opponent' ? (await getUsername() ?? 'Anonym') : undefined;
      const updatedBattle = await submitTurn(
        battleId,
        role,
        { round: roundNumber, category: categoryId, score: result.totalScore, questionIds: playedQuestionIds },
        myName,
      );

      const phase = computeBattlePhase(updatedBattle);
      const targetId = role === 'creator' ? updatedBattle.opponent_id : updatedBattle.creator_id;
      const myDisplayName = role === 'creator' ? updatedBattle.creator_name : (updatedBattle.opponent_name ?? 'Motståndare');
      if (targetId) {
        const isChallenge = phase === 'opponent_respond' || phase === 'creator_respond';
        const title = 'Quizine ⚔️';
        const body = isChallenge
          ? `${myDisplayName} utmanade dig! Dags att svara.`
          : `${myDisplayName} svarade! Nu är det din tur att utmana.`;
        sendPushToUser(targetId, title, body, { battleId }).catch(() => {});
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
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

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
        const all: EffectType[] = ['slowStars', 'bigBalloons', 'fireworks', 'champagne'];
        const count = Math.random() < 0.38 ? 2 : 1;
        const picked = [...all].sort(() => Math.random() - 0.5).slice(0, count);
        setCelebrationEffects(picked);
        setShowWow(currentQuestion.difficulty === 'hard');
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

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
          />
        </View>

        <View style={styles.content}>
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
            <TouchableOpacity
              onPress={advance}
              style={[
                styles.nextBtn,
                { backgroundColor: category?.color ?? '#9B5DE5' },
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
        </View>
      </View>

      <CelebrationOverlay effects={celebrationEffects} showWow={showWow} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12082A' },
  loading: {
    flex: 1,
    backgroundColor: '#12082A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_400Regular',
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
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roundPillText: {
    color: '#9B5DE5',
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
  },
  miniScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniScoreMe: {
    color: '#9B5DE5',
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
  },
  miniScoreSep: {
    color: '#3D2870',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
  },
  miniScoreThem: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
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
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.3,
  },
});
