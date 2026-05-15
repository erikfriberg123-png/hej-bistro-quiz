import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  type FriendProfile,
  type FriendStatus,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getFriendStatusBatch,
} from '../lib/friends';
import { NeonTabBar } from '../components/NeonTabBar';
import { colors, fonts, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

export default function FriendsScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<FriendProfile & { status: FriendStatus }>>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pending, setPending] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState<FriendProfile | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [f, p] = await Promise.all([getFriends(), getPendingRequests()]);
      setFriends(f);
      setPending(p);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(query);
        const statusMap = await getFriendStatusBatch(results.map(u => u.user_id));
        const withStatus = results.map(u => ({ ...u, status: statusMap[u.user_id] ?? 'none' as FriendStatus }));
        setSearchResults(withStatus);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = async (user: FriendProfile) => {
    try {
      await sendFriendRequest(user.user_id);
      setSearchResults(prev =>
        prev.map(u => u.user_id === user.user_id ? { ...u, status: 'pending_sent' } : u)
      );
    } catch {
      Alert.alert('Fel', 'Kunde inte skicka förfrågan.');
    }
  };

  const handleAccept = async (requester: FriendProfile) => {
    try {
      await acceptFriendRequest(requester.user_id);
      setPending(prev => prev.filter(p => p.user_id !== requester.user_id));
      setFriends(prev => [...prev, { ...requester, createdAt: new Date().toISOString() }]);
    } catch {
      Alert.alert('Fel', 'Kunde inte acceptera förfrågan.');
    }
  };

  const handleRemove = (friend: FriendProfile) => {
    setConfirmRemove(friend);
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await removeFriend(confirmRemove.user_id);
      setFriends(prev => prev.filter(f => f.user_id !== confirmRemove.user_id));
    } catch {
      // silent — friend stays in list if call fails
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  };

  const isNewFriend = (f: FriendProfile) => {
    if (!f.createdAt) return false;
    const msAgo = Date.now() - new Date(f.createdAt).getTime();
    return msAgo < 7 * 24 * 60 * 60 * 1000;
  };

  const handleChallenge = (friend: FriendProfile) => {
    navigation.navigate('ChallengeLobby', {
      preselectedFriendId: friend.user_id,
      preselectedFriendName: friend.username,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vänner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Sök efter smeknamn..."
            placeholderTextColor="#6050A0"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator color="#9B5DE5" style={styles.searchSpinner} />}
        </View>

        {/* Search results */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SÖKRESULTAT</Text>
            {searchResults.map(u => (
              <UserRow
                key={u.user_id}
                username={u.username}
                right={
                  u.status === 'accepted' ? (
                    <Text style={styles.tagAccepted}>Vän ✓</Text>
                  ) : u.status === 'pending_sent' ? (
                    <Text style={styles.tagPending}>Väntande...</Text>
                  ) : u.status === 'pending_received' ? (
                    <TouchableOpacity onPress={() => handleAccept(u)} style={styles.btnAccept}>
                      <Text style={styles.btnAcceptText}>Acceptera</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => handleAdd(u)} style={styles.btnAdd}>
                      <Text style={styles.btnAddText}>+ Lägg till</Text>
                    </TouchableOpacity>
                  )
                }
              />
            ))}
          </View>
        )}

        {query.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <Text style={styles.emptyHint}>Inga användare hittades.</Text>
        )}

        {/* Pending requests */}
        {!loading && pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FÖRFRÅGNINGAR ({pending.length})</Text>
            {pending.map(u => (
              <UserRow
                key={u.user_id}
                username={u.username}
                right={
                  <TouchableOpacity onPress={() => handleAccept(u)} style={styles.btnAccept}>
                    <Text style={styles.btnAcceptText}>Acceptera</Text>
                  </TouchableOpacity>
                }
              />
            ))}
          </View>
        )}

        {/* Friends list */}
        {!loading && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              MINA VÄNNER {friends.length > 0 ? `(${friends.length})` : ''}
            </Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyHint}>
                Inga vänner ännu. Sök efter ett smeknamn för att lägga till!
              </Text>
            ) : (
              friends.map(f => (
                <UserRow
                  key={f.user_id}
                  username={f.username}
                  isNew={isNewFriend(f)}
                  right={
                    <View style={styles.friendActions}>
                      <TouchableOpacity onPress={() => handleChallenge(f)} style={styles.btnChallenge}>
                        <Text style={styles.btnChallengeText}>⚔️ Utmana</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemove(f)} style={styles.btnRemove}>
                        <Text style={styles.btnRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              ))
            )}
          </View>
        )}

        {loading && <ActivityIndicator color={colors.cyan} style={{ marginTop: 32 }} />}

      </ScrollView>

      <NeonTabBar
        activeRoute="Friends"
        onPress={(route) => navigation.navigate(route as any)}
      />

      <Modal
        visible={!!confirmRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmRemove(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmText}>
              Är du säker på att du vill ta bort{' '}
              <Text style={styles.confirmName}>{confirmRemove?.username}</Text>
              {' '}från din vänlista?
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                onPress={() => setConfirmRemove(null)}
                style={styles.confirmBtnNej}
                disabled={removing}
              >
                <Text style={styles.confirmBtnNejText}>Nej</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmRemove}
                style={styles.confirmBtnJa}
                disabled={removing}
              >
                <Text style={styles.confirmBtnJaText}>
                  {removing ? '...' : 'Ja'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function UserRow({ username, right, isNew }: { username: string; right: React.ReactNode; isNew?: boolean }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.usernameBlock}>
        <Text style={styles.username} numberOfLines={1}>{username}</Text>
        {isNew && <Text style={styles.newTag}>Ny vän</Text>}
      </View>
      <View style={styles.userRowRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { color: colors.text2, fontSize: 22 },
  title: { color: colors.text1, fontSize: 20, fontFamily: fonts.display700, letterSpacing: -0.4 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg2, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.lineStrong, marginBottom: 20,
  },
  searchInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text1, fontSize: 15, fontFamily: fonts.display500,
  },
  searchSpinner: { marginRight: 12 },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: colors.text3, fontSize: 10.5, fontFamily: fonts.mono700,
    letterSpacing: 0.2 * 10.5, textTransform: 'uppercase', marginBottom: 10,
  },
  emptyHint: {
    color: colors.text3, fontSize: 14, fontFamily: fonts.display400,
    textAlign: 'center', marginTop: 8, marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6, gap: 12,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.text1, fontSize: 15, fontFamily: fonts.display700 },
  usernameBlock: { flex: 1, justifyContent: 'center' },
  username: { color: colors.text1, fontSize: 15, fontFamily: fonts.display500 },
  newTag: { color: colors.pink, fontSize: 10, fontFamily: fonts.display600, letterSpacing: 0.3, marginTop: 1 },
  userRowRight: { flexShrink: 0 },
  friendActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btnAdd: { backgroundColor: colors.pink, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 },
  btnAddText: { color: '#1a0010', fontSize: 13, fontFamily: fonts.display700 },
  btnAccept: { backgroundColor: colors.cyan, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 },
  btnAcceptText: { color: '#001a1a', fontSize: 13, fontFamily: fonts.display700 },
  btnChallenge: {
    borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.cyan, backgroundColor: 'rgba(54, 224, 224, 0.08)',
  },
  btnChallengeText: { color: colors.cyan, fontSize: 13, fontFamily: fonts.display600 },
  btnRemove: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center',
  },
  btnRemoveText: { color: colors.text2, fontSize: 14 },
  tagAccepted: { color: colors.correct, fontSize: 13, fontFamily: fonts.display500 },
  tagPending: { color: colors.text2, fontSize: 13, fontFamily: fonts.display400 },
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  confirmCard: {
    backgroundColor: colors.bg1, borderRadius: radius.xl, padding: 24,
    width: '100%', borderWidth: 1, borderColor: colors.lineStrong,
  },
  confirmText: {
    color: colors.text2, fontSize: 15, fontFamily: fonts.display400,
    lineHeight: 24, textAlign: 'center', marginBottom: 24,
  },
  confirmName: { color: colors.text1, fontFamily: fonts.display600 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
  confirmBtnNej: {
    flex: 1, backgroundColor: colors.bg2, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.lineStrong,
  },
  confirmBtnNejText: { color: colors.text2, fontSize: 16, fontFamily: fonts.display600 },
  confirmBtnJa: { flex: 1, backgroundColor: colors.wrong, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  confirmBtnJaText: { color: '#fff', fontSize: 16, fontFamily: fonts.display700 },
});
