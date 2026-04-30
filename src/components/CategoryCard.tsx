import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Category } from '../types';

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
      style={[styles.card, { backgroundColor: category.color }]}
    >
      <Text style={styles.icon}>{category.icon}</Text>
      <Text style={styles.name}>{category.name}</Text>
      <Text style={styles.description} numberOfLines={2}>{category.description}</Text>
      {highscore > 0 ? (
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>🏅 {highscore} XP</Text>
        </View>
      ) : (
        <View style={styles.scoreBadge}>
          <Text style={styles.noScoreText}>Inget rekord än</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    minHeight: 160,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 15,
    flex: 1,
  },
  scoreBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  noScoreText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
  },
});
