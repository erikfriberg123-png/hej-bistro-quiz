import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CategoryId, Question } from '../types';
import { CATEGORIES } from '../data/categories';
import { useGameStore } from '../store/gameStore';
import {
  fetchAllQuestionsAdmin,
  addRemoteQuestion,
  toggleRemoteQuestion,
  deleteRemoteQuestion,
} from '../lib/remoteQuestions';

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

const EMPTY_ANSWERS: [string, string, string, string] = ['', '', '', ''];

export default function AdminScreen({ navigation }: Props) {
  const { loadRemoteQuestions } = useGameStore();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState<[string, string, string, string]>([...EMPTY_ANSWERS]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [showForm, setShowForm] = useState(false);

  const category = CATEGORIES.find(c => c.id === selectedCategory)!;

  const reload = useCallback(async () => {
    setLoadingList(true);
    try {
      const qs = await fetchAllQuestionsAdmin();
      setQuestions(qs);
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta frågor.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { reload(); }, []);

  const updateAnswer = (i: number, v: string) => {
    const next = [...answers] as [string, string, string, string];
    next[i] = v;
    setAnswers(next);
  };

  const resetForm = () => {
    setQuestionText('');
    setAnswers([...EMPTY_ANSWERS]);
    setCorrectIndex(null);
    setDifficulty('medium');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!questionText.trim()) { Alert.alert('Saknad fråga', 'Skriv in en fråga.'); return; }
    if (answers.some(a => !a.trim())) { Alert.alert('Saknade alternativ', 'Fyll i alla fyra alternativ.'); return; }
    if (correctIndex === null) { Alert.alert('Inget rätt svar', 'Markera rätt alternativ.'); return; }

    setSaving(true);
    try {
      await addRemoteQuestion({
        category: selectedCategory,
        question: questionText.trim(),
        answers: answers.map(a => a.trim()) as [string, string, string, string],
        correctIndex: correctIndex as 0 | 1 | 2 | 3,
        difficulty,
      });
      await loadRemoteQuestions();
      resetForm();
      reload();
      Alert.alert('Sparad ✓', 'Frågan är nu live i appen.');
    } catch {
      Alert.alert('Fel', 'Kunde inte spara frågan. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (q: Question, active: boolean) => {
    try {
      await toggleRemoteQuestion(q.id, active);
      await loadRemoteQuestions();
      reload();
    } catch {
      Alert.alert('Fel', 'Kunde inte uppdatera frågan.');
    }
  };

  const handleDelete = (q: Question) => {
    const preview = q.question.length > 80 ? q.question.slice(0, 80) + '…' : q.question;
    const doDelete = async () => {
      try {
        await deleteRemoteQuestion(q.id);
        await loadRemoteQuestions();
        reload();
      } catch {
        Alert.alert('Fel', 'Kunde inte ta bort frågan.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Ta bort fråga?\n\n${preview}`)) doDelete();
      return;
    }
    Alert.alert('Ta bort fråga', preview, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta bort', style: 'destructive', onPress: doDelete },
    ]);
  };

  const countsByCategory = CATEGORIES.map(cat => ({
    cat,
    count: questions.filter(q => q.category === cat.id).length,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin ⚙️</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Stats */}
          <View style={styles.statsRow}>
            {countsByCategory.map(({ cat, count }) => (
              <View key={cat.id} style={[styles.statChip, { borderColor: cat.color + '66' }]}>
                <Text style={styles.statEmoji}>{cat.icon}</Text>
                <Text style={[styles.statCount, { color: cat.color }]}>{count}</Text>
              </View>
            ))}
          </View>

          {/* Add question toggle */}
          <TouchableOpacity
            onPress={() => setShowForm(v => !v)}
            style={[styles.addToggle, showForm && styles.addToggleActive]}
          >
            <Text style={styles.addToggleText}>{showForm ? '✕  Avbryt' : '+ Lägg till fråga'}</Text>
          </TouchableOpacity>

          {/* Form */}
          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.label}>Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[styles.catPill, selectedCategory === cat.id && { backgroundColor: cat.color }]}
                  >
                    <Text style={styles.catPillIcon}>{cat.icon}</Text>
                    <Text style={[styles.catPillText, selectedCategory === cat.id && styles.catPillTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Svårighetsgrad</Text>
              <View style={styles.diffRow}>
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDifficulty(d)}
                    style={[styles.diffChip, difficulty === d && { backgroundColor: category.color }]}
                  >
                    <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>
                      {d === 'easy' ? 'Lätt' : d === 'medium' ? 'Medel' : 'Svår'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Fråga</Text>
              <TextInput
                style={[styles.input, styles.questionInput]}
                value={questionText}
                onChangeText={setQuestionText}
                placeholder="Skriv din fråga här..."
                placeholderTextColor="#6050A0"
                multiline
                maxLength={200}
              />

              <Text style={styles.label}>Svarsalternativ</Text>
              <Text style={styles.sublabel}>Tryck på cirkeln för att markera rätt svar</Text>
              {answers.map((answer, i) => (
                <View key={i} style={styles.answerRow}>
                  <TouchableOpacity
                    onPress={() => setCorrectIndex(i)}
                    style={[styles.radio, correctIndex === i && { backgroundColor: category.color, borderColor: category.color }]}
                  >
                    {correctIndex === i && <View style={styles.radioDot} />}
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.answerInput]}
                    value={answer}
                    onChangeText={v => updateAnswer(i, v)}
                    placeholder={`Alternativ ${i + 1}`}
                    placeholderTextColor="#6050A0"
                    maxLength={100}
                  />
                </View>
              ))}

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: category.color }, saving && styles.disabled]}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.saveBtnText}>Publicera fråga →</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Question list */}
          <Text style={styles.sectionTitle}>
            Remote frågor ({questions.length} st)
          </Text>

          {loadingList ? (
            <ActivityIndicator color="#9B5DE5" style={{ marginTop: 24 }} />
          ) : questions.length === 0 ? (
            <Text style={styles.emptyText}>Inga remote frågor ännu. Lägg till din första ovan.</Text>
          ) : (
            questions.map(q => {
              const cat = CATEGORIES.find(c => c.id === q.category);
              return (
                <View key={q.id} style={[styles.qCard, !q.active && styles.qCardInactive]}>
                  <View style={styles.qCardTop}>
                    <View style={[styles.catBadge, { backgroundColor: (cat?.color ?? '#9B5DE5') + '33' }]}>
                      <Text style={[styles.catBadgeText, { color: cat?.color }]}>
                        {cat?.icon} {cat?.name}
                      </Text>
                    </View>
                    <View style={styles.qActions}>
                      <TouchableOpacity
                        onPress={() => handleToggle(q, !q.active)}
                        style={[styles.toggleBtn, q.active ? styles.toggleBtnOn : styles.toggleBtnOff]}
                      >
                        <Text style={styles.toggleBtnText}>{q.active ? 'Live' : 'Av'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(q)} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.qText}>{q.question}</Text>
                  {q.answers.map((a, i) => (
                    <Text key={i} style={[styles.qAnswer, i === q.correctIndex && { color: cat?.color, fontFamily: 'DMSans_600SemiBold' }]}>
                      {i === q.correctIndex ? '✓ ' : '   '}{a}
                    </Text>
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1040',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statEmoji: { fontSize: 13 },
  statCount: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  addToggle: {
    backgroundColor: '#1E1040',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  addToggleActive: { borderColor: '#9B5DE5' },
  addToggleText: { color: '#9B5DE5', fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  formCard: {
    backgroundColor: '#1E1040',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 4,
  },
  label: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  sublabel: { color: '#6050A0', fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 8, marginTop: -4 },
  catRow: { gap: 8, paddingBottom: 4 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A50',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  catPillIcon: { fontSize: 13 },
  catPillText: { color: '#B0A8C8', fontSize: 12, fontFamily: 'DMSans_500Medium' },
  catPillTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  diffRow: { flexDirection: 'row', gap: 8 },
  diffChip: {
    flex: 1,
    backgroundColor: '#2A1A50',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  diffText: { color: '#B0A8C8', fontSize: 13, fontFamily: 'DMSans_500Medium' },
  diffTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  input: {
    backgroundColor: '#2A1A50',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  questionInput: { minHeight: 80, textAlignVertical: 'top' },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  radio: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#3D2870',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  answerInput: { flex: 1 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'DMSans_700Bold' },
  disabled: { opacity: 0.5 },
  sectionTitle: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyText: { color: '#6050A0', fontSize: 14, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12 },
  qCard: {
    backgroundColor: '#1E1040',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A1A50',
  },
  qCardInactive: { opacity: 0.45 },
  qCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  qActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  toggleBtnOn: { backgroundColor: '#1A3A1A' },
  toggleBtnOff: { backgroundColor: '#2A1A1A' },
  toggleBtnText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: '#FFFFFF' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: '#6050A0', fontSize: 15 },
  qText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginBottom: 6, lineHeight: 20 },
  qAnswer: { color: '#B0A8C8', fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 2 },
});
