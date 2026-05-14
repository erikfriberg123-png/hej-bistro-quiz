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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { fetchBattleLeaderboard, getCurrentUserId, BattleLeaderboardEntry } from '../lib/scores';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<BattleLeaderboardEntry[]>([]);
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
      setEntries(await fetchBattleLeaderboard());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item, index }: { item: BattleLeaderboardEntry; index: number }) => {
    const isMe = item.user_id === currentUserId;
    const rank = index + 1;
    const medal = MEDALS[rank - 1];

    return (
      <View style={[styles.row, isMe && styles.rowHighlight]}>
        <Text style={styles.rank}>{medal ?? `${rank}.`}</Text>
        <View style={styles.info}>
          <Text style={[styles.username, isMe && styles.usernameMe]} numberOfLines={1}>
            {item.username}{isMe ? ' (du)' : ''}
          </Text>
          <Text style={styles.sub}>{item.wins}V · {item.battles} battles</Text>
        </View>
        <Text style={styles.score}>{item.total_score.toLocaleString('sv-SE')} XP</Text>
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
        <Text style={styles.title}>Topplista ⚔️</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#9B5DE5" size="large" />
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
          <Text style={styles.emptyText}>Inga battles ännu.</Text>
          <Text style={styles.emptySubtext}>Utmana en vän för att hamna på listan!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.listHeader}>Globalt — totalt battle-XP</Text>
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
  title: { color: '#FFFFFF', fontSize: 20, fontFamily: 'DMSans_700Bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: {
    color: '#FFFFFF', fontSize: 16,
    fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center',
  },
  emptySubtext: {
    color: '#B0A8C8', fontSize: 14,
    fontFamily: 'DMSans_400Regular', textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16, backgroundColor: '#1E1040',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
  },
  retryText: { color: '#9B5DE5', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: {
    color: '#B0A8C8', fontSize: 11,
    fontFamily: 'DMSans_600SemiBold', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rowHighlight: { borderWidth: 1.5, borderColor: '#9B5DE5' },
  rank: { width: 36, color: '#B0A8C8', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  info: { flex: 1 },
  username: { color: '#FFFFFF', fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  usernameMe: { color: '#9B5DE5' },
  sub: { color: '#6050A0', fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  score: { color: '#9B5DE5', fontSize: 15, fontFamily: 'DMSans_700Bold' },
});
