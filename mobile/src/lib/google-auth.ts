import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult =
  | { cancelled: true }
  | { cancelled: false };

/**
 * Browser OAuth through Supabase (web Google client). Does not create a
 * hoflayn.com PHP user — identity join key is still the same email.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = Linking.createURL('/auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Google oturumu başlatılamadı.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { cancelled: true };
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google girişi tamamlanamadı.');
  }

  const params = new URL(result.url.replace('#', '?')).searchParams;
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error) throw exchanged.error;
    return { cancelled: false };
  }

  if (accessToken && refreshToken) {
    const session = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (session.error) throw session.error;
    return { cancelled: false };
  }

  throw new Error('Doğrulama bilgisi bulunamadı.');
}
