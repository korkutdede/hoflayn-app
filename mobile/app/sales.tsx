import type {
  LowStockListDto,
  SaleDto,
  SaleSummaryDto,
  SaleVoidResult,
} from '@hoflayn/contracts';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppTitle,
  Card,
  Message,
  PrimaryButton,
  SecondaryButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

function formatTry(minor: number) {
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${minor < 0 ? '-' : ''}${whole},${fraction} ₺`;
}

function WindowRow({
  label,
  revenueMinor,
  quantitySold,
  saleCount,
}: {
  label: string;
  revenueMinor: number;
  quantitySold: number;
  saleCount: number;
}) {
  return (
    <View style={styles.windowRow}>
      <Text style={styles.windowLabel}>{label}</Text>
      <Text style={styles.windowValue}>
        {formatTry(revenueMinor)} · {saleCount} satış · {quantitySold} adet
      </Text>
    </View>
  );
}

export default function SalesScreen() {
  const { isDemo, session } = useAuth();
  const [rows, setRows] = useState<SaleDto[]>([]);
  const [summary, setSummary] = useState<SaleSummaryDto | null>(null);
  const [lowStock, setLowStock] = useState<LowStockListDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemo || !session) {
      setLoading(false);
      return;
    }
    try {
      const [list, stats, alerts] = await Promise.all([
        apiRequest<SaleDto[]>('/api/v1/sales'),
        apiRequest<SaleSummaryDto>('/api/v1/sales/summary?topN=5'),
        apiRequest<LowStockListDto>('/api/v1/products/low-stock'),
      ]);
      setRows(list);
      setSummary(stats);
      setLowStock(alerts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Satışlar alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [isDemo, session]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function confirmVoid(sale: SaleDto) {
    Alert.alert(
      'Satışı iptal et',
      `${formatTry(sale.totalMinor)} tutarındaki satış iptal edilecek ve stok iade edilecek. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          style: 'destructive',
          onPress: () => void onVoid(sale.id),
        },
      ],
    );
  }

  async function onVoid(saleId: string) {
    setVoidingId(saleId);
    setError(null);
    try {
      await apiRequest<SaleVoidResult>(`/api/v1/sales/${saleId}/void`, {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: `mobile-void:${saleId}`,
        }),
      });
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Satış iptal edilemedi.',
      );
    } finally {
      setVoidingId(null);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Satış">Satış kayıtları</AppTitle>
      <Text style={styles.help}>
        Özet yalnızca tamamlanan satışları sayar. İptal stoku geri yükler.
      </Text>
      <PrimaryButton
        label="Yeni satış"
        onPress={() => router.push('/sale-form')}
      />
      {error ? <Message>{error}</Message> : null}
      {loading ? <Text style={styles.help}>Yükleniyor…</Text> : null}

      {lowStock && lowStock.count > 0 ? (
        <Card>
          <Text style={styles.title}>
            Düşük stok · {lowStock.count} ürün
          </Text>
          <Text style={styles.help}>
            Stok adedi, uyarı eşiğinin altında veya eşit. Örnek: stokta 3, eşik
            5 → kalan azaldı.
          </Text>
          {lowStock.items.slice(0, 3).map((item) => (
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

      {summary ? (
        <Card>
          <Text style={styles.title}>Özet</Text>
          <WindowRow
            label="Bugün"
            {...summary.windows.today}
          />
          <WindowRow
            label="7 gün"
            {...summary.windows.last7Days}
          />
          <WindowRow
            label="30 gün"
            {...summary.windows.last30Days}
          />
          {summary.topProducts.length ? (
            <>
              <Text style={styles.subTitle}>Çok satanlar (30 gün)</Text>
              {summary.topProducts.map((p) => (
                <Text key={p.productId} style={styles.help}>
                  {p.productName} · {p.quantitySold} adet ·{' '}
                  {formatTry(p.revenueMinor)}
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.help}>Son 30 günde ürün satışı yok.</Text>
          )}
        </Card>
      ) : null}

      {!loading && !rows.length ? (
        <Card>
          <Text style={styles.title}>Henüz satış yok</Text>
          <Text style={styles.help}>
            İlk satışını ürün, adet ve satış fiyatı ile ekle.
          </Text>
        </Card>
      ) : null}
      {rows.map((row) => (
        <Card key={row.id}>
          <Text style={styles.title}>{formatTry(row.totalMinor)}</Text>
          <Text style={styles.help}>
            {row.lines.length} satır · {row.source} · {row.status} ·{' '}
            {new Date(row.soldAt).toLocaleString('tr-TR')}
          </Text>
          {row.lines.slice(0, 2).map((line) => (
            <Text key={line.id} style={styles.help}>
              {line.productNameSnapshot} × {line.quantity}
            </Text>
          ))}
          {row.status === 'completed' ? (
            <SecondaryButton
              label={
                voidingId === row.id ? 'İptal ediliyor…' : 'Satışı iptal et'
              }
              disabled={voidingId !== null}
              onPress={() => confirmVoid(row)}
            />
          ) : (
            <Text style={styles.help}>İptal edildi — stok iade edildi.</Text>
          )}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  subTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  help: { color: colors.muted, lineHeight: 22 },
  windowRow: { marginTop: 8, gap: 2 },
  windowLabel: { color: colors.ink, fontWeight: '700' },
  windowValue: { color: colors.muted, lineHeight: 20 },
  alertItem: { color: colors.brand, fontWeight: '600', lineHeight: 22 },
});
