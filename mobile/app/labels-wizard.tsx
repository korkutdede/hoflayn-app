import type {
  LabelBarcodeFormat,
  LabelExportDto,
  LabelExportStartResult,
  LabelSizeId,
  ProductDto,
} from '@hoflayn/contracts';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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

const SIZE_OPTIONS: {
  id: LabelSizeId;
  label: string;
  hint: string;
  widthMm: number;
  heightMm: number;
}[] = [
  {
    id: '50x30',
    label: '50×30 mm',
    hint: 'Küçük etiket kâğıdı',
    widthMm: 50,
    heightMm: 30,
  },
  {
    id: '62x29',
    label: '62×29 mm',
    hint: 'Brother DK tarzı rulo',
    widthMm: 62,
    heightMm: 29,
  },
  {
    id: '100x50',
    label: '100×50 mm',
    hint: 'Geniş etiket kâğıdı',
    widthMm: 100,
    heightMm: 50,
  },
];

const FORMAT_OPTIONS: {
  id: LabelBarcodeFormat;
  label: string;
  infoTitle: string;
  infoBody: string;
}[] = [
  {
    id: 'code128',
    label: 'Code128',
    infoTitle: 'Code 128',
    infoBody:
      'Tek çizgili barkod. Harf ve rakamlı SKU’lar için uygundur (örn. ATOLYE-KUPA-01). Uluslararası standart; Türkiye’ye özel değil. Atölye içi stok ve rafta okutma için en yaygın seçenek.',
  },
  {
    id: 'qr',
    label: 'QR',
    infoTitle: 'QR kod',
    infoBody:
      'Kare kod. Daha uzun metin veya link taşıyabilir; telefon kamerasıyla kolay okunur. Uluslararası standart. Katalog linki veya uzun ürün kodu için tercih edilir.',
  },
  {
    id: 'gs1_128',
    label: 'GS1-128',
    infoTitle: 'GS1-128',
    infoBody:
      'Ticari / lojistik barkod (GS1). Yalnızca rakam kabul eder; GTIN benzeri kodlar için. Uluslararası standart. Pazaryeri veya kargo GS1 isterse kullanılır. Hoflayn check digit düzeltmez.',
  },
];

function newKey() {
  return `labels-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveCodeText(product: ProductDto | null, format: LabelBarcodeFormat) {
  if (!product) return 'SKU-ORNEK';
  const raw = (product.barcodeValue || product.sku || '').trim();
  if (!raw) return 'SKU / barkod yok';
  if (format === 'gs1_128' && !/^\d+$/.test(raw)) {
    return 'GS1 için yalnızca rakam';
  }
  return raw;
}

function FormatChip({
  option,
  selected,
  onSelect,
}: {
  option: (typeof FORMAT_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <View style={styles.formatChipWrap}>
      <Pressable
        style={[styles.chip, selected && styles.chipOn]}
        onPress={onSelect}>
        <Text style={[styles.chipText, selected && styles.chipTextOn]}>
          {option.label}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${option.label} bilgisi`}
        hitSlop={8}
        onPress={() =>
          Alert.alert(option.infoTitle, option.infoBody, [{ text: 'Tamam' }])
        }
        style={styles.infoBtn}>
        <Text style={styles.infoBtnText}>ⓘ</Text>
      </Pressable>
    </View>
  );
}

