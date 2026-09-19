import { CRAFT_CATEGORIES, type CraftCategoryId } from '@hoflayn/contracts';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppTitle,
  Card,
  Field,
  Message,
  PrimaryButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function OnboardingScreen() {
  const { session, me, loading: authLoading, refreshMe } = useAuth();
  const [name, setName] = useState(me?.workshop.name ?? '');
  const [categories, setCategories] = useState<CraftCategoryId[]>(['ceramics']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && !session) return <Redirect href="/(auth)/login" />;
  if (!authLoading && me && !me.needsOnboarding) {
    return <Redirect href="/(tabs)/home" />;
  }

  function toggleCategory(id: CraftCategoryId) {
    setCategories((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== id);
      }
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/api/v1/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ name, craftCategories: categories }),
      });
      await refreshMe();
      router.replace('/(tabs)/home');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Tek adım kaldı">Atölyeni tanıyalım</AppTitle>
      <Text style={styles.subtitle}>
        Üretim alanlarını seç; Hoflayn önerilerini buna göre uyarlasın. En fazla
        üç alan seçebilirsin.
      </Text>
      <Card>
        <Field label="Atölye adı" value={name} onChangeText={setName} />
        <View style={styles.categories}>
          {CRAFT_CATEGORIES.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => toggleCategory(item.id)}
              style={[
                styles.category,
                categories.includes(item.id) && styles.categorySelected,
              ]}>
              <Text
                style={[
                  styles.categoryText,
                  categories.includes(item.id) && styles.categoryTextSelected,
                ]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? <Message>{error}</Message> : null}
        <PrimaryButton
          label="Çalışma masamı aç"
          loading={loading}
          onPress={() => void submit()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  category: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categorySelected: {
    borderColor: colors.brand,
    backgroundColor: colors.softBrand,
  },
  categoryText: { color: colors.ink, fontWeight: '600' },
  categoryTextSelected: { color: colors.brand },
});
