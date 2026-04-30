import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { shuffle } from '../utils/shuffle';
import { SparklerTimer } from '../components/SparklerTimer';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerButton, AnswerState } from '../components/AnswerButton';
import { ScoreBadge } from '../components/ScoreBadge';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const TIMER_DURATION = 15000;

export default function GameScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;
  const { questions, currentQuestionIndex, score, startGame, submitAnswer, nextQuestion, endGame } =
    useGameStore();

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [answerStates, setAnswerStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([0, 1, 2, 3]);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const questionStartRef = useRef<number>(Date.now());
  const isAdvancingRef = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    startGame(categoryId);
  }, []);

  useEffect(() => {
    if (!currentQuestion) return;
    isAdvancingRef.current = false;
    setIsAnswered(false);
    setPointsAwarded(null);
    setAnswerStates(['default', 'default', 'default', 'default']);
    const indices = shuffle([0, 1, 2, 3]);
    setShuffledIndices(indices);
    questionStartRef.current = Date.now();
    setIsTimerRunning(true);
  }, [currentQuestion?.id]);

  const advance = useCallback(() => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;

    if (currentQuestionIndex >= 9) {
      const { result, isNewHighscore, previousHighscore } = endGame();
      navigation.replace('Result', {
        categoryId: result.categoryId,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        totalScore: result.totalScore,
        isNewHighscore,
        previousHighscore,
      });
    } else {
      nextQuestion();
    }
  }, [currentQuestionIndex, endGame, nextQuestion, navigation]);

  const handleAnswer = useCallback(
    (displayIndex: number) => {
      if (isAnswered || !currentQuestion) return;
      setIsTimerRunning(false);
      setIsAnswered(true);

      const elapsed = (Date.now() - questionStartRef.current) / 1000;
      const timeRemaining = Math.max(0, 15 - elapsed);
      const actualIndex = shuffledIndices[displayIndex];
      const correct = currentQuestion.correctIndex;
      const points = submitAnswer(actualIndex, timeRemaining);
      setPointsAwarded(points);

      Haptics.impactAsync(
        points > 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      );

      const newStates: AnswerState[] = shuffledIndices.map((origIdx, dispIdx) => {
        if (origIdx === correct) return 'show-correct';
        if (dispIdx === displayIndex && origIdx !== correct) return 'wrong';
        return 'disabled';
      });
      if (points > 0) {
        newStates[displayIndex] = 'correct';
      }
      setAnswerStates(newStates);

      setTimeout(advance, 1200);
    },
    [isAnswered, currentQuestion, shuffledIndices, submitAnswer, advance]
  );

  const handleTimerExpire = useCallback(() => {
    if (isAnswered) return;
    setIsTimerRunning(false);
    setIsAnswered(true);
    submitAnswer(-1, 0);
    setPointsAwarded(0);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const correct = currentQuestion.correctIndex;
    const newStates: AnswerState[] = shuffledIndices.map((origIdx) =>
      origIdx === correct ? 'show-correct' : 'disabled'
    );
    setAnswerStates(newStates);

    setTimeout(advance, 1000);
  }, [isAnswered, currentQuestion, shuffledIndices, submitAnswer, advance]);

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
        <ScoreBadge score={score} pointsAwarded={pointsAwarded} />
      </View>

      <View style={styles.timerRow}>
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
          total={10}
        />

        {shuffledIndices.map((origIdx, dispIdx) => (
          <AnswerButton
            key={dispIdx}
            index={dispIdx}
            text={currentQuestion.answers[origIdx]}
            state={answerStates[dispIdx]}
            onPress={() => handleAnswer(dispIdx)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#12082A',
  },
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
  exitBtn: {
    padding: 8,
  },
  exitText: {
    color: '#B0A8C8',
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  timerRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
