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
import { NeonTabBar } from '../components/NeonTabBar';
import { colors, fonts, radius } from '../theme/tokens';

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
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Topplista ⚔️</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyan} size="large" />
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

      <NeonTabBar
        activeRoute="Leaderboard"
        onPress={(route) => navigation.navigate(route as any)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: colors.text2, fontSize: 22 },
  title: { color: colors.text1, fontSize: 20, fontFamily: fonts.display700, letterSpacing: -0.4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.text1, fontSize: 16, fontFamily: fonts.display600, marginBottom: 8, textAlign: 'center' },
  emptySubtext: { color: colors.text2, fontSize: 14, fontFamily: fonts.display400, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  retryText: { color: colors.cyan, fontSize: 14, fontFamily: fonts.display600 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader: {
    color: colors.text3,
    fontSize: 10.5,
    fontFamily: fonts.mono700,
    letterSpacing: 0.2 * 10.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    gap: 12,
  },
  rowHighlight: { borderColor: 'rgba(54, 224, 224, 0.45)', backgroundColor: 'rgba(54, 224, 224, 0.04)' },
  rank: { width: 32, color: colors.text3, fontSize: 14, fontFamily: fonts.mono700, textAlign: 'center' },
  info: { flex: 1 },
  username: { color: colors.text1, fontSize: 14.5, fontFamily: fonts.display600 },
  usernameMe: { color: colors.cyan },
  sub: { color: colors.text3, fontSize: 11, fontFamily: fonts.display400, marginTop: 2 },
  score: { color: colors.yellow, fontSize: 14, fontFamily: fonts.mono700 },
});
