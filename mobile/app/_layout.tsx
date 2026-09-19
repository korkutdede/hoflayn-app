import { Stack } from 'expo-router';
import { AuthProvider } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product-form" options={{ title: 'Ürün' }} />
        <Stack.Screen name="tools-desi" options={{ title: 'Desi hesabı' }} />
        <Stack.Screen
          name="tools-profit"
          options={{ title: 'Gider defteri' }}
        />
        <Stack.Screen
          name="tools-pricing"
          options={{ title: 'Fiyat belirle' }}
        />
        <Stack.Screen name="catalogs" options={{ title: 'Kataloglar' }} />
        <Stack.Screen
          name="catalog-wizard"
          options={{ title: 'Katalog sihirbazı' }}
        />
        <Stack.Screen
          name="labels-wizard"
          options={{ title: 'Etiket sihirbazı' }}
        />
        <Stack.Screen name="sales" options={{ title: 'Satışlar' }} />
        <Stack.Screen name="sale-form" options={{ title: 'Yeni satış' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
