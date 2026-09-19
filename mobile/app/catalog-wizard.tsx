import type {
  CatalogDto,
  CatalogExportStartResult,
  CatalogTemplateId,
  CatalogThemeId,
  ProductDto,
} from '@hoflayn/contracts';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  Share,
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
import {
  assertAiJobSucceeded,
  waitForAiJob,
} from '@/src/lib/ai-jobs';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

const THEME_PREVIEW: Record<
  CatalogThemeId,
  {
    bg: string;
    ink: string;
    muted: string;
    accent: string;
    label: string;
    blurb: string;
  }
> = {
  linen: {
    bg: '#F7F2EA',
    ink: '#2C241B',
    muted: '#7A6F63',
    accent: '#8B5E3C',
    label: 'Keten',
    blurb: 'Sıcak kâğıt / keten hissi — el yapımı, doğal atölye.',
  },
  ink: {
    bg: '#F4F6F8',
    ink: '#142033',
    muted: '#5B6B7C',
    accent: '#1F4E79',
    label: 'Mürekkep',
    blurb: 'Soğuk slate / mürekkep — daha modern, vitrin katalog.',
  },
};

const TEMPLATE_INFO: Record<
  CatalogTemplateId,
  { label: string; blurb: string }
> = {
  grid: {
    label: 'Izgara',
    blurb:
      'Kapak + sayfada 2 sütun ürün kartı. Çok SKU / toptan liste için yoğun.',
  },
  lookbook: {
    label: 'Lookbook',
    blurb:
      'Kapak + her ürün tam sayfa, büyük görsel. Butik anlatım için.',
  },
};

