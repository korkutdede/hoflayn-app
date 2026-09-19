import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function TabLayout() {
  const { session, me, isDemo, loading } = useAuth();
  if (loading) return null;
  if (!session && !isDemo) return <Redirect href="/" />;
  if (!isDemo && me?.needsOnboarding) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text>,
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: 'Stüdyo',
          tabBarIcon: ({ color }) => <Text style={{ color }}>✦</Text>,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Ürünler',
          tabBarIcon: ({ color }) => <Text style={{ color }}>▦</Text>,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Araçlar',
          tabBarIcon: ({ color }) => <Text style={{ color }}>◈</Text>,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Hesap',
          tabBarIcon: ({ color }) => <Text style={{ color }}>◎</Text>,
        }}
      />
    </Tabs>
  );
}
