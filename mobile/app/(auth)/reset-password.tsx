import { router } from 'expo-router';
import { useState } from 'react';
import {
  AppTitle,
  Card,
  Field,
  Message,
  PrimaryButton,
  Screen,
} from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.replace('/');
  }

  return (
    <Screen>
      <AppTitle>Yeni şifre</AppTitle>
      <Card>
        <Field
          label="Yeni şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        {error ? <Message>{error}</Message> : null}
        <PrimaryButton
          label="Şifreyi kaydet"
          loading={loading}
          onPress={() => void submit()}
        />
      </Card>
    </Screen>
  );
}
