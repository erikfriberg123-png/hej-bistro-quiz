import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing !== 'granted' ? await Notifications.requestPermissionsAsync() : { status: existing };
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('battle', {
        name: 'Battle',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: '87de1099-7c19-4189-a11d-4ad66e30b7c4',
    });
    if (!tokenData) { console.warn('[push] getExpoPushTokenAsync returned no token'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('[push] no authenticated user when registering token'); return; }

    const { error } = await supabase.from('profiles').update({ push_token: tokenData }).eq('id', user.id);
    if (error) console.warn('[push] failed to save token:', error.message);
    else console.log('[push] token registered for', user.id, tokenData);
  } catch (err) {
    console.warn('[push] registerPushToken error:', err);
  }
}

export async function clearPushToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ push_token: null }).eq('id', user.id);
  } catch {
    // non-fatal
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', {
      body: { userId, title, body, data },
    });
  } catch {
    // non-fatal — game still works without push
  }
}
