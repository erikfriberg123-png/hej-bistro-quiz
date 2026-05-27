import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { getCategoriesForArea } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';
import { NeonTabBar } from '../components/NeonTabBar';
import { getUserProfile, setUsername, setArea as saveArea, checkUsernameAvailable } from '../lib/scores';
import { type Area, AREA_BRANDING, AREAS, DEFAULT_AREA } from '../lib/branding';
import { tablesForArea } from '../lib/appConfig';
import { getPendingRequests } from '../lib/friends';
import { Battle, getMyActiveTurns, getPendingBattlesForMe } from '../lib/battles';
import { supabase } from '../lib/supabase';
import { submitFeedback } from '../lib/feedback';
import { registerPushToken, clearPushToken } from '../lib/pushNotifications';
import { StoryModal } from '../components/StoryModal';
import { fonts, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { survivalHighscores, loadRemoteQuestions, resetGame, isDarkMode, toggleDarkMode } = useGameStore();
  const [helpVisible, setHelpVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);
  const [area, setAreaState] = useState<Area>(DEFAULT_AREA);
  const [selectedArea, setSelectedArea] = useState<Area>(DEFAULT_AREA);
  const [inputName, setInputName] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
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
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const prevMyTurnIdsRef = useRef<Set<string> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const pendingBattleCount = pendingBattles.length;
  const myTurnCount = myTurnBattles.length;

  useEffect(() => {
    getUserProfile().then(({ username: name, area: userArea }) => {
      if (!name) { navigation.replace('Welcome'); return; }
      setUsernameState(name);
      setInputName(name);
      setAreaState(userArea);
      setSelectedArea(userArea);
      loadRemoteQuestions(userArea);
      registerPushToken();
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { userIdRef.current = user.id; setUserId(user.id); registerPushToken(); }
    });
  }, []);

  const refreshBattleState = useCallback(async (notifyOnNew: boolean) => {
    const [newMyTurns, newPending] = await Promise.all([
      getMyActiveTurns(area).catch((): Battle[] => []),
      getPendingBattlesForMe(area).catch((): Battle[] => []),
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
  }, [area]);

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
    const battlesTable = tablesForArea(area).battles;
    const ch1 = supabase
      .channel(`home-cr-${userId}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: battlesTable, filter: `creator_id=eq.${userId}` }, onUpdate)
      .subscribe();
    const ch2 = supabase
      .channel(`home-op-${userId}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: battlesTable, filter: `opponent_id=eq.${userId}` }, onUpdate)
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId, area, refreshBattleState]);

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
      setProfileVisible(false);
    } catch {
      setUsernameError('Kunde inte spara namn. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  const doChangeArea = async (newArea: Area) => {
    try {
      await saveArea(newArea);
      resetGame();
      setMode(null);
      setAreaState(newArea);
      setSelectedArea(newArea);
      loadRemoteQuestions(newArea);
      setProfileVisible(false);
    } catch {}
  };

  const handleChangeArea = (newArea: Area) => {
    if (newArea === area) return;
    const newBranding = AREA_BRANDING[newArea];
    const hasPending = myTurnBattles.length > 0 || pendingBattles.length > 0;
    const warningLine = hasPending
      ? `Pågående battles och spel avslutas.`
      : `Pågående spel avslutas.`;

    if (Platform.OS === 'web') {
      if (window.confirm(`Byta till ${newBranding.brandName}?\n${warningLine}`)) {
        doChangeArea(newArea);
      }
      return;
    }
    Alert.alert(
      `Byta till ${newBranding.brandName}?`,
      warningLine,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Byt bransch', style: 'destructive', onPress: () => doChangeArea(newArea) },
      ],
    );
  };

  const handlePendingBattlePress = async () => {
    const battle = pendingBattles[0];
    if (!battle) return;
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
    navigation.navigate('ChallengeLobby', {});
  };

  const handleDailyQuiz = async () => {
    const dailyPath = AREA_BRANDING[area].dailyPath;
    const base = `https://daily.quizine.se/${dailyPath}`;
    const { data: { session } } = await supabase.auth.getSession();
    let url = base;
    if (session?.access_token && session?.refresh_token) {
      const params = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        expires_in: String(session.expires_in ?? 3600),
        type: 'magiclink',
      });
      url = `${base}#${params.toString()}`;
    }
    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) { win.location.href = url; } else { Linking.openURL(url); }
      return;
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

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      setDeleteAccountVisible(false);
      setProfileVisible(false);
      await supabase.auth.signOut();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Kunde inte radera kontot. Försök igen.');
      } else {
        Alert.alert('Fel', 'Kunde inte radera kontot. Försök igen.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Är du säker på att du vill logga ut?')) {
        setProfileVisible(false);
        await clearPushToken();
        supabase.auth.signOut();
      }
      return;
    }
    Alert.alert('Logga ut', 'Är du säker på att du vill logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logga ut', style: 'destructive', onPress: async () => { setProfileVisible(false); await clearPushToken(); await supabase.auth.signOut(); } },
    ]);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true); setFeedbackError('');
    const { error } = await submitFeedback(feedbackText, userId, username, area);
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
          <Text style={[styles.brandNeon, { color: AREA_BRANDING[area].brandColor }]}>
            {AREA_BRANDING[area].neonLine}
          </Text>
          {area === 'krogen' ? (
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          ) : area === 'it' ? (
            <Text style={{ fontSize: 48 }}>💻</Text>
          ) : area === 'blaljus' ? (
            <Text style={{ fontSize: 48 }}>🚨</Text>
          ) : area === 'handel' ? (
            <Image source={require('../../assets/logo_generic_work.png')} style={styles.logo} resizeMode="contain" />
          ) : (
            <Image source={require('../../assets/health-icon-1-stethoscope.png')} style={styles.logo} />
          )}
          <Text style={[styles.brandTagline, { color: AREA_BRANDING[area].brandColor }]}>
            {AREA_BRANDING[area].tagline.toUpperCase()}
          </Text>
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
            <TouchableOpacity
              style={[styles.modeCard, { borderColor: AREA_BRANDING[area].brandColor + '8C' }]}
              onPress={() => setMode('survival')}
              activeOpacity={0.85}
            >
              <View style={[styles.modeIcon, { backgroundColor: AREA_BRANDING[area].brandColor + '23' }]}>
                <Text style={styles.modeEmoji}>❤️</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Överlevnadsläge</Text>
                <Text style={styles.modeDesc}>3 liv — svara rätt och håll sviten vid liv</Text>
              </View>
              <Text style={[styles.modeArrow, { color: AREA_BRANDING[area].brandColor }]}>→</Text>
            </TouchableOpacity>

            {/* Sant eller Falskt */}
            <TouchableOpacity
              style={[styles.modeCard, { borderColor: AREA_BRANDING[area].brandColor + '8C' }]}
              onPress={() => navigation.navigate('SantEllerFalskt', { round: 1 })}
              activeOpacity={0.85}
            >
              <View style={[styles.modeIcon, { backgroundColor: AREA_BRANDING[area].brandColor + '23' }]}>
                <Text style={styles.modeEmoji}>🔀</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Sant eller Falskt</Text>
                <Text style={styles.modeDesc}>Svep rätt eller vänster — 3 rundor, 7 sekunder per fråga</Text>
              </View>
              <Text style={[styles.modeArrow, { color: AREA_BRANDING[area].brandColor }]}>→</Text>
            </TouchableOpacity>

            {/* Battle */}
            <TouchableOpacity
              style={[styles.modeCard, { borderColor: AREA_BRANDING[area].brandColor + '8C' }]}
              onPress={handleChallengePress}
              activeOpacity={0.85}
            >
              <View style={[styles.modeIcon, { backgroundColor: AREA_BRANDING[area].brandColor + '23' }]}>
                <Text style={styles.modeEmoji}>⚔️</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Battle</Text>
                <Text style={styles.modeDesc}>Utmana en kompis i ett riktigt quiz-duell</Text>
              </View>
              {pendingBattleCount > 0 ? (
                <View style={[styles.modeBadge, { backgroundColor: AREA_BRANDING[area].brandColor }]}>
                  <Text style={styles.modeBadgeText}>{pendingBattleCount}</Text>
                </View>
              ) : (
                <Text style={[styles.modeArrow, { color: AREA_BRANDING[area].brandColor }]}>→</Text>
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
              {getCategoriesForArea(area).map((cat) => (
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
          <Text style={styles.ghostBtnIcon}>{AREA_BRANDING[area].storyButtonIcon}</Text>
          <Text style={styles.ghostBtnText}>{AREA_BRANDING[area].storyButtonText}</Text>
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

              <Text style={styles.helpSection}>📅 Daily Quiz</Text>
              <Text style={styles.modalBody}>{'Daily Quiz öppnas i din webbläsare som en ny flik — utanför appen. Varje dag finns ett nytt frågesset att klara. Svara på alla frågor och slå ditt bästa resultat!'}</Text>

              <Text style={styles.helpSection}>🎯 Quiz-läget</Text>
              <Text style={styles.modalBody}>{'Välj en kategori och svara på 10 frågor. Du har 25 sekunder per fråga — ju snabbare du svarar rätt, desto mer poäng. Max 150 poäng per fråga (100 bas + 50 tidsbonus). Svarar du fel visas rätt svar med en förklaring.'}</Text>

              <Text style={styles.helpSection}>❤️ Överlevnadsläge</Text>
              <Text style={styles.modalBody}>{'Du startar med 3 liv. Varje fel kostar ett liv — svara rätt och håll din svit igång så länge som möjligt. Ditt rekord sparas per kategori.'}</Text>

              <Text style={styles.helpSection}>✅ Sant eller Falskt</Text>
              <Text style={styles.modalBody}>{'Läs påståendet och svep höger om det är sant, vänster om det är falskt. Du har 7 sekunder per påstående och spelar 3 rundor med ökande svårighet.'}</Text>

              <Text style={styles.helpSection}>⚔️ Battle-läget</Text>
              <Text style={styles.modalBody}>{'Utmana en vän på ett ämne du väljer. Ni spelar var för sig i er egen takt — när ni båda är klara räknas poängen ihop och den med flest poäng vinner.\n\nHar du fått en utmaning? En banner visas på startsidan — tryck på den för att hoppa direkt in i din match.'}</Text>

              <Text style={styles.helpSection}>👥 Lägga till vänner</Text>
              <Text style={styles.modalBody}>{'Tryck på vänner-ikonen 👥 uppe till höger på startsidan.\n\nSök på en kollegas smeknamn och skicka en vänförfrågan. När de accepterar kan ni utmana varandra i Battle-läget.\n\nGlöm inte att sätta ett smeknamn på din profil — annars kan ingen hitta dig!'}</Text>

            </ScrollView>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Förstått!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback modal */}
      <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete account confirmation modal */}
      <Modal visible={deleteAccountVisible} transparent animationType="fade" onRequestClose={() => setDeleteAccountVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => !deleteLoading && setDeleteAccountVisible(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Radera konto?</Text>
                <Text style={styles.modalBody}>
                  {'All din data raderas permanent — poäng, statistik och vänskapsband. Det går inte att ångra.'}
                </Text>
                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  style={[styles.deleteConfirmBtn, deleteLoading && styles.primaryBtnDisabled]}
                  disabled={deleteLoading}
                >
                  <Text style={styles.deleteConfirmText}>
                    {deleteLoading ? 'Raderar...' : 'Ja, radera mitt konto'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteAccountVisible(false)}
                  style={styles.ghostModalBtn}
                  disabled={deleteLoading}
                >
                  <Text style={styles.ghostModalBtnText}>Avbryt</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Profile modal */}
      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setProfileVisible(false); setChangePwVisible(false); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setProfileVisible(false); setChangePwVisible(false); }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Din profil</Text>
              <Text style={styles.modalBody}>Ändra ditt smeknamn. Namnet måste vara unikt.</Text>

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

              <Text style={[styles.sectionLabel, { marginTop: 18, marginBottom: 10 }]}>Din bransch</Text>
              <View style={styles.areaToggleRow}>
                {AREAS.map(a => {
                  const b = AREA_BRANDING[a];
                  const active = area === a;
                  const disabled = !!b.disabled;
                  return (
                    <TouchableOpacity
                      key={a}
                      style={[
                        styles.areaToggleBtn,
                        active && { borderColor: b.brandColor, backgroundColor: `${b.brandColor}18` },
                        disabled && { opacity: 0.4 },
                      ]}
                      onPress={() => !disabled && handleChangeArea(a)}
                      activeOpacity={disabled ? 1 : 0.8}
                    >
                      <Text style={[styles.areaToggleName, active && { color: b.brandColor }]}>
                        {b.label}{disabled ? ' (snart)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 18, marginBottom: 10 }]}>Utseende</Text>
              <View style={styles.themeRow}>
                <Text style={styles.themeRowLabel}>{isDarkMode ? '🌙 Mörkt läge' : '☀️ Ljust läge'}</Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: colors.lineStrong, true: colors.pink + '60' }}
                  thumbColor={isDarkMode ? colors.pink : colors.text3}
                  ios_backgroundColor={colors.lineStrong}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveUsername}
                style={[styles.primaryBtn, { marginTop: 16 }, (!inputName.trim() || saving) && styles.primaryBtnDisabled]}
                disabled={!inputName.trim() || saving}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Kontrollerar...' : 'Spara'}</Text>
              </TouchableOpacity>

              {!changePwVisible && (
                <>
                  <TouchableOpacity onPress={() => setDeleteAccountVisible(true)} style={styles.dangerBtn}>
                    <Text style={styles.dangerBtnText}>🗑️  Radera konto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={openChangePw} style={styles.ghostModalBtn}>
                    <Text style={styles.ghostModalBtnText}>🔑  Byt lösenord</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleLogout} style={styles.dangerBtn}>
                    <Text style={styles.dangerBtnText}>🚪  Logga ut</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setProfileVisible(false)} style={styles.ghostModalBtn}>
                    <Text style={styles.ghostModalBtnText}>✕  Avbryt</Text>
                  </TouchableOpacity>
                </>
              )}

              {changePwVisible && (
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
        <StoryModal userId={userId} username={username} area={area} onClose={() => setStoryVisible(false)} />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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

  // Area toggle (profile modal)
  areaToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  areaToggleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  areaToggleName: { color: colors.text1, fontSize: 14, fontFamily: fonts.display700, marginBottom: 2 },
  areaToggleLabel: { color: colors.text3, fontSize: 11, fontFamily: fonts.display400 },

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
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modeIconDaily: { backgroundColor: 'rgba(255, 213, 79, 0.14)' },
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
  deleteConfirmBtn: {
    backgroundColor: '#CC2222',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteConfirmText: { color: '#FFFFFF', fontSize: 16, fontFamily: fonts.display700 },
  successText: { color: colors.correct, fontSize: 16, fontFamily: fonts.display600, textAlign: 'center', marginVertical: 16 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  themeRowLabel: { color: colors.text1, fontSize: 14, fontFamily: fonts.display600 },
});
