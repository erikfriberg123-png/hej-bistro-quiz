import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { CATEGORIES } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';
import { getUsername, setUsername } from '../lib/scores';
import { checkIsAdmin } from '../lib/remoteQuestions';
import { getPendingRequests } from '../lib/friends';
import { getMyActiveTurns, getPendingBattlesForMe } from '../lib/battles';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { highscores, streak, checkStreak } = useGameStore();
  const [helpVisible, setHelpVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [challengeAfterSave, setChallengeAfterSave] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingBattleCount, setPendingBattleCount] = useState(0);
  const [myTurnCount, setMyTurnCount] = useState(0);
  const [mode, setMode] = useState<'training' | null>(null);

  useEffect(() => {
    checkStreak();
    getUsername().then(name => {
      setUsernameState(name);
      setInputName(name ?? '');
    });
    checkIsAdmin().then(setIsAdmin);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPendingRequests().then(p => setPendingCount(p.length)).catch(() => {});
      getPendingBattlesForMe().then(b => setPendingBattleCount(b.length)).catch(() => {});
      getMyActiveTurns().then(b => setMyTurnCount(b.length)).catch(() => {});
    }, [])
  );

  const handleSaveUsername = async () => {
    if (!inputName.trim()) return;
    setSaving(true);
    try {
      await setUsername(inputName.trim());
      setUsernameState(inputName.trim());
      setProfileVisible(false);
      if (challengeAfterSave) {
        setChallengeAfterSave(false);
        navigation.navigate('ChallengeLobby', {});
      }
    } catch {
      Alert.alert('Fel', 'Kunde inte spara namn. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  const handleChallengePress = () => {
    if (!username) {
      setChallengeAfterSave(true);
      setProfileVisible(true);
    } else {
      navigation.navigate('ChallengeLobby', {});
    }
  };


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => setProfileVisible(true)} style={styles.profileBtn}>
            <Text style={styles.profileIcon}>👤</Text>
            <Text style={styles.profileName} numberOfLines={1}>
              {username ?? 'Sätt namn'}
            </Text>
            {pendingCount > 0 && (
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Image source={require('../../assets/appicon.png')} style={styles.logo} />
            <Text style={styles.subtitle}>Quiz för restaurangfolk</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Leaderboard', {})}
            style={styles.leaderboardBtn}
          >
            <Text style={styles.leaderboardIcon}>🏆</Text>
          </TouchableOpacity>
        </View>

        {pendingBattleCount > 0 && (
          <TouchableOpacity
            style={styles.pendingBattleBanner}
            onPress={handleChallengePress}
            activeOpacity={0.8}
          >
            <Text style={styles.pendingBattleText}>
              ⚔️  Du har {pendingBattleCount} utmaning{pendingBattleCount > 1 ? 'ar' : ''} att svara på!
            </Text>
            <Text style={styles.pendingBattleArrow}>→</Text>
          </TouchableOpacity>
        )}

        {myTurnCount > 0 && (
          <TouchableOpacity
            style={styles.myTurnBanner}
            onPress={handleChallengePress}
            activeOpacity={0.8}
          >
            <Text style={styles.myTurnText}>
              ⚡  Din tur i {myTurnCount} battle{myTurnCount > 1 ? 's' : ''}!
            </Text>
            <Text style={styles.myTurnArrow}>→</Text>
          </TouchableOpacity>
        )}

        {streak > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakText}>🔥 {streak} dag{streak !== 1 ? 'ar' : ''} i rad!</Text>
          </View>
        )}

        {mode === null ? (
          <>
            <Text style={styles.sectionTitle}>Välj spelläge</Text>

            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => setMode('training')}
              activeOpacity={0.85}
            >
              <Text style={styles.modeCardIcon}>🎯</Text>
              <View style={styles.modeCardBody}>
                <Text style={styles.modeCardTitle}>Träningsläge</Text>
                <Text style={styles.modeCardSub}>Välj en kategori och öva på dina kunskaper</Text>
              </View>
              <Text style={styles.modeCardArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeCard, styles.modeCardBattle]}
              onPress={handleChallengePress}
              activeOpacity={0.85}
            >
              <Text style={styles.modeCardIcon}>⚔️</Text>
              <View style={styles.modeCardBody}>
                <Text style={styles.modeCardTitle}>Battle</Text>
                <Text style={styles.modeCardSub}>Utmana en kompis i ett riktigt quiz-duell</Text>
              </View>
              {pendingBattleCount > 0 ? (
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>{pendingBattleCount}</Text>
                </View>
              ) : (
                <Text style={styles.modeCardArrow}>→</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setMode(null)} style={styles.backModeBtn}>
              <Text style={styles.backModeBtnText}>← Spelläge</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Välj kategori</Text>

            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <View key={cat.id} style={styles.gridItem}>
                  <CategoryCard
                    category={cat}
                    highscore={highscores[cat.id] ?? 0}
                    onPress={() => navigation.navigate('Game', { categoryId: cat.id })}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('CreateQuestion')}
          style={styles.createBtn}
        >
          <Text style={styles.createBtnIcon}>✏️</Text>
          <Text style={styles.createBtnText}>Skapa egna frågor</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setHelpVisible(true)} style={styles.helpLink}>
          <Text style={styles.helpText}>Hur funkar det?</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Admin')}
            style={styles.adminBtn}
          >
            <Text style={styles.adminBtnText}>⚙️  Admin</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Help modal */}
      <Modal visible={helpVisible} transparent animationType="slide" onRequestClose={() => setHelpVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hur funkar det?</Text>
            <Text style={styles.modalBody}>
              {'1. Välj en kategori\n\n'}
              {'2. Svara på 10 frågor\n\n'}
              {'3. Du har 15 sekunder per fråga\n\n'}
              {'4. Ju snabbare du svarar rätt, desto mer XP får du\n\n'}
              {'5. Max 150 XP per fråga (100 bas + 50 tidsbonus)\n\n'}
              {'6. Spela varje dag för att hålla din streak!\n\n'}
              {'7. Ditt resultat skickas till topplistan 🏆'}
            </Text>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Förstått!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile / username modal */}
      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setProfileVisible(false); setChallengeAfterSave(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ditt namn</Text>
            {challengeAfterSave && (
              <Text style={styles.modalHint}>
                Du behöver ett smeknamn för att utmana andra.
              </Text>
            )}
            <Text style={styles.modalBody}>
              {'Sätt ett smeknamn som visas på topplistan. Annars visas du som "Anonym".'}
            </Text>

            <TextInput
              style={styles.input}
              value={inputName}
              onChangeText={setInputName}
              placeholder="Ditt smeknamn..."
              placeholderTextColor="#6050A0"
              maxLength={20}
              autoCapitalize="words"
            />
            <TouchableOpacity
              onPress={handleSaveUsername}
              style={[styles.modalBtn, (!inputName.trim() || saving) && styles.modalBtnDisabled]}
              disabled={!inputName.trim() || saving}
            >
              <Text style={styles.modalBtnText}>{saving ? 'Sparar...' : 'Spara'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setProfileVisible(false);
                setChallengeAfterSave(false);
                navigation.navigate('Friends');
              }}
              style={styles.friendsBtn}
            >
              <Text style={styles.friendsBtnText}>👥  Mina vänner</Text>
              {pendingCount > 0 && (
                <View style={styles.friendsBadge}>
                  <Text style={styles.friendsBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setProfileVisible(false); setChallengeAfterSave(false); }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12082A' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 120,
    gap: 6,
  },
  profileIcon: { fontSize: 14 },
  profileName: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    flexShrink: 1,
  },
  profileBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  profileBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 13,
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  subtitle: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  leaderboardBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
  },
  leaderboardIcon: { fontSize: 18 },
  pendingBattleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D2A2A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#2EC4B6',
  },
  pendingBattleText: {
    color: '#2EC4B6',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  pendingBattleArrow: {
    color: '#2EC4B6',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginLeft: 8,
  },
  myTurnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A10',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F4C842',
  },
  myTurnText: {
    color: '#F4C842',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  myTurnArrow: {
    color: '#F4C842',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginLeft: 8,
  },
  streakBanner: {
    backgroundColor: '#1E1040',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  streakText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  sectionTitle: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '50%' },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  modeCardBattle: {
    backgroundColor: '#0D2A2A',
    borderColor: '#2EC4B6',
  },
  modeCardIcon: { fontSize: 32 },
  modeCardBody: { flex: 1, gap: 3 },
  modeCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  modeCardSub: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
  modeCardArrow: {
    color: '#6050A0',
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  modeBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  modeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 16,
  },
  backModeBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  backModeBtnText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  createBtnIcon: { fontSize: 16 },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  helpLink: { alignItems: 'center', marginTop: 12, paddingVertical: 12 },
  adminBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  adminBtnText: { color: '#3D2870', fontSize: 13, fontFamily: 'Poppins_500Medium' },
  helpText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1E1040',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 16,
  },
  modalBody: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 24,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#2A1A50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  modalBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBtnDisabled: { opacity: 0.5 },
  modalBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#B0A8C8', fontSize: 14, fontFamily: 'Poppins_500Medium' },
  modalHint: {
    color: '#2EC4B6',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
  },
  friendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A1A50',
    marginTop: 4,
    gap: 8,
  },
  friendsBtnText: { color: '#B0A8C8', fontSize: 14, fontFamily: 'Poppins_500Medium' },
  friendsBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  friendsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 14,
  },
});