function LabelPreview({
  size,
  format,
  product,
  showName,
  showPrice,
}: {
  size: LabelSizeId;
  format: LabelBarcodeFormat;
  product: ProductDto | null;
  showName: boolean;
  showPrice: boolean;
}) {
  const meta = SIZE_OPTIONS.find((row) => row.id === size) ?? SIZE_OPTIONS[0];
  const ratio = meta.widthMm / meta.heightMm;
  const previewWidth = 220;
  const previewHeight = Math.max(72, Math.round(previewWidth / ratio));
  const codeText = resolveCodeText(product, format);

  return (
    <View style={styles.previewBlock}>
      <Text style={styles.title}>Önizleme</Text>
      <Text style={styles.help}>
        Basit şema — gerçek barkod çizgisi PDF’de üretilir. Kredi harcamaz.
      </Text>
      <View
        style={[
          styles.previewCard,
          { width: previewWidth, height: previewHeight },
        ]}>
        <View
          style={[
            styles.previewCodeArea,
            format === 'qr' ? styles.previewQr : styles.previewBars,
          ]}>
          {format === 'qr' ? (
            <View style={styles.qrMark}>
              <Text style={styles.qrMarkText}>QR</Text>
            </View>
          ) : (
            <View style={styles.barRow}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      width: i % 3 === 0 ? 3 : 1.5,
                      opacity: i % 4 === 0 ? 0.35 : 1,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        <Text style={styles.previewCode} numberOfLines={1}>
          {codeText}
        </Text>
        {showName ? (
          <Text style={styles.previewName} numberOfLines={1}>
            {product?.name ?? 'Ürün adı'}
          </Text>
        ) : null}
        {showPrice ? (
          <Text style={styles.previewPrice} numberOfLines={1}>
            {product?.price ? `${product.price} TL` : 'Fiyat'}
          </Text>
        ) : null}
      </View>
      <Text style={styles.hint}>
        Etiket kâğıdı {meta.label} · {FORMAT_OPTIONS.find((f) => f.id === format)?.label}
      </Text>
    </View>
  );
}

export default function LabelsWizardScreen() {
  const { isDemo, me, refreshMe } = useAuth();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [history, setHistory] = useState<LabelExportDto[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [size, setSize] = useState<LabelSizeId>('50x30');
  const [format, setFormat] = useState<LabelBarcodeFormat>('code128');
  const [copies, setCopies] = useState('1');
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const previewProduct = useMemo(() => {
    if (!selected.length) return products[0] ?? null;
    return products.find((p) => p.id === selected[0]) ?? null;
  }, [products, selected]);

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const [productRows, exports] = await Promise.all([
        apiRequest<ProductDto[]>('/api/v1/products'),
        apiRequest<LabelExportDto[]>('/api/v1/labels'),
      ]);
      setProducts(productRows);
      setHistory(exports);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Veriler alınamadı.');
    }
  }, [isDemo]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function produce() {
    if (isDemo) {
      setError('Demo modunda etiket üretilmez.');
      return;
    }
    if (me?.workshop.role === 'member') {
      setError('Etiket için yönetici yetkisi gerekli.');
      return;
    }
    if (!selected.length) {
      setError('En az bir ürün seç.');
      return;
    }
    setBusy(true);
    setError(null);
    setPdfUrl(null);
    try {
      const started = await apiRequest<LabelExportStartResult>('/api/v1/labels', {
        method: 'POST',
        body: JSON.stringify({
          productIds: selected,
          size,
          format,
          copies: Number(copies.replace(/\D/g, '')) || 1,
          showPrice,
          showName,
          idempotencyKey: newKey(),
        }),
      });

      let exportRow = started.export;
      if (
        started.jobId &&
        ['pending', 'running', 'retry_later'].includes(exportRow.status)
      ) {
        const job = await waitForAiJob(started.jobId, exportRow.status);
        assertAiJobSucceeded(job);
        exportRow = await apiRequest<LabelExportDto>(
          `/api/v1/labels/${started.export.id}`,
        );
      }
      if (exportRow.status !== 'succeeded' || !exportRow.pdfUrl) {
        throw new Error(exportRow.error ?? 'Etiket PDF hazırlanamadı.');
      }
      setPdfUrl(exportRow.pdfUrl);
      await refreshMe();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Etiket başarısız.');
    } finally {
      setBusy(false);
    }
  }

  async function sharePdf() {
    if (!pdfUrl) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        const target = `${FileSystem.cacheDirectory}hoflayn-labels.pdf`;
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
      <AppTitle eyebrow="Barkod">Etiket sihirbazı</AppTitle>
      <Text style={styles.help}>
        Yazıcı için etiket PDF’i üret · 1 kredi. Üründe SKU veya barkod değeri
        olmalı.
      </Text>

      <Card>
        <Text style={styles.title}>Etiket kâğıdı boyutu</Text>
        <Text style={styles.help}>
          Bu, ürünün fiziksel ölçüsü değil; yazıcıya takılan etiket kâğıdının en
          × boy ölçüsüdür (mm).
        </Text>
        <View style={styles.row}>
          {SIZE_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.chip, size === option.id && styles.chipOn]}
              onPress={() => setSize(option.id)}>
              <Text
                style={[
                  styles.chipText,
                  size === option.id && styles.chipTextOn,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>
          {SIZE_OPTIONS.find((row) => row.id === size)?.hint}
        </Text>

        <Text style={styles.title}>Barkod formatı</Text>
        <View style={styles.row}>
          {FORMAT_OPTIONS.map((option) => (
            <FormatChip
              key={option.id}
              option={option}
              selected={format === option.id}
              onSelect={() => setFormat(option.id)}
            />
          ))}
        </View>

        <Field
          label="Kopya adedi"
          value={copies}
          onChangeText={setCopies}
          keyboardType="number-pad"
        />
        <Pressable onPress={() => setShowName((v) => !v)}>
          <Text style={styles.help}>{showName ? '✓' : '○'} Ürün adı</Text>
        </Pressable>
        <Pressable onPress={() => setShowPrice((v) => !v)}>
          <Text style={styles.help}>{showPrice ? '✓' : '○'} Fiyat</Text>
        </Pressable>

        <LabelPreview
          size={size}
          format={format}
          product={previewProduct}
          showName={showName}
          showPrice={showPrice}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Ürünler</Text>
        <Text style={styles.hint}>
          Önizleme seçili ilk ürünü (veya listedeki ilk ürünü) gösterir.
        </Text>
        {products.map((product) => (
          <Pressable
            key={product.id}
            style={styles.product}
            onPress={() => toggle(product.id)}>
            <Text style={styles.help}>
              {selectedSet.has(product.id) ? '✓' : '○'} {product.name}
              {product.sku ? ` · ${product.sku}` : ''}
            </Text>
          </Pressable>
        ))}
      </Card>

      {error ? <Message>{error}</Message> : null}
      <PrimaryButton
        label={busy ? 'Hazırlanıyor…' : 'Etiket PDF üret · 1 kredi'}
        loading={busy}
        disabled={busy}
        onPress={() => void produce()}
      />
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

      {history.length ? (
        <Card>
          <Text style={styles.title}>Son üretimler</Text>
          {history.slice(0, 5).map((row) => (
            <Text key={row.id} style={styles.help}>
              {row.size} · {row.format} · {row.status}
              {row.itemCount ? ` · ${row.itemCount} ürün` : ''}
            </Text>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  help: { color: colors.muted, lineHeight: 22 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  chipText: { color: colors.muted, fontWeight: '700' },
  chipTextOn: { color: colors.brand },
  formatChipWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  product: { paddingVertical: 6 },
  previewBlock: { gap: 8, marginTop: 8 },
  previewCard: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 8,
    gap: 4,
    justifyContent: 'center',
  },
  previewCodeArea: {
    flex: 1,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBars: { paddingVertical: 4 },
  previewQr: { paddingVertical: 2 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 28,
    gap: 2,
    width: '100%',
    justifyContent: 'center',
  },
  bar: { backgroundColor: colors.ink, height: '100%' },
  qrMark: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrMarkText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  previewCode: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  previewName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewPrice: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
});
