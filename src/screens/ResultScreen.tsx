import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Share,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { getCategoryById } from '../data/categories';
import { submitComplaint } from '../lib/submissions';
import { ComplaintModal } from '../components/ComplaintModal';
import { CelebrationOverlay, EffectType } from '../components/CelebrationOverlay';
import { colors, fonts, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export default function ResultScreen({ route, navigation }: Props) {
  const { categoryId, totalQuestions, correctAnswers, totalScore, isNewHighscore, previousHighscore } =
    route.params;

  const { startGame, questions } = useGameStore();
  const category = getCategoryById(categoryId);
  const [displayScore, setDisplayScore] = useState(0);
  const [celebrationEffects, setCelebrationEffects] = useState<EffectType[]>([]);
  const [complainedIds, setComplainedIds] = useState<Set<string>>(new Set());
  const [complaintTarget, setComplaintTarget] = useState<{ id: string; question: string; category: string } | null>(null);

  useEffect(() => {
    // Pick 3 random effects for the end-of-round celebration
    const all: EffectType[] = ['slowStars', 'bigBalloons', 'fireworks', 'champagne'];
    setCelebrationEffects([...all].sort(() => Math.random() - 0.5).slice(0, 3));
  }, []);

  useEffect(() => {
    const target = totalScore;
    const duration = 1400;
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + increment, target);
      setDisplayScore(Math.round(current));
      if (current >= target) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [totalScore]);

  const handlePlayAgain = () => {
    startGame(categoryId);
    navigation.replace('Game', { categoryId });
  };

  const handleChangeCategory = () => {
    navigation.navigate('Home');
  };

  const handleComplainSubmit = async (message: string) => {
    if (!complaintTarget) return;
    const { error } = await submitComplaint(complaintTarget.id, complaintTarget.question, complaintTarget.category, message);
    if (!error) setComplainedIds(prev => new Set(prev).add(complaintTarget.id));
    setComplaintTarget(null);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Jag fick ${totalScore} XP på Quizine i kategorin "${category?.name}"! ${correctAnswers} av ${totalQuestions} rätt. Kan du slå det? 🍽️`,
      });
    } catch {}
  };

  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const emoji =
    percentage >= 80 ? '🏆' : percentage >= 50 ? '👍' : '💪';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.emoji}>{emoji}</Text>

        {isNewHighscore && (
          <View style={styles.newRecordBadge}>
            <Text style={styles.newRecordText}>🎉 NYTT REKORD!</Text>
          </View>
        )}

        <Text style={styles.scoreLabel}>TOTALPOÄNG</Text>
        <Text style={styles.scoreValue}>{displayScore} XP</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{correctAnswers}</Text>
            <Text style={styles.statLabel}>Rätt</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={styles.statValue}>{totalQuestions - correctAnswers}</Text>
            <Text style={styles.statLabel}>Fel</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{percentage}%</Text>
            <Text style={styles.statLabel}>Träffsäkerhet</Text>
          </View>
        </View>

        {!isNewHighscore && previousHighscore > 0 && (
          <Text style={styles.prevHighscore}>Rekord: {previousHighscore} XP</Text>
        )}

        <Text style={styles.tagline}>SNABBT, KUL & LÄRORIKT!</Text>

        <TouchableOpacity
          onPress={handlePlayAgain}
          style={[styles.btn, { backgroundColor: colors.pink }]}
        >
          <Text style={styles.btnText}>Spela igen</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleChangeCategory} style={styles.btnOutline}>
          <Text style={styles.btnOutlineText}>Byt kategori</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Leaderboard', { categoryId })}
          style={styles.btnOutline}
        >
          <Text style={styles.btnOutlineText}>🏆  Topplista</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareText}>Dela resultat  ↗</Text>
        </TouchableOpacity>

        {questions.length > 0 && (
          <View style={styles.complainSection}>
            <Text style={styles.complainTitle}>⚠️  Fel på en fråga?</Text>
            {questions.map(q => (
              <View key={q.id} style={styles.complainRow}>
                <Text style={styles.complainQ} numberOfLines={2}>{q.question}</Text>
                {complainedIds.has(q.id) ? (
                  <Text style={styles.complainedBadge}>Skickat ✓</Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => setComplaintTarget({ id: q.id, question: q.question, category: q.category })}
                    style={styles.complainBtn}
                  >
                    <Text style={styles.complainBtnText}>Klaga</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <CelebrationOverlay effects={celebrationEffects} />
      <ComplaintModal
        visible={complaintTarget !== null}
        questionText={complaintTarget?.question ?? ''}
        onClose={() => setComplaintTarget(null)}
        onSubmit={handleComplainSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emoji: { fontSize: 64, marginBottom: 8 },
  newRecordBadge: {
    backgroundColor: colors.yellow,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  newRecordText: { color: colors.bg1, fontSize: 14, fontFamily: fonts.display700, letterSpacing: 1 },
  scoreLabel: {
    color: colors.text3,
    fontSize: 10.5,
    fontFamily: fonts.mono700,
    letterSpacing: 0.22 * 10.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scoreValue: {
    color: colors.yellow,
    fontSize: 64,
    fontFamily: fonts.mono700,
    marginBottom: 24,
    lineHeight: 70,
    letterSpacing: -2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 8,
    width: '100%',
    marginBottom: 16,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.lineStrong },
  statValue: { color: colors.text1, fontSize: 26, fontFamily: fonts.display700 },
  statLabel: { color: colors.text3, fontSize: 12, fontFamily: fonts.display400, marginTop: 2 },
  prevHighscore: { color: colors.text3, fontSize: 13, fontFamily: fonts.display400, marginBottom: 12 },
  tagline: {
    color: colors.text3,
    fontSize: 10.5,
    fontFamily: fonts.mono700,
    letterSpacing: 0.22 * 10.5,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  btn: { width: '100%', paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#1a0010', fontSize: 17, fontFamily: fonts.display700 },
  btnOutline: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    marginBottom: 10,
  },
  btnOutlineText: { color: colors.text1, fontSize: 16, fontFamily: fonts.display600 },
  shareBtn: { paddingVertical: 8 },
  shareText: { color: colors.text2, fontSize: 14, fontFamily: fonts.display500 },
  complainSection: {
    width: '100%',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
    gap: 10,
  },
  complainTitle: { color: colors.text2, fontSize: 13, fontFamily: fonts.display600, letterSpacing: 0.5, marginBottom: 4 },
  complainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  complainQ: { flex: 1, color: colors.text1, fontSize: 13, fontFamily: fonts.display400, lineHeight: 18 },
  complainBtn: {
    backgroundColor: colors.bg3,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  complainBtnText: { color: colors.text2, fontSize: 12, fontFamily: fonts.display600 },
  complainedBadge: { color: colors.correct, fontSize: 12, fontFamily: fonts.display600 },
});
