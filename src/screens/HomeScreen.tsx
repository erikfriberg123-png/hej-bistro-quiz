import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { CATEGORIES } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';
import { getUsername, setUsername, checkUsernameAvailable } from '../lib/scores';
import { checkIsAdmin } from '../lib/remoteQuestions';
import { getPendingRequests } from '../lib/friends';
import { Battle, getMyActiveTurns, getPendingBattlesForMe } from '../lib/battles';
import { supabase } from '../lib/supabase';
import { submitFeedback } from '../lib/feedback';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { highscores, streak, checkStreak } = useGameStore();
  const [helpVisible, setHelpVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [usernameRequired, setUsernameRequired] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [challengeAfterSave, setChallengeAfterSave] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingBattles, setPendingBattles] = useState<Battle[]>([]);
  const [myTurnBattles, setMyTurnBattles] = useState<Battle[]>([]);
  const [mode, setMode] = useState<'training' | 'survival' | null>(null);
  const [changePwVisible, setChangePwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [turnNotification, setTurnNotification] = useState<{ opponentName: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const prevMyTurnIdsRef = useRef<Set<string> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const pendingBattleCount = pendingBattles.length;
  const myTurnCount = myTurnBattles.length;

  useEffect(() => {
    checkStreak();
    getUsername().then(name => {
      setUsernameState(name);
      setInputName(name ?? '');
      if (!name) {
        setUsernameRequired(true);
        setProfileVisible(true);
      }
    });
    checkIsAdmin().then(setIsAdmin);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { userIdRef.current = user.id; setUserId(user.id); }
    });
  }, []);

  // Unified battle refresh — notifyOnNew triggers the toast when a new "your turn" appears
  const refreshBattleState = useCallback(async (notifyOnNew: boolean) => {
    const [newMyTurns, newPending] = await Promise.all([
      getMyActiveTurns().catch((): Battle[] => []),
      getPendingBattlesForMe().catch((): Battle[] => []),
    ]);

    if (notifyOnNew && prevMyTurnIdsRef.current !== null) {
      const added = newMyTurns.filter(b => !prevMyTurnIdsRef.current!.has(b.id));
      if (added.length > 0) {
        const b = added[0];
        const uid = userIdRef.current;
        const opponentName = uid && b.creator_id === uid
          ? (b.opponent_name ?? 'din motståndare')
          : b.creator_name;
        setTurnNotification({ opponentName });
      }
    }

    prevMyTurnIdsRef.current = new Set(newMyTurns.map(b => b.id));
    setMyTurnBattles(newMyTurns);
    setPendingBattles(newPending);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPendingRequests().then(p => setPendingCount(p.length)).catch(() => {});
      refreshBattleState(false);
    }, [refreshBattleState])
  );

  // Realtime subscriptions — unique name per effect invocation prevents the
  // "cannot add callbacks after subscribe()" error if the effect ever re-runs.
  useEffect(() => {
    if (!userId) return;
    const suffix = Date.now();
    const onUpdate = () => refreshBattleState(true);
    const ch1 = supabase
      .channel(`home-cr-${userId}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `creator_id=eq.${userId}` }, onUpdate)
      .subscribe();
    const ch2 = supabase
      .channel(`home-op-${userId}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles', filter: `opponent_id=eq.${userId}` }, onUpdate)
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId, refreshBattleState]);

  // Auto-dismiss the turn toast after 5 s
  useEffect(() => {
    if (!turnNotification) return;
    const t = setTimeout(() => setTurnNotification(null), 5000);
    return () => clearTimeout(t);
  }, [turnNotification]);

  const handleSaveUsername = async () => {
    if (!inputName.trim()) return;
    setUsernameError('');
    setSaving(true);
    try {
      const available = await checkUsernameAvailable(inputName.trim());
      if (!available) {
        setUsernameError('Det namnet är redan taget. Välj ett annat.');
        return;
      }
      await setUsername(inputName.trim());
      setUsernameState(inputName.trim());
      setUsernameRequired(false);
      setProfileVisible(false);
      if (challengeAfterSave) {
        setChallengeAfterSave(false);
        navigation.navigate('ChallengeLobby', {});
      }
    } catch {
      setUsernameError('Kunde inte spara namn. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  const handlePendingBattlePress = async () => {
    const battle = pendingBattles[0];
    if (!battle) return;
    if (!username) {
      setChallengeAfterSave(true);
      setProfileVisible(true);
      return;
    }
    navigation.navigate('BattleBoard', { battleId: battle.id, code: battle.code, role: 'opponent' });
  };

  const handleMyTurnPress = async () => {
    const battle = myTurnBattles[0];
    if (!battle) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const role = battle.creator_id === user.id ? 'creator' : 'opponent';
    navigation.navigate('BattleBoard', { battleId: battle.id, code: battle.code, role });
  };

  const handleChallengePress = () => {
    if (!username) {
      setChallengeAfterSave(true);
      setProfileVisible(true);
    } else {
      navigation.navigate('ChallengeLobby', {});
    }
  };

  const openChangePw = () => {
    setCurrentPw('');
    setNewPw('');
    setPwError('');
    setPwSuccess(false);
    setChangePwVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPw) { setPwError('Ange ditt nuvarande lösenord.'); return; }
    if (newPw.length < 6) { setPwError('Nytt lösenord måste vara minst 6 tecken.'); return; }
    if (currentPw === newPw) { setPwError('Det nya lösenordet måste skilja sig från det gamla.'); return; }
    setPwError('');
    setPwSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('no email');
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (verifyError) {
        setPwError('Nuvarande lösenord är fel.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
      if (updateError) throw updateError;
      setPwSuccess(true);
    } catch {
      setPwError('Något gick fel. Försök igen.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Är du säker på att du vill logga ut?')) {
        setProfileVisible(false);
        supabase.auth.signOut();
      }
      return;
    }
    Alert.alert(
      'Logga ut',
      'Är du säker på att du vill logga ut?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Logga ut',
          style: 'destructive',
          onPress: async () => {
            setProfileVisible(false);
            await supabase.auth.signOut();
          },
        },
      ],
    );
  };


  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    setFeedbackError('');
    const { error } = await submitFeedback(feedbackText, userId, username);
    setFeedbackSending(false);
    if (error) { setFeedbackError('Något gick fel. Försök igen.'); return; }
    setFeedbackSent(true);
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
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.subtitle}>Quiz för restaurangfolk</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Leaderboard', {})}
            style={styles.leaderboardBtn}
          >
            <Text style={styles.leaderboardIcon}>🏆</Text>
          </TouchableOpacity>
        </View>

        {myTurnCount > 0 && (
          <TouchableOpacity
            style={styles.myTurnBanner}
            onPress={handleMyTurnPress}
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
              style={[styles.modeCard, styles.modeCardSurvival]}
              onPress={() => setMode('survival')}
              activeOpacity={0.85}
            >
              <Text style={styles.modeCardIcon}>❤️</Text>
              <View style={styles.modeCardBody}>
                <Text style={styles.modeCardTitle}>Överlevnadsläge</Text>
                <Text style={styles.modeCardSub}>3 liv — svara rätt och håll sviten vid liv</Text>
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

            {pendingBattleCount > 0 && (
              <TouchableOpacity
                style={styles.challengeCard}
                onPress={handlePendingBattlePress}
                activeOpacity={0.8}
              >
                <Text style={styles.challengeCardEmoji}>⚔️</Text>
                <View style={styles.challengeCardBody}>
                  <Text style={styles.challengeCardTitle}>
                    {pendingBattles[0]?.creator_name ?? 'Någon'} utmanar dig!
                  </Text>
                  {pendingBattleCount > 1 && (
                    <Text style={styles.challengeCardSub}>+{pendingBattleCount - 1} utmaning{pendingBattleCount - 1 > 1 ? 'ar' : ''} till</Text>
                  )}
                </View>
                <Text style={styles.challengeCardAction}>Svara →</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setMode(null)} style={styles.backModeBtn}>
              <Text style={styles.backModeBtnText}>← Spelläge</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Välj kategori</Text>

            {mode === 'survival' && (
              <TouchableOpacity
                style={styles.allCategoriesCard}
                onPress={() => navigation.navigate('Survival', { categoryId: 'all' })}
                activeOpacity={0.85}
              >
                <Text style={styles.allCategoriesIcon}>🎲</Text>
                <Text style={styles.allCategoriesText}>Alla kategorier (mix)</Text>
              </TouchableOpacity>
            )}

            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <View key={cat.id} style={styles.gridItem}>
                  <CategoryCard
                    category={cat}
                    highscore={highscores[cat.id] ?? 0}
                    onPress={() => mode === 'survival'
                      ? navigation.navigate('Survival', { categoryId: cat.id })
                      : navigation.navigate('Game', { categoryId: cat.id })
                    }
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Friends')}
          style={styles.createBtn}
        >
          <Text style={styles.createBtnIcon}>👥</Text>
          <Text style={styles.createBtnText}>Mina vänner</Text>
          {pendingCount > 0 && (
            <View style={styles.friendsBadge}>
              <Text style={styles.friendsBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('CreateQuestion')}
          style={styles.createBtn}
        >
          <Text style={styles.createBtnIcon}>✏️</Text>
          <Text style={styles.createBtnText}>Skapa egna frågor</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setFeedbackText(''); setFeedbackSent(false); setFeedbackError(''); setFeedbackVisible(true); }} style={styles.helpLink}>
          <Text style={styles.helpText}>Feedback</Text>
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
            <ScrollView showsVerticalScrollIndicator={false} style={styles.helpScroll}>

              <Text style={styles.helpSection}>🎯 Quiz-läget</Text>
              <Text style={styles.modalBody}>
                {'Välj en kategori och svara på 10 frågor. Du har 15 sekunder per fråga — ju snabbare du svarar rätt, desto mer XP får du. Max 150 XP per fråga (100 bas + 50 tidsbonus). Spela varje dag för att hålla igång din streak och klättra på topplistan! 🏆'}
              </Text>

              <Text style={styles.helpSection}>⚔️ Battle-läget</Text>
              <Text style={styles.modalBody}>
                {'Utmana en vän på ett ämne du väljer. Tryck på "Battle" på startsidan och välj en vän och kategori.\n\nNi spelar var för sig i er egen takt. När ni båda är klara räknas poängen ihop — den med flest poäng vinner.\n\nHar du fått en utmaning? En banner visas på startsidan — tryck på den för att hoppa direkt in i din match.'}
              </Text>

              <Text style={styles.helpSection}>👥 Lägga till vänner</Text>
              <Text style={styles.modalBody}>
                {'Tryck på vänner-ikonen 👥 uppe till höger på startsidan.\n\nSök på en kollegas smeknamn och skicka en vänförfrågan. När de accepterar kan ni se varandras resultat och utmana varandra i Battle-läget.\n\nGlöm inte att sätta ett smeknamn på din profil — annars kan ingen hitta dig!'}
              </Text>

            </ScrollView>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Förstått!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback modal */}
      <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Feedback</Text>
            {feedbackSent ? (
              <>
                <Text style={styles.feedbackSuccess}>Tack för din feedback! 🙏</Text>
                <TouchableOpacity onPress={() => setFeedbackVisible(false)} style={styles.modalBtn}>
                  <Text style={styles.modalBtnText}>Stäng</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalBody}>Har du förslag, hittat en bugg eller vill säga något? Vi läser allt!</Text>
                <TextInput
                  style={[styles.input, styles.feedbackInput]}
                  value={feedbackText}
                  onChangeText={v => { setFeedbackText(v); setFeedbackError(''); }}
                  placeholder="Skriv ditt meddelande..."
                  placeholderTextColor="#6050A0"
                  multiline
                  maxLength={1000}
                />
                {feedbackError ? <Text style={styles.usernameError}>{feedbackError}</Text> : null}
                <TouchableOpacity
                  onPress={handleFeedbackSubmit}
                  style={[styles.modalBtn, (!feedbackText.trim() || feedbackSending) && styles.modalBtnDisabled]}
                  disabled={!feedbackText.trim() || feedbackSending}
                >
                  <Text style={styles.modalBtnText}>{feedbackSending ? 'Skickar...' : 'Skicka'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFeedbackVisible(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Avbryt</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile / username modal */}
      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (usernameRequired) return;
          setProfileVisible(false);
          setChallengeAfterSave(false);
          setChangePwVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (usernameRequired) return;
            setProfileVisible(false);
            setChallengeAfterSave(false);
            setChangePwVisible(false);
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {usernameRequired ? 'Välj ett smeknamn' : 'Ditt namn'}
              </Text>
              {usernameRequired ? (
                <Text style={styles.modalBody}>
                  {'Välj ett unikt smeknamn innan du börjar spela. Det visas på topplistan och när du utmanar vänner.'}
                </Text>
              ) : challengeAfterSave ? (
                <Text style={styles.modalHint}>
                  Du behöver ett smeknamn för att utmana andra.
                </Text>
              ) : (
                <Text style={styles.modalBody}>
                  {'Ändra ditt smeknamn. Namnet måste vara unikt.'}
                </Text>
              )}

              <TextInput
                style={[styles.input, usernameError ? styles.inputError : null]}
                value={inputName}
                onChangeText={v => { setInputName(v); setUsernameError(''); }}
                placeholder="Ditt smeknamn..."
                placeholderTextColor="#6050A0"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {usernameError ? (
                <Text style={styles.usernameError}>{usernameError}</Text>
              ) : null}

              <TouchableOpacity
                onPress={handleSaveUsername}
                style={[styles.modalBtn, (!inputName.trim() || saving) && styles.modalBtnDisabled]}
                disabled={!inputName.trim() || saving}
              >
                <Text style={styles.modalBtnText}>{saving ? 'Kontrollerar...' : 'Spara'}</Text>
              </TouchableOpacity>

              {!usernameRequired && !changePwVisible && (
                <>
                  <TouchableOpacity onPress={openChangePw} style={styles.changePwBtn}>
                    <Text style={styles.changePwText}>🔑  Byt lösenord</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>🚪  Logga ut</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { setProfileVisible(false); setChallengeAfterSave(false); }}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>✕  Avbryt</Text>
                  </TouchableOpacity>
                </>
              )}

              {!usernameRequired && changePwVisible && (
                <>
                  {pwSuccess ? (
                    <>
                      <Text style={styles.pwSuccessText}>✓ Lösenordet är uppdaterat!</Text>
                      <TouchableOpacity
                        onPress={() => setChangePwVisible(false)}
                        style={styles.modalBtn}
                      >
                        <Text style={styles.modalBtnText}>Tillbaka</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={[styles.input, pwError && styles.inputError]}
                        value={currentPw}
                        onChangeText={v => { setCurrentPw(v); setPwError(''); }}
                        placeholder="Nuvarande lösenord"
                        placeholderTextColor="#6050A0"
                        secureTextEntry
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={[styles.input, pwError && styles.inputError]}
                        value={newPw}
                        onChangeText={v => { setNewPw(v); setPwError(''); }}
                        placeholder="Nytt lösenord (minst 6 tecken)"
                        placeholderTextColor="#6050A0"
                        secureTextEntry
                        autoCapitalize="none"
                      />
                      {pwError ? <Text style={styles.usernameError}>{pwError}</Text> : null}
                      <TouchableOpacity
                        onPress={handleChangePassword}
                        style={[styles.modalBtn, (!currentPw || !newPw || pwSaving) && styles.modalBtnDisabled]}
                        disabled={!currentPw || !newPw || pwSaving}
                      >
                        <Text style={styles.modalBtnText}>{pwSaving ? 'Sparar...' : 'Byt lösenord'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setChangePwVisible(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Avbryt</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {turnNotification && (
        <TouchableOpacity
          style={styles.turnToast}
          onPress={() => { setTurnNotification(null); handleMyTurnPress(); }}
          activeOpacity={0.9}
        >
          <Text style={styles.turnToastEmoji}>⚡</Text>
          <View style={styles.turnToastBody}>
            <Text style={styles.turnToastTitle}>Din tur!</Text>
            <Text style={styles.turnToastSub}>{turnNotification.opponentName} har spelat klart.</Text>
          </View>
          <Text style={styles.turnToastArrow}>→</Text>
        </TouchableOpacity>
      )}
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
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_700Bold',
    lineHeight: 13,
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  logo: {
    width: 48,
    height: 48,
  },
  subtitle: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
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
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#061818',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 12,
    marginTop: -10,
    marginBottom: 14,
    borderTopWidth: 0,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderLeftColor: '#2EC4B6',
    borderRightColor: '#2EC4B6',
    borderBottomColor: '#2EC4B6',
    gap: 10,
  },
  challengeCardEmoji: { fontSize: 20 },
  challengeCardBody: { flex: 1 },
  challengeCardTitle: {
    color: '#2EC4B6',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  challengeCardSub: {
    color: '#7EEAE4',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  challengeCardAction: {
    color: '#2EC4B6',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_600SemiBold',
    flex: 1,
  },
  myTurnArrow: {
    color: '#F4C842',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
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
  streakText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  sectionTitle: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
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
  modeCardSurvival: {
    backgroundColor: '#2A0A1A',
    borderColor: '#E84393',
  },
  modeCardBattle: {
    backgroundColor: '#0D2A2A',
    borderColor: '#2EC4B6',
  },
  allCategoriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E1040',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E84393',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  allCategoriesIcon: { fontSize: 24 },
  allCategoriesText: {
    color: '#E84393',
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
  },
  modeCardIcon: { fontSize: 32 },
  modeCardBody: { flex: 1, gap: 3 },
  modeCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
  },
  modeCardSub: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
  modeCardArrow: {
    color: '#6050A0',
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_600SemiBold',
  },
  helpLink: { alignItems: 'center', marginTop: 12, paddingVertical: 12 },
  adminBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  adminBtnText: { color: '#3D2870', fontSize: 13, fontFamily: 'DMSans_500Medium' },
  helpText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    textDecorationLine: 'underline',
  },
  turnToast: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    backgroundColor: '#1E1040',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#F4C842',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  turnToastEmoji: { fontSize: 24 },
  turnToastBody: { flex: 1 },
  turnToastTitle: {
    color: '#F4C842',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
  },
  turnToastSub: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  turnToastArrow: {
    color: '#F4C842',
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_700Bold',
    marginBottom: 16,
  },
  modalBody: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 24,
    marginBottom: 20,
  },
  helpScroll: {
    maxHeight: 420,
    marginBottom: 4,
  },
  helpSection: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A1A50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  inputError: {
    borderColor: '#FF5555',
  },
  usernameError: {
    color: '#FF5555',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    marginBottom: 12,
  },
  modalBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBtnDisabled: { opacity: 0.5 },
  modalBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  changePwBtn: { alignItems: 'center', paddingVertical: 8 },
  changePwText: { color: '#B0A8C8', fontSize: 13, fontFamily: 'DMSans_500Medium' },
  logoutBtn: { alignItems: 'center', paddingVertical: 8 },
  logoutText: { color: '#FF5555', fontSize: 13, fontFamily: 'DMSans_500Medium' },
  pwSuccessText: {
    color: '#4CAF50',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalHint: {
    color: '#2EC4B6',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
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
  friendsBtnText: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_500Medium' },
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
    fontFamily: 'DMSans_700Bold',
    lineHeight: 14,
  },
  feedbackInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  feedbackSuccess: {
    color: '#A0F0B0',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
    marginVertical: 20,
  },
});
