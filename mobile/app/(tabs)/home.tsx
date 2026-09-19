import type { HomePulseDto, TenantUsageSummary } from '@hoflayn/contracts';
import { router, type Href, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import {
  AppTitle,
  Card,
  Message,
  PrimaryButton,
  SecondaryButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { DEMO_HOME_PULSE } from '@/src/lib/demo';
import { MARKETPLACE_ORIGIN } from '@/src/lib/marketplace';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

function formatTry(minor: number) {
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${minor < 0 ? '-' : ''}${whole},${fraction} ₺`;
}

export default function HomeScreen() {
  const { me, isDemo, refreshMe, signOut, session } = useAuth();
  const [pulse, setPulse] = useState<HomePulseDto | null>(null);
  const [usage, setUsage] = useState<TenantUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPulse = useCallback(async () => {
    setError(null);
    if (isDemo) {
      setPulse(DEMO_HOME_PULSE);
      setUsage({
        windowDays: 7,
        creditsUsed: 7,
        jobCount: 5,
        succeededJobs: 5,
        byOperation: [
          {
            operation: 'white_bg',
            label: 'Beyaz arka plan',
            creditsUsed: 3,
            jobCount: 3,
            unitCost: 1,
          },
        ],
      });
      setLoading(false);
      return;
    }
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      const [pulseRow, usageRow] = await Promise.all([
        apiRequest<HomePulseDto>('/api/v1/home/pulse'),
        apiRequest<TenantUsageSummary>('/api/v1/usage'),
      ]);
      setPulse(pulseRow);
      setUsage(usageRow);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nabız alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [isDemo, session]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadPulse();
      if (!isDemo) void refreshMe();
    }, [isDemo, loadPulse, refreshMe]),
  );

  return (
    <Screen>
      {isDemo ? (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerTitle}>Demo atölyesini geziyorsun</Text>
          <Text style={styles.help}>
            Nabız verileri örnektir; gerçek hesapta satış ve stok canlıdır.
          </Text>
        </View>
      ) : null}
      <AppTitle eyebrow="Atölye nabzı">
        {me?.workshop.name ?? 'Hoflayn'}
      </AppTitle>
      <Text style={styles.meta}>
        {me?.user.email}
        {me?.workshop.craftCategory ? ` · ${me.workshop.craftCategory}` : ''}
      </Text>

      {error ? <Message>{error}</Message> : null}
      {loading && !pulse ? (
        <Text style={styles.help}>Nabız yükleniyor…</Text>
      ) : null}

      <Card>
        <Text style={styles.cardLabel}>Kredi bakiyesi</Text>
        <Text style={styles.credit}>
          {pulse?.creditBalance ?? me?.workshop.creditBalance ?? '—'}
        </Text>
        <Text style={styles.help}>
          Fotoğraf düzenleme ve AI içerik işlemlerinde kullanılır.
        </Text>
        {usage ? (
          <Text style={styles.usageHint}>
            Son {usage.windowDays} gün: −{usage.creditsUsed} kredi
            {usage.byOperation[0]
              ? ` · en çok ${usage.byOperation[0].label}`
              : ''}
          </Text>
        ) : null}
        <SecondaryButton
          label="Harcama detayı"
          onPress={() => router.push('/(tabs)/account' as Href)}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Bugünkü satış</Text>
        {pulse?.empty.noSalesToday ? (
          <Text style={styles.help}>
            Bugün henüz tamamlanmış satış yok.
          </Text>
        ) : (
          <Text style={styles.metric}>
            {formatTry(pulse?.todaySales.revenueMinor ?? 0)} ·{' '}
            {pulse?.todaySales.saleCount ?? 0} satış ·{' '}
            {pulse?.todaySales.quantitySold ?? 0} adet
          </Text>
        )}
        <SecondaryButton
          label="Satışlara git"
          onPress={() => router.push('/sales' as Href)}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Düşük stok</Text>
        {pulse?.empty.noLowStock ? (
          <Text style={styles.help}>Eşik altında ürün yok.</Text>
        ) : (
          <Text style={styles.metric}>
            {pulse?.lowStockCount ?? 0} ürün eşik altında
          </Text>
        )}
        <SecondaryButton
          label="Ürünlere git"
          onPress={() => router.push('/(tabs)/products' as Href)}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>hoflayn.com pazaryeri</Text>
        <Text style={styles.help}>
          Vitrin, akademi ve alışveriş orada. Bu ekran atölye masandır. Satıcı
          hesabın varsa aynı e-postayı kullan.
        </Text>
        <SecondaryButton
          label="Pazaryerini aç"
          onPress={() => void Linking.openURL(MARKETPLACE_ORIGIN)}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Son satışlar</Text>
        {pulse?.empty.noRecentSales ? (
          <Text style={styles.help}>
            Henüz satış yok. Araçlar → Satışlar’dan ilk kaydı ekleyebilirsin.
          </Text>
        ) : (
          pulse?.recentSales.map((sale) => (
            <View key={sale.id} style={styles.job}>
              <Text style={styles.jobName}>{formatTry(sale.totalMinor)}</Text>
              <Text style={styles.jobStatus}>
                {sale.status} · {sale.lineCount} satır
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Son AI işlemleri</Text>
        {me?.recentJobs.length ? (
          me.recentJobs.map((job) => (
            <View key={job.id} style={styles.job}>
              <Text style={styles.jobName}>{job.operation}</Text>
              <Text style={styles.jobStatus}>
                {job.status}
                {job.creditsCharged ? ` · −${job.creditsCharged}` : ''}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.help}>
            Henüz işlem yok. Stüdyo’dan ilk fotoğrafını hazırlayabilirsin.
          </Text>
        )}
      </Card>

      {!isDemo ? (
        <PrimaryButton
          label="Nabzı yenile"
          onPress={() => {
            setLoading(true);
            void loadPulse();
            void refreshMe();
          }}
        />
      ) : null}
      <PrimaryButton
        label={isDemo ? 'Karşılamaya dön' : 'Çıkış yap'}
        onPress={() => {
          void signOut().then(() => router.replace('/'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { color: colors.muted, marginTop: -12 },
  demoBanner: {
    gap: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.softBrand,
  },
  demoBannerTitle: { color: colors.brand, fontWeight: '800' },
  cardLabel: { color: colors.muted, fontSize: 14 },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  credit: { color: colors.ink, fontSize: 44, fontWeight: '800' },
  metric: { color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 24 },
  usageHint: { color: colors.ink, fontWeight: '600', lineHeight: 22 },
  help: { color: colors.muted, lineHeight: 21 },
  job: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  jobName: { color: colors.ink, fontWeight: '600' },
  jobStatus: { color: colors.muted },
});
