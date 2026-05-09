import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  score: number;
  pointsAwarded?: number | null;
}

export function ScoreBadge({ score, pointsAwarded }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.score}>{score} XP</Text>
      {pointsAwarded != null && pointsAwarded > 0 && (
        <Text style={styles.awarded}>+{pointsAwarded}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  score: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
  },
  awarded: {
    color: '#4CAF50',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
});
