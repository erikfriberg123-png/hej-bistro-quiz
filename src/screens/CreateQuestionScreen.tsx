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
import { colors, fonts, radius } from '../theme/tokens';

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
  const [submitted, setSubmitted] = useState(false);

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

  const resetForm = () => {
    setSelectedCategory(null);
    setQuestionText('');
    setAnswers([...EMPTY_ANSWERS]);
    setCorrectIndex(null);
    setHasImage(false);
    setImageUrl(null);
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

    resetForm();
    setSubmitted(true);
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
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

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
        {submitted ? (
          <View style={styles.thankYouContainer}>
            <Text style={styles.thankYouEmoji}>🎉</Text>
            <Text style={styles.thankYouTitle}>Tack för din fråga!</Text>
            <Text style={styles.thankYouSub}>
              Din fråga har skickats in och väntar på granskning. Vi uppskattar ditt bidrag!
            </Text>
            <TouchableOpacity
              onPress={() => setSubmitted(false)}
              style={styles.thankYouBtnPrimary}
            >
              <Text style={styles.thankYouBtnPrimaryText}>Lägg till en fråga till</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.thankYouBtnSecondary}
            >
              <Text style={styles.thankYouBtnSecondaryText}>Återgå till menyn</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* Category picker */}
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => {
              const selected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.categoryItem, selected && { borderColor: cat.color, backgroundColor: cat.color + '22' }]}
                >
                  <Text style={styles.categoryItemIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryItemText, selected && { color: cat.color, fontFamily: fonts.display700 }]}>
                    {cat.name}
                  </Text>
                  {selected && <Text style={[styles.categoryTick, { color: cat.color }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

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
                          i === q.correctIndex && { color: cat?.color, fontFamily: fonts.display600 },
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: colors.text2, fontSize: 22 },
  title: {
    color: colors.text1,
    fontSize: 20,
    fontFamily: fonts.display700,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 8,
  },
  label: {
    color: colors.text2,
    fontSize: 12,
    fontFamily: fonts.display600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },
  sublabel: {
    color: colors.text3,
    fontSize: 12,
    fontFamily: fonts.display400,
    marginBottom: 10,
    marginTop: -6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: colors.bg2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryItemIcon: { fontSize: 16 },
  categoryItemText: {
    flex: 1,
    color: colors.text2,
    fontSize: 13,
    fontFamily: fonts.display500,
  },
  categoryTick: {
    fontSize: 13,
    fontFamily: fonts.display700,
  },
  input: {
    backgroundColor: colors.bg2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text1,
    fontSize: 15,
    fontFamily: fonts.display400,
    borderWidth: 1,
    borderColor: colors.lineStrong,
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
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text1,
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
    color: colors.text1,
    fontSize: 17,
    fontFamily: fonts.display700,
  },
  savedCard: {
    backgroundColor: colors.bg2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.bg3,
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
    fontFamily: fonts.display600,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    color: colors.text3,
    fontSize: 16,
  },
  savedQuestion: {
    color: colors.text1,
    fontSize: 14,
    fontFamily: fonts.display600,
    marginBottom: 8,
    lineHeight: 20,
  },
  savedAnswer: {
    color: colors.text2,
    fontSize: 13,
    fontFamily: fonts.display400,
    marginBottom: 3,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.lineStrong,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg2,
  },
  checkboxTick: { color: colors.text1, fontSize: 13, fontFamily: fonts.display700 },
  checkboxLabel: { color: colors.text2, fontSize: 14, fontFamily: fonts.display500 },
  imagePickBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: colors.bg2,
    minHeight: 52,
    justifyContent: 'center',
  },
  imagePickBtnText: { fontSize: 14, fontFamily: fonts.display600 },
  imagePreview: { width: '100%', height: 150, borderRadius: 12, marginTop: 10 },
  disabled: { opacity: 0.5 },
  thankYouContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  thankYouEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  thankYouTitle: {
    color: colors.text1,
    fontSize: 24,
    fontFamily: fonts.display700,
    textAlign: 'center',
  },
  thankYouSub: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  thankYouBtnPrimary: {
    width: '100%',
    backgroundColor: colors.pink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  thankYouBtnPrimaryText: {
    color: colors.text1,
    fontSize: 16,
    fontFamily: fonts.display700,
  },
  thankYouBtnSecondary: {
    width: '100%',
    backgroundColor: colors.bg2,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  thankYouBtnSecondaryText: {
    color: colors.text2,
    fontSize: 16,
    fontFamily: fonts.display600,
  },
});
