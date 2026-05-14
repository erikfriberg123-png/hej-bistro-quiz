import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  question: string;
  questionNumber: number;
  total?: number;
  imageUrl?: string;
}

export function QuestionCard({ question, questionNumber, total, imageUrl }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.counter}>
        {total != null ? `${questionNumber} / ${total}` : `Fråga ${questionNumber}`}
      </Text>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}
      <Text style={styles.question}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2A1A50',
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
  image: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
  },
  question: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    lineHeight: 24,
  },
});
