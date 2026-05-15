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
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import { AuthStackParamList, RootStackParamList } from './src/types';
import { supabase } from './src/lib/supabase';
import { useGameStore } from './src/store/gameStore';
import { registerPushToken } from './src/lib/pushNotifications';
import { colors } from './src/theme/tokens';
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
import SurvivalScreen from './src/screens/SurvivalScreen';
import SurvivalResultScreen from './src/screens/SurvivalResultScreen';
import UpdatePasswordScreen from './src/screens/UpdatePasswordScreen';

const AppStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const linking = {
  prefixes: ['https://quizine.se'],
  config: {
    screens: {
      Home: '',
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    Caveat_700Bold,
  });

  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const loadRemoteQuestions = useGameStore(s => s.loadRemoteQuestions);

  useEffect(() => {
    const init = async () => {
      const [{ data: { session } }, done, keepSignedIn] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem('onboarding-done'),
        AsyncStorage.getItem('keepSignedIn'),
      ]);
      if (session && keepSignedIn === 'false') {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(session);
      }
      setOnboardingDone(!!done);
      setIsReady(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      setSession(session);
      if (session && _event !== 'PASSWORD_RECOVERY') {
        loadRemoteQuestions();
        registerPushToken().catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadRemoteQuestions();
  }, [!!session]);

  if (passwordRecovery) {
    const inner = <UpdatePasswordScreen onDone={() => setPasswordRecovery(false)} />;
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webOuter}>
          <View style={styles.webInner}>{inner}</View>
        </View>
      );
    }
    return inner;
  }

  if (!fontsLoaded || !isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.pink} />
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
    <NavigationContainer linking={linking}>
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
        <AppStack.Screen name="Survival" component={SurvivalScreen} />
        <AppStack.Screen name="SurvivalResult" component={SurvivalResultScreen} />
        <AppStack.Screen name="Friends" component={FriendsScreen} />
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
    backgroundColor: colors.bg1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webOuter: {
    flex: 1,
    backgroundColor: colors.bg0,
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
