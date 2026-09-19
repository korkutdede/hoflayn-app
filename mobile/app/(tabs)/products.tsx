import type { LowStockListDto, ProductDto } from '@hoflayn/contracts';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppTitle,
  Card,
  Message,
  PrimaryButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { DEMO_PRODUCTS } from '@/src/lib/demo';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function ProductsScreen() {
  const { isDemo, signOut } = useAuth();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [lowStock, setLowStock] = useState<LowStockListDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (isDemo) {
      setProducts(DEMO_PRODUCTS);
      setLowStock(null);
      setLoading(false);
      return;
    }
    try {
      const [list, alerts] = await Promise.all([
        apiRequest<ProductDto[]>('/api/v1/products'),
        apiRequest<LowStockListDto>('/api/v1/products/low-stock'),
      ]);
      setProducts(list);
      setLowStock(alerts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ürünler alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <AppTitle eyebrow="Katalog">Ürünler</AppTitle>
      {isDemo ? (
        <Card>
          <Text style={styles.demoTitle}>Örnek ürün kataloğu</Text>
          <Text style={styles.help}>
            Gerçek hesabında kendi ürünlerini, stoklarını ve stüdyo görsellerini
            burada yöneteceksin.
          </Text>
        </Card>
      ) : null}
      <PrimaryButton
        label={isDemo ? 'Kendi kataloğunu oluştur' : 'Yeni ürün'}
        onPress={() => {
          if (!isDemo) {
            router.push('/product-form');
            return;
          }
          void signOut().then(() => router.push('/(auth)/signup'));
        }}
      />
      {lowStock && lowStock.count > 0 ? (
        <Card>
          <Text style={styles.alertTitle}>
            Düşük stok · {lowStock.count} ürün
          </Text>
          <Text style={styles.help}>
            Stok adedi uyarı eşiğinin altında veya eşit (varsayılan{' '}
            {lowStock.defaultThreshold}).
          </Text>
          {lowStock.items.slice(0, 5).map((item) => (
            <Pressable
              key={item.productId}
              onPress={() =>
                router.push({
                  pathname: '/product-form',
                  params: { id: item.productId },
                })
              }>
              <Text style={styles.alertItem}>
                {item.name} · stokta {item.stockQuantity} · eşik{' '}
                {item.threshold}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
      {loading ? <ActivityIndicator color={colors.brand} /> : null}
      {error ? <Message>{error}</Message> : null}
      {!loading && !products.length ? (
        <Card>
          <Text style={styles.emptyTitle}>İlk ürününü oluştur</Text>
          <Text style={styles.help}>
            Ürün bilgilerini tek yerde sakla; hazırladığın stüdyo görsellerini
            kapak olarak kullan.
          </Text>
        </Card>
      ) : null}
      <View style={styles.grid}>
        {products.map((product) => (
          <Pressable
            key={product.id}
            style={styles.product}
            onPress={() => {
              if (!isDemo) {
                router.push({
                  pathname: '/product-form',
                  params: { id: product.id },
                });
              }
            }}>
            {product.coverUrl ? (
              <Image
                source={{ uri: product.coverUrl }}
                style={styles.cover}
                alt={`${product.name} kapak görseli`}
              />
            ) : (
              <View style={[styles.cover, styles.coverEmpty]}>
                <Text style={styles.coverEmptyText}>Görsel yok</Text>
              </View>
            )}
            <Text numberOfLines={1} style={styles.productName}>
              {product.name}
            </Text>
            <Text style={styles.help}>
              {product.price ? `${product.price} ₺` : 'Fiyat yok'} ·{' '}
              {product.stockQuantity} stok
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  product: {
    width: '48%',
    minWidth: 150,
    flexGrow: 1,
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: { width: '100%', height: 140, borderRadius: 11 },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  coverEmptyText: { color: colors.muted },
  productName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  demoTitle: { color: colors.brand, fontSize: 16, fontWeight: '800' },
  alertTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  alertItem: { color: colors.brand, lineHeight: 22, fontWeight: '600' },
  help: { color: colors.muted, lineHeight: 20 },
});
