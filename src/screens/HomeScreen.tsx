import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { CATEGORIES } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';
import { getUsername, setUsername } from '../lib/scores';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { highscores, streak, checkStreak } = useGameStore();
  const [helpVisible, setHelpVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkStreak();
    getUsername().then(name => {
      setUsernameState(name);
      setInputName(name ?? '');
    });
  }, []);

  const handleSaveUsername = async () => {
    if (!inputName.trim()) return;
    setSaving(true);
    try {
      await setUsername(inputName.trim());
      setUsernameState(inputName.trim());
      setProfileVisible(false);
    } catch {
      Alert.alert('Fel', 'Kunde inte spara namn. Försök igen.');
    } finally {
      setSaving(false);
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
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.logo}>Hej Bistro</Text>
            <Text style={styles.subtitle}>Quiz för restaurangfolk</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Leaderboard', {})}
            style={styles.leaderboardBtn}
          >
            <Text style={styles.leaderboardIcon}>🏆</Text>
          </TouchableOpacity>
        </View>

        {streak > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakText}>🔥 {streak} dag{streak !== 1 ? 'ar' : ''} i rad!</Text>
          </View>
        )}

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

        <TouchableOpacity onPress={() => setHelpVisible(true)} style={styles.helpLink}>
          <Text style={styles.helpText}>Hur funkar det?</Text>
        </TouchableOpacity>
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
      <Modal visible={profileVisible} transparent animationType="slide" onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ditt namn</Text>
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
            <TouchableOpacity onPress={() => setProfileVisible(false)} style={styles.cancelBtn}>
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
  titleBlock: { flex: 1, alignItems: 'center' },
  logo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: -0.5,
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
  helpLink: { alignItems: 'center', marginTop: 24, paddingVertical: 12 },
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
});
