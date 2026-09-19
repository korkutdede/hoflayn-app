import type { ProductDto, SaleCreateResult } from '@hoflayn/contracts';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const VISIBLE_WITHOUT_SEARCH = 12;

export default function SaleFormScreen() {
  const { isDemo, session } = useAuth();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [productId, setProductId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isDemo || !session) {
      setLoading(false);
      return;
    }
    try {
      const rows = await apiRequest<ProductDto[]>('/api/v1/products');
      setProducts(rows);
      if (rows[0]) {
        setProductId(rows[0].id);
        setUnitPrice(rows[0].price || '');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ürünler alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [isDemo, session]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [productId, products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return products;
    return products.filter((p) => {
      const name = p.name.toLocaleLowerCase('tr-TR');
      const sku = (p.sku ?? '').toLocaleLowerCase('tr-TR');
      return name.includes(q) || sku.includes(q);
    });
  }, [products, query]);

  const visible = useMemo(() => {
    if (query.trim()) return filtered;
    return filtered.slice(0, VISIBLE_WITHOUT_SEARCH);
  }, [filtered, query]);

  const hiddenCount =
    !query.trim() && products.length > VISIBLE_WITHOUT_SEARCH
      ? products.length - VISIBLE_WITHOUT_SEARCH
      : 0;

  function pickProduct(p: ProductDto) {
    setProductId(p.id);
    if (p.price) setUnitPrice(p.price);
  }

  async function onSave() {
    if (!productId) {
      setError('Ürün seç.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const qty = Number(quantity);
      const result = await apiRequest<SaleCreateResult>('/api/v1/sales', {
        method: 'POST',
        body: JSON.stringify({
          source: 'manual',
          note,
          lines: [
            {
              productId,
              quantity: qty,
              unitPrice,
            },
          ],
          idempotencyKey: `mobile-sale:${productId}:${qty}:${unitPrice}:${Date.now()}`,
        }),
      });
      if (result.sale) {
        router.replace('/sales');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Satış kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Satış">Manuel satış</AppTitle>
      <Text style={styles.help}>
        Kayıt atomik: satır + stok çıkışı aynı transaction’da yazılır.
      </Text>
      {loading ? <Text style={styles.help}>Yükleniyor…</Text> : null}
      {error ? <Message>{error}</Message> : null}

      <Card>
        <Text style={styles.label}>Ürün</Text>
        {selected ? (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedName}>{selected.name}</Text>
            <Text style={styles.help}>
              Stok {selected.stockQuantity ?? 0}
              {selected.sku ? ` · ${selected.sku}` : ''}
            </Text>
          </View>
        ) : null}

        {products.length > 6 ? (
          <Field
            label="Ürün ara"
            value={query}
            onChangeText={setQuery}
            placeholder="Ad veya SKU"
            autoCorrect={false}
          />
        ) : null}

        <View style={styles.list}>
          {visible.map((p) => {
            const isOn = p.id === productId;
            return (
              <Pressable
                key={p.id}
                onPress={() => pickProduct(p)}
                style={[styles.chip, isOn && styles.chipOn]}>
                <Text style={[styles.chipText, isOn && styles.chipTextOn]}>
                  {p.name}
                  {typeof p.stockQuantity === 'number'
                    ? ` · Stok ${p.stockQuantity}`
                    : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!filtered.length ? (
          <Text style={styles.help}>Aramaya uyan ürün yok.</Text>
        ) : null}
        {hiddenCount > 0 ? (
          <Text style={styles.help}>
            +{hiddenCount} ürün daha — bulmak için yukarıdan ara.
          </Text>
        ) : null}
        {query.trim() && filtered.length ? (
          <Text style={styles.help}>{filtered.length} sonuç</Text>
        ) : null}

        <Field
          label="Adet"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
        <Field
          label="Satış fiyatı"
          suffix="TL"
          value={unitPrice}
          onChangeText={setUnitPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Field
          label="Not"
          value={note}
          onChangeText={setNote}
          placeholder="İsteğe bağlı"
        />
        <PrimaryButton
          label={saving ? 'Kaydediliyor…' : 'Satışı kaydet'}
          onPress={() => void onSave()}
          disabled={saving || loading}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.muted, lineHeight: 22 },
  label: { color: colors.ink, fontWeight: '700', marginBottom: 8 },
  selectedBox: {
    gap: 2,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.softBrand,
  },
  selectedName: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  list: { gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.brand,
    backgroundColor: colors.softBrand,
  },
  chipText: { color: colors.ink },
  chipTextOn: { color: colors.brand, fontWeight: '700' },
});
