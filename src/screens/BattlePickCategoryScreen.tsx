import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CategoryId } from '../types';
import { CATEGORIES } from '../data/categories';
import { shuffle } from '../utils/shuffle';

type Props = NativeStackScreenProps<RootStackParamList, 'BattlePickCategory'>;

export default function BattlePickCategoryScreen({ route, navigation }: Props) {
  const {
    battleId, code, role, roundNumber,
    creatorScore, opponentScore, creatorName, opponentName,
  } = route.params;

  const fourCategories = useMemo(() => shuffle([...CATEGORIES]).slice(0, 4), []);

  const myScore = role === 'creator' ? creatorScore : opponentScore;
  const theirScore = role === 'creator' ? opponentScore : creatorScore;
  const myName = role === 'creator' ? creatorName : opponentName;
  const theirName = role === 'creator' ? opponentName : creatorName;

  const handlePick = (categoryId: CategoryId) => {
    navigation.replace('BattleRound', {
      battleId, code, role, roundNumber, category: categoryId,
      creatorScore, opponentScore, creatorName, opponentName,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#030C1A" />

      <View style={styles.topBar}>
        <View style={styles.roundPill}>
          <Text style={styles.roundPillText}>
            {roundNumber > 4 ? '⚡ SUDDEN DEATH' : `OMGÅNG ${roundNumber} / 4`}
          </Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreName} numberOfLines={1}>{myName}</Text>
            <Text style={[styles.scoreNum, styles.scoreNumMe]}>{myScore}</Text>
          </View>
          <Text style={styles.scoreDash}>–</Text>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreName} numberOfLines={1}>{theirName || 'Motståndare'}</Text>
            <Text style={styles.scoreNum}>{theirScore}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Välj en kategori</Text>
        <Text style={styles.sub}>Din omgång – du väljer!</Text>

        <View style={styles.grid}>
          {fourCategories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handlePick(cat.id)}
              style={[styles.card, { borderColor: cat.color }]}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBg, { backgroundColor: cat.color + '28' }]}>
                <Text style={styles.icon}>{cat.icon}</Text>
              </View>
              <Text style={styles.cardName}>{cat.name}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{cat.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030C1A' },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  roundPill: {
    backgroundColor: '#0C1E35',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  roundPillText: {
    color: '#1D6FE8',
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C1E35',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 20,
    width: '100%',
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  scoreName: {
    color: '#7B9EC4',
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
  },
  scoreNum: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'DMSans_800ExtraBold',
  },
  scoreNumMe: {
    color: '#1D6FE8',
  },
  scoreDash: {
    color: '#1B3A5C',
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'DMSans_800ExtraBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    color: '#7B9EC4',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#0C1E35',
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    gap: 8,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  cardName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    lineHeight: 18,
  },
  cardDesc: {
    color: '#7B9EC4',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 16,
  },
});
