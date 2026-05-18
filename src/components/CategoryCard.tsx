import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Category } from '../types';
import { colors, fonts, radius } from '../theme/tokens';

interface Props {
  category: Category;
  highscore: number;
  onPress: () => void;
}

export function CategoryCard({ category, highscore, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.card}
    >
      {/* Neon glow blob in top-right corner */}
      <View style={[styles.glowBlob, { backgroundColor: category.color }]} />

      <Text style={styles.icon}>{category.icon}</Text>
      <Text style={styles.name}>{category.name}</Text>
      <Text style={styles.description} numberOfLines={2}>{category.description}</Text>
      <View style={styles.scoreBadge}>
        {highscore > 0 ? (
          <Text style={styles.scoreText}>
            <Text style={styles.scoreMono}>{highscore.toLocaleString('sv-SE')}</Text>
            <Text style={styles.scoreXp}> XP</Text>
          </Text>
        ) : (
          <Text style={styles.noScoreText}>Inget rekord</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    padding: 14,
    margin: 5,
    minHeight: 130,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.18,
  },
  icon: {
    fontSize: 26,
    marginBottom: 8,
  },
  name: {
    color: colors.text1,
    fontSize: 14,
    fontFamily: fonts.display700,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  description: {
    color: colors.text3,
    fontSize: 11,
    fontFamily: fonts.display400,
    lineHeight: 15,
    flex: 1,
  },
  scoreBadge: {
    marginTop: 8,
  },
  scoreText: {
    fontSize: 11,
  },
  scoreMono: {
    fontFamily: fonts.mono700,
    color: colors.yellow,
    fontSize: 11,
  },
  scoreXp: {
    fontFamily: fonts.mono500,
    color: colors.text3,
    fontSize: 10,
  },
  noScoreText: {
    color: colors.text4,
    fontSize: 10,
    fontFamily: fonts.display400,
  },
});
