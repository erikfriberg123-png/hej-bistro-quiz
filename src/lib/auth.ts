import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';

export async function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<{ username: string | null }> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) throw new Error('No identity token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  // Apple only sends fullName on the very first sign-in
  const given = credential.fullName?.givenName;
  const family = credential.fullName?.familyName;
  const fullName = [given, family].filter(Boolean).join(' ') || null;

  return { username: fullName };
}

export async function getAuthProvider(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.app_metadata?.provider ?? null;
}
