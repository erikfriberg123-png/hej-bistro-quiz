import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { CATEGORIES } from '../data/categories';
import { fetchLeaderboard, getCurrentUserId, LeaderboardEntry } from '../lib/scores';
import { getCategoryById } from '../data/categories';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

export default function LeaderboardScreen({ navigation, route }: Props) {
  const initialCategory = route.params?.categoryId ?? 'food';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchLeaderboard(selectedCategory);
      setEntries(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { load(); }, [load]);

  const category = getCategoryById(selectedCategory);

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isMe = item.user_id === currentUserId;
    const medals = ['🥇', '🥈', '🥉'];
    const rank = index + 1;

    return (
      <View style={[styles.row, isMe && styles.rowHighlight]}>
        <Text style={styles.rank}>{rank <= 3 ? medals[rank - 1] : `${rank}.`}</Text>
        <Text style={[styles.username, isMe && styles.usernameMe]} numberOfLines={1}>
          {item.username}{isMe ? ' (du)' : ''}
        </Text>
        <Text style={[styles.score, { color: category?.color ?? '#9B5DE5' }]}>
          {item.best_score} XP
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Topplista</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            style={[
              styles.tab,
              selectedCategory === cat.id && { backgroundColor: cat.color },
            ]}
          >
            <Text style={styles.tabIcon}>{cat.icon}</Text>
            <Text style={[styles.tabText, selectedCategory === cat.id && styles.tabTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={category?.color ?? '#9B5DE5'} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Kunde inte hämta topplistan.</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Försök igen</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Inga poäng ännu.</Text>
          <Text style={styles.emptySubtext}>Bli den första att sätta ett rekord!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.listHeader}>Topp {entries.length} — {category?.name}</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12082A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: '#B0A8C8', fontSize: 22 },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  tabs: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  tabIcon: { fontSize: 14 },
  tabText: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  tabTextActive: { color: '#FFFFFF', fontFamily: 'Poppins_700Bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#1E1040',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#9B5DE5', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  rowHighlight: {
    borderWidth: 1.5,
    borderColor: '#9B5DE5',
  },
  rank: {
    width: 36,
    color: '#B0A8C8',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  username: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  usernameMe: { color: '#9B5DE5', fontFamily: 'Poppins_700Bold' },
  score: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
});
