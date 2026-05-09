import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import { AuthStackParamList, RootStackParamList } from './src/types';
import { supabase } from './src/lib/supabase';
import { useGameStore } from './src/store/gameStore';
import { registerPushToken } from './src/lib/pushNotifications';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import CreateQuestionScreen from './src/screens/CreateQuestionScreen';
import ChallengeLobbyScreen from './src/screens/ChallengeLobbyScreen';
import ChallengeResultScreen from './src/screens/ChallengeResultScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import BattlePickCategoryScreen from './src/screens/BattlePickCategoryScreen';
import BattleRoundScreen from './src/screens/BattleRoundScreen';
import BattleBoardScreen from './src/screens/BattleBoardScreen';
import BattleResultScreen from './src/screens/BattleResultScreen';
import AdminScreen from './src/screens/AdminScreen';

const AppStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const loadRemoteQuestions = useGameStore(s => s.loadRemoteQuestions);

  useEffect(() => {
    const init = async () => {
      const [{ data: { session } }, done] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem('onboarding-done'),
      ]);
      setSession(session);
      setOnboardingDone(!!done);
      setIsReady(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadRemoteQuestions();
        registerPushToken().catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load remote questions whenever we have a session
  useEffect(() => {
    if (session) loadRemoteQuestions();
  }, [!!session]);

  if (!fontsLoaded || !isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#9B5DE5" />
      </View>
    );
  }

  const navContent = !session ? (
    <NavigationContainer>
      <AuthStack.Navigator
        initialRouteName={onboardingDone ? 'Auth' : 'Onboarding'}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
        <AuthStack.Screen name="Auth" component={AuthScreen} />
      </AuthStack.Navigator>
    </NavigationContainer>
  ) : (
    <NavigationContainer>
      <AppStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <AppStack.Screen name="Home" component={HomeScreen} />
        <AppStack.Screen name="Game" component={GameScreen} />
        <AppStack.Screen name="Result" component={ResultScreen} />
        <AppStack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <AppStack.Screen name="CreateQuestion" component={CreateQuestionScreen} />
        <AppStack.Screen name="ChallengeLobby" component={ChallengeLobbyScreen} />
        <AppStack.Screen name="ChallengeResult" component={ChallengeResultScreen} />
        <AppStack.Screen name="BattlePickCategory" component={BattlePickCategoryScreen} />
        <AppStack.Screen name="BattleRound" component={BattleRoundScreen} />
        <AppStack.Screen name="BattleBoard" component={BattleBoardScreen} />
        <AppStack.Screen name="BattleResult" component={BattleResultScreen} />
        <AppStack.Screen name="Friends" component={FriendsScreen} />
        <AppStack.Screen name="Admin" component={AdminScreen} />
      </AppStack.Navigator>
    </NavigationContainer>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webInner}>
          {navContent}
        </View>
      </View>
    );
  }

  return navContent;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#12082A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webOuter: {
    flex: 1,
    backgroundColor: '#0A0520',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webInner: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
});
