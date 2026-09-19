import type { CatalogDto } from '@hoflayn/contracts';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  AppTitle,
  Card,
  Message,
  PrimaryButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function CatalogsScreen() {
  const { isDemo, session } = useAuth();
  const [rows, setRows] = useState<CatalogDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isDemo || !session) {
      setLoading(false);
      return;
    }
    try {
      setRows(await apiRequest<CatalogDto[]>('/api/v1/catalogs'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kataloglar alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [isDemo, session]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <Screen>
      <AppTitle eyebrow="Katalog">PDF kataloglar</AppTitle>
      <Text style={styles.help}>
        Seçtiğin ürünlerden paylaşılabilir PDF oluştur. Üretim arka planda
        çalışır · 1 kredi.
      </Text>
      <PrimaryButton
        label="Yeni katalog"
        onPress={() => router.push('/catalog-wizard')}
      />
      {error ? <Message>{error}</Message> : null}
      {loading ? <Text style={styles.help}>Yükleniyor…</Text> : null}
      {!loading && !rows.length ? (
        <Card>
          <Text style={styles.title}>Henüz katalog yok</Text>
          <Text style={styles.help}>
            En az bir ürün seçerek ilk kataloğunu oluştur.
          </Text>
        </Card>
      ) : null}
      {rows.map((row) => (
        <Pressable
          key={row.id}
          onPress={() =>
            router.push({
              pathname: '/catalog-wizard',
              params: { id: row.id },
            })
          }>
          <Card>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.help}>
              {row.itemCount} ürün · {row.templateId} · {row.theme}
            </Text>
            {row.latestExport ? (
              <Text style={styles.help}>
                Son export: {row.latestExport.status}
              </Text>
            ) : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  help: { color: colors.muted, lineHeight: 22 },
});
