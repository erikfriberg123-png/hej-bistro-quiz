import React, { useCallback, useEffect, useState } from 'react';
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
import {
  fetchBattleLeaderboard,
  fetchSurvivalLeaderboard,
  getCurrentUserId,
  BattleLeaderboardEntry,
  SurvivalLeaderboardEntry,
} from '../lib/scores';
import { NeonTabBar } from '../components/NeonTabBar';
import { colors, fonts, radius, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

const MEDALS = ['🥇', '🥈', '🥉'];

type Tab = 'battle' | 'survival';

export default function LeaderboardScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('battle');
  const [battleEntries, setBattleEntries] = useState<BattleLeaderboardEntry[]>([]);
  const [survivalEntries, setSurvivalEntries] = useState<SurvivalLeaderboardEntry[]>([]);
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
      const [battle, survival] = await Promise.all([
        fetchBattleLeaderboard(),
        fetchSurvivalLeaderboard(),
      ]);
      setBattleEntries(battle);
      setSurvivalEntries(survival);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderBattle = ({ item, index }: { item: BattleLeaderboardEntry; index: number }) => {
    const isMe = item.user_id === currentUserId;
    const rank = index + 1;
    const medal = MEDALS[rank - 1];

    return (
      <View style={[styles.row, isMe && styles.rowHighlightCyan]}>
        <Text style={styles.rank}>{medal ?? `${rank}.`}</Text>
        <View style={styles.info}>
          <Text style={[styles.username, isMe && styles.usernameCyan]} numberOfLines={1}>
            {item.username}{isMe ? ' (du)' : ''}
          </Text>
          <Text style={styles.sub}>{item.wins} vinster · {item.battles} battles</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreMain, { color: colors.cyan }]}>{item.wins}</Text>
          <Text style={styles.scoreUnit}>V</Text>
        </View>
      </View>
    );
  };

  const renderSurvival = ({ item, index }: { item: SurvivalLeaderboardEntry; index: number }) => {
    const isMe = item.user_id === currentUserId;
    const rank = index + 1;
    const medal = MEDALS[rank - 1];

    return (
      <View style={[styles.row, isMe && styles.rowHighlightPink]}>
        <Text style={styles.rank}>{medal ?? `${rank}.`}</Text>
        <View style={styles.info}>
          <Text style={[styles.username, isMe && styles.usernamePink]} numberOfLines={1}>
            {item.username}{isMe ? ' (du)' : ''}
          </Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreMain, { color: colors.yellow }]}>
            {item.best_score.toLocaleString('sv-SE')}
          </Text>
          <Text style={styles.scoreUnit}>XP</Text>
        </View>
      </View>
    );
  };

  const isBattle = activeTab === 'battle';
  const entries = isBattle ? battleEntries : survivalEntries;
  const isEmpty = entries.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Topplista</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab('battle')}
          style={[styles.tab, isBattle && styles.tabActiveCyan]}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, isBattle && styles.tabTextActiveCyan]}>⚔️  Battles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('survival')}
          style={[styles.tab, !isBattle && styles.tabActivePink]}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, !isBattle && styles.tabTextActivePink]}>❤️  Överlevnad</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={isBattle ? colors.cyan : colors.pink} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Kunde inte hämta topplistan.</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Försök igen</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {isBattle ? 'Inga battles ännu.' : 'Inga överlevnadsresultat ännu.'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isBattle
              ? 'Utmana en vän för att hamna på listan!'
              : 'Spela Överlevnadsläge för att hamna på listan!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries as any[]}
          keyExtractor={item => item.user_id}
          renderItem={isBattle ? renderBattle as any : renderSurvival as any}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {isBattle ? 'Flest vinster — battles' : 'Bästa poäng — överlevnadsläge'}
            </Text>
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
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s2,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: colors.text2, fontSize: 22 },
  title: { color: colors.text1, fontSize: 20, fontFamily: fonts.display700, letterSpacing: -0.4 },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  tabActiveCyan: {
    backgroundColor: 'rgba(54, 224, 224, 0.1)',
    borderColor: 'rgba(54, 224, 224, 0.5)',
  },
  tabActivePink: {
    backgroundColor: 'rgba(255, 56, 165, 0.1)',
    borderColor: 'rgba(255, 56, 165, 0.5)',
  },
  tabText: { color: colors.text3, fontSize: 13.5, fontFamily: fonts.display600 },
  tabTextActiveCyan: { color: colors.cyan },
  tabTextActivePink: { color: colors.pink },

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

  list: { paddingHorizontal: spacing.s4, paddingBottom: 24 },
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
  rowHighlightCyan: { borderColor: 'rgba(54, 224, 224, 0.45)', backgroundColor: 'rgba(54, 224, 224, 0.04)' },
  rowHighlightPink: { borderColor: 'rgba(255, 56, 165, 0.45)', backgroundColor: 'rgba(255, 56, 165, 0.04)' },

  rank: { width: 32, color: colors.text3, fontSize: 14, fontFamily: fonts.mono700, textAlign: 'center' },
  info: { flex: 1 },
  username: { color: colors.text1, fontSize: 14.5, fontFamily: fonts.display600 },
  usernameCyan: { color: colors.cyan },
  usernamePink: { color: colors.pink },
  sub: { color: colors.text3, fontSize: 11, fontFamily: fonts.display400, marginTop: 2 },

  scoreCol: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  scoreMain: { fontSize: 16, fontFamily: fonts.mono700 },
  scoreUnit: { color: colors.text3, fontSize: 10, fontFamily: fonts.mono500 },
});
