import type {
  AiSuggestionResult,
  BridgeStatus,
  ProductCaptionSuggestion,
  ProductDescriptionSuggestion,
  ProductDto,
  ProductImageAnalysis,
  ProductImageAnalysisResult,
  ProductInput,
  SeoAnalyzeResult,
  SeoApplyFlags,
  SeoAudit,
  SeoChannelId,
  SeoSuggestion,
  StockMovementDto,
  StockMovementResult,
  StockMovementType,
} from '@hoflayn/contracts';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { appendImageAsset } from '@/src/lib/image-upload';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

type CoverOption = {
  id: string;
  url: string;
  kind: string;
  createdAt: string;
};

type ResolvedProductImageAnalysis = ProductImageAnalysisResult & {
  analysis: ProductImageAnalysis;
};

const EMPTY: ProductInput = {
  name: '',
  description: '',
  price: '',
  costPrice: '',
  stockQuantity: 0,
  lowStockThreshold: null,
  category: '',
  tags: '',
  coverImageId: null,
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  weightKg: '',
  sku: '',
  barcodeValue: '',
  barcodeFormat: 'code128',
};

export default function ProductFormScreen() {
  const {
    session,
    me,
    isDemo,
    loading: authLoading,
    refreshMe,
  } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [covers, setCovers] = useState<CoverOption[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [analyzing, setAnalyzing] = useState(false);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [analysis, setAnalysis] =
    useState<ResolvedProductImageAnalysis | null>(null);
  const [descriptionSuggestion, setDescriptionSuggestion] =
    useState<ProductDescriptionSuggestion | null>(null);
  const [writerMaterial, setWriterMaterial] = useState('');
  const [writerFeatures, setWriterFeatures] = useState('');
  const [writerAudience, setWriterAudience] = useState('');
  const [captionSuggestion, setCaptionSuggestion] =
    useState<ProductCaptionSuggestion | null>(null);
  const [captionTone, setCaptionTone] = useState<
    'samimi' | 'hikaye' | 'sade'
  >('samimi');
  const [seoChannel, setSeoChannel] = useState<SeoChannelId>('generic_web');
  const [seoSuggestion, setSeoSuggestion] = useState<SeoSuggestion | null>(
    null,
  );
  const [seoAudit, setSeoAudit] = useState<SeoAudit | null>(null);
  const [seoJobId, setSeoJobId] = useState<string | null>(null);
  const [seoApply, setSeoApply] = useState<SeoApplyFlags>({
    title: true,
    metaDescription: true,
    slug: true,
    primaryKeyword: true,
    secondaryKeywords: true,
    tagsFromKeywords: false,
  });
  const [seoCurrent, setSeoCurrent] = useState<{
    seoTitle: string;
    seoMetaDescription: string;
    seoSlug: string;
    seoPrimaryKeyword: string;
    seoSecondaryKeywords: string;
    seoChannel: string;
  } | null>(null);
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovementDto[]>([]);
  const [stockType, setStockType] = useState<StockMovementType>('in');
  const [stockQty, setStockQty] = useState('1');
  const [stockNote, setStockNote] = useState('');
  const [allowNegative, setAllowNegative] = useState(false);
  const [toolLoading, setToolLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (authLoading || (!session && !isDemo)) return;
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const [product, availableCovers, bridgeStatus, seoState, movements] =
          await Promise.all([
            apiRequest<ProductDto>(`/api/v1/products/${id}`),
            apiRequest<CoverOption[]>('/api/v1/media/covers'),
            apiRequest<BridgeStatus>(`/api/v1/products/${id}/bridge`),
            apiRequest<{
              current: {
                seoTitle: string;
                seoMetaDescription: string;
                seoSlug: string;
                seoPrimaryKeyword: string;
                seoSecondaryKeywords: string;
                seoChannel: string;
              };
            }>(`/api/v1/products/${id}/seo`),
            apiRequest<StockMovementDto[]>(
              `/api/v1/products/${id}/stock-movements`,
            ),
          ]);
        if (product) setForm(product);
        setCovers(availableCovers);
        setBridge(bridgeStatus);
        setSeoCurrent(seoState.current);
        setStockMovements(movements);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Ürün alınamadı.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [authLoading, id, isDemo, session]);

  async function analyzeImage(selected: ImagePicker.ImagePickerAsset) {
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      appendImageAsset(formData, selected);
      const result = await apiRequest<ProductImageAnalysisResult>(
        '/api/v1/products/analyze',
        { method: 'POST', body: formData },
      );
      let generated = result.analysis;
      let status = result.status;
      let creditsCharged = result.creditsCharged;
      if (!generated) {
        const job = await waitForAiJob(result.jobId, result.status);
        assertAiJobSucceeded(job);
        generated = job.output?.analysis as
          | ProductImageAnalysis
          | undefined;
        status = job.status;
        creditsCharged = job.creditsCharged;
      }
      if (!generated) throw new Error('AI analiz çıktısı bulunamadı.');
      const resolved: ResolvedProductImageAnalysis = {
        ...result,
        status,
        analysis: generated,
        creditsCharged,
      };
      setAnalysis(resolved);
      setForm({
        ...EMPTY,
        name: resolved.analysis.name,
        description: resolved.analysis.description,
        category: resolved.analysis.category,
        tags: resolved.analysis.tags,
        coverImageId: resolved.coverImageId,
      });
      await refreshMe();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Görsel analiz edilemedi.',
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function chooseProductImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Ürün fotoğrafını seçmek için galeri izni gerekiyor.');
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    const selected = selection.canceled ? null : selection.assets[0];
    if (!selected) return;
    setAsset(selected);
    setAnalysis(null);
    await analyzeImage(selected);
  }

  function update<K extends keyof ProductInput>(
    key: K,
    value: ProductInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateDescription() {
    if (!id) return;
    setToolLoading('description');
    setError(null);
    try {
      const result = await apiRequest<
        AiSuggestionResult<ProductDescriptionSuggestion>
      >(`/api/v1/products/${id}/description`, {
        method: 'POST',
        body: JSON.stringify({
          material: writerMaterial,
          features: writerFeatures,
          audience: writerAudience,
        }),
      });
      let suggestion = result.suggestion;
      if (!suggestion) {
        const job = await waitForAiJob(result.jobId, result.status);
        assertAiJobSucceeded(job);
        suggestion = job.output?.description as
          | ProductDescriptionSuggestion
          | undefined;
      }
      if (!suggestion) throw new Error('AI açıklama çıktısı bulunamadı.');
      setDescriptionSuggestion(suggestion);
      await refreshMe();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Açıklama üretilemedi.');
    } finally {
      setToolLoading(null);
    }
  }

  async function applyDescription() {
    if (!id || !descriptionSuggestion) return;
    setToolLoading('apply-description');
    setError(null);
    try {
      await apiRequest(`/api/v1/products/${id}/description`, {
        method: 'PATCH',
        body: JSON.stringify(descriptionSuggestion),
      });
      setForm((current) => ({
        ...current,
        name: descriptionSuggestion.title,
        description: [
          descriptionSuggestion.longDescription,
          '',
          ...descriptionSuggestion.bullets.map((item) => `• ${item}`),
        ].join('\n'),
        tags: descriptionSuggestion.seoKeywords.join(', '),
      }));
      setDescriptionSuggestion(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Öneri uygulanamadı.');
    } finally {
      setToolLoading(null);
    }
  }

  async function generateCaption() {
    if (!id) return;
    setToolLoading('caption');
    setError(null);
    try {
      const result = await apiRequest<
        AiSuggestionResult<ProductCaptionSuggestion>
      >(`/api/v1/products/${id}/caption`, {
        method: 'POST',
        body: JSON.stringify({ tone: captionTone }),
      });
      let suggestion = result.suggestion;
      if (!suggestion) {
        const job = await waitForAiJob(result.jobId, result.status);
        assertAiJobSucceeded(job);
        suggestion = job.output?.caption as
          | ProductCaptionSuggestion
          | undefined;
      }
      if (!suggestion) throw new Error('Instagram metni bulunamadı.');
      setCaptionSuggestion(suggestion);
      await refreshMe();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Metin üretilemedi.');
    } finally {
      setToolLoading(null);
    }
  }

  async function analyzeSeo() {
    if (!id) return;
    setToolLoading('seo');
    setError(null);
    try {
      const result = await apiRequest<SeoAnalyzeResult>(
        `/api/v1/products/${id}/seo`,
        {
          method: 'POST',
          body: JSON.stringify({ channel: seoChannel }),
        },
      );
      let suggestion = result.suggestion;
      let audit = result.audit;
      if (!suggestion) {
        const job = await waitForAiJob(result.jobId, result.status);
        assertAiJobSucceeded(job);
        suggestion = job.output?.suggestion as SeoSuggestion | undefined;
        audit = job.output?.audit as SeoAudit | undefined;
      }
      if (!suggestion) throw new Error('SEO önerisi bulunamadı.');
      setSeoSuggestion(suggestion);
      setSeoAudit(audit ?? null);
      setSeoJobId(result.jobId);
      await refreshMe();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SEO analizi başarısız.');
    } finally {
      setToolLoading(null);
    }
  }

  async function applySeo() {
    if (!id || !seoSuggestion) return;
    if (!Object.values(seoApply).some(Boolean)) {
      setError('Uygulamak için en az bir alan seç.');
      return;
    }
    setToolLoading('seo-apply');
    setError(null);
    try {
      const result = await apiRequest<{
        product: {
          seoTitle: string;
          seoMetaDescription: string;
          seoSlug: string;
          seoPrimaryKeyword: string;
          seoSecondaryKeywords: string;
          seoChannel: string;
          tags: string;
        };
      }>(`/api/v1/products/${id}/seo`, {
        method: 'PATCH',
        body: JSON.stringify({
          jobId: seoJobId,
          suggestion: seoSuggestion,
          apply: seoApply,
        }),
      });
      setSeoCurrent({
        seoTitle: result.product.seoTitle,
        seoMetaDescription: result.product.seoMetaDescription,
        seoSlug: result.product.seoSlug,
        seoPrimaryKeyword: result.product.seoPrimaryKeyword,
        seoSecondaryKeywords: result.product.seoSecondaryKeywords,
        seoChannel: result.product.seoChannel,
      });
      if (seoApply.tagsFromKeywords) {
        update('tags', result.product.tags);
      }
      Alert.alert('SEO uygulandı', 'Seçili alanlar ürüne yazıldı.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SEO uygulanamadı.');
    } finally {
      setToolLoading(null);
    }
  }

  async function applyStock() {
    if (!id) return;
    const quantity = Number(stockQty.replace(/\D/g, '')) || 0;
    setToolLoading('stock');
    setError(null);
    try {
      const result = await apiRequest<StockMovementResult>(
        `/api/v1/products/${id}/stock-movements`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: stockType,
            quantity,
            note: stockNote,
            allowNegative,
          }),
        },
      );
      update('stockQuantity', result.stockQuantity);
      const movements = await apiRequest<StockMovementDto[]>(
        `/api/v1/products/${id}/stock-movements`,
      );
      setStockMovements(movements);
      setStockNote('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Stok güncellenemedi.');
    } finally {
      setToolLoading(null);
    }
  }

  async function exportToHoflaynWeb() {
    if (!id) return;
    setToolLoading('bridge');
    setError(null);
    try {
      const status = await apiRequest<BridgeStatus>(
        `/api/v1/products/${id}/bridge`,
        { method: 'POST' },
      );
      setBridge(status);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Aktarım başarısız.');
    } finally {
      setToolLoading(null);
    }
  }

  async function archiveFromHoflaynWeb() {
    if (!id) return;
    setToolLoading('bridge');
    setError(null);
    try {
      const status = await apiRequest<BridgeStatus>(
        `/api/v1/products/${id}/bridge`,
        { method: 'DELETE' },
      );
      setBridge(status);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Vitrinden kaldırılamadı.',
      );
    } finally {
      setToolLoading(null);
    }
  }

  function confirmArchiveFromHoflaynWeb() {
    Alert.alert(
      'Hoflayn Web vitrinden kaldır',
      'Ürün Hoflayn Web vitrinde arşivlenecek ve müşterilere görünmeyecek. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Arşivle',
          style: 'destructive',
          onPress: () => void archiveFromHoflaynWeb(),
        },
      ],
    );
  }

  function requestHoflaynWebExport() {
    const missing = bridge?.missingFields ?? [];
    if (missing.length) {
      setError(
        `Vitrineye çıkarmak için şu alanları tamamla: ${missing.join(', ')}.`,
      );
      return;
    }

    const isUpdate =
      bridge?.status === 'published' || Boolean(bridge?.needsUpdate);
    Alert.alert(
      isUpdate ? 'Vitrineyi güncelle' : 'Hoflayn Web’da vitrine çıkar',
      isUpdate
        ? 'Ürünün güncel bilgileri Hoflayn Web’a gönderilecek. Devam edilsin mi?'
        : 'Ürün Hoflayn Web admin onayına gönderilecek. Onaydan sonra vitrinde görünür.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: () => void exportToHoflaynWeb(),
        },
      ],
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiRequest<ProductDto>(
        id ? `/api/v1/products/${id}` : '/api/v1/products',
        {
          method: id ? 'PATCH' : 'POST',
          body: JSON.stringify(form),
        },
      );
      // A newly-created product must have an id before marketplace actions
      // can be shown. Keep the user on the detail form to make that next step
      // explicit instead of silently closing the screen.
      if (id) {
        router.back();
      } else {
        router.replace(`/product-form?id=${saved.id}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!id) return;
    Alert.alert('Ürünü sil', 'Bu ürün kalıcı olarak silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          setSaving(true);
          void apiRequest(`/api/v1/products/${id}`, { method: 'DELETE' })
            .then(() => router.back())
            .catch((reason) =>
              setError(
                reason instanceof Error ? reason.message : 'Silme başarısız.',
              ),
            )
            .finally(() => setSaving(false));
        },
      },
    ]);
  }

  if (authLoading) return null;
  if (!session && !isDemo) return <Redirect href="/" />;
  if (isDemo) return <Redirect href="/(tabs)/products" />;
  if (me?.needsOnboarding) return <Redirect href="/onboarding" />;

  if (!id && !analysis) {
    return (
      <Screen>
        <AppTitle eyebrow="Yeni ürün">Önce fotoğrafını seç</AppTitle>
        <Text style={styles.intro}>
          Fotoğrafını seç; Hoflayn ürün adı, açıklama, kategori ve etiketleri
          satışa uygun öneri olarak doldursun. Sen kontrol edip düzeltirsin.
        </Text>
        <Card>
          {asset ? (
            <Image
              source={{ uri: asset.uri }}
              style={styles.analysisImage}
              alt="Analiz edilecek ürün fotoğrafı"
            />
          ) : (
            <Pressable
              style={styles.imagePicker}
              onPress={() => void chooseProductImage()}>
              <Text style={styles.imagePickerIcon}>＋</Text>
              <Text style={styles.imagePickerTitle}>Ürün fotoğrafını seç</Text>
              <Text style={styles.imagePickerHelp}>JPEG, PNG veya WebP · en fazla 8 MB</Text>
            </Pressable>
          )}
          {analyzing ? (
            <View style={styles.analyzing}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.help}>
                Görsel inceleniyor, satış kartın hazırlanıyor…
              </Text>
            </View>
          ) : null}
          {error ? <Message>{error}</Message> : null}
          <PrimaryButton
            label={asset ? 'Başka fotoğraf seç' : 'Galeriden seç'}
            disabled={analyzing}
            onPress={() => void chooseProductImage()}
          />
          {asset && !analyzing ? (
            <Pressable onPress={() => void analyzeImage(asset)}>
              <Text style={styles.retry}>Analizi tekrar dene</Text>
            </Pressable>
          ) : null}
          <Text style={styles.creditNote}>
            Görsel analizi 1 kredi kullanır. Sonuç öneridir; kaydetmeden önce
            kontrol et.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppTitle eyebrow={id ? 'Ürün kartı' : 'AI önerisi'}>
        {id ? 'Ürünü düzenle' : 'Önerileri kontrol et'}
      </AppTitle>
      {!id && analysis ? (
        <Card>
          <Image
            source={{ uri: analysis.imageUrl }}
            style={styles.analysisImage}
            alt="Analiz edilen ürün fotoğrafı"
          />
          <Text style={styles.analysisTitle}>
            Alanlar görselden önerildi · %{Math.round(analysis.analysis.confidence * 100)} güven
          </Text>
          <Text style={styles.help}>
            Malzeme: {analysis.analysis.material || 'Fotoğraftan kesin belirlenemedi'}
            {' · '}Renkler: {analysis.analysis.colors.join(', ')}
          </Text>
        </Card>
      ) : null}
      <Card>
        <Field
          label="Ürün adı"
          value={form.name}
          onChangeText={(value) => update('name', value)}
          editable={!loading}
        />
        <Field
          label="Açıklama"
          value={form.description}
          onChangeText={(value) => update('description', value)}
          multiline
        />
        {!id ? (
          <Text style={styles.help}>
            Fiyat ve stok görselden bilinemez; bu iki alanı sen tamamla.
          </Text>
        ) : null}
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Fiyat"
              value={form.price}
              onChangeText={(value) => update('price', value)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Maliyet"
              value={form.costPrice ?? ''}
              onChangeText={(value) => update('costPrice', value)}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            {id ? (
              <Text style={styles.help}>
                Mevcut stok: {form.stockQuantity ?? 0} (aşağıdaki hareketlerle
                güncelle)
              </Text>
            ) : (
              <Field
                label="Stok"
                value={String(form.stockQuantity ?? 0)}
                onChangeText={(value) =>
                  update('stockQuantity', Number(value.replace(/\D/g, '')) || 0)
                }
                keyboardType="number-pad"
              />
            )}
          </View>
          <View style={styles.flex}>
            <Field
              label="Düşük stok eşiği"
              value={
                form.lowStockThreshold === null ||
                form.lowStockThreshold === undefined
                  ? ''
                  : String(form.lowStockThreshold)
              }
              onChangeText={(value) => {
                const trimmed = value.replace(/\D/g, '');
                update(
                  'lowStockThreshold',
                  trimmed === '' ? null : Number(trimmed),
                );
              }}
              keyboardType="number-pad"
              placeholder="Atölye varsayılanı"
            />
          </View>
        </View>
        <Text style={styles.help}>
          Ölçü ve ağırlık desi hesabı için; boş bırakılabilir.
        </Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="En (cm)"
              value={form.lengthCm ?? ''}
              onChangeText={(value) => update('lengthCm', value)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Boy (cm)"
              value={form.widthCm ?? ''}
              onChangeText={(value) => update('widthCm', value)}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Yükseklik (cm)"
              value={form.heightCm ?? ''}
              onChangeText={(value) => update('heightCm', value)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Ağırlık (kg)"
              value={form.weightKg ?? ''}
              onChangeText={(value) => update('weightKg', value)}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Field
          label="SKU"
          value={form.sku ?? ''}
          onChangeText={(value) => update('sku', value)}
          placeholder="ATOLYE-KUPA-01"
        />
        <Field
          label="Barkod değeri"
          value={form.barcodeValue ?? ''}
          onChangeText={(value) => update('barcodeValue', value)}
          placeholder="Boşsa SKU kullanılır"
        />
        <Field
          label="Kategori"
          value={form.category}
          onChangeText={(value) => update('category', value)}
        />
        <Field
          label="Etiketler"
          value={form.tags}
          onChangeText={(value) => update('tags', value)}
          placeholder="minimal, seramik, hediye"
        />

        {covers.length ? (
          <View style={styles.coverSection}>
            <Text style={styles.coverTitle}>Stüdyo görseli</Text>
            <View style={styles.covers}>
              {covers.map((cover) => (
                <Pressable
                  key={cover.id}
                  onPress={() =>
                    update(
                      'coverImageId',
                      form.coverImageId === cover.id ? null : cover.id,
                    )
                  }
                  style={[
                    styles.coverButton,
                    form.coverImageId === cover.id && styles.coverSelected,
                  ]}>
                  <Image
                    source={{ uri: cover.url }}
                    style={styles.cover}
                    alt="Stüdyo kapak seçeneği"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {error ? <Message>{error}</Message> : null}
        <PrimaryButton
          label="Kaydet"
          loading={saving}
          onPress={() => void save()}
        />
        {id && me?.workshop.role !== 'member' ? (
          <Pressable onPress={confirmDelete} disabled={saving}>
            <Text style={styles.delete}>Ürünü sil</Text>
          </Pressable>
        ) : null}
      </Card>
      {id ? (
        <>
          <Card>
            <Text style={styles.toolTitle}>Stok hareketleri</Text>
            <Text style={styles.help}>
              Giriş, çıkış, sayım (adjust) veya rezervasyon. Varsayılan: negatif
              stok engellenir.
            </Text>
            <View style={styles.toneOptions}>
              {(
                [
                  ['in', 'Giriş'],
                  ['out', 'Çıkış'],
                  ['adjust', 'Sayım'],
                  ['reserve', 'Rezerv'],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[
                    styles.tone,
                    stockType === value && styles.toneSelected,
                  ]}
                  onPress={() => setStockType(value)}>
                  <Text
                    style={[
                      styles.toneText,
                      stockType === value && styles.toneTextSelected,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              label={
                stockType === 'adjust' ? 'Yeni stok seviyesi' : 'Miktar'
              }
              value={stockQty}
              onChangeText={setStockQty}
              keyboardType="number-pad"
            />
            <Field
              label="Not"
              value={stockNote}
              onChangeText={setStockNote}
              placeholder="İsteğe bağlı"
            />
            {me?.workshop.role !== 'member' ? (
              <Pressable onPress={() => setAllowNegative((v) => !v)}>
                <Text style={styles.help}>
                  {allowNegative ? '✓' : '○'} Negatif stoka izin ver (yönetici)
                </Text>
              </Pressable>
            ) : null}
            <PrimaryButton
              label="Stok hareketini kaydet"
              loading={toolLoading === 'stock'}
              disabled={Boolean(toolLoading)}
              onPress={() => void applyStock()}
            />
            {stockMovements.length ? (
              <View style={styles.suggestion}>
                {stockMovements.slice(0, 8).map((row) => (
                  <Text key={row.id} style={styles.help}>
                    {row.type} · Δ{row.quantity} → {row.balanceAfter}
                    {row.note ? ` · ${row.note}` : ''}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.help}>Henüz hareket yok.</Text>
            )}
          </Card>

          <Card>
            <Text style={styles.toolTitle}>AI ürün açıklaması</Text>
            <Text style={styles.help}>
              Ürün bilgilerine göre satış metni ve SEO etiketleri hazırlar.
            </Text>
            <Field
              label="Malzeme"
              value={writerMaterial}
              placeholder="Seramik, pamuk, ahşap…"
              onChangeText={setWriterMaterial}
            />
            <Field
              label="Öne çıkan özellikler"
              value={writerFeatures}
              placeholder="El boyaması, kişiselleştirilebilir…"
              onChangeText={setWriterFeatures}
            />
            <Field
              label="Hedef kitle"
              value={writerAudience}
              placeholder="Yeni ev hediyesi arayanlar…"
              onChangeText={setWriterAudience}
            />
            <PrimaryButton
              label="Açıklama öner · 2 kredi"
              loading={toolLoading === 'description'}
              disabled={Boolean(toolLoading)}
              onPress={() => void generateDescription()}
            />
            {descriptionSuggestion ? (
              <View style={styles.suggestion}>
                <Text style={styles.suggestionTitle}>
                  {descriptionSuggestion.title}
                </Text>
                <Text style={styles.help}>
                  {descriptionSuggestion.longDescription}
                </Text>
                <SecondaryButton
                  label="Öneriyi ürüne uygula"
                  disabled={Boolean(toolLoading)}
                  onPress={() => void applyDescription()}
                />
              </View>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.toolTitle}>Instagram metni</Text>
            <Text style={styles.help}>
              Üründen paylaşılabilir bir gönderi metni üretir.
            </Text>
            <View style={styles.toneOptions}>
              {(
                [
                  ['samimi', 'Samimi'],
                  ['hikaye', 'Hikâye'],
                  ['sade', 'Sade'],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[
                    styles.tone,
                    captionTone === value && styles.toneSelected,
                  ]}
                  onPress={() => setCaptionTone(value)}>
                  <Text
                    style={[
                      styles.toneText,
                      captionTone === value && styles.toneTextSelected,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton
              label="Instagram metni üret · 2 kredi"
              loading={toolLoading === 'caption'}
              disabled={Boolean(toolLoading)}
              onPress={() => void generateCaption()}
            />
            {captionSuggestion ? (
              <View style={styles.suggestion}>
                <Text style={styles.help}>{captionSuggestion.caption}</Text>
                <Text style={styles.help}>{captionSuggestion.callToAction}</Text>
                <Text style={styles.tags}>
                  {captionSuggestion.hashtags.join(' ')}
                </Text>
                <SecondaryButton
                  label="Paylaş"
                  onPress={() =>
                    void Share.share({
                      message: [
                        captionSuggestion.caption,
                        captionSuggestion.callToAction,
                        '',
                        captionSuggestion.hashtags.join(' '),
                      ].join('\n\n'),
                    })
                  }
                />
              </View>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.toolTitle}>SEO Yardımcısı</Text>
            <Text style={styles.help}>
              Başlık, meta, slug ve anahtar kelime önerir. Ürüne ancak sen
              onaylayınca yazar · 2 kredi.
            </Text>
            {seoCurrent?.seoTitle ? (
              <Text style={styles.help}>
                Kayıtlı: {seoCurrent.seoTitle}
                {seoCurrent.seoSlug ? ` · /${seoCurrent.seoSlug}` : ''}
              </Text>
            ) : null}
            <View style={styles.toneOptions}>
              {(
                [
                  ['generic_web', 'Genel web'],
                  ['hoflayn_web', 'Hoflayn Web'],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[
                    styles.tone,
                    seoChannel === value && styles.toneSelected,
                  ]}
                  onPress={() => setSeoChannel(value)}>
                  <Text
                    style={[
                      styles.toneText,
                      seoChannel === value && styles.toneTextSelected,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton
              label="SEO analizi üret · 2 kredi"
              loading={toolLoading === 'seo'}
              disabled={Boolean(toolLoading)}
              onPress={() => void analyzeSeo()}
            />
            {seoSuggestion ? (
              <View style={styles.suggestion}>
                {seoAudit ? (
                  <Text style={styles.help}>
                    Skor {seoAudit.score}/100
                    {seoAudit.warnings.length
                      ? ` · ${seoAudit.warnings[0]}`
                      : ''}
                  </Text>
                ) : null}
                <Text style={styles.help}>Başlık: {seoSuggestion.title}</Text>
                <Text style={styles.help}>
                  Meta: {seoSuggestion.metaDescription}
                </Text>
                <Text style={styles.help}>Slug: {seoSuggestion.slug}</Text>
                <Text style={styles.tags}>
                  {seoSuggestion.primaryKeyword}
                  {seoSuggestion.secondaryKeywords.length
                    ? ` · ${seoSuggestion.secondaryKeywords.join(', ')}`
                    : ''}
                </Text>
                {(
                  [
                    ['title', 'Başlık'],
                    ['metaDescription', 'Meta'],
                    ['slug', 'Slug'],
                    ['primaryKeyword', 'Ana kelime'],
                    ['secondaryKeywords', 'İkincil kelimeler'],
                    ['tagsFromKeywords', 'Etiketlere yaz'],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable
                    key={key}
                    style={styles.seoFlag}
                    onPress={() =>
                      setSeoApply((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }>
                    <Text style={styles.help}>
                      {seoApply[key] ? '✓' : '○'} {label}
                    </Text>
                  </Pressable>
                ))}
                {me?.workshop.role === 'member' ? (
                  <Text style={styles.help}>
                    SEO uygulamak için yönetici yetkisi gerekli.
                  </Text>
                ) : (
                  <SecondaryButton
                    label="Seçili alanları ürüne uygula"
                    disabled={Boolean(toolLoading)}
                    onPress={() => void applySeo()}
                  />
                )}
              </View>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.toolTitle}>Hoflayn Web Marketplace</Text>
            <Text style={styles.help}>
              Durum:{' '}
              {bridge?.status === 'draft'
                ? 'Hazır değil'
                : bridge?.status === 'pending'
                  ? 'Onay bekliyor'
                  : bridge?.status === 'published'
                    ? 'Yayında'
                    : bridge?.status === 'rejected'
                      ? 'Reddedildi'
                      : bridge?.status === 'failed'
                        ? 'Aktarım başarısız'
                        : bridge?.status === 'archived'
                          ? 'Arşivlendi'
                          : 'yükleniyor'}
              {bridge?.externalId ? ` · #${bridge.externalId}` : ''}
            </Text>
            {bridge?.configured && !bridge.connected ? (
              <Text style={styles.help}>
                İlk gönderimde {me?.user.email} ile Hoflayn Web satıcı hesabın
                eşleştirilecek.
              </Text>
            ) : null}
            {bridge?.externalUrl ? (
              <SecondaryButton
                label="Hoflayn Web’da görüntüle"
                onPress={() => void Linking.openURL(bridge.externalUrl!)}
              />
            ) : null}
            {bridge?.missingFields?.length ? (
              <Text style={styles.help}>
                Eksik: {bridge.missingFields.join(', ')}
              </Text>
            ) : null}
            {bridge?.lastError ? <Message>{bridge.lastError}</Message> : null}
            {bridge?.rejectionReason ? (
              <Message>Hoflayn Web gerekçesi: {bridge.rejectionReason}</Message>
            ) : null}
            {bridge?.needsUpdate ? (
              <Text style={styles.help}>
                Ürün değişti; vitrindeki kaydı güncellemen gerekiyor.
              </Text>
            ) : null}
            {me?.workshop.role === 'member' ? (
              <Text style={styles.help}>
                Marketplace aktarımı için yönetici yetkisi gerekli.
              </Text>
            ) : !bridge?.configured ? (
              <Message>Bridge sunucuda henüz yapılandırılmamış.</Message>
            ) : (
              <PrimaryButton
                label={
                  bridge.status === 'published' || bridge.needsUpdate
                    ? 'Vitrineyi güncelle'
                    : bridge.status === 'pending'
                      ? 'Onay bekleniyor'
                      : bridge.status === 'rejected' ||
                          bridge.status === 'failed'
                        ? 'Tekrar gönder'
                        : 'Hoflayn Web’da vitrine çıkar'
                }
                loading={toolLoading === 'bridge'}
                disabled={Boolean(toolLoading) || bridge.status === 'pending'}
                onPress={requestHoflaynWebExport}
              />
            )}
            {bridge?.status === 'published' ? (
              <SecondaryButton
                label="Hoflayn Web vitrinden kaldır"
                disabled={Boolean(toolLoading)}
                onPress={confirmArchiveFromHoflaynWeb}
              />
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  analysisImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    resizeMode: 'contain',
    backgroundColor: colors.background,
  },
  imagePicker: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    borderRadius: 18,
    backgroundColor: colors.softBrand,
  },
  imagePickerIcon: { color: colors.brand, fontSize: 40, fontWeight: '300' },
  imagePickerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  imagePickerHelp: { color: colors.muted, fontSize: 13 },
  analyzing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  retry: {
    color: colors.brand,
    textAlign: 'center',
    fontWeight: '700',
    padding: 8,
  },
  creditNote: { color: colors.muted, textAlign: 'center', fontSize: 12 },
  analysisTitle: { color: colors.success, fontSize: 15, fontWeight: '800' },
  toolTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  suggestion: {
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  suggestionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  tags: { color: colors.brand, lineHeight: 22 },
  seoFlag: { paddingVertical: 2 },
  toneOptions: { flexDirection: 'row', gap: 8 },
  tone: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  toneSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  toneText: { color: colors.ink, textAlign: 'center', fontWeight: '600' },
  toneTextSelected: { color: colors.brand },
  help: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  coverSection: { gap: 10 },
  coverTitle: { color: colors.ink, fontWeight: '700' },
  covers: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  coverButton: { borderWidth: 2, borderColor: 'transparent', borderRadius: 12 },
  coverSelected: { borderColor: colors.brand },
  cover: { width: 76, height: 76, borderRadius: 9 },
  delete: {
    color: colors.danger,
    fontWeight: '700',
    textAlign: 'center',
    padding: 10,
  },
});
