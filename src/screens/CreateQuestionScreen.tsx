import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
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
import { submitQuestion } from '../lib/submissions';
import { pickAndUploadQuestionImage } from '../lib/imageUpload';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateQuestion'>;

const EMPTY_ANSWERS: [string, string, string, string] = ['', '', '', ''];

export default function CreateQuestionScreen({ navigation }: Props) {
  const { customQuestions, addCustomQuestion, deleteCustomQuestion } = useGameStore();

  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState<[string, string, string, string]>([...EMPTY_ANSWERS]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

  const [hasImage, setHasImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const category = CATEGORIES.find(c => c.id === selectedCategory) ?? CATEGORIES[0]

  const handlePickImage = async () => {
    setUploadingImage(true);
    const result = await pickAndUploadQuestionImage();
    setUploadingImage(false);
    if ('error' in result) {
      if (result.error !== 'cancelled') Alert.alert('Fel', result.error);
      return;
    }
    setImageUrl(result.url);
  };;

  const updateAnswer = (index: number, value: string) => {
    const next = [...answers] as [string, string, string, string];
    next[index] = value;
    setAnswers(next);
  };

  const handleSave = async () => {
    if (!selectedCategory) {
      Alert.alert('Ingen kategori', 'Välj en kategori för frågan.');
      return;
    }
    if (!questionText.trim()) {
      Alert.alert('Saknad fråga', 'Skriv in en fråga.');
      return;
    }
    if (answers.some(a => !a.trim())) {
      Alert.alert('Saknade alternativ', 'Fyll i alla fyra svarsalternativ.');
      return;
    }
    if (correctIndex === null) {
      Alert.alert('Inget rätt svar', 'Markera vilket alternativ som är rätt svar.');
      return;
    }

    const { error } = await submitQuestion({
      category: selectedCategory!,
      question: questionText.trim(),
      answers: answers.map(a => a.trim()) as [string, string, string, string],
      correctIndex: correctIndex as 0 | 1 | 2 | 3,
      difficulty: 'medium',
      ...(imageUrl ? { imageUrl } : {}),
    });

    if (error) {
      Alert.alert('Fel', 'Kunde inte skicka frågan. Försök igen.');
      return;
    }

    setSelectedCategory(null);
    setQuestionText('');
    setAnswers([...EMPTY_ANSWERS]);
    setCorrectIndex(null);
    setHasImage(false);
    setImageUrl(null);
    Alert.alert('Skickad! ✓', 'Din fråga har skickats för granskning. Tack!');
  };

  const handleDelete = (id: string, questionText: string) => {
    Alert.alert(
      'Ta bort fråga',
      `"${questionText.length > 60 ? questionText.slice(0, 60) + '…' : questionText}"`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bort', style: 'destructive', onPress: () => deleteCustomQuestion(id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Skapa fråga</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category picker */}
          <Text style={styles.label}>Kategori</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.categoryPill,
                  selectedCategory === cat.id && { backgroundColor: cat.color },
                ]}
              >
                <Text style={styles.categoryPillIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryPillText,
                  selectedCategory === cat.id && styles.categoryPillTextActive,
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Question input */}
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

          {/* Optional image */}
          <TouchableOpacity
            onPress={() => { setHasImage(v => !v); if (hasImage) setImageUrl(null); }}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, hasImage && { backgroundColor: category.color, borderColor: category.color }]}>
              {hasImage && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Lägg till bild</Text>
          </TouchableOpacity>

          {hasImage && (
            <>
              <TouchableOpacity
                onPress={handlePickImage}
                style={[styles.imagePickBtn, { borderColor: category.color }, uploadingImage && styles.disabled]}
                disabled={uploadingImage}
              >
                {uploadingImage
                  ? <ActivityIndicator color={category.color} />
                  : <Text style={[styles.imagePickBtnText, { color: category.color }]}>
                      {imageUrl ? '🖼  Byt bild' : '📁  Välj bild från biblioteket'}
                    </Text>
                }
              </TouchableOpacity>
              {imageUrl && (
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
              )}
            </>
          )}

          {/* Answer inputs */}
          <Text style={styles.label}>Svarsalternativ</Text>
          <Text style={styles.sublabel}>Tryck på cirkeln för att markera rätt svar</Text>

          {answers.map((answer, i) => (
            <View key={i} style={styles.answerRow}>
              <TouchableOpacity
                onPress={() => setCorrectIndex(i)}
                style={[
                  styles.radio,
                  correctIndex === i && { backgroundColor: category.color, borderColor: category.color },
                ]}
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

          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: category.color }]}>
            <Text style={styles.saveBtnText}>Lägg till fråga</Text>
          </TouchableOpacity>

          {/* Existing custom questions */}
          {customQuestions.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 32 }]}>
                Mina frågor ({customQuestions.length})
              </Text>
              {customQuestions.map(q => {
                const cat = CATEGORIES.find(c => c.id === q.category);
                return (
                  <View key={q.id} style={styles.savedCard}>
                    <View style={styles.savedCardHeader}>
                      <View style={[styles.savedCatBadge, { backgroundColor: cat?.color + '33' }]}>
                        <Text style={[styles.savedCatText, { color: cat?.color }]}>
                          {cat?.icon} {cat?.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDelete(q.id, q.question)}
                        style={styles.deleteBtn}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.savedQuestion}>{q.question}</Text>
                    {q.answers.map((a, i) => (
                      <Text
                        key={i}
                        style={[
                          styles.savedAnswer,
                          i === q.correctIndex && { color: cat?.color, fontFamily: 'DMSans_600SemiBold' },
                        ]}
                      >
                        {i === q.correctIndex ? '✓ ' : '   '}{a}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </>
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
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 8,
  },
  label: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },
  sublabel: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 10,
    marginTop: -6,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  categoryPillIcon: { fontSize: 14 },
  categoryPillText: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
  },
  input: {
    backgroundColor: '#1E1040',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  questionInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3D2870',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  answerInput: {
    flex: 1,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
  },
  savedCard: {
    backgroundColor: '#1E1040',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A1A50',
  },
  savedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  savedCatBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savedCatText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    color: '#6050A0',
    fontSize: 16,
  },
  savedQuestion: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 8,
    lineHeight: 20,
  },
  savedAnswer: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 3,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#3D2870',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E1040',
  },
  checkboxTick: { color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans_700Bold' },
  checkboxLabel: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  imagePickBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: '#1E1040',
    minHeight: 52,
    justifyContent: 'center',
  },
  imagePickBtnText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  imagePreview: { width: '100%', height: 150, borderRadius: 12, marginTop: 10 },
  disabled: { opacity: 0.5 },
});
