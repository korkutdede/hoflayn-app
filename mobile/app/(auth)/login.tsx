import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  AppTitle,
  Card,
  Field,
  Message,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TextButton,
} from '@/src/components/ui';
import { signInWithGoogle } from '@/src/lib/google-auth';
import { deviceTranslator } from '@/src/lib/i18n';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function LoginScreen() {
  const { enterDemo } = useAuth();
  const t = useMemo(() => deviceTranslator(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.replace('/');
  }

  async function google() {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.cancelled) return;
      router.replace('/');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t('auth.error.google'),
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Hoflayn">AI Çalışma Masası</AppTitle>
      <Text style={styles.subtitle}>
        Ürünlerini telefondan düzenle, fotoğraflarını hazırla ve işini büyüt.
      </Text>
      <Card>
        <Field
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        {error ? <Message>{error}</Message> : null}
        <PrimaryButton
          label="Giriş yap"
          loading={loading}
          onPress={() => void submit()}
        />
        <Text style={styles.or}>{t('auth.or')}</Text>
        <SecondaryButton
          label={googleLoading ? t('auth.login.submitting') : t('auth.google')}
          disabled={loading || googleLoading}
          onPress={() => void google()}
        />
        <TextButton onPress={() => router.push('/(auth)/forgot-password')}>
          Şifremi unuttum
        </TextButton>
      </Card>
      <SecondaryButton
        label="Giriş yapmadan keşfet"
        onPress={() => {
          enterDemo();
          router.replace('/(tabs)/home');
        }}
      />
      <TextButton onPress={() => router.push('/(auth)/signup')}>
        Hesabın yok mu? Kayıt ol
      </TextButton>
      <TextButton onPress={() => router.replace('/')}>
        Karşılama ekranına dön
      </TextButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  or: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
