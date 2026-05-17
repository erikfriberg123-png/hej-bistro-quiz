import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/tokens';

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
    color: colors.yellow,
    fontSize: 20,
    fontFamily: fonts.mono700,
  },
  awarded: {
    color: colors.correct,
    fontSize: 13,
    fontFamily: fonts.mono500,
  },
});
