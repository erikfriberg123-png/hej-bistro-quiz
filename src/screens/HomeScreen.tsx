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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { CATEGORIES } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { highscores, streak, checkStreak } = useGameStore();
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    checkStreak();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.logo}>Hej Bistro</Text>
          <Text style={styles.subtitle}>Quiz för restaurangfolk</Text>
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
              {'6. Spela varje dag för att hålla din streak!'}
            </Text>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Förstått!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#12082A',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 16,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  streakBanner: {
    backgroundColor: '#1E1040',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionTitle: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
  },
  helpLink: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
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
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
});
