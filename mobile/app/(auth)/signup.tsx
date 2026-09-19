import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
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
import { HoflaynApiError, publicApiRequest } from '@/src/lib/api';
import { signInWithGoogle } from '@/src/lib/google-auth';
import { deviceTranslator, webOrigin } from '@/src/lib/i18n';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

type InviteGateStatus = {
  gate: 'open' | 'allowlist' | 'closed';
  maxTenants: number | null;
  tenantCount: number | null;
  remaining: number | null;
};

type InviteCheckOk = {
  allowed: true;
  status: 'open' | 'allowlisted';
};

export default function SignupScreen() {
  const { enterDemo } = useAuth();
  const t = useMemo(() => deviceTranslator(), []);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [gate, setGate] = useState<InviteGateStatus | null>(null);
  const [inviteOk, setInviteOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = gate?.gate !== 'allowlist' && gate?.gate !== 'closed';

  const loadGate = useCallback(async () => {
    try {
      setGate(await publicApiRequest<InviteGateStatus>('/api/v1/invite/check'));
    } catch {
      setGate({
        gate: 'open',
        maxTenants: null,
        tenantCount: null,
        remaining: null,
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadGate(), 0);
    return () => clearTimeout(timer);
  }, [loadGate]);

  function inviteErrorMessage(reason: unknown): string {
    if (reason instanceof HoflaynApiError) {
      if (reason.code === 'invalid_email') return t('auth.error.invalidEmail');
      return reason.message;
    }
    return reason instanceof Error ? reason.message : t('auth.error.invalidForm');
  }

  async function checkInvite() {
    setChecking(true);
    setError(null);
    setMessage(null);
    setInviteOk(false);
    try {
      const result = await publicApiRequest<InviteCheckOk>(
        '/api/v1/invite/check',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      setInviteOk(true);
      setMessage(
        result.status === 'open'
          ? t('auth.signup.success')
          : t('auth.signup.success'),
      );
    } catch (reason) {
      setError(inviteErrorMessage(reason));
    } finally {
      setChecking(false);
    }
  }

  async function submit() {
    if (!accepted) {
      setError(t('auth.terms.required'));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await publicApiRequest<InviteCheckOk>('/api/v1/invite/check', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setInviteOk(true);
      const result = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: Linking.createURL('/auth/callback'),
        },
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.data.session) router.replace('/');
      else setMessage(t('auth.signup.success'));
    } catch (reason) {
      setError(inviteErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);
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

  const gateHelp =
    gate?.gate === 'closed'
      ? t('beta.error.closed')
      : gate?.gate === 'allowlist'
        ? t('beta.inviteRequired')
        : t('landing.subtitle');

  return (
    <Screen>
      <AppTitle eyebrow={t('app.name')}>{t('auth.signup.title')}</AppTitle>
      <Text style={styles.help}>{gateHelp}</Text>
      {gate?.gate === 'allowlist' && gate.remaining != null ? (
        <Text style={styles.help}>
          {gate.remaining}
          {gate.maxTenants != null ? ` / ${gate.maxTenants}` : ''}
        </Text>
      ) : null}

      <Card>
        <Field
          label={t('auth.signup.name.label')}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />
        <Field
          label={t('auth.email.label')}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setInviteOk(false);
            setMessage(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        {gate?.gate === 'allowlist' ? (
          <SecondaryButton
            label={checking ? t('auth.signup.submitting') : t('auth.invite.check')}
            disabled={checking || loading || !email.trim()}
            onPress={() => void checkInvite()}
          />
        ) : null}
        <Field
          label={t('auth.password.label')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Pressable
          onPress={() => setAccepted((value) => !value)}
          style={styles.termsRow}>
          <Text style={styles.checkbox}>{accepted ? '☑' : '☐'}</Text>
          <Text style={styles.help}>{t('auth.terms.label')}</Text>
        </Pressable>
        <TextButton onPress={() => void Linking.openURL(`${webOrigin()}/privacy`)}>
          {t('landing.legal.privacy')}
        </TextButton>
        <TextButton onPress={() => void Linking.openURL(`${webOrigin()}/terms`)}>
          {t('landing.legal.terms')}
        </TextButton>
        {error ? <Message>{error}</Message> : null}
        {message ? <Message tone="success">{message}</Message> : null}
        <PrimaryButton
          label={t('auth.signup.submit')}
          loading={loading}
          disabled={gate?.gate === 'closed' || (!open && !inviteOk && gate?.gate === 'allowlist')}
          onPress={() => void submit()}
        />
        <Text style={styles.or}>{t('auth.or')}</Text>
        <SecondaryButton
          label={googleLoading ? t('auth.signup.submitting') : t('auth.google')}
          disabled={loading || googleLoading || gate?.gate === 'closed'}
          onPress={() => void google()}
        />
        <Text style={styles.help}>{t('auth.terms.google')}</Text>
      </Card>

      <SecondaryButton
        label={t('auth.signup.explore')}
        onPress={() => {
          enterDemo();
          router.replace('/(tabs)/home');
        }}
      />
      <TextButton onPress={() => router.back()}>
        {t('auth.signup.hasAccount')}
      </TextButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.muted, lineHeight: 22, flex: 1 },
  or: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkbox: { fontSize: 18, color: colors.ink, lineHeight: 22 },
});
