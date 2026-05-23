import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, TofQuestion } from '../types';
import { useGameStore } from '../store/gameStore';
import {
  TOF_ROUND_DIFFICULTIES,
  TOF_QUESTIONS_PER_ROUND,
  TOF_POINTS_PER_CORRECT,
  TOF_TIMER_SECONDS,
  TOF_DIFFICULTY_LABEL,
  TOF_TOTAL_ROUNDS,
  fetchTofQuestions,
  shuffleArray,
} from '../lib/tofQuestions';
import { updateTofHighscore } from '../lib/tofHighscores';
import { fonts, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SantEllerFalskt'>;

const SWIPE_THRESHOLD = 110;
const CARD_FLY_DISTANCE = 600;

type FeedbackState = 'correct' | 'wrong' | 'timeout' | null;

export default function SantEllerFalsktScreen({ route, navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { round, cumulativeScore: prevCumulative = 0 } = route.params;
  const currentArea = useGameStore(s => s.currentArea);
  const difficulty = TOF_ROUND_DIFFICULTIES[round - 1];

  const [questions, setQuestions] = useState<TofQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [noQuestions, setNoQuestions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const answeredRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const questionsRef = useRef<TofQuestion[]>([]);

  useEffect(() => {
    fetchTofQuestions(currentArea, difficulty)
      .then(all => {
        if (all.length === 0) { setNoQuestions(true); setLoading(false); return; }
        const q = shuffleArray(all).slice(0, TOF_QUESTIONS_PER_ROUND);
        questionsRef.current = q;
        setQuestions(q);
        setLoading(false);
      })
      .catch(() => { setNoQuestions(true); setLoading(false); });
  }, [currentArea, difficulty]);

  const advanceQuestion = useCallback((nextIndex: number, finalScore: number, finalCorrect: number) => {
    if (nextIndex >= Math.min(questionsRef.current.length, TOF_QUESTIONS_PER_ROUND)) {
      updateTofHighscore(round, finalScore)
        .then(({ isNewBest, previousBest }) => {
          navigation.replace('SantEllerFalsktResult', {
            round,
            score: finalScore,
            correctAnswers: finalCorrect,
            isNewBest,
            previousBest,
            cumulativeScore: prevCumulative + finalScore,
          });
        })
        .catch(() => {
          navigation.replace('SantEllerFalsktResult', {
            round,
            score: finalScore,
            correctAnswers: finalCorrect,
            isNewBest: false,
            previousBest: 0,
            cumulativeScore: prevCumulative + finalScore,
          });
        });
      return;
    }
    answeredRef.current = false;
    setIsAnswered(false);
    pan.setValue({ x: 0, y: 0 });
    cardScale.setValue(1);
    feedbackOpacity.setValue(0);
    setFeedback(null);
    setCurrentIndex(nextIndex);
  }, [round, navigation, pan, cardScale, feedbackOpacity]);

  const showFeedbackThen = useCallback((type: FeedbackState, nextIndex: number, finalScore: number, finalCorrect: number) => {
    setFeedback(type);
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
    setTimeout(() => advanceQuestion(nextIndex, finalScore, finalCorrect), 900);
  }, [advanceQuestion, feedbackOpacity]);

  const handleAnswer = useCallback((goesRight: boolean) => {
    if (answeredRef.current || questionsRef.current.length === 0) return;
    answeredRef.current = true;
    setIsAnswered(true);

    timerAnimRef.current?.stop();

    const currentQ = questionsRef.current[currentIndex];
    const isCorrect = goesRight === currentQ.answer;

    const newScore = scoreRef.current + (isCorrect ? TOF_POINTS_PER_CORRECT : 0);
    const newCorrect = correctRef.current + (isCorrect ? 1 : 0);
    scoreRef.current = newScore;
    correctRef.current = newCorrect;
    setScore(newScore);
    setCorrectCount(newCorrect);

    if (Platform.OS !== 'web') {
      if (isCorrect) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    Animated.timing(pan, {
      toValue: { x: goesRight ? CARD_FLY_DISTANCE : -CARD_FLY_DISTANCE, y: 0 },
      duration: 260,
      useNativeDriver: false,
    }).start(() => {
      showFeedbackThen(isCorrect ? 'correct' : 'wrong', currentIndex + 1, newScore, newCorrect);
    });
  }, [currentIndex, pan, showFeedbackThen]);

  const handleTimerExpire = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setIsAnswered(true);

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Animated.timing(cardScale, {
      toValue: 0.85,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      showFeedbackThen('timeout', currentIndex + 1, scoreRef.current, correctRef.current);
    });
  }, [currentIndex, cardScale, showFeedbackThen]);

  useEffect(() => {
    if (loading || noQuestions || questions.length === 0) return;

    timerAnim.setValue(1);
    cardScale.setValue(1);
    pan.setValue({ x: 0, y: 0 });

    const anim = Animated.timing(timerAnim, {
      toValue: 0,
      duration: TOF_TIMER_SECONDS * 1000,
      useNativeDriver: false,
    });
    timerAnimRef.current = anim;
    anim.start(({ finished }) => { if (finished) handleTimerExpire(); });

    return () => anim.stop();
  }, [currentIndex, loading, noQuestions, questions.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !answeredRef.current,
      onMoveShouldSetPanResponder: (_, g) => !answeredRef.current && Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (answeredRef.current) return;
        if (g.dx > SWIPE_THRESHOLD) handleAnswer(true);
        else if (g.dx < -SWIPE_THRESHOLD) handleAnswer(false);
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const cardRotation = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });
  const santOpacity = pan.x.interpolate({
    inputRange: [30, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const falsktOpacity = pan.x.interpolate({
    inputRange: [-120, -30],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const cardGreenTint = pan.x.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 0.18],
    extrapolate: 'clamp',
  });
  const cardRedTint = pan.x.interpolate({
    inputRange: [-150, 0],
    outputRange: [0.18, 0],
    extrapolate: 'clamp',
  });
  const timerBarWidth = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const timerBarColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [colors.wrong, colors.yellow, colors.correct],
  });

  const currentQuestion = questions[currentIndex] ?? null;

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Laddar...</Text>
      </View>
    );
  }

  if (noQuestions || !currentQuestion) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Inga frågor ännu</Text>
          <Text style={styles.emptyBody}>
            Det finns inga {TOF_DIFFICULTY_LABEL[difficulty].toLowerCase()}-frågor för den här rundan.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Tillbaka</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const feedbackEmoji = feedback === 'correct' ? '✅' : feedback === 'timeout' ? '⏱' : '❌';
  const feedbackLabel =
    feedback === 'correct' ? 'Rätt!' :
    feedback === 'timeout' ? 'Tid ute!' :
    `Fel! Svaret var ${currentQuestion.answer ? 'Sant' : 'Falskt'}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitBtn}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.roundLabel}>Nivå {round}/{TOF_TOTAL_ROUNDS}</Text>
          <Text style={styles.difficultyLabel}>{TOF_DIFFICULTY_LABEL[difficulty]}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>{score}</Text>
          <Text style={styles.scoreUnit}>p</Text>
        </View>
      </View>

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOF_QUESTIONS_PER_ROUND }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i < correctCount && styles.progressDotCorrect,
              i === currentIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Timer bar */}
      <View style={styles.timerTrack}>
        <Animated.View style={[styles.timerBar, { width: timerBarWidth, backgroundColor: timerBarColor }]} />
      </View>

      {/* Card area */}
      <View style={styles.gameArea}>
        <Animated.View style={[styles.sideLabel, styles.sideLabelLeft, { opacity: falsktOpacity }]}>
          <Text style={styles.sideLabelTextFalskt}>FALSKT</Text>
        </Animated.View>
        <Animated.View style={[styles.sideLabel, styles.sideLabelRight, { opacity: santOpacity }]}>
          <Text style={styles.sideLabelTextSant}>SANT</Text>
        </Animated.View>

        <View style={styles.cardContainer}>
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { translateX: pan.x },
                  { rotate: cardRotation },
                  { scale: cardScale },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Animated.View style={[StyleSheet.absoluteFill, styles.cardTint, { backgroundColor: colors.correct, opacity: cardGreenTint }]} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.cardTint, { backgroundColor: colors.wrong, opacity: cardRedTint }]} />
            <Text style={styles.questionNumber}>{currentIndex + 1} / {TOF_QUESTIONS_PER_ROUND}</Text>
            <Text style={styles.statement}>{currentQuestion.statement}</Text>
          </Animated.View>
        </View>

        {feedback !== null && (
          <Animated.View style={[styles.feedbackOverlay, { opacity: feedbackOpacity }]}>
            <Text style={styles.feedbackEmoji}>{feedbackEmoji}</Text>
            <Text style={[styles.feedbackText, feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong]}>
              {feedbackLabel}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom answer buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.answerBtn, styles.falsktBtn, isAnswered && styles.btnDisabled]}
          onPress={() => handleAnswer(false)}
          disabled={isAnswered}
          activeOpacity={0.75}
        >
          <Text style={styles.falsktBtnText}>Falskt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.answerBtn, styles.santBtn, isAnswered && styles.btnDisabled]}
          onPress={() => handleAnswer(true)}
          disabled={isAnswered}
          activeOpacity={0.75}
        >
          <Text style={styles.santBtnText}>Sant</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  loading: { flex: 1, backgroundColor: colors.bg1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.text2, fontFamily: fonts.display400, fontSize: 16 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text1, fontSize: 22, fontFamily: fonts.display700, textAlign: 'center' },
  emptyBody: { color: colors.text2, fontSize: 15, fontFamily: fonts.display400, textAlign: 'center', lineHeight: 22 },
  backBtn: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 28, backgroundColor: colors.bg2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong },
  backBtnText: { color: colors.text2, fontSize: 15, fontFamily: fonts.display600 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  exitBtn: { padding: 8, minWidth: 40 },
  exitText: { color: colors.text2, fontSize: 18, fontFamily: fonts.display600 },
  topCenter: { alignItems: 'center' },
  roundLabel: { color: colors.text1, fontSize: 15, fontFamily: fonts.display700 },
  difficultyLabel: { color: colors.text2, fontSize: 11, fontFamily: fonts.display500, marginTop: 1 },
  scoreBox: { flexDirection: 'row', alignItems: 'baseline', gap: 2, minWidth: 40, justifyContent: 'flex-end' },
  scoreText: { color: colors.text1, fontSize: 20, fontFamily: fonts.display700 },
  scoreUnit: { color: colors.text2, fontSize: 12, fontFamily: fonts.display500 },

  progressRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 20,
    paddingBottom: 8,
    justifyContent: 'center',
  },
  progressDot: { width: 20, height: 6, borderRadius: 3, backgroundColor: colors.bg3 },
  progressDotCorrect: { backgroundColor: colors.correct },
  progressDotActive: { backgroundColor: colors.pink },

  timerTrack: { height: 4, backgroundColor: colors.bg2, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  timerBar: { height: '100%', borderRadius: 2 },

  gameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },

  sideLabel: {
    position: 'absolute',
    top: '40%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  sideLabelLeft: { left: 12, borderColor: colors.wrong, backgroundColor: `${colors.wrong}20` },
  sideLabelRight: { right: 12, borderColor: colors.correct, backgroundColor: `${colors.correct}20` },
  sideLabelTextFalskt: { color: colors.wrong, fontSize: 14, fontFamily: fonts.display700, letterSpacing: 1 },
  sideLabelTextSant: { color: colors.correct, fontSize: 14, fontFamily: fonts.display700, letterSpacing: 1 },

  cardContainer: { width: '82%', alignItems: 'center' },
  card: {
    width: '100%',
    minHeight: 220,
    backgroundColor: colors.bg2,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  cardTint: { borderRadius: 22 },
  questionNumber: { color: colors.text3, fontSize: 12, fontFamily: fonts.display500, letterSpacing: 0.5 },
  statement: {
    color: colors.text1,
    fontSize: 22,
    fontFamily: fonts.display700,
    textAlign: 'center',
    lineHeight: 30,
  },

  feedbackOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg1,
    borderRadius: radius.xl,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
  },
  feedbackEmoji: { fontSize: 40 },
  feedbackText: { fontSize: 17, fontFamily: fonts.display700, textAlign: 'center' },
  feedbackCorrect: { color: colors.correct },
  feedbackWrong: { color: colors.wrong },

  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 12,
  },
  answerBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  falsktBtn: {
    backgroundColor: `${colors.wrong}1a`,
    borderColor: colors.wrong,
  },
  santBtn: {
    backgroundColor: `${colors.correct}1a`,
    borderColor: colors.correct,
  },
  falsktBtnText: {
    color: colors.wrong,
    fontSize: 18,
    fontFamily: fonts.display700,
    letterSpacing: 0.5,
  },
  santBtnText: {
    color: colors.correct,
    fontSize: 18,
    fontFamily: fonts.display700,
    letterSpacing: 0.5,
  },
  btnDisabled: { opacity: 0.35 },
});
