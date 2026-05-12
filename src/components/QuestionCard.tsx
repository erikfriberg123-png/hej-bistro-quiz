import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  question: string;
  questionNumber: number;
  total: number;
}

export function QuestionCard({ question, questionNumber, total }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.counter}>{questionNumber} / {total}</Text>
      <Text style={styles.question}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2A1A62',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    minHeight: 80,
    justifyContent: 'center',
    // Shadow — lifts the question above the flat answer buttons
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  counter: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 6,
  },
  question: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    lineHeight: 24,
  },
});
