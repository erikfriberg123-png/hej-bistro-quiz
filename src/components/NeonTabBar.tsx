import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme/tokens';

interface Tab {
  route: string;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { route: 'Home', icon: '🏠', label: 'Hem' },
  { route: 'ChallengeLobby', icon: '⚔️', label: 'Duell' },
  { route: 'Leaderboard', icon: '🏆', label: 'Topplista' },
  { route: 'Friends', icon: '👥', label: 'Vänner' },
];

interface Props {
  activeRoute: string;
  onPress: (route: string) => void;
  pendingCount?: number;
}

export function NeonTabBar({ activeRoute, onPress, pendingCount = 0 }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const isActive = activeRoute === tab.route;
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => onPress(tab.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Text style={styles.icon}>{tab.icon}</Text>
              {tab.route === 'Friends' && pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bg1,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    position: 'relative',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255, 56, 165, 0.12)',
    ...(Platform.OS !== 'android' && {
      shadowColor: colors.pink,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
    }),
  },
  icon: { fontSize: 18 },
  label: {
    fontFamily: fonts.mono700,
    fontSize: 9,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
    color: colors.text3,
  },
  labelActive: {
    color: colors.pink,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.pink,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#1a0010',
    fontSize: 9,
    fontFamily: fonts.display700,
    lineHeight: 11,
  },
});
