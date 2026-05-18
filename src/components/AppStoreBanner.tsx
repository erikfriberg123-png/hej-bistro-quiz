import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

const APP_STORE_URL = 'https://apps.apple.com/app/idXXXXXXXXX';

export default function AppStoreBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('app-banner-dismissed');
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem('app-banner-dismissed', '1');
    setVisible(false);
  };

  return (
    <View style={styles.banner}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>🎯</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>ProQuiz</Text>
        <Text style={styles.sub}>Ladda ner appen för bästa upplevelsen</Text>
      </View>
      <Pressable style={styles.button} onPress={() => Linking.openURL(APP_STORE_URL)}>
        <Text style={styles.buttonText}>Hämta</Text>
      </Pressable>
      <Pressable style={styles.close} onPress={dismiss} hitSlop={8}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    backgroundColor: colors.bg2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: colors.text1,
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
  },
  sub: {
    color: colors.text3,
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
  },
  button: {
    backgroundColor: colors.pink,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  buttonText: {
    color: colors.text1,
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
  },
  close: {
    paddingHorizontal: 4,
  },
  closeText: {
    color: colors.text3,
    fontSize: 14,
  },
});
