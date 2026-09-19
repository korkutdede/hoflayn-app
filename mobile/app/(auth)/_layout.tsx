import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  if (!loading && session) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
