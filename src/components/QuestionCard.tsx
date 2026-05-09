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
    backgroundColor: '#1E1040',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    minHeight: 120,
    justifyContent: 'center',
  },
  counter: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 8,
  },
  question: {
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: 'DMSans_600SemiBold',
    lineHeight: 28,
  },
});
