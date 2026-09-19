import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/src/components/ui';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function IndexScreen() {
  const {
    session,
    me,
    isDemo,
    loading,
    error,
    enterDemo,
    refreshMe,
    signOut,
  } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.text}>Çalışma masan hazırlanıyor…</Text>
      </View>
    );
  }
  if (isDemo) return <Redirect href="/(tabs)/home" />;
  if (me?.needsOnboarding) return <Redirect href="/onboarding" />;
  if (me) return <Redirect href="/(tabs)/home" />;

  if (!session) {
    return (
      <Screen>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>H</Text>
          </View>
          <Text style={styles.brand}>HOFLAYN</Text>
          <View style={styles.betaPill}>
            <Text style={styles.betaText}>BETA</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>ATÖLYE ÇALIŞMA MASASI</Text>
          <Text style={styles.heroTitle}>Üretirken{'\n'}yalnız değilsin.</Text>
          <Text style={styles.heroBody}>
            Bu uygulama hoflayn.com vitrini değil. Fotoğraf, açıklama, stok ve
            katalog işlerini burada yaparsın; pazaryerinde satmak için aynı
            e-posta ile satıcı olursun.
          </Text>
        </View>

        <View style={styles.featureGrid}>
          <View style={[styles.feature, styles.featureWarm]}>
            <Text style={styles.featureIcon}>✦</Text>
            <Text style={styles.featureTitle}>Fotoğraf Stüdyosu</Text>
            <Text style={styles.featureBody}>
              Ürününü saniyeler içinde satışa hazırla.
            </Text>
          </View>
          <View style={[styles.feature, styles.featureGreen]}>
            <Text style={styles.featureIcon}>✎</Text>
            <Text style={styles.featureTitle}>İçerik Yardımcısı</Text>
            <Text style={styles.featureBody}>
              Açıklama ve sosyal medya metni üret.
            </Text>
          </View>
          <View style={[styles.feature, styles.featureCream]}>
            <Text style={styles.featureIcon}>▦</Text>
            <Text style={styles.featureTitle}>Ürün Masası</Text>
            <Text style={styles.featureBody}>
              Ürünlerini ve stoklarını düzenli tut.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Uygulamayı keşfet"
            onPress={() => enterDemo()}
          />
          <SecondaryButton
            label="Hesap oluştur"
            onPress={() => router.push('/(auth)/signup')}
          />
          <Text style={styles.loginText} onPress={() => router.push('/(auth)/login')}>
            Zaten hesabın var mı? <Text style={styles.loginStrong}>Giriş yap</Text>
          </Text>
        </View>

        <Text style={styles.demoNote}>
          “Uygulamayı keşfet” demoya girer; kart veya davetiye gerekmez.
          Pazaryeri alışverişi hoflayn.com’dadır.
        </Text>
      </Screen>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.error}>{error ?? 'Hesap bilgileri alınamadı.'}</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Tekrar dene" onPress={() => void refreshMe()} />
        <PrimaryButton label="Çıkış yap" onPress={() => void signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
    backgroundColor: colors.background,
  },
  text: { color: colors.muted },
  error: { color: colors.danger, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 360, gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  brandMarkText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  brand: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  betaPill: {
    borderRadius: 999,
    backgroundColor: colors.softBrand,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  betaText: { color: colors.brand, fontSize: 10, fontWeight: '800' },
  hero: { gap: 12, paddingTop: 18 },
  heroEyebrow: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  heroBody: {
    maxWidth: 540,
    color: colors.muted,
    fontSize: 18,
    lineHeight: 27,
  },
  featureGrid: { gap: 10 },
  feature: {
    minHeight: 116,
    borderRadius: 20,
    padding: 17,
    gap: 5,
  },
  featureWarm: { backgroundColor: '#F2DCD0' },
  featureGreen: { backgroundColor: '#DCE9E1' },
  featureCream: { backgroundColor: '#EEE8D9' },
  featureIcon: { color: colors.brand, fontSize: 23, fontWeight: '800' },
  featureTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  featureBody: { color: colors.muted, lineHeight: 20 },
  loginText: {
    color: colors.muted,
    textAlign: 'center',
    padding: 8,
    fontSize: 15,
  },
  loginStrong: { color: colors.brand, fontWeight: '800' },
  demoNote: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 8,
  },
});
