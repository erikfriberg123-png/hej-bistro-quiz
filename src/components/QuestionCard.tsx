import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens';

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
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}
      <Text style={styles.question}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  counter: {
    color: colors.text3,
    fontSize: 10.5,
    fontFamily: fonts.mono700,
    letterSpacing: 0.18 * 10.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    marginBottom: 10,
  },
  question: {
    color: colors.text1,
    fontSize: 17,
    fontFamily: fonts.display600,
    lineHeight: 23,
    letterSpacing: -0.3,
  },
});
