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
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { CATEGORIES } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';
import { NeonTabBar } from '../components/NeonTabBar';
import { getUsername, setUsername, checkUsernameAvailable } from '../lib/scores';
import { getPendingRequests } from '../lib/friends';
import { Battle, getMyActiveTurns, getPendingBattlesForMe } from '../lib/battles';
import { supabase } from '../lib/supabase';
import { submitFeedback } from '../lib/feedback';
import { StoryModal } from '../components/StoryModal';
import { colors, fonts, radius, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { survivalHighscores, streak, checkStreak } = useGameStore();
  const [helpVisible, setHelpVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [usernameRequired, setUsernameRequired] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [challengeAfterSave, setChallengeAfterSave] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingBattles, setPendingBattles] = useState<Battle[]>([]);
  const [myTurnBattles, setMyTurnBattles] = useState<Battle[]>([]);
  const [mode, setMode] = useState<'survival' | null>(null);
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
  const [storyVisible, setStoryVisible] = useState(false);
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { userIdRef.current = user.id; setUserId(user.id); }
    });
  }, []);

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

  const handleDailyQuiz = async () => {
    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      const { data: { session } } = await supabase.auth.getSession();
      let url = 'https://daily.quizine.se';
      if (session?.access_token && session?.refresh_token) {
        const params = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          token_type: 'bearer',
          expires_in: String(session.expires_in ?? 3600),
          type: 'magiclink',
        });
        url = `https://daily.quizine.se#${params.toString()}`;
      }
      if (win) { win.location.href = url; } else { Linking.openURL(url); }
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    let url = 'https://daily.quizine.se';
    if (session?.access_token && session?.refresh_token) {
      const params = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        expires_in: String(session.expires_in ?? 3600),
        type: 'magiclink',
      });
      url = `https://daily.quizine.se#${params.toString()}`;
    }
    Linking.openURL(url);
  };

  const openChangePw = () => {
    setCurrentPw(''); setNewPw(''); setPwError(''); setPwSuccess(false);
    setChangePwVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPw) { setPwError('Ange ditt nuvarande lösenord.'); return; }
    if (newPw.length < 6) { setPwError('Nytt lösenord måste vara minst 6 tecken.'); return; }
    if (currentPw === newPw) { setPwError('Det nya lösenordet måste skilja sig från det gamla.'); return; }
    setPwError(''); setPwSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('no email');
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
      if (verifyError) { setPwError('Nuvarande lösenord är fel.'); return; }
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
    Alert.alert('Logga ut', 'Är du säker på att du vill logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logga ut', style: 'destructive', onPress: async () => { setProfileVisible(false); await supabase.auth.signOut(); } },
    ]);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true); setFeedbackError('');
    const { error } = await submitFeedback(feedbackText, userId, username);
    setFeedbackSending(false);
    if (error) { setFeedbackError('Något gick fel. Försök igen.'); return; }
    setFeedbackSent(true);
  };

  const handleTabPress = (route: string) => {
    if (route === 'Home') return;
    navigation.navigate(route as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => setProfileVisible(true)} style={styles.userpill}>
            <View style={styles.userdot}>
              <Text style={styles.userdotText}>
                {(username ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userpillName} numberOfLines={1}>
              {username ?? 'Sätt namn'}
            </Text>
            {pendingCount > 0 && (
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Leaderboard', {})}
            style={styles.iconBtn}
          >
            <Text style={styles.iconBtnText}>🏆</Text>
          </TouchableOpacity>
        </View>

        {/* Brand block */}
        <View style={styles.brandBlock}>
          <Text style={styles.brandNeon}>~ open all night ~</Text>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.brandTagline}>QUIZ FÖR KROGANSTÄLLDA</Text>
        </View>

        {/* My turn banner */}
        {myTurnCount > 0 && (
          <TouchableOpacity style={styles.bannerYourTurn} onPress={handleMyTurnPress} activeOpacity={0.8}>
            <View style={styles.pulseDot} />
            <Text style={styles.bannerText}>
              ⚡ Din tur i {myTurnCount} battle{myTurnCount > 1 ? 's' : ''}!
            </Text>
            <Text style={styles.bannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Streak */}
        {streak > 0 && (
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>🔥 {streak} dag{streak !== 1 ? 'ar' : ''} i rad!</Text>
          </View>
        )}

        {mode === null ? (
          <>
            <Text style={styles.sectionLabel}>Välj spelläge</Text>

            {/* Daily */}
            <TouchableOpacity style={[styles.modeCard, styles.modeCardDaily]} onPress={handleDailyQuiz} activeOpacity={0.85}>
              <View style={[styles.modeIcon, styles.modeIconDaily]}>
                <Text style={styles.modeEmoji}>📅</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Daily Quiz</Text>
                <Text style={styles.modeDesc}>Dagens quiz — ett nytt utmaningsset varje dag</Text>
              </View>
              <Text style={[styles.modeArrow, { color: colors.yellow }]}>↗</Text>
            </TouchableOpacity>

            {/* Survival */}
            <TouchableOpacity style={[styles.modeCard, styles.modeCardSurvival]} onPress={() => setMode('survival')} activeOpacity={0.85}>
              <View style={[styles.modeIcon, styles.modeIconSurvival]}>
                <Text style={styles.modeEmoji}>❤️</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Överlevnadsläge</Text>
                <Text style={styles.modeDesc}>3 liv — svara rätt och håll sviten vid liv</Text>
              </View>
              <Text style={[styles.modeArrow, { color: colors.pink }]}>→</Text>
            </TouchableOpacity>

            {/* Battle */}
            <TouchableOpacity style={[styles.modeCard, styles.modeCardBattle]} onPress={handleChallengePress} activeOpacity={0.85}>
              <View style={[styles.modeIcon, styles.modeIconBattle]}>
                <Text style={styles.modeEmoji}>⚔️</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Battle</Text>
                <Text style={styles.modeDesc}>Utmana en kompis i ett riktigt quiz-duell</Text>
              </View>
              {pendingBattleCount > 0 ? (
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>{pendingBattleCount}</Text>
                </View>
              ) : (
                <Text style={[styles.modeArrow, { color: colors.cyan }]}>→</Text>
              )}
            </TouchableOpacity>

            {/* Pending challenge banner */}
            {pendingBattleCount > 0 && (
              <TouchableOpacity style={styles.challengeCard} onPress={handlePendingBattlePress} activeOpacity={0.8}>
                <Text style={styles.challengeEmoji}>⚔️</Text>
                <View style={styles.challengeBody}>
                  <Text style={styles.challengeTitle}>
                    {pendingBattles[0]?.creator_name ?? 'Någon'} utmanar dig!
                  </Text>
                  {pendingBattleCount > 1 && (
                    <Text style={styles.challengeSub}>+{pendingBattleCount - 1} utmaning{pendingBattleCount - 1 > 1 ? 'ar' : ''} till</Text>
                  )}
                </View>
                <Text style={styles.challengeAction}>Svara →</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setMode(null)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Tillbaka</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Välj kategori</Text>

            {mode === 'survival' && (
              <TouchableOpacity
                style={styles.allCatsCard}
                onPress={() => navigation.navigate('Survival', { categoryId: 'all' })}
                activeOpacity={0.85}
              >
                <Text style={styles.allCatsIcon}>🎲</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allCatsText}>Alla kategorier (mix)</Text>
                  {(survivalHighscores['all'] ?? 0) > 0 && (
                    <Text style={styles.allCatsScore}>
                      <Text style={styles.allCatsScoreMono}>{survivalHighscores['all'].toLocaleString('sv-SE')}</Text> XP
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <View key={cat.id} style={styles.gridItem}>
                  <CategoryCard
                    category={cat}
                    highscore={survivalHighscores[cat.id] ?? 0}
                    onPress={() => navigation.navigate('Survival', { categoryId: cat.id })}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Bottom actions */}
        <TouchableOpacity onPress={() => navigation.navigate('CreateQuestion')} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnIcon}>✏️</Text>
          <Text style={styles.ghostBtnText}>Skapa egna frågor</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setStoryVisible(true)} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnIcon}>🍽️</Text>
          <Text style={styles.ghostBtnText}>Berätta en kroghistoria</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setFeedbackText(''); setFeedbackSent(false); setFeedbackError(''); setFeedbackVisible(true); }}
          style={styles.textLink}
        >
          <Text style={styles.textLinkText}>Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setHelpVisible(true)} style={styles.textLink}>
          <Text style={styles.textLinkText}>Hur funkar det?</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Neon tab bar */}
      <NeonTabBar
        activeRoute="Home"
        onPress={handleTabPress}
        pendingCount={pendingCount}
      />

      {/* Help modal */}
      <Modal visible={helpVisible} transparent animationType="slide" onRequestClose={() => setHelpVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Hur funkar det?</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.helpScroll}>
              <Text style={styles.helpSection}>⚔️ Battle-läget</Text>
              <Text style={styles.modalBody}>{'Utmana en vän på ett ämne du väljer. Tryck på "Battle" på startsidan och välj en vän och kategori.\n\nNi spelar var för sig i er egen takt. När ni båda är klara räknas poängen ihop — den med flest poäng vinner.'}</Text>
              <Text style={styles.helpSection}>👥 Lägga till vänner</Text>
              <Text style={styles.modalBody}>{'Tryck på vänner-ikonen 👥 i nedre menyn.\n\nSök på en kollegas smeknamn och skicka en vänförfrågan. När de accepterar kan ni se varandras resultat och utmana varandra i Battle-läget.'}</Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Förstått!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback modal */}
      <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Feedback</Text>
            {feedbackSent ? (
              <>
                <Text style={styles.successText}>Tack för din feedback! 🙏</Text>
                <TouchableOpacity onPress={() => setFeedbackVisible(false)} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Stäng</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalBody}>Har du förslag, hittat en bugg eller vill säga något? Vi läser allt!</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={feedbackText}
                  onChangeText={v => { setFeedbackText(v); setFeedbackError(''); }}
                  placeholder="Skriv ditt meddelande..."
                  placeholderTextColor={colors.text3}
                  multiline
                  maxLength={1000}
                />
                {feedbackError ? <Text style={styles.errorText}>{feedbackError}</Text> : null}
                <TouchableOpacity
                  onPress={handleFeedbackSubmit}
                  style={[styles.primaryBtn, (!feedbackText.trim() || feedbackSending) && styles.primaryBtnDisabled]}
                  disabled={!feedbackText.trim() || feedbackSending}
                >
                  <Text style={styles.primaryBtnText}>{feedbackSending ? 'Skickar...' : 'Skicka'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFeedbackVisible(false)} style={styles.ghostModalBtn}>
                  <Text style={styles.ghostModalBtnText}>Avbryt</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile modal */}
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
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {usernameRequired ? 'Välj ett smeknamn' : 'Din profil'}
              </Text>
              {usernameRequired ? (
                <Text style={styles.modalBody}>Välj ett unikt smeknamn innan du börjar spela. Det visas på topplistan och när du utmanar vänner.</Text>
              ) : challengeAfterSave ? (
                <Text style={styles.hintText}>Du behöver ett smeknamn för att utmana andra.</Text>
              ) : (
                <Text style={styles.modalBody}>Ändra ditt smeknamn. Namnet måste vara unikt.</Text>
              )}

              <TextInput
                style={[styles.input, usernameError ? styles.inputError : null]}
                value={inputName}
                onChangeText={v => { setInputName(v); setUsernameError(''); }}
                placeholder="Ditt smeknamn..."
                placeholderTextColor={colors.text3}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

              <TouchableOpacity
                onPress={handleSaveUsername}
                style={[styles.primaryBtn, (!inputName.trim() || saving) && styles.primaryBtnDisabled]}
                disabled={!inputName.trim() || saving}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Kontrollerar...' : 'Spara'}</Text>
              </TouchableOpacity>

              {!usernameRequired && !changePwVisible && (
                <>
                  <TouchableOpacity onPress={openChangePw} style={styles.ghostModalBtn}>
                    <Text style={styles.ghostModalBtnText}>🔑  Byt lösenord</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleLogout} style={styles.dangerBtn}>
                    <Text style={styles.dangerBtnText}>🚪  Logga ut</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setProfileVisible(false); setChallengeAfterSave(false); }} style={styles.ghostModalBtn}>
                    <Text style={styles.ghostModalBtnText}>✕  Avbryt</Text>
                  </TouchableOpacity>
                </>
              )}

              {!usernameRequired && changePwVisible && (
                <>
                  {pwSuccess ? (
                    <>
                      <Text style={styles.successText}>✓ Lösenordet är uppdaterat!</Text>
                      <TouchableOpacity onPress={() => setChangePwVisible(false)} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnText}>Tillbaka</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={[styles.input, pwError && styles.inputError]}
                        value={currentPw}
                        onChangeText={v => { setCurrentPw(v); setPwError(''); }}
                        placeholder="Nuvarande lösenord"
                        placeholderTextColor={colors.text3}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={[styles.input, pwError && styles.inputError]}
                        value={newPw}
                        onChangeText={v => { setNewPw(v); setPwError(''); }}
                        placeholder="Nytt lösenord (minst 6 tecken)"
                        placeholderTextColor={colors.text3}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                      {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}
                      <TouchableOpacity
                        onPress={handleChangePassword}
                        style={[styles.primaryBtn, (!currentPw || !newPw || pwSaving) && styles.primaryBtnDisabled]}
                        disabled={!currentPw || !newPw || pwSaving}
                      >
                        <Text style={styles.primaryBtnText}>{pwSaving ? 'Sparar...' : 'Byt lösenord'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setChangePwVisible(false)} style={styles.ghostModalBtn}>
                        <Text style={styles.ghostModalBtnText}>Avbryt</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Turn notification toast */}
      {turnNotification && (
        <TouchableOpacity
          style={styles.toast}
          onPress={() => { setTurnNotification(null); handleMyTurnPress(); }}
          activeOpacity={0.9}
        >
          <Text style={styles.toastEmoji}>⚡</Text>
          <View style={styles.toastBody}>
            <Text style={styles.toastTitle}>Din tur!</Text>
            <Text style={styles.toastSub}>{turnNotification.opponentName} har spelat klart.</Text>
          </View>
          <Text style={styles.toastArrow}>→</Text>
        </TouchableOpacity>
      )}

      {storyVisible && (
        <StoryModal userId={userId} username={username} onClose={() => setStoryVisible(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  scroll: { paddingHorizontal: spacing.s4, paddingBottom: spacing.s7 },

  // Top bar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.s5,
    paddingBottom: spacing.s3,
  },
  userpill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 11,
    maxWidth: 140,
    gap: 8,
    position: 'relative',
  },
  userdot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userdotText: {
    color: '#1a0010',
    fontSize: 10,
    fontFamily: fonts.display700,
    lineHeight: 14,
  },
  userpillName: {
    color: colors.text2,
    fontSize: 12,
    fontFamily: fonts.display600,
    flexShrink: 1,
  },
  profileBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.wrong,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  profileBadgeText: { color: '#fff', fontSize: 9, fontFamily: fonts.display700, lineHeight: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 15 },

  // Brand block
  brandBlock: { alignItems: 'center', marginBottom: spacing.s5, marginTop: spacing.s2 },
  brandNeon: {
    fontFamily: fonts.neon700,
    fontSize: 16,
    color: colors.pink,
    marginBottom: 6,
  },
  logo: { width: 56, height: 56, marginBottom: 6 },
  brandTagline: {
    fontFamily: fonts.mono700,
    fontSize: 10,
    color: colors.cyan,
    letterSpacing: 0.28 * 10,
    textTransform: 'uppercase',
  },

  // Banners
  bannerYourTurn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(54, 224, 224, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(54, 224, 224, 0.5)',
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  bannerText: { flex: 1, color: colors.cyan, fontSize: 13.5, fontFamily: fonts.display600 },
  bannerArrow: { color: colors.cyan, fontFamily: fonts.display700, fontSize: 16 },
  streakPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 56, 165, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 56, 165, 0.4)',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  streakText: { color: colors.pink, fontSize: 13, fontFamily: fonts.display700 },

  // Section label
  sectionLabel: {
    color: colors.text3,
    fontSize: 11,
    fontFamily: fonts.mono700,
    letterSpacing: 0.22 * 11,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Mode cards
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modeCardDaily: { borderColor: 'rgba(255, 213, 79, 0.5)' },
  modeCardSurvival: { borderColor: 'rgba(255, 56, 165, 0.55)' },
  modeCardBattle: { borderColor: 'rgba(54, 224, 224, 0.5)' },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modeIconDaily: { backgroundColor: 'rgba(255, 213, 79, 0.14)' },
  modeIconSurvival: { backgroundColor: 'rgba(255, 56, 165, 0.14)' },
  modeIconBattle: { backgroundColor: 'rgba(54, 224, 224, 0.14)' },
  modeEmoji: { fontSize: 22 },
  modeInfo: { flex: 1 },
  modeTitle: { color: colors.text1, fontSize: 16, fontFamily: fonts.display700, marginBottom: 2, letterSpacing: -0.4 },
  modeDesc: { color: colors.text3, fontSize: 11.5, fontFamily: fonts.display400, lineHeight: 16 },
  modeArrow: { fontFamily: fonts.display700, fontSize: 18 },
  modeBadge: {
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadgeText: { color: '#1a0010', fontSize: 11, fontFamily: fonts.display700 },

  // Challenge card
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 56, 165, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 56, 165, 0.5)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  challengeEmoji: { fontSize: 18 },
  challengeBody: { flex: 1 },
  challengeTitle: { color: colors.pink, fontSize: 14, fontFamily: fonts.display600 },
  challengeSub: { color: colors.text2, fontSize: 12, fontFamily: fonts.display400, marginTop: 2 },
  challengeAction: { color: colors.pink, fontSize: 13, fontFamily: fonts.display700 },

  // Category grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  gridItem: { width: '50%' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 10 },
  backBtnText: { color: colors.text2, fontSize: 14, fontFamily: fonts.display500 },

  allCatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 56, 165, 0.45)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  allCatsIcon: { fontSize: 22 },
  allCatsText: { color: colors.pink, fontSize: 15, fontFamily: fonts.display700 },
  allCatsScore: { color: colors.text3, fontSize: 11, fontFamily: fonts.display400, marginTop: 2 },
  allCatsScoreMono: { fontFamily: fonts.mono700, color: colors.yellow },

  // Ghost buttons
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  ghostBtnIcon: { fontSize: 15 },
  ghostBtnText: { color: colors.text1, fontSize: 15, fontFamily: fonts.display600 },
  textLink: { alignItems: 'center', marginTop: 10, paddingVertical: 10 },
  textLinkText: { color: colors.text2, fontSize: 14, fontFamily: fonts.display500, textDecorationLine: 'underline' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    backgroundColor: colors.bg2,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 213, 79, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  toastEmoji: { fontSize: 22 },
  toastBody: { flex: 1 },
  toastTitle: { color: colors.yellow, fontSize: 13, fontFamily: fonts.display700 },
  toastSub: { color: colors.text2, fontSize: 11.5, fontFamily: fonts.display400, marginTop: 2 },
  toastArrow: { color: colors.yellow, fontSize: 18, fontFamily: fonts.display700 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(54, 224, 224, 0.35)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.lineStrong,
    borderRightColor: colors.lineStrong,
    padding: 28,
    paddingTop: 20,
  },
  modalHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: { color: colors.text1, fontSize: 22, fontFamily: fonts.display700, marginBottom: 12, letterSpacing: -0.4 },
  modalBody: { color: colors.text2, fontSize: 14.5, fontFamily: fonts.display400, lineHeight: 22, marginBottom: 18 },
  helpScroll: { maxHeight: 400, marginBottom: 4 },
  helpSection: { color: colors.text1, fontSize: 15, fontFamily: fonts.display700, marginBottom: 8 },

  // Inputs
  input: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text1,
    fontSize: 15,
    fontFamily: fonts.display500,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    minHeight: 46,
  },
  inputMultiline: { height: 110, textAlignVertical: 'top', paddingTop: 12 },
  inputError: { borderColor: colors.wrong },
  errorText: { color: colors.wrong, fontSize: 12.5, fontFamily: fonts.display500, marginBottom: 10 },
  hintText: { color: colors.cyan, fontSize: 13, fontFamily: fonts.display600, marginBottom: 8 },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.pink,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#1a0010', fontSize: 16, fontFamily: fonts.display700 },
  ghostModalBtn: { alignItems: 'center', paddingVertical: 10 },
  ghostModalBtnText: { color: colors.text2, fontSize: 14, fontFamily: fonts.display500 },
  dangerBtn: { alignItems: 'center', paddingVertical: 8 },
  dangerBtnText: { color: colors.wrong, fontSize: 13, fontFamily: fonts.display500 },
  successText: { color: colors.correct, fontSize: 16, fontFamily: fonts.display600, textAlign: 'center', marginVertical: 16 },
});