function newIdempotencyKey() {
  return `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function CatalogStylePreview({
  templateId,
  theme,
  title,
  showPrices,
  showWorkshop,
  productCount,
}: {
  templateId: CatalogTemplateId;
  theme: CatalogThemeId;
  title: string;
  showPrices: boolean;
  showWorkshop: boolean;
  productCount: number;
}) {
  const t = THEME_PREVIEW[theme];
  const info = TEMPLATE_INFO[templateId];

  return (
    <View style={styles.previewBlock}>
      <Text style={styles.previewTitle}>Önizleme</Text>
      <Text style={styles.help}>
        {info.blurb} Tema: {t.blurb}
      </Text>
      <View style={[styles.previewPage, { backgroundColor: t.bg }]}>
        <Text style={[styles.previewBrand, { color: t.accent }]}>HOFLAYN</Text>
        <Text
          style={[styles.previewHeading, { color: t.ink }]}
          numberOfLines={1}>
          {title.trim() || 'Atölye kataloğu'}
        </Text>
        {showWorkshop ? (
          <Text style={[styles.previewMeta, { color: t.muted }]}>
            Atölye adı
          </Text>
        ) : null}
        <Text style={[styles.previewMeta, { color: t.muted }]}>
          {productCount || '…'} ürün
        </Text>

        {templateId === 'grid' ? (
          <View style={styles.gridRows}>
            {[0, 1].map((row) => (
              <View key={row} style={styles.gridRow}>
                {[0, 1].map((col) => (
                  <View
                    key={col}
                    style={[styles.gridCell, { borderColor: t.muted }]}>
                    <View
                      style={[
                        styles.gridPhoto,
                        { backgroundColor: `${t.accent}33` },
                      ]}
                    />
                    <Text
                      style={[styles.gridName, { color: t.ink }]}
                      numberOfLines={1}>
                      Ürün
                    </Text>
                    {showPrices ? (
                      <Text style={[styles.gridPrice, { color: t.muted }]}>
                        — TL
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.lookPage, { borderColor: t.muted }]}>
            <View
              style={[styles.lookPhoto, { backgroundColor: `${t.accent}33` }]}
            />
            <Text style={[styles.lookName, { color: t.ink }]}>Ürün adı</Text>
            {showPrices ? (
              <Text style={[styles.gridPrice, { color: t.muted }]}>— TL</Text>
            ) : null}
            <Text style={[styles.previewMeta, { color: t.muted }]}>
              1 ürün / sayfa
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CatalogWizardScreen() {
  const { isDemo, me, refreshMe } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const existingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [title, setTitle] = useState('Atölye kataloğu');
  const [templateId, setTemplateId] = useState<CatalogTemplateId>('grid');
  const [theme, setTheme] = useState<CatalogThemeId>('linen');
  const [showPrices, setShowPrices] = useState(true);
  const [showWorkshop, setShowWorkshop] = useState(true);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogDto | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const productRows = await apiRequest<ProductDto[]>('/api/v1/products');
      setProducts(productRows);
      if (existingId) {
        const row = await apiRequest<CatalogDto>(
          `/api/v1/catalogs/${existingId}`,
        );
        setCatalog(row);
        setTitle(row.title);
        setTemplateId(row.templateId);
        setTheme(row.theme);
        setShowPrices(row.showPrices);
        setShowWorkshop(row.showWorkshop);
        setSelected(row.items.map((item) => item.productId));
        if (row.latestExport?.pdfUrl) setPdfUrl(row.latestExport.pdfUrl);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Veriler alınamadı.');
    }
  }, [existingId, isDemo]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function toggleProduct(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function createAndExport() {
    if (isDemo) {
      setError('Demo modunda katalog üretilmez.');
      return;
    }
    if (me?.workshop.role === 'member') {
      setError('Katalog için yönetici yetkisi gerekli.');
      return;
    }
    if (!selected.length) {
      setError('En az bir ürün seç.');
      return;
    }
    setBusy('create');
    setError(null);
    setPdfUrl(null);
    try {
      let catalogId = catalog?.id ?? existingId;
      if (!catalogId) {
        const created = await apiRequest<CatalogDto>('/api/v1/catalogs', {
          method: 'POST',
          body: JSON.stringify({
            title,
            templateId,
            theme,
            showPrices,
            showWorkshop,
            coverProductId: selected[0] ?? null,
            productIds: selected,
          }),
        });
        setCatalog(created);
        catalogId = created.id;
      }

      setBusy('export');
      const started = await apiRequest<CatalogExportStartResult>(
        `/api/v1/catalogs/${catalogId}/exports`,
        {
          method: 'POST',
          body: JSON.stringify({ idempotencyKey: newIdempotencyKey() }),
        },
      );

      let exportRow = started.export;
      if (
        started.jobId &&
        ['pending', 'running', 'retry_later'].includes(exportRow.status)
      ) {
        const job = await waitForAiJob(started.jobId, exportRow.status);
        assertAiJobSucceeded(job);
        exportRow = await apiRequest(
          `/api/v1/catalogs/${catalogId}/exports/${started.export.id}`,
        );
      }

      if (exportRow.status !== 'succeeded' || !exportRow.pdfUrl) {
        throw new Error(exportRow.error ?? 'PDF hazırlanamadı.');
      }
      setPdfUrl(exportRow.pdfUrl);
      await refreshMe();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Katalog başarısız.');
    } finally {
      setBusy(null);
    }
  }

  async function sharePdf() {
    if (!pdfUrl) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        const target = `${FileSystem.cacheDirectory}hoflayn-catalog.pdf`;
        const downloaded = await FileSystem.downloadAsync(pdfUrl, target);
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
        return;
      }
      await Share.share({ message: pdfUrl, url: pdfUrl });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Paylaşım açılamadı.');
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Katalog sihirbazı">PDF oluştur</AppTitle>
      <Card>
        <Field label="Başlık" value={title} onChangeText={setTitle} />
        <Text style={styles.sectionLabel}>Şablon</Text>
        <View style={styles.row}>
          {(Object.keys(TEMPLATE_INFO) as CatalogTemplateId[]).map((value) => (
            <Pressable
              key={value}
              style={[styles.chip, templateId === value && styles.chipOn]}
              onPress={() => setTemplateId(value)}>
              <Text
                style={[
                  styles.chipText,
                  templateId === value && styles.chipTextOn,
                ]}>
                {TEMPLATE_INFO[value].label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{TEMPLATE_INFO[templateId].blurb}</Text>

        <Text style={styles.sectionLabel}>Tema</Text>
        <View style={styles.row}>
          {(Object.keys(THEME_PREVIEW) as CatalogThemeId[]).map((value) => (
            <Pressable
              key={value}
              style={[styles.chip, theme === value && styles.chipOn]}
              onPress={() => setTheme(value)}>
              <View
                style={[
                  styles.themeSwatch,
                  { backgroundColor: THEME_PREVIEW[value].bg },
                  { borderColor: THEME_PREVIEW[value].accent },
                ]}
              />
              <Text
                style={[styles.chipText, theme === value && styles.chipTextOn]}>
                {THEME_PREVIEW[value].label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{THEME_PREVIEW[theme].blurb}</Text>

        <Pressable onPress={() => setShowPrices((v) => !v)}>
          <Text style={styles.help}>
            {showPrices ? '✓' : '○'} Fiyatları göster
          </Text>
        </Pressable>
        <Pressable onPress={() => setShowWorkshop((v) => !v)}>
          <Text style={styles.help}>
            {showWorkshop ? '✓' : '○'} Atölye bilgisini göster
          </Text>
        </Pressable>

        <CatalogStylePreview
          templateId={templateId}
          theme={theme}
          title={title}
          showPrices={showPrices}
          showWorkshop={showWorkshop}
          productCount={selected.length}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Ürünler</Text>
        {!products.length ? (
          <Text style={styles.help}>Önce ürün ekle.</Text>
        ) : (
          products.map((product) => (
            <Pressable
              key={product.id}
              style={styles.product}
              onPress={() => toggleProduct(product.id)}>
              <Text style={styles.help}>
                {selectedSet.has(product.id) ? '✓' : '○'} {product.name}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      {error ? <Message>{error}</Message> : null}
      {!existingId || !catalog ? (
        <PrimaryButton
          label={busy ? 'Hazırlanıyor…' : 'Oluştur ve PDF üret · 1 kredi'}
          loading={Boolean(busy)}
          disabled={Boolean(busy)}
          onPress={() => void createAndExport()}
        />
      ) : (
        <PrimaryButton
          label={busy ? 'Hazırlanıyor…' : 'Yeniden PDF üret · 1 kredi'}
          loading={Boolean(busy)}
          disabled={Boolean(busy)}
          onPress={() => void createAndExport()}
        />
      )}
      {pdfUrl ? (
        <Card>
          <Text style={styles.title}>PDF hazır</Text>
          <SecondaryButton label="Paylaş" onPress={() => void sharePdf()} />
          <SecondaryButton
            label="Önizle / aç"
            onPress={() => void Linking.openURL(pdfUrl)}
          />
        </Card>
      ) : null}
      <SecondaryButton
        label="Listeye dön"
        onPress={() => router.push('/catalogs')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  sectionLabel: {
    color: colors.ink,
    fontWeight: '700',
    marginTop: 4,
  },
  help: { color: colors.muted, lineHeight: 22 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  chipText: { color: colors.muted, fontWeight: '700' },
  chipTextOn: { color: colors.brand },
  themeSwatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
  },
  product: { paddingVertical: 6 },
  previewBlock: { gap: 8, marginTop: 10 },
  previewTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  previewPage: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    minHeight: 220,
  },
  previewBrand: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  previewHeading: { fontSize: 18, fontWeight: '800' },
  previewMeta: { fontSize: 12 },
  gridRows: { gap: 8, marginTop: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  gridCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    gap: 4,
  },
  gridPhoto: { height: 44, borderRadius: 4 },
  gridName: { fontSize: 11, fontWeight: '700' },
  gridPrice: { fontSize: 10 },
  lookPage: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  lookPhoto: { height: 88, borderRadius: 6 },
  lookName: { fontSize: 14, fontWeight: '800' },
});
