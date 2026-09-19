import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';

function urlParams(url: string) {
  const normalized = url.replace('#', '?');
  return new URL(normalized).searchParams;
}

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [message, setMessage] = useState('Oturum doğrulanıyor…');

  useEffect(() => {
    if (!url) return;

    async function complete() {
      const params = urlParams(url!);
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const next = params.get('next');

      const result = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          : { error: new Error('Doğrulama bilgisi bulunamadı.') };

      if (result.error) {
        setMessage(result.error.message);
        return;
      }
      router.replace(
        next === 'reset-password' ? '/(auth)/reset-password' : '/',
      );
    }

    void complete();
  }, [url]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
    backgroundColor: colors.background,
  },
  text: { color: colors.muted, textAlign: 'center' },
});
