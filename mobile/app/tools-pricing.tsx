import {
  calculateProfit,
  expenseMetaFromProfitInputs,
  type ProfitResult,
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
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

type NameMode = 'custom' | 'product';

function isPricingScenario(row: ToolScenarioDto) {
  return expenseMetaFromProfitInputs(row.inputs) == null;
}

function Connector() {
  return (
    <View style={styles.connector} accessibilityElementsHidden>
      <View style={styles.connectorLine} />
      <View style={styles.connectorNode} />
      <View style={styles.connectorLine} />
    </View>
  );
}

export default function ToolsPricingScreen() {
  const { isDemo } = useAuth();
  const [materials, setMaterials] = useState('100');
  const [labor, setLabor] = useState('50');
  const [packaging, setPackaging] = useState('10');
  const [commissionPercent, setCommissionPercent] = useState('7.5');
  const [shipping, setShipping] = useState('');
  const [other, setOther] = useState('');
  const [yieldQty, setYieldQty] = useState('1');
  const [targetMargin, setTargetMargin] = useState('30');
  const [nameMode, setNameMode] = useState<NameMode>('custom');
  const [name, setName] = useState('');
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [productId, setProductId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ToolScenarioDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const result = useMemo((): ProfitResult | null => {
    try {
      return calculateProfit({
        components: {
          materials,
          labor,
          packaging,
          shipping,
          other,
        },
        sellPrice: null,
        targetMarginPercent: targetMargin.trim()
          ? Number(targetMargin)
          : null,
        quantity: yieldQty.trim() ? Number(yieldQty) : null,
        commissionPercent: commissionPercent.trim()
          ? Number(commissionPercent)
          : null,
      });
    } catch {
      return null;
    }
  }, [
    commissionPercent,
    labor,
    materials,
    other,
    packaging,
    shipping,
    targetMargin,
    yieldQty,
  ]);

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const [productRows, scenarioRows] = await Promise.all([
        apiRequest<ProductDto[]>('/api/v1/products'),
        apiRequest<ToolScenarioDto[]>('/api/v1/tools/scenarios?kind=profit'),
      ]);
      setProducts(productRows);
      setScenarios(scenarioRows.filter(isPricingScenario));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Veriler alınamadı.');
    }
  }, [isDemo]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function selectProduct(product: ProductDto) {
    setProductId(product.id);
    setName(product.name);
    if (product.costPrice) setMaterials(product.costPrice);
  }

  function switchNameMode(mode: NameMode) {
    setNameMode(mode);
    if (mode === 'custom') {
      setProductId(null);
    }
  }

  async function save() {
    if (!result?.targetPrice) {
      setError('Önce maliyet ve hedef marjı tamamla.');
      return;
    }
    const scenarioName = name.trim();
    if (scenarioName.length < 2) {
      setError('Ürün adı en az 2 karakter olmalı.');
      return;
    }
    if (isDemo) {
      setSuccess('Demo’da kayıt tutulmaz; hesabınla kaydedebilirsin.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest('/api/v1/tools/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'profit',
          name: scenarioName,
          productId: nameMode === 'product' ? productId : null,
          inputs: {
            components: {
              materials,
              labor,
              packaging,
              shipping,
              other,
            },
            sellPrice: result.targetPrice,
            targetMarginPercent: targetMargin.trim()
              ? Number(targetMargin)
              : null,
            quantity: yieldQty.trim() ? Number(yieldQty) : null,
            commissionPercent: commissionPercent.trim()
              ? Number(commissionPercent)
              : null,
          },
        }),
      });
      setSuccess('Fiyat senaryosu kaydedildi.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kayıt başarısız.');
    } finally {
      setBusy(false);
    }
  }

  async function apply(scenario: ToolScenarioDto) {
    if (!scenario.productId) {
      setError('Bu senaryo bir ürüne bağlı değil.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/v1/tools/scenarios/${scenario.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          applyCostPrice: true,
          applySellPrice: true,
        }),
      });
      setSuccess('Maliyet ve fiyat ürüne uygulandı.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Uygulanamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Fiyat">Fiyat belirle</AppTitle>
      <Text style={styles.intro}>
        Üretim maliyetini gir, ürün başına giderleri ekle; hedef marj satış
        fiyatını bulsun.
      </Text>

      <View style={styles.stack}>
        <Card>
          <Text style={styles.sectionTitle}>Maliyet</Text>
          <Field
            label="Malzeme"
            suffix="TL"
            value={materials}
            onChangeText={setMaterials}
            keyboardType="decimal-pad"
          />
          <Field
            label="İşçilik"
            suffix="TL"
            value={labor}
            onChangeText={setLabor}
            keyboardType="decimal-pad"
          />
          <Field
            label="Ambalaj"
            suffix="TL"
            value={packaging}
            onChangeText={setPackaging}
            keyboardType="decimal-pad"
          />
          <Field
            label="Bu maliyetlerle kaç ürün çıkar?"
            value={yieldQty}
            onChangeText={setYieldQty}
            keyboardType="number-pad"
            placeholder="1"
          />
          <Text style={styles.hint}>
            Malzeme, işçilik ve ambalaj giderleri bu adede bölünür. Alttaki
            kalemler ürün başınadır.
          </Text>
          <Field
            label="Komisyon"
            suffix="%"
            value={commissionPercent}
            onChangeText={setCommissionPercent}
            keyboardType="decimal-pad"
          />
          <Field
            label="Kargo"
            suffix="TL"
            value={shipping}
            onChangeText={setShipping}
            keyboardType="decimal-pad"
          />
          <Field
            label="Diğer"
            suffix="TL"
            value={other}
            onChangeText={setOther}
            keyboardType="decimal-pad"
          />
          {result ? (
            <View style={styles.unitCostBanner}>
              <Text style={styles.unitCostLabel}>Birim maliyet</Text>
              <Text style={styles.unitCostValue}>{result.unitCost} TL</Text>
              {result.quantity > 1 ? (
                <Text style={styles.hint}>
                  Üretim {result.batchCost} TL / {result.quantity} ürün (+ ürün
                  başı kalemler)
                </Text>
              ) : null}
            </View>
          ) : (
            <Message>Tutarları veya adedi kontrol et.</Message>
          )}
        </Card>

        <Connector />

        <Card>
          <Text style={styles.sectionTitle}>Fiyat</Text>
          <Field
            label="Hedef marj"
            suffix="%"
            value={targetMargin}
            onChangeText={setTargetMargin}
            keyboardType="decimal-pad"
            placeholder="örn. 30"
          />
          <View style={styles.derivedPrice}>
            <Text style={styles.derivedLabel}>Satış fiyatı</Text>
            <Text style={styles.derivedValue}>
              {result?.targetPrice != null
                ? `${result.targetPrice} TL`
                : '—'}
            </Text>
            <Text style={styles.hint}>
              Birim maliyet + komisyon % + hedef marja göre önerilir.
            </Text>
          </View>
        </Card>

        <Connector />

        <Card>
          <Text style={styles.sectionTitle}>Kaydet</Text>
          <Text style={styles.hint}>
            Satış fiyatını belirledin. Senaryoya isim ver veya mevcut ürüne bağla.
          </Text>
          <View style={styles.segment}>
            <Pressable
              style={[
                styles.segmentItem,
                nameMode === 'custom' && styles.segmentItemSelected,
              ]}
              onPress={() => switchNameMode('custom')}>
              <Text
                style={[
                  styles.segmentText,
                  nameMode === 'custom' && styles.segmentTextSelected,
                ]}>
                Ürün adı gir
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentItem,
                nameMode === 'product' && styles.segmentItemSelected,
              ]}
              onPress={() => switchNameMode('product')}>
              <Text
                style={[
                  styles.segmentText,
                  nameMode === 'product' && styles.segmentTextSelected,
                ]}>
                Üründen seç
              </Text>
            </Pressable>
          </View>

          {nameMode === 'custom' ? (
            <Field
              label="Ürün adı"
              value={name}
              onChangeText={setName}
              placeholder="örn. Seramik kupa v2"
            />
          ) : (
            <>
              {isDemo ? (
                <Text style={styles.hint}>
                  Demo’da ürün listesi yok; ürün adı gir modunu kullan.
                </Text>
              ) : products.length ? (
                <View style={styles.chips}>
                  {products.map((product) => (
                    <Pressable
                      key={product.id}
                      style={[
                        styles.chip,
                        productId === product.id && styles.chipSelected,
                      ]}
                      onPress={() => selectProduct(product)}>
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
              ) : (
                <Text style={styles.hint}>Henüz ürün yok.</Text>
              )}
              {productId && name ? (
                <Text style={styles.selectedName}>Seçili: {name}</Text>
              ) : null}
            </>
          )}

          {error ? <Message>{error}</Message> : null}
          {success ? <Message tone="success">{success}</Message> : null}
          <PrimaryButton
            label="Senaryoyu kaydet"
            loading={busy}
            onPress={() => void save()}
          />
        </Card>
      </View>

      {!isDemo && scenarios.length ? (
        <Card>
          <Text style={styles.sectionTitle}>Kayıtlı senaryolar</Text>
          {scenarios.map((scenario) => {
            const results = scenario.results as {
              unitCost?: string;
              targetPrice?: string | null;
              sellPrice?: string | null;
            };
            return (
              <View key={scenario.id} style={styles.scenario}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.hint}>
                  Birim maliyet {results.unitCost ?? '—'} TL
                  {(results.targetPrice || results.sellPrice)
                    ? ` · Satış ${results.targetPrice || results.sellPrice} TL`
                    : ''}
                </Text>
                {scenario.productId ? (
                  <SecondaryButton
                    label="Maliyet/fiyatı ürüne uygula"
                    disabled={busy}
                    onPress={() => void apply(scenario)}
                  />
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, lineHeight: 22 },
  stack: { gap: 0 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  hint: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  unitCostBanner: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  unitCostLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  unitCostValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  connector: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  connectorLine: {
    width: 2,
    height: 14,
    backgroundColor: colors.border,
  },
  connectorNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  derivedPrice: {
    gap: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.softBrand,
  },
  derivedLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  derivedValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentItemSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.softBrand,
  },
  segmentText: { color: colors.ink, fontWeight: '600' },
  segmentTextSelected: { color: colors.brand, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.softBrand,
  },
  chipText: { color: colors.ink },
  chipTextSelected: { color: colors.brand, fontWeight: '700' },
  selectedName: { color: colors.ink, fontWeight: '600' },
  scenario: { gap: 8, paddingVertical: 10 },
  scenarioName: { color: colors.ink, fontWeight: '700', fontSize: 16 },
});
