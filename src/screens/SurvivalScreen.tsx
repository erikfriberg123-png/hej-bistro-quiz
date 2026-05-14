import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { RootStackParamList, CategoryId } from '../types';
import { fetchRemoteQuestions } from '../lib/remoteQuestions';
import { Question } from '../types';
import { getCategoryById } from '../data/categories';
import { shuffle } from '../utils/shuffle';
import { SparklerTimer } from '../components/SparklerTimer';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerButton, AnswerState } from '../components/AnswerButton';
import { CelebrationOverlay, EffectType } from '../components/CelebrationOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'Survival'>;

const TIMER_DURATION = 15000;
const MAX_LIVES = 3;

function streakMultiplier(streak: number): number {
  if (streak >= 15) return 3;
  if (streak >= 10) return 2;
  if (streak >= 5) return 1.5;
  return 1;
}

function timeBonus(timeRemaining: number): number {
  return Math.round((timeRemaining / 15) * 50);
}

export default function SurvivalScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;

  const [pool, setPool] = useState<Question[]>([]);
  const [poolIndex, setPoolIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [answerStates, setAnswerStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([0, 1, 2, 3]);
  const [celebrationEffects, setCelebrationEffects] = useState<EffectType[]>([]);
  const [showWow, setShowWow] = useState(false);

  const questionStartRef = useRef<number>(Date.now());
  const isAdvancingRef = useRef(false);
  const livesRef = useRef(MAX_LIVES);

  const nextBtnProgress = useSharedValue(0);
  const nextBtnStyle = useAnimatedStyle(() => ({ opacity: nextBtnProgress.value }));

  useEffect(() => {
    nextBtnProgress.value = answered
      ? withDelay(350, withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.2)) }))
      : 0;
  }, [answered]);

  // Load question pool
  useEffect(() => {
    fetchRemoteQuestions().then(all => {
      const filtered = categoryId === 'all'
        ? all
        : all.filter(q => q.category === categoryId);
      setPool(shuffle(filtered));
      setLoading(false);
    });
  }, []);

  const currentQuestion = pool[poolIndex] ?? null;
  const multiplier = streakMultiplier(streak);

  // Reset per question
  useEffect(() => {
    if (!currentQuestion) return;
    isAdvancingRef.current = false;
    setAnswered(false);
    setCelebrationEffects([]);
    setShowWow(false);
    setAnswerStates(['default', 'default', 'default', 'default']);
    setShuffledIndices(shuffle([0, 1, 2, 3]));
    questionStartRef.current = Date.now();
    setIsTimerRunning(true);
  }, [currentQuestion?.id]);

  const advanceOrEnd = useCallback((livesLeft: number) => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;

    if (livesLeft <= 0) {
      // Use functional setters to get accurate final values
      setScore(s => {
        setCorrectAnswers(c => {
          setMaxStreak(ms => {
            navigation.replace('SurvivalResult', {
              score: s,
              correctAnswers: c,
              maxStreak: ms,
              categoryId,
            });
            return ms;
          });
          return c;
        });
        return s;
      });
      return;
    }

    setPoolIndex(i => {
      const next = i + 1;
      if (next >= pool.length) {
        // Reshuffle and continue
        setPool(prev => shuffle([...prev]));
        return 0;
      }
      return next;
    });
  }, [pool, categoryId, navigation]);

  const handleAnswer = useCallback((displayIndex: number) => {
    if (answered || !currentQuestion) return;
    setIsTimerRunning(false);
    setAnswered(true);

    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const timeRemaining = Math.max(0, 15 - elapsed);
    const actualIndex = shuffledIndices[displayIndex];
    const correct = currentQuestion.correctIndex;
    const isCorrect = actualIndex === correct;

    const newStates: AnswerState[] = shuffledIndices.map((origIdx, dispIdx) => {
      if (origIdx === correct) return 'show-correct';
      if (dispIdx === displayIndex && !isCorrect) return 'wrong';
      return 'disabled';
    });
    if (isCorrect) newStates[displayIndex] = 'correct';
    setAnswerStates(newStates);

    if (isCorrect) {
      const newStreak = streak + 1;
      const mult = streakMultiplier(newStreak);
      const points = Math.round((100 + timeBonus(timeRemaining)) * mult);
      setStreak(newStreak);
      setMaxStreak(ms => Math.max(ms, newStreak));
      setScore(s => s + points);
      setCorrectAnswers(c => c + 1);
      const all: EffectType[] = ['slowStars', 'bigBalloons', 'fireworks', 'champagne'];
      setCelebrationEffects([...all].sort(() => Math.random() - 0.5).slice(0, 1));
      setShowWow(currentQuestion.difficulty === 'hard' && newStreak >= 5);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      const newLives = lives - 1;
      livesRef.current = newLives;
      setLives(newLives);
      setStreak(0);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [answered, currentQuestion, shuffledIndices, streak, lives]);

  const handleTimerExpire = useCallback(() => {
    if (answered) return;
    setIsTimerRunning(false);
    setAnswered(true);
    const correct = currentQuestion.correctIndex;
    setAnswerStates(shuffledIndices.map(origIdx => origIdx === correct ? 'show-correct' : 'disabled'));
    const newLives = lives - 1;
    livesRef.current = newLives;
    setLives(newLives);
    setStreak(0);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [answered, currentQuestion, shuffledIndices, lives]);

  const handleNext = useCallback(() => {
    advanceOrEnd(livesRef.current);
  }, [advanceOrEnd]);

  const category = categoryId !== 'all' ? getCategoryById(categoryId as CategoryId) : null;
  const accentColor = category?.color ?? '#E84393';

  if (loading || !currentQuestion) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Laddar...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitBtn}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.livesRow}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]}>
              {i < lives ? '❤️' : '🖤'}
            </Text>
          ))}
        </View>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>{score.toLocaleString('sv-SE')}</Text>
          {multiplier > 1 && (
            <View style={[styles.multBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.multText}>{multiplier}×</Text>
            </View>
          )}
        </View>
      </View>

      {/* Streak bar */}
      {streak > 0 && (
        <View style={styles.streakBar}>
          <Text style={styles.streakText}>🔥 {streak} i rad</Text>
          <Text style={[styles.streakMult, { color: accentColor }]}>
            {multiplier > 1 ? `${multiplier}× poäng` : 'Håll i!'}
          </Text>
        </View>
      )}

      <View style={styles.gameArea}>
        <View style={styles.timerColumn}>
          <SparklerTimer
            duration={TIMER_DURATION}
            onExpire={handleTimerExpire}
            isRunning={isTimerRunning}
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
            questionNumber={correctAnswers + 1}
            total={undefined}
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

          <Animated.View style={[styles.nextBtnWrapper, nextBtnStyle, { pointerEvents: answered ? 'auto' : 'none' }]}>
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: accentColor }]}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>
                {lives <= 0 && answered ? 'Game over...' : 'Nästa fråga  →'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>

      <CelebrationOverlay effects={celebrationEffects} showWow={showWow} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12082A' },
  loading: { flex: 1, backgroundColor: '#12082A', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#FFFFFF', fontFamily: 'DMSans_400Regular', fontSize: 16 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  exitBtn: { padding: 8 },
  exitText: { color: '#B0A8C8', fontSize: 18, fontFamily: 'DMSans_600SemiBold' },
  livesRow: { flexDirection: 'row', gap: 4 },
  heart: { fontSize: 22 },
  heartLost: { opacity: 0.35 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  multBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  multText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'DMSans_700Bold' },
  streakBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  streakText: { color: '#B0A8C8', fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  streakMult: { fontSize: 13, fontFamily: 'DMSans_700Bold' },
  gameArea: { flex: 1, flexDirection: 'row' },
  timerColumn: { paddingVertical: 12, paddingLeft: 16, paddingRight: 4 },
  content: { flex: 1 },
  contentInner: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 16 },
  answersGrid: { gap: 8 },
  nextBtnWrapper: { marginTop: 'auto', paddingTop: 8 },
  nextBtn: { borderRadius: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3 },
});
