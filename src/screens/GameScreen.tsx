import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { submitScore, getUsername } from '../lib/scores';
import { createChallenge, joinChallenge, getChallengeById } from '../lib/challenges';
import { getCategoryById } from '../data/categories';
import { shuffle } from '../utils/shuffle';
import { SparklerTimer } from '../components/SparklerTimer';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerButton, AnswerState } from '../components/AnswerButton';
import { ScoreBadge } from '../components/ScoreBadge';
import { CelebrationOverlay } from '../components/CelebrationOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const TIMER_DURATION = 20000;

export default function GameScreen({ route, navigation }: Props) {
  const { categoryId, challengeMode, challengeId, questionIds, targetFriendId, targetFriendName } = route.params;
  const {
    questions,
    currentQuestionIndex,
    score,
    startGame,
    startChallengeGame,
    submitAnswer,
    nextQuestion,
    endGame,
  } = useGameStore();

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [answerStates, setAnswerStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([0, 1, 2, 3]);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const questionStartRef = useRef<number>(Date.now());
  const isAdvancingRef = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;
  const category = getCategoryById(categoryId);

  // Animated next button
  const nextBtnProgress = useSharedValue(0);
  const nextBtnStyle = useAnimatedStyle(() => ({
    opacity: nextBtnProgress.value,
    transform: [{ translateY: interpolate(nextBtnProgress.value, [0, 1], [40, 0]) }],
  }));

  useEffect(() => {
    if (isAnswered) {
      nextBtnProgress.value = withDelay(350, withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.2)) }));
    } else {
      nextBtnProgress.value = 0;
    }
  }, [isAnswered]);

  useEffect(() => {
    if (challengeMode === 'join' && questionIds?.length) {
      startChallengeGame(categoryId, questionIds);
    } else {
      startGame(categoryId);
    }
  }, []);

  useEffect(() => {
    if (!currentQuestion) return;
    isAdvancingRef.current = false;
    setIsAnswered(false);
    setShowCelebration(false);
    setPointsAwarded(null);
    setAnswerStates(['default', 'default', 'default', 'default']);
    const indices = shuffle([0, 1, 2, 3]);
    setShuffledIndices(indices);
    questionStartRef.current = Date.now();
    setIsTimerRunning(true);
  }, [currentQuestion?.id]);

  const finishGame = useCallback(async () => {
    setIsFinishing(true);
    const { result, isNewHighscore, previousHighscore } = endGame();
    submitScore(result.categoryId, result.totalScore);

    try {
      if (challengeMode === 'create') {
        try {
          const name = await getUsername() ?? 'Anonym';
          const { code } = await createChallenge(
            result.categoryId,
            questions.map(q => q.id),
            result.totalScore,
            name,
            targetFriendId,
          );
          navigation.replace('ChallengeResult', {
            mode: 'create',
            categoryId: result.categoryId,
            myScore: result.totalScore,
            challengeCode: code,
            targetFriendName,
          });
        } catch {
          navigation.replace('Result', {
            categoryId: result.categoryId,
            totalQuestions: result.totalQuestions,
            correctAnswers: result.correctAnswers,
            totalScore: result.totalScore,
            isNewHighscore,
            previousHighscore,
          });
        }
      } else if (challengeMode === 'join' && challengeId) {
        try {
          const name = await getUsername() ?? 'Anonym';
          await joinChallenge(challengeId, result.totalScore, name);
          const challenge = await getChallengeById(challengeId);
          navigation.replace('ChallengeResult', {
            mode: 'join',
            categoryId: result.categoryId,
            myScore: result.totalScore,
            challengerName: challenge?.creator_name ?? 'Anonym',
            challengerScore: challenge?.creator_score ?? 0,
          });
        } catch {
          navigation.replace('ChallengeResult', {
            mode: 'join',
            categoryId: result.categoryId,
            myScore: result.totalScore,
          });
        }
      } else {
        navigation.replace('Result', {
          categoryId: result.categoryId,
          totalQuestions: result.totalQuestions,
          correctAnswers: result.correctAnswers,
          totalScore: result.totalScore,
          isNewHighscore,
          previousHighscore,
        });
      }
    } catch {
      navigation.replace('Result', {
        categoryId: result.categoryId,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        totalScore: result.totalScore,
        isNewHighscore,
        previousHighscore,
      });
    }
  }, [challengeMode, challengeId, targetFriendId, targetFriendName, questions, endGame, navigation]);

  const advance = useCallback(() => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    if (isLastQuestion) {
      finishGame();
    } else {
      nextQuestion();
    }
  }, [isLastQuestion, finishGame, nextQuestion]);

  const handleAnswer = useCallback(
    (displayIndex: number) => {
      if (isAnswered || !currentQuestion) return;
      setIsTimerRunning(false);
      setIsAnswered(true);

      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      const timeRemaining = Math.max(0, 20 - elapsed);
      const actualIndex = shuffledIndices[displayIndex];
      const correct = currentQuestion.correctIndex;
      const points = submitAnswer(actualIndex, timeRemaining);
      setPointsAwarded(points);

      if (points > 0) {
        setShowCelebration(true);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const newStates: AnswerState[] = shuffledIndices.map((origIdx, dispIdx) => {
        if (origIdx === correct) return 'show-correct';
        if (dispIdx === displayIndex && origIdx !== correct) return 'wrong';
        return 'disabled';
      });
      if (points > 0) {
        newStates[displayIndex] = 'correct';
      }
      setAnswerStates(newStates);
    },
    [isAnswered, currentQuestion, shuffledIndices, submitAnswer],
  );

  const handleTimerExpire = useCallback(() => {
    if (isAnswered) return;
    setIsTimerRunning(false);
    setIsAnswered(true);
    submitAnswer(-1, 0);
    setPointsAwarded(0);

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const correct = currentQuestion.correctIndex;
    const newStates: AnswerState[] = shuffledIndices.map((origIdx) =>
      origIdx === correct ? 'show-correct' : 'disabled',
    );
    setAnswerStates(newStates);
  }, [isAnswered, currentQuestion, shuffledIndices, submitAnswer]);

  if (!currentQuestion) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Laddar...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitBtn}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        {challengeMode && (
          <Text style={styles.challengeBadge}>⚔️ Utmaning</Text>
        )}
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
          />

          <View style={styles.answersGrid}>
            {[0, 1].map(row => (
              <View key={row} style={styles.answersRow}>
                {[0, 1].map(col => {
                  const dispIdx = row * 2 + col;
                  return (
                    <AnswerButton
                      key={dispIdx}
                      index={dispIdx}
                      text={currentQuestion.answers[shuffledIndices[dispIdx]]}
                      state={answerStates[dispIdx]}
                      onPress={() => handleAnswer(dispIdx)}
                      compact
                    />
                  );
                })}
              </View>
            ))}
          </View>

          <Animated.View
            style={[styles.nextBtnWrapper, nextBtnStyle]}
            pointerEvents={isAnswered ? 'auto' : 'none'}
          >
            <TouchableOpacity
              onPress={advance}
              style={[styles.nextBtn, { backgroundColor: category?.color ?? '#9B5DE5' }, isFinishing && styles.nextBtnDisabled]}
              activeOpacity={0.85}
              disabled={isFinishing}
            >
              <Text style={styles.nextBtnText}>
                {isFinishing ? 'Laddar...' : isLastQuestion ? 'Visa resultat  🏆' : 'Nästa fråga  →'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <CelebrationOverlay visible={showCelebration} />
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
    fontFamily: 'Poppins_400Regular',
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
  exitBtn: { padding: 8 },
  exitText: {
    color: '#B0A8C8',
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  challengeBadge: {
    color: '#2EC4B6',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
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
  answersGrid: {
    gap: 8,
    marginTop: 4,
  },
  answersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nextBtnWrapper: {
    marginTop: 14,
  },
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
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.3,
  },
});
