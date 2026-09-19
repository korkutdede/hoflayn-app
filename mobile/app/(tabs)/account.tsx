import {
  CRAFT_CATEGORIES,
  type BillingStatus,
  type TenantUsageSummary,
} from '@hoflayn/contracts';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppTitle,
  Card,
  Field,
  Message,
  PrimaryButton,
  SecondaryButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { webOrigin } from '@/src/lib/i18n';
import {
  MARKETPLACE_ORIGIN,
  MARKETPLACE_SELLER_REGISTER,
} from '@/src/lib/marketplace';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

type CheckoutResult = { url: string; provider: string };

const DEMO_BILLING: BillingStatus = {
  configured: true,
  mode: 'test',
  plan: 'free',
  isPro: false,
  creditBalance: 24,
  pro: {
    name: 'Profesyonel',
    priceCents: 2499,
    currency: 'USD',
    monthlyCredits: 900,
  },
  creditPacks: [
    {
      id: 'credits_50',
      credits: 50,
      label: '50 kredi',
      priceCents: 499,
    },
    {
      id: 'credits_200',
      credits: 200,
      label: '200 kredi',
      priceCents: 1499,
    },
  ],
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatPeriodEnd(iso: string | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Free plan: no auto-renew. Pro: Stripe period end when known. */
function creditRenewalCopy(opts: {
  isPro: boolean;
  balance: number | null;
  currentPeriodEnd?: string;
  monthlyCredits?: number;
  stripeConfigured: boolean;
}) {
  const empty = opts.balance != null && opts.balance <= 0;
  if (opts.isPro) {
    const when = formatPeriodEnd(opts.currentPeriodEnd);
    const amount = opts.monthlyCredits ?? 900;
    if (when) {
      return empty
        ? `Kredin bitti. Profesyonel planında sonraki aylık ${amount} kredi ${when} civarında yenilenir (Stripe fatura dönemi).`
        : `Profesyonel: aylık ${amount} kredi. Sonraki yenileme: ${when}.`;
    }
    return empty
      ? 'Kredin bitti. Profesyonel planında kredi aylık fatura ile yenilenir.'
      : 'Profesyonel: kredi aylık fatura döneminde yenilenir.';
  }
  if (empty) {
    return opts.stripeConfigured
      ? 'Ücretsiz planda kredi otomatik yenilenmez. Bittiğinde AI işlemleri durur; paket veya Pro ile devam edebilirsin.'
      : 'Ücretsiz planda kredi otomatik yenilenmez. Bittiğinde AI işlemleri durur (ödeme şu an kapalı olabilir).';
  }
  return 'Ücretsiz planda kredi otomatik yenilenmez — kayıt sırasında verilen başlangıç hakkı. Bitince AI durur.';
}

export default function AccountScreen() {
  const { billing: billingResult } = useLocalSearchParams<{
    billing?: string;
  }>();
  const { me, isDemo, refreshMe, signOut } = useAuth();
  const [usage, setUsage] = useState<TenantUsageSummary | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [name, setName] = useState(me?.workshop.name ?? '');
  const [craftCategories, setCraftCategories] = useState<string[]>(
    me?.workshop.craftCategories?.length
      ? me.workshop.craftCategories
      : me?.workshop.craftCategory
        ? [me.workshop.craftCategory]
        : ['other'],
  );
  const [loading, setLoading] = useState(!isDemo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canManage = me?.workshop.role !== 'member';
  const canUseSubscriptionCheckout =
    Platform.OS === 'web' ||
    process.env.EXPO_PUBLIC_ENABLE_EXTERNAL_BILLING === 'true';

  const load = useCallback(async () => {
    if (isDemo) {
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
          {
            operation: 'generate_caption',
            label: 'Sosyal medya metni',
            creditsUsed: 4,
            jobCount: 2,
            unitCost: 2,
          },
        ],
      });
      setBilling(DEMO_BILLING);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [usageResult, billingStatus] = await Promise.all([
        apiRequest<TenantUsageSummary>('/api/v1/usage'),
        apiRequest<BillingStatus>('/api/v1/billing'),
      ]);
      setUsage(usageResult);
      setBilling(billingStatus);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Hesap alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshAfterReturn = useCallback(async () => {
    await Promise.all([refreshMe(), load()]);
    let ticks = 0;
    stopPolling();
    pollRef.current = setInterval(() => {
      ticks += 1;
      void refreshMe();
      void load();
      if (ticks >= 4) stopPolling();
    }, 2500);
  }, [load, refreshMe, stopPolling]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(timer);
      stopPolling();
    };
  }, [load, stopPolling]);

  useFocusEffect(
    useCallback(() => {
      if (!billingResult) return;
      if (billingResult === 'success') {
        setReturnNote(
          'Ödeme tamamlandı. Bakiye webhook sonrası yenilenir; şimdi kontrol ediliyor…',
        );
        void refreshAfterReturn();
      } else if (billingResult === 'canceled') {
        setReturnNote(
          'Ödeme iptal edildi. İstediğin zaman yeniden deneyebilirsin.',
        );
      }
    }, [billingResult, refreshAfterReturn]),
  );

  async function checkout(body: Record<string, string>) {
    if (!canManage) {
      setError('Ödeme işlemleri için yönetici yetkisi gerekli.');
      return;
    }
    if (isDemo) {
      setError('Demo modunda ödeme açılamaz. Gerçek hesapla dene.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<CheckoutResult>('/api/v1/billing', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await Linking.openURL(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ödeme açılamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function buyCreditPack(packId: string) {
    await checkout({ kind: 'credit_pack', packId });
  }

  async function saveWorkshop() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name, craftCategories }),
      });
      await refreshMe();
      setSuccess('Atölye ayarları kaydedildi.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ayar kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  function toggleCategory(id: string) {
    setCraftCategories((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== id);
      }
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  const balance =
    billing?.creditBalance ?? me?.workshop.creditBalance ?? (isDemo ? 24 : '—');
  const numericBalance =
    typeof balance === 'number'
      ? balance
      : (billing?.creditBalance ?? null);

  return (
    <Screen>
      <AppTitle eyebrow="Hesap ve operasyon">Atölyen</AppTitle>
      {returnNote ? (
        <Message tone={billingResult === 'canceled' ? 'error' : 'success'}>
          {returnNote}
        </Message>
      ) : null}
      {error ? <Message>{error}</Message> : null}

      <Card>
        <Text style={styles.cardLabel}>Kredi bakiyesi</Text>
        <Text style={styles.balance}>{balance}</Text>
        <Text style={styles.help}>
          AI stüdyo, yazım, katalog ve etiket işlerinde kullanılır.
        </Text>
        <Text style={styles.renewal}>
          {creditRenewalCopy({
            isPro: Boolean(billing?.isPro),
            balance: numericBalance,
            currentPeriodEnd: billing?.currentPeriodEnd,
            monthlyCredits: billing?.pro.monthlyCredits,
            stripeConfigured: Boolean(billing?.configured),
          })}
        </Text>
      </Card>

      <Card>
        <Text style={styles.title}>Kredi paketleri</Text>
        <Text style={styles.help}>
          Stripe Checkout tarayıcıda açılır. Ödeme sonrası uygulamaya dönünce
          bakiye yenilenir.
        </Text>
        {billing && !billing.configured ? (
          <Message>Stripe henüz yapılandırılmamış.</Message>
        ) : null}
        {!canManage ? (
          <Message>
            Kredi paketi satın almak için owner veya admin yetkisi gerekli.
          </Message>
        ) : null}
        {(billing?.creditPacks ?? DEMO_BILLING.creditPacks).map((pack) => (
          <View key={pack.id} style={styles.packRow}>
            <View style={styles.packCopy}>
              <Text style={styles.packTitle}>{pack.label}</Text>
              <Text style={styles.help}>
                {pack.credits} kredi · {formatUsd(pack.priceCents)}
              </Text>
            </View>
            <PrimaryButton
              label={busy ? '…' : 'Satın al'}
              loading={busy}
              disabled={busy || !billing?.configured || isDemo}
              onPress={() => {
                if (!canManage) {
                  setError('Ödeme işlemleri için yönetici yetkisi gerekli.');
                  return;
                }
                void buyCreditPack(pack.id);
              }}
            />
          </View>
        ))}
        {isDemo ? (
          <Text style={styles.help}>
            Demo: paketler görünür; gerçek checkout kapalıdır.
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.title}>Son 7 gün</Text>
        <View style={styles.metrics}>
          <Metric
            label="Kredi"
            value={usage ? String(usage.creditsUsed) : '—'}
          />
          <Metric label="AI işi" value={usage ? String(usage.jobCount) : '—'} />
          <Metric
            label="Başarılı"
            value={usage ? String(usage.succeededJobs) : '—'}
          />
        </View>
        <Text style={styles.subTitle}>Nereye harcandı?</Text>
        {!usage?.byOperation?.length ? (
          <Text style={styles.help}>
            Bu pencerede kredi harcayan AI işlemi yok.
          </Text>
        ) : (
          usage.byOperation.map((row) => (
            <View key={row.operation} style={styles.usageRow}>
              <View style={styles.packCopy}>
                <Text style={styles.packTitle}>{row.label}</Text>
                <Text style={styles.help}>
                  {row.jobCount} iş
                  {row.unitCost != null ? ` · birim ${row.unitCost}` : ''}
                </Text>
              </View>
              <Text style={styles.usageCredits}>−{row.creditsUsed}</Text>
            </View>
          ))
        )}
      </Card>

      {canUseSubscriptionCheckout ? (
        <Card>
          <Text style={styles.title}>Profesyonel plan</Text>
          <Text style={styles.help}>
            Aylık{' '}
            {billing?.pro.monthlyCredits ?? DEMO_BILLING.pro.monthlyCredits}{' '}
            kredi ·{' '}
            {formatUsd(
              billing?.pro.priceCents ?? DEMO_BILLING.pro.priceCents,
            )}
          </Text>
          <PrimaryButton
            label={busy ? '…' : 'Pro’ya geç'}
            loading={busy}
            disabled={busy || !billing?.configured || isDemo || !canManage}
            onPress={() => void checkout({ kind: 'subscription' })}
          />
          {billing?.isPro ? (
            <SecondaryButton
              label="Stripe müşteri portalı"
              disabled={busy || !billing.configured}
              onPress={() => void checkout({ kind: 'portal' })}
            />
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text style={styles.title}>Profesyonel plan</Text>
          <Text style={styles.help}>
            Abonelik mağaza politikası nedeniyle native’de kapalı. Kredi
            paketleri tarayıcı checkout ile alınabilir.
          </Text>
        </Card>
      )}

      <Card>
        <Text style={styles.title}>Atölye</Text>
        <Field label="Atölye adı" value={name} onChangeText={setName} />
        <Text style={styles.help}>Üretim alanları (en fazla 3)</Text>
        <View style={styles.chips}>
          {CRAFT_CATEGORIES.map((cat) => {
            const on = craftCategories.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggleCategory(cat.id)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {success ? <Message tone="success">{success}</Message> : null}
        <PrimaryButton
          label={busy ? 'Kaydediliyor…' : 'Kaydet'}
          loading={busy}
          disabled={busy || isDemo}
          onPress={() => void saveWorkshop()}
        />
      </Card>

      <SecondaryButton
        label={loading ? 'Yükleniyor…' : 'Hesabı yenile'}
        disabled={loading}
        onPress={() => void load()}
      />
      {!isDemo ? (
        <SecondaryButton label="Çıkış yap" onPress={() => void signOut()} />
      ) : null}
      <SecondaryButton
        label="hoflayn.com pazaryeri"
        onPress={() => void Linking.openURL(MARKETPLACE_ORIGIN)}
      />
      <SecondaryButton
        label="Aynı e-posta ile satıcı ol"
        onPress={() => void Linking.openURL(MARKETPLACE_SELLER_REGISTER)}
      />
      <SecondaryButton
        label="Gizlilik politikası"
        onPress={() => void Linking.openURL(`${webOrigin()}/privacy`)}
      />
      <SecondaryButton
        label="Kullanım şartları"
        onPress={() => void Linking.openURL(`${webOrigin()}/terms`)}
      />
      <SecondaryButton
        label="Hesabı sil"
        onPress={() => void Linking.openURL(`${webOrigin()}/account-delete`)}
      />
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  balance: { color: colors.ink, fontSize: 44, fontWeight: '800' },
  renewal: {
    color: colors.ink,
    lineHeight: 22,
    marginTop: 8,
    fontWeight: '600',
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  subTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  help: { color: colors.muted, lineHeight: 22 },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  packCopy: { flex: 1, gap: 2 },
  packTitle: { color: colors.ink, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, gap: 2 },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  metricLabel: { color: colors.muted, fontSize: 12 },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  usageCredits: { color: colors.brand, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  chipText: { color: colors.ink },
  chipTextOn: { color: colors.brand, fontWeight: '700' },
});
