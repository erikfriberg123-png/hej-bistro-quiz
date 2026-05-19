import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

interface Props {
  score: number;
  pointsAwarded?: number | null;
}

export function ScoreBadge({ score, pointsAwarded }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.score}>{score} XP</Text>
      {pointsAwarded != null && pointsAwarded > 0 && (
        <Text style={styles.awarded}>+{pointsAwarded}</Text>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
