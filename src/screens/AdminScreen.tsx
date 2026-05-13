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
  addRemoteQuestions,
  toggleRemoteQuestion,
  deleteRemoteQuestion,
} from '../lib/remoteQuestions';
import { Complaint, getComplaints, dismissComplaint } from '../lib/submissions';
import { getQuestionStats, getBattlesPerDay, QuestionStat, DailyBattleStat } from '../lib/stats';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

interface ParsedQuestion {
  question: string;
  answers: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  difficulty: 'easy' | 'medium' | 'hard';
  valid: boolean;
  error?: string;
}

const EMPTY_ANSWERS: [string, string, string, string] = ['', '', '', ''];

export default function AdminScreen({ navigation }: Props) {
  const { loadRemoteQuestions } = useGameStore();

  const [adminTab, setAdminTab] = useState<'questions' | 'stats' | 'daily'>('questions');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [battleStats, setBattleStats] = useState<DailyBattleStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  interface DailyEntry { id: string; username: string; score: number; correct: number; total: number; created_at: string }
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Bulk import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<CategoryId>('food');
  const [bulkDifficulty, setBulkDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [bulkText, setBulkText] = useState('');
  const [parsedBulk, setParsedBulk] = useState<ParsedQuestion[] | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);

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
      const [qs, cs] = await Promise.all([
        fetchAllQuestionsAdmin(),
        getComplaints(),
      ]);
      setQuestions(qs);
      setComplaints(cs);
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta frågor.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [qs, bs] = await Promise.all([getQuestionStats(), getBattlesPerDay()]);
      setQuestionStats(qs);
      setBattleStats(bs);
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta statistik.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const todayParis = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  const loadDaily = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const { data, error } = await supabase
        .from('daily_scores')
        .select('id, username, score, correct, total, created_at')
        .eq('date', todayParis)
        .order('score', { ascending: false });
      if (error) throw error;
      setDailyEntries((data ?? []) as DailyEntry[]);
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta dagliga speldata.');
    } finally {
      setLoadingDaily(false);
    }
  }, [todayParis]);

  const handleResetDaily = () => {
    const doReset = async () => {
      setResetting(true);
      try {
        const { error } = await supabase
          .from('daily_scores')
          .delete()
          .eq('date', todayParis);
        if (error) throw error;
        setDailyEntries([]);
        Alert.alert('Återställt ✓', `Alla speldata för ${todayParis} är borttagna. Spelare kan nu spela om.`);
      } catch {
        Alert.alert('Fel', 'Kunde inte återställa.');
      } finally {
        setResetting(false);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Återställ dagens quiz (${todayParis})?\n\nDetta tar bort alla spelresultat för idag från databasen.`)) doReset();
      return;
    }
    Alert.alert(
      'Återställ dagligt quiz',
      `Ta bort alla resultat för ${todayParis}? Spelare kan då spela om.`,
      [{ text: 'Avbryt', style: 'cancel' }, { text: 'Återställ', style: 'destructive', onPress: doReset }],
    );
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (adminTab === 'stats') loadStats();
    if (adminTab === 'daily') loadDaily();
  }, [adminTab]);

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

  const handleDismissComplaint = async (complaint: Complaint) => {
    try {
      await dismissComplaint(complaint.id);
      setComplaints(prev => prev.filter(c => c.id !== complaint.id));
    } catch {
      Alert.alert('Fel', 'Kunde inte stänga klagomålet.');
    }
  };

  const parseBulk = () => {
    setBulkError('');
    setParsedBulk(null);
    const raw = bulkText.trim();
    if (!raw) { setBulkError('Klistra in JSON-text ovan.'); return; }
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('Rotnivån måste vara en JSON-array [ ... ]');
      const result: ParsedQuestion[] = arr.map((item: any, i: number) => {
        if (!item.question || typeof item.question !== 'string')
          return { question: '', answers: ['','','',''], correct: 0, difficulty: 'medium', valid: false, error: `Post ${i+1}: saknar "question"` };
        if (!Array.isArray(item.answers) || item.answers.length !== 4)
          return { question: item.question, answers: ['','','',''], correct: 0, difficulty: 'medium', valid: false, error: `Post ${i+1}: "answers" måste vara en array med exakt 4 element` };
        if (typeof item.correct !== 'number' || item.correct < 0 || item.correct > 3)
          return { question: item.question, answers: item.answers, correct: 0, difficulty: 'medium', valid: false, error: `Post ${i+1}: "correct" måste vara ett tal 0–3` };
        return {
          question: item.question.trim(),
          answers: item.answers.map((a: string) => String(a).trim()) as [string,string,string,string],
          correct: item.correct as 0|1|2|3,
          difficulty: (['easy','medium','hard'].includes(item.difficulty) ? item.difficulty : bulkDifficulty) as 'easy'|'medium'|'hard',
          valid: true,
        };
      });
      setParsedBulk(result);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Ogiltig JSON');
    }
  };

  const handleBulkImport = async () => {
    if (!parsedBulk) return;
    const valid = parsedBulk.filter(p => p.valid);
    if (valid.length === 0) { Alert.alert('Inga giltiga frågor', 'Rätta felen ovan först.'); return; }
    setBulkImporting(true);
    try {
      await addRemoteQuestions(valid.map(p => ({
        category: bulkCategory,
        question: p.question,
        answers: p.answers as [string,string,string,string],
        correctIndex: p.correct as 0|1|2|3,
        difficulty: p.difficulty,
      })));
      await loadRemoteQuestions();
      reload();
      setBulkText('');
      setParsedBulk(null);
      setBulkError('');
      setShowBulkImport(false);
      Alert.alert('Importerat ✓', `${valid.length} frågor publicerades.`);
    } catch {
      Alert.alert('Fel', 'Kunde inte importera frågorna. Försök igen.');
    } finally {
      setBulkImporting(false);
    }
  };

  const handlePublishPending = async (q: Question) => {
    try {
      await toggleRemoteQuestion(q.id, true);
      await loadRemoteQuestions();
      reload();
    } catch {
      Alert.alert('Fel', 'Kunde inte publicera frågan.');
    }
  };

  const countsByCategory = CATEGORIES.map(cat => ({
    cat,
    count: questions.filter(q => q.category === cat.id).length,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#030C1A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin ⚙️</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['questions', 'stats', 'daily'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setAdminTab(tab)}
            style={[styles.tabBtn, adminTab === tab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, adminTab === tab && styles.tabBtnTextActive]}>
              {tab === 'questions' ? 'Frågor' : tab === 'stats' ? 'Statistik' : 'Daglig'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {adminTab === 'daily' ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Dagligt quiz — {todayParis}</Text>

            {/* Reset button */}
            <TouchableOpacity
              onPress={handleResetDaily}
              style={[styles.resetDailyBtn, resetting && styles.disabled]}
              disabled={resetting}
            >
              {resetting
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.resetDailyBtnText}>🔄  Återställ dagens quiz</Text>
              }
            </TouchableOpacity>
            <Text style={styles.resetDailyHint}>
              Tar bort alla spelresultat för idag ur databasen — spelare kan sedan spela om.
              Obs: spelaren behöver även rensa sin webbläsares localStorage för daily.quizine.se.
            </Text>

            {/* Refresh */}
            <TouchableOpacity onPress={loadDaily} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>↻  Uppdatera</Text>
            </TouchableOpacity>

            {/* Today's players */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Spelade idag ({dailyEntries.length} st)
            </Text>

            {loadingDaily ? (
              <ActivityIndicator color="#1D6FE8" style={{ marginTop: 16 }} />
            ) : dailyEntries.length === 0 ? (
              <Text style={styles.emptyText}>Ingen har spelat ännu idag.</Text>
            ) : (
              dailyEntries.map((entry, i) => (
                <View key={entry.id} style={styles.dailyEntryRow}>
                  <Text style={styles.dailyRank}>#{i + 1}</Text>
                  <Text style={styles.dailyName} numberOfLines={1}>{entry.username}</Text>
                  <Text style={styles.dailyCorrect}>{entry.correct}/{entry.total}</Text>
                  <Text style={styles.dailyScore}>{entry.score} p</Text>
                </View>
              ))
            )}
          </ScrollView>
        ) : adminTab === 'stats' ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {loadingStats ? (
              <ActivityIndicator color="#1D6FE8" style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Battle activity */}
                <Text style={styles.sectionTitle}>Battles per dag (30 dagar)</Text>
                {battleStats.length === 0 ? (
                  <Text style={styles.emptyText}>Ingen data ännu.</Text>
                ) : (
                  battleStats.slice(0, 14).map(row => {
                    const maxBattles = Math.max(...battleStats.map(r => r.battle_count));
                    const barW = maxBattles > 0 ? Math.round((row.battle_count / maxBattles) * 100) : 0;
                    return (
                      <View key={row.day} style={styles.battleRow}>
                        <Text style={styles.battleDay}>{row.day}</Text>
                        <View style={styles.battleBarBg}>
                          <View style={[styles.battleBarFill, { width: `${barW}%` as any }]} />
                        </View>
                        <Text style={styles.battleVal}>{row.battle_count}⚔ {row.player_count}👤</Text>
                      </View>
                    );
                  })
                )}

                {/* Top 10 easiest */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Top 10 lättaste frågorna</Text>
                {questionStats.length === 0 ? (
                  <Text style={styles.emptyText}>Minst 3 försök krävs per fråga.</Text>
                ) : (
                  [...questionStats]
                    .sort((a, b) => b.correct_rate - a.correct_rate)
                    .slice(0, 10)
                    .map((stat, i) => {
                      const q = questions.find(x => x.id === stat.question_id);
                      const cat = q ? CATEGORIES.find(c => c.id === q.category) : undefined;
                      return (
                        <View key={stat.question_id} style={styles.statQCard}>
                          <View style={styles.statQTop}>
                            <Text style={styles.statQRank}>#{i + 1}</Text>
                            <Text style={[styles.statQRate, { color: '#06D6A0' }]}>
                              {Math.round(stat.correct_rate * 100)}% rätt
                            </Text>
                            <Text style={styles.statQTotal}>{stat.total} försök</Text>
                            {cat && (
                              <View style={[styles.catBadge, { backgroundColor: cat.color + '33' }]}>
                                <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.icon}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.statQText} numberOfLines={2}>
                            {q?.question ?? stat.question_id}
                          </Text>
                        </View>
                      );
                    })
                )}

                {/* Top 10 hardest */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Top 10 svåraste frågorna</Text>
                {questionStats.length === 0 ? (
                  <Text style={styles.emptyText}>Minst 3 försök krävs per fråga.</Text>
                ) : (
                  [...questionStats]
                    .sort((a, b) => a.correct_rate - b.correct_rate)
                    .slice(0, 10)
                    .map((stat, i) => {
                      const q = questions.find(x => x.id === stat.question_id);
                      const cat = q ? CATEGORIES.find(c => c.id === q.category) : undefined;
                      return (
                        <View key={stat.question_id} style={styles.statQCard}>
                          <View style={styles.statQTop}>
                            <Text style={styles.statQRank}>#{i + 1}</Text>
                            <Text style={[styles.statQRate, { color: '#FF4757' }]}>
                              {Math.round(stat.correct_rate * 100)}% rätt
                            </Text>
                            <Text style={styles.statQTotal}>{stat.total} försök</Text>
                            {cat && (
                              <View style={[styles.catBadge, { backgroundColor: cat.color + '33' }]}>
                                <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.icon}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.statQText} numberOfLines={2}>
                            {q?.question ?? stat.question_id}
                          </Text>
                        </View>
                      );
                    })
                )}
              </>
            )}
          </ScrollView>
        ) : (
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
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => { setShowForm(v => !v); setShowBulkImport(false); }}
              style={[styles.addToggle, styles.addToggleHalf, showForm && styles.addToggleActive]}
            >
              <Text style={styles.addToggleText}>{showForm ? '✕  Avbryt' : '+ Lägg till fråga'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowBulkImport(v => !v); setShowForm(false); }}
              style={[styles.addToggle, styles.addToggleHalf, showBulkImport && styles.addToggleBulkActive]}
            >
              <Text style={[styles.addToggleText, showBulkImport && { color: '#FF6B2B' }]}>
                {showBulkImport ? '✕  Avbryt' : '📋  Massimport (JSON)'}
              </Text>
            </TouchableOpacity>
          </View>

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
                placeholderTextColor="#254A72"
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
                    placeholderTextColor="#254A72"
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

          {/* Bulk import form */}
          {showBulkImport && (
            <View style={styles.formCard}>
              <Text style={styles.label}>Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setBulkCategory(cat.id)}
                    style={[styles.catPill, bulkCategory === cat.id && { backgroundColor: cat.color }]}
                  >
                    <Text style={styles.catPillIcon}>{cat.icon}</Text>
                    <Text style={[styles.catPillText, bulkCategory === cat.id && styles.catPillTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Standardsvårighetsgrad</Text>
              <View style={styles.diffRow}>
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setBulkDifficulty(d)}
                    style={[styles.diffChip, bulkDifficulty === d && { backgroundColor: '#FF6B2B' }]}
                  >
                    <Text style={[styles.diffText, bulkDifficulty === d && styles.diffTextActive]}>
                      {d === 'easy' ? 'Lätt' : d === 'medium' ? 'Medel' : 'Svår'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Klistra in JSON</Text>
              <Text style={styles.sublabel}>Format: {`[{"question":"...","answers":["A","B","C","D"],"correct":0}]`}</Text>
              <TextInput
                style={[styles.input, styles.bulkInput]}
                value={bulkText}
                onChangeText={v => { setBulkText(v); setParsedBulk(null); setBulkError(''); }}
                placeholder={'[\n  {\n    "question": "Din fråga?",\n    "answers": ["A","B","C","D"],\n    "correct": 0\n  }\n]'}
                placeholderTextColor="#254A72"
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />

              {bulkError ? (
                <Text style={styles.bulkError}>{bulkError}</Text>
              ) : null}

              <TouchableOpacity
                onPress={parseBulk}
                style={styles.parseBtn}
                disabled={!bulkText.trim()}
              >
                <Text style={styles.parseBtnText}>Förhandsgranska →</Text>
              </TouchableOpacity>

              {parsedBulk && (
                <>
                  <Text style={[styles.label, { marginTop: 16 }]}>
                    Förhandsgranskning — {parsedBulk.filter(p => p.valid).length}/{parsedBulk.length} giltiga
                  </Text>
                  {parsedBulk.map((p, i) => (
                    <View key={i} style={[styles.bulkPreviewCard, !p.valid && styles.bulkPreviewInvalid]}>
                      {p.valid ? (
                        <>
                          <Text style={styles.bulkPreviewQ}>{p.question}</Text>
                          {p.answers.map((a, ai) => (
                            <Text key={ai} style={[styles.bulkPreviewA, ai === p.correct && styles.bulkPreviewCorrect]}>
                              {ai === p.correct ? '✓ ' : '   '}{a}
                            </Text>
                          ))}
                        </>
                      ) : (
                        <Text style={styles.bulkPreviewErr}>⚠ {p.error}</Text>
                      )}
                    </View>
                  ))}

                  {parsedBulk.some(p => p.valid) && (
                    <TouchableOpacity
                      onPress={handleBulkImport}
                      style={[styles.saveBtn, { backgroundColor: '#FF6B2B' }, bulkImporting && styles.disabled]}
                      disabled={bulkImporting}
                    >
                      {bulkImporting
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <Text style={styles.saveBtnText}>
                            Publicera {parsedBulk.filter(p => p.valid).length} frågor →
                          </Text>
                      }
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Complaints */}
          <Text style={styles.sectionTitle}>
            Klagomål ({complaints.length} st)
          </Text>

          {complaints.length === 0 ? (
            <Text style={[styles.emptyText, { marginBottom: 24 }]}>Inga klagomål. 🎉</Text>
          ) : (
            complaints.map(c => {
              const cat = CATEGORIES.find(cat => cat.id === c.category_id);
              const date = new Date(c.created_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
              return (
                <View key={c.id} style={styles.complaintCard}>
                  <View style={styles.complaintHeader}>
                    <View style={[styles.catBadge, { backgroundColor: (cat?.color ?? '#1D6FE8') + '33' }]}>
                      <Text style={[styles.catBadgeText, { color: cat?.color }]}>
                        {cat?.icon} {cat?.name ?? c.category_id}
                      </Text>
                    </View>
                    <Text style={styles.complaintMeta}>{c.complained_username} · {date}</Text>
                  </View>
                  <Text style={styles.complaintQuestion} numberOfLines={3}>{c.question_text}</Text>
                  <View style={styles.complaintMsgBox}>
                    <Text style={styles.complaintMsg}>"{c.message}"</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDismissComplaint(c)}
                    style={styles.dismissBtn}
                  >
                    <Text style={styles.dismissBtnText}>Stäng ✓</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* Pending review — user-submitted / inactive questions */}
          {(() => {
            const pending = questions.filter(q => !q.active);
            if (loadingList || pending.length === 0) return null;
            return (
              <>
                <Text style={[styles.sectionTitle, { color: '#FF6B2B' }]}>
                  Väntande granskning ({pending.length} st)
                </Text>
                {pending.map(q => {
                  const cat = CATEGORIES.find(c => c.id === q.category);
                  return (
                    <View key={q.id} style={[styles.qCard, styles.qCardPending]}>
                      <View style={styles.qCardTop}>
                        <View style={[styles.catBadge, { backgroundColor: (cat?.color ?? '#1D6FE8') + '33' }]}>
                          <Text style={[styles.catBadgeText, { color: cat?.color }]}>
                            {cat?.icon} {cat?.name}
                          </Text>
                        </View>
                        <View style={styles.qActions}>
                          <TouchableOpacity
                            onPress={() => handlePublishPending(q)}
                            style={styles.publishBtn}
                          >
                            <Text style={styles.publishBtnText}>Publicera ✓</Text>
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
                })}
              </>
            );
          })()}

          {/* Live question list */}
          <Text style={styles.sectionTitle}>
            Live frågor ({questions.filter(q => q.active).length} st)
          </Text>

          {loadingList ? (
            <ActivityIndicator color="#1D6FE8" style={{ marginTop: 24 }} />
          ) : questions.filter(q => q.active).length === 0 ? (
            <Text style={styles.emptyText}>Inga live-frågor ännu.</Text>
          ) : (
            questions.filter(q => q.active).map(q => {
              const cat = CATEGORIES.find(c => c.id === q.category);
              return (
                <View key={q.id} style={styles.qCard}>
                  <View style={styles.qCardTop}>
                    <View style={[styles.catBadge, { backgroundColor: (cat?.color ?? '#1D6FE8') + '33' }]}>
                      <Text style={[styles.catBadgeText, { color: cat?.color }]}>
                        {cat?.icon} {cat?.name}
                      </Text>
                    </View>
                    <View style={styles.qActions}>
                      <TouchableOpacity
                        onPress={() => handleToggle(q, false)}
                        style={[styles.toggleBtn, styles.toggleBtnOn]}
                      >
                        <Text style={styles.toggleBtnText}>Live</Text>
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030C1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: '#7B9EC4', fontSize: 22 },
  title: { color: '#FFFFFF', fontSize: 20, fontFamily: 'DMSans_700Bold' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0C1E35',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statEmoji: { fontSize: 13 },
  statCount: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  addToggle: {
    backgroundColor: '#0C1E35',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1B3A5C',
  },
  addToggleActive: { borderColor: '#1D6FE8' },
  addToggleText: { color: '#1D6FE8', fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  formCard: {
    backgroundColor: '#0C1E35',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 4,
  },
  label: {
    color: '#7B9EC4',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  sublabel: { color: '#254A72', fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 8, marginTop: -4 },
  catRow: { gap: 8, paddingBottom: 4 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#112540',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  catPillIcon: { fontSize: 13 },
  catPillText: { color: '#7B9EC4', fontSize: 12, fontFamily: 'DMSans_500Medium' },
  catPillTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  diffRow: { flexDirection: 'row', gap: 8 },
  diffChip: {
    flex: 1,
    backgroundColor: '#112540',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  diffText: { color: '#7B9EC4', fontSize: 13, fontFamily: 'DMSans_500Medium' },
  diffTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  input: {
    backgroundColor: '#112540',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    borderWidth: 1,
    borderColor: '#1B3A5C',
  },
  questionInput: { minHeight: 80, textAlignVertical: 'top' },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  radio: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#1B3A5C',
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
    color: '#7B9EC4',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyText: { color: '#254A72', fontSize: 14, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12 },
  qCard: {
    backgroundColor: '#0C1E35',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#112540',
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
  deleteBtnText: { color: '#254A72', fontSize: 15 },
  qText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginBottom: 6, lineHeight: 20 },
  qAnswer: { color: '#7B9EC4', fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 2 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addToggleHalf: { flex: 1, marginBottom: 0 },
  addToggleBulkActive: { borderColor: '#FF6B2B' },
  bulkInput: { minHeight: 160, textAlignVertical: 'top', fontFamily: 'DMSans_400Regular' },
  bulkError: { color: '#FF4757', fontSize: 13, fontFamily: 'DMSans_500Medium', marginTop: 6 },
  parseBtn: {
    backgroundColor: '#112540',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FF6B2B',
  },
  parseBtnText: { color: '#FF6B2B', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  bulkPreviewCard: {
    backgroundColor: '#030C1A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#112540',
  },
  bulkPreviewInvalid: { borderColor: '#FF4757' + '55' },
  bulkPreviewQ: { color: '#FFFFFF', fontSize: 12, fontFamily: 'DMSans_600SemiBold', marginBottom: 4 },
  bulkPreviewA: { color: '#7B9EC4', fontSize: 11, fontFamily: 'DMSans_400Regular' },
  bulkPreviewCorrect: { color: '#06D6A0', fontFamily: 'DMSans_600SemiBold' },
  bulkPreviewErr: { color: '#FF4757', fontSize: 12, fontFamily: 'DMSans_500Medium' },
  qCardPending: { borderColor: '#FF6B2B' + '55', borderWidth: 1.5 },
  publishBtn: { backgroundColor: '#1A3A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  publishBtnText: { color: '#4CAF50', fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  complaintCard: {
    backgroundColor: '#0C1E35',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FF4757' + '44',
    gap: 10,
  },
  complaintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  complaintMeta: {
    color: '#254A72',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
  },
  complaintQuestion: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    lineHeight: 19,
  },
  complaintMsgBox: {
    backgroundColor: '#030C1A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#112540',
  },
  complaintMsg: {
    color: '#7B9EC4',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#1A3A1A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  dismissBtnText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#0C1E35',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: '#1D6FE8' },
  tabBtnText: { color: '#254A72', fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  tabBtnTextActive: { color: '#FFFFFF' },
  battleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  battleDay: {
    color: '#7B9EC4',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    width: 80,
  },
  battleBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#112540',
    borderRadius: 4,
    overflow: 'hidden',
  },
  battleBarFill: {
    height: 8,
    backgroundColor: '#1D6FE8',
    borderRadius: 4,
  },
  battleVal: {
    color: '#7B9EC4',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    width: 80,
    textAlign: 'right',
  },
  statQCard: {
    backgroundColor: '#0C1E35',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#112540',
  },
  statQTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statQRank: {
    color: '#254A72',
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    width: 28,
  },
  statQRate: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
  },
  statQTotal: {
    color: '#254A72',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    flex: 1,
  },
  statQText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
  resetDailyBtn: {
    backgroundColor: '#C0392B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 10,
  },
  resetDailyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
  },
  resetDailyHint: {
    color: '#254A72',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  refreshBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0C1E35',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1B3A5C',
  },
  refreshBtnText: {
    color: '#1D6FE8',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  dailyEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C1E35',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 8,
  },
  dailyRank: {
    color: '#254A72',
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    width: 28,
  },
  dailyName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    flex: 1,
  },
  dailyCorrect: {
    color: '#7B9EC4',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    width: 36,
    textAlign: 'center',
  },
  dailyScore: {
    color: '#1D6FE8',
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    width: 44,
    textAlign: 'right',
  },
});
