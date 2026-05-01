import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CategoryId } from '../types';
import { CATEGORIES } from '../data/categories';
import { getChallengeByCode, findRandomChallenge } from '../lib/challenges';

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeLobby'>;
type LobbyMode = 'create' | 'random' | 'join';

export default function ChallengeLobbyScreen({ navigation }: Props) {
  const [mode, setMode] = useState<LobbyMode>('create');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food_drink');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartCreate = () => {
    navigation.navigate('Game', {
      categoryId: selectedCategory,
      challengeMode: 'create',
    });
  };

  const handleJoinByCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      Alert.alert('Ogiltig kod', 'Ange en 6-teckens utmaningskod.');
      return;
    }
    setLoading(true);
    try {
      const challenge = await getChallengeByCode(trimmed);
      if (!challenge) {
        Alert.alert('Hittades inte', 'Ingen utmaning med den koden. Kontrollera koden och försök igen.');
        return;
      }
      if (challenge.opponent_id) {
        Alert.alert('Utmaning tagen', 'Någon annan har redan svarat på den här utmaningen.');
        return;
      }
      navigation.navigate('Game', {
        categoryId: challenge.category_id as CategoryId,
        challengeMode: 'join',
        challengeId: challenge.id,
        questionIds: challenge.question_ids,
      });
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta utmaningen. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindRandom = async () => {
    setLoading(true);
    try {
      const challenge = await findRandomChallenge();
      if (challenge) {
        Alert.alert(
          'Motståndare hittad! ⚔️',
          `${challenge.creator_name} utmanar dig i "${CATEGORIES.find(c => c.id === challenge.category_id)?.name}"\n\nDeras poäng: ${challenge.creator_score} XP`,
          [
            { text: 'Avbryt', style: 'cancel' },
            {
              text: 'Acceptera!',
              onPress: () =>
                navigation.navigate('Game', {
                  categoryId: challenge.category_id as CategoryId,
                  challengeMode: 'join',
                  challengeId: challenge.id,
                  questionIds: challenge.question_ids,
                }),
            },
          ]
        );
      } else {
        Alert.alert(
          'Inga motståndare just nu',
          'Det finns inga öppna utmaningar för tillfället. Utmana en vän istället!',
          [
            { text: 'OK' },
            {
              text: 'Utmana en vän',
              onPress: () => setMode('create'),
            },
          ]
        );
      }
    } catch {
      Alert.alert('Fel', 'Kunde inte söka efter motståndare. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Utmaningsläge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Mode cards */}
        <View style={styles.modeRow}>
          <ModeCard
            emoji="👤"
            label="Utmana vän"
            active={mode === 'create'}
            onPress={() => setMode('create')}
          />
          <ModeCard
            emoji="🎲"
            label="Slumpmotståndare"
            active={mode === 'random'}
            onPress={() => setMode('random')}
          />
          <ModeCard
            emoji="🔑"
            label="Ange kod"
            active={mode === 'join'}
            onPress={() => setMode('join')}
          />
        </View>

        {/* Create flow */}
        {mode === 'create' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Välj kategori</Text>
            <Text style={styles.panelSub}>
              Du spelar din omgång och får sedan en kod att dela med din vän.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.catPill,
                    selectedCategory === cat.id && { backgroundColor: cat.color },
                  ]}
                >
                  <Text style={styles.catPillIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.catPillText,
                    selectedCategory === cat.id && styles.catPillTextActive,
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleStartCreate} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Spela din omgång ⚔️</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Random flow */}
        {mode === 'random' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Hitta motståndare</Text>
            <Text style={styles.panelSub}>
              Vi letar efter en öppen utmaning från en annan spelare. Kategorin väljs automatiskt.
            </Text>
            <TouchableOpacity
              onPress={handleFindRandom}
              style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.actionBtnText}>Hitta motståndare 🎲</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Join by code flow */}
        {mode === 'join' && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Svara på utmaning</Text>
            <Text style={styles.panelSub}>
              Ange koden du fått av din vän för att spela deras utmaning.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={v => setCode(v.toUpperCase())}
              placeholder="XXXXXX"
              placeholderTextColor="#6050A0"
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleJoinByCode}
              style={[styles.actionBtn, (loading || code.trim().length < 6) && styles.actionBtnDisabled]}
              disabled={loading || code.trim().length < 6}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.actionBtnText}>Acceptera utmaning 🔑</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeCard({
  emoji, label, active, onPress,
}: {
  emoji: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.modeCard, active && styles.modeCardActive]}
    >
      <Text style={styles.modeCardEmoji}>{emoji}</Text>
      <Text style={[styles.modeCardLabel, active && styles.modeCardLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
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
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#1E1040',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modeCardActive: {
    borderColor: '#2EC4B6',
    backgroundColor: '#0D2A2A',
  },
  modeCardEmoji: { fontSize: 22 },
  modeCardLabel: {
    color: '#B0A8C8',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  modeCardLabelActive: { color: '#2EC4B6' },
  panel: {
    backgroundColor: '#1E1040',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  panelSub: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
    marginTop: -8,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 4,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A50',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  catPillIcon: { fontSize: 14 },
  catPillText: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
  },
  actionBtn: {
    backgroundColor: '#2EC4B6',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  codeInput: {
    backgroundColor: '#2A1A50',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    borderWidth: 1,
    borderColor: '#3D2870',
    textAlign: 'center',
    letterSpacing: 8,
  },
});
