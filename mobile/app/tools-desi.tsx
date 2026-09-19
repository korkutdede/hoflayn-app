import {
  CARRIER_PROFILES,
  calculateDesi,
  carrierLabelKey,
  formatCalcMessages,
  type CarrierProfileId,
  type DesiResult,
} from '@hoflayn/calc';
import type { ProductDto, ToolScenarioDto } from '@hoflayn/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { deviceTranslator } from '@/src/lib/i18n';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export default function ToolsDesiScreen() {
  const { isDemo } = useAuth();
  const t = useMemo(() => deviceTranslator(), []);
  const [lengthCm, setLengthCm] = useState('30');
  const [widthCm, setWidthCm] = useState('20');
  const [heightCm, setHeightCm] = useState('10');
  const [weightKg, setWeightKg] = useState('1.2');
  const [carrierId, setCarrierId] = useState<CarrierProfileId>('yurtici');
  const [divisor, setDivisor] = useState('3000');
  const [name, setName] = useState('Desi senaryosu');
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [productId, setProductId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ToolScenarioDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const result = useMemo((): DesiResult | null => {
    try {
      return calculateDesi({
        lengthCm: Number(lengthCm),
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        weightKg: weightKg.trim() ? Number(weightKg) : null,
        carrierId,
        divisor: carrierId === 'custom' ? Number(divisor) : null,
      });
    } catch {
      return null;
    }
  }, [carrierId, divisor, heightCm, lengthCm, weightKg, widthCm]);

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const [productRows, scenarioRows] = await Promise.all([
        apiRequest<ProductDto[]>('/api/v1/products'),
        apiRequest<ToolScenarioDto[]>('/api/v1/tools/scenarios?kind=desi'),
      ]);
      setProducts(productRows);
      setScenarios(scenarioRows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Veriler alınamadı.');
    }
  }, [isDemo]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function save() {
    if (!result) {
      setError('Ölçüleri kontrol et.');
      return;
    }
    if (isDemo) {
      setSuccess('Demo modunda kayıt yapılmaz; hesabınla kaydedebilirsin.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest('/api/v1/tools/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'desi',
          name,
          productId,
          inputs: {
            lengthCm: Number(lengthCm),
            widthCm: Number(widthCm),
            heightCm: Number(heightCm),
            weightKg: weightKg.trim() ? Number(weightKg) : null,
            carrierId,
            divisor: carrierId === 'custom' ? Number(divisor) : null,
          },
        }),
      });
      setSuccess('Desi senaryosu kaydedildi.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kayıt başarısız.');
    } finally {
      setBusy(false);
    }
  }

  async function apply(scenario: ToolScenarioDto) {
    if (!scenario.productId) {
      setError('Önce senaryoyu bir ürüne bağlayıp kaydet.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/v1/tools/scenarios/${scenario.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ applyDimensions: true }),
      });
      setSuccess('Ölçüler ürüne uygulandı.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Uygulanamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Kargo">Desi hesabı</AppTitle>
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Uzunluk (cm)" value={lengthCm} onChangeText={setLengthCm} keyboardType="decimal-pad" />
          </View>
          <View style={styles.flex}>
            <Field label="Genişlik (cm)" value={widthCm} onChangeText={setWidthCm} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Yükseklik (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
          </View>
          <View style={styles.flex}>
            <Field label="Ağırlık (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
          </View>
        </View>
        <Text style={styles.label}>Taşıyıcı profili</Text>
        <View style={styles.chips}>
          {CARRIER_PROFILES.map((profile) => (
            <Pressable
              key={profile.id}
              style={[styles.chip, carrierId === profile.id && styles.chipSelected]}
              onPress={() => {
                setCarrierId(profile.id);
                setDivisor(String(profile.divisor));
              }}>
              <Text
                style={[
                  styles.chipText,
                  carrierId === profile.id && styles.chipTextSelected,
                ]}>
                {t(carrierLabelKey(profile.id))}
              </Text>
            </Pressable>
          ))}
        </View>
        {carrierId === 'custom' ? (
          <Field label="Desi böleni" value={divisor} onChangeText={setDivisor} keyboardType="number-pad" />
        ) : null}
        <Field label="Senaryo adı" value={name} onChangeText={setName} />
        {!isDemo ? (
          <>
            <Text style={styles.label}>Ürüne bağla (isteğe bağlı)</Text>
            <View style={styles.chips}>
              <Pressable
                style={[styles.chip, !productId && styles.chipSelected]}
                onPress={() => setProductId(null)}>
                <Text style={[styles.chipText, !productId && styles.chipTextSelected]}>
                  Bağlama
                </Text>
              </Pressable>
              {products.map((product) => (
                <Pressable
                  key={product.id}
                  style={[
                    styles.chip,
                    productId === product.id && styles.chipSelected,
                  ]}
                  onPress={() => setProductId(product.id)}>
                  <Text
                    style={[
                      styles.chipText,
                      productId === product.id && styles.chipTextSelected,
                    ]}>
                    {product.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.title}>Sonuç</Text>
        {result ? (
          <>
            <Text style={styles.metric}>Desi: {result.desi}</Text>
            <Text style={styles.help}>
              Hacim {result.volumeCm3} cm³ · Bölen {result.divisor}
            </Text>
            <Text style={styles.metric}>
              Faturalanan ağırlık: {result.billableWeightKg} kg
            </Text>
            {formatCalcMessages(result.assumptions, t).map((item) => (
              <Text key={item} style={styles.assumption}>
                • {item}
              </Text>
            ))}
          </>
        ) : (
          <Message>Ölçüler pozitif sayı olmalı.</Message>
        )}
        {error ? <Message>{error}</Message> : null}
        {success ? <Message tone="success">{success}</Message> : null}
        <PrimaryButton label="Senaryoyu kaydet" loading={busy} onPress={() => void save()} />
      </Card>

      {!isDemo && scenarios.length ? (
        <Card>
          <Text style={styles.title}>Kayıtlı senaryolar</Text>
          {scenarios.map((scenario) => (
            <View key={scenario.id} style={styles.scenario}>
              <Text style={styles.scenarioName}>{scenario.name}</Text>
              <Text style={styles.help}>
                Desi {(scenario.results as { desi?: number }).desi ?? '—'}
              </Text>
              {scenario.productId ? (
                <SecondaryButton
                  label="Ölçüleri ürüne uygula"
                  disabled={busy}
                  onPress={() => void apply(scenario)}
                />
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  label: { color: colors.ink, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  chipText: { color: colors.ink },
  chipTextSelected: { color: colors.brand, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  metric: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  help: { color: colors.muted, lineHeight: 20 },
  assumption: { color: colors.muted, lineHeight: 20 },
  scenario: { gap: 8, paddingVertical: 8 },
  scenarioName: { color: colors.ink, fontWeight: '700' },
});
