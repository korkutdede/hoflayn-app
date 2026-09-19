import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  AppTitle,
  Card,
  Field,
  Message,
  PrimaryButton,
  Screen,
  TextButton,
} from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/auth/callback?next=reset-password'),
    });
    setLoading(false);
    setMessage(
      error?.message ?? 'Şifre yenileme bağlantısını e-posta adresine gönderdik.',
    );
  }

  return (
    <Screen>
      <AppTitle>Şifreni yenile</AppTitle>
      <Card>
        <Field
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {message ? <Message tone="success">{message}</Message> : null}
        <PrimaryButton
          label="Bağlantı gönder"
          loading={loading}
          onPress={() => void submit()}
        />
      </Card>
      <TextButton onPress={() => router.back()}>Girişe dön</TextButton>
    </Screen>
  );
}
