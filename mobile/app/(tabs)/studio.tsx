import type { ProductDto, StudioJobResult } from '@hoflayn/contracts';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppTitle,
  Card,
  Message,
  PrimaryButton,
  SecondaryButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { appendImageAsset } from '@/src/lib/image-upload';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

type Mode = 'remove_bg' | 'white_bg';

async function waitForStudioJob(job: StudioJobResult) {
  let current = job;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (!['pending', 'running', 'retry_later'].includes(current.status)) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    current = await apiRequest<StudioJobResult>(
      `/api/v1/studio/jobs/${job.id}`,
    );
  }
  return current;
}

export default function StudioScreen() {
  const { isDemo, refreshMe } = useAuth();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [mode, setMode] = useState<Mode>('remove_bg');
  const [result, setResult] = useState<StudioJobResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Fotoğraf seçmek için galeri izni gerekiyor.');
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!selection.canceled) {
      setAsset(selection.assets[0] ?? null);
      setResult(null);
      setError(null);
    }
  }

  async function submit() {
    if (!asset) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (isDemo) {
      setResult({
        id: 'demo-studio-job',
        status: 'succeeded',
        operation: mode,
        creditsCharged: 0,
        provider: 'demo önizlemesi',
        beforeUrl: asset.uri,
        afterUrl: asset.uri,
      });
      setLoading(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('mode', mode);
      appendImageAsset(formData, asset);
      const job = await apiRequest<StudioJobResult>('/api/v1/studio/jobs', {
        method: 'POST',
        body: formData,
      });
      const completed = await waitForStudioJob(job);
      if (completed.status !== 'succeeded' || !completed.afterUrl) {
        throw new Error(
          ['pending', 'running', 'retry_later'].includes(completed.status)
            ? 'İşlem beklenenden uzun sürdü. Biraz sonra tekrar dene.'
            : completed.error ?? 'Görsel hazırlanamadı.',
        );
      }
      setResult(completed);
      await refreshMe();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  }

  async function shareResult() {
    if (!result?.afterUrl) return;
    setError(null);
    try {
      if (await Sharing.isAvailableAsync()) {
        if (result.afterUrl.startsWith('file:')) {
          await Sharing.shareAsync(result.afterUrl);
          return;
        }
        const extension = mode === 'white_bg' ? 'jpg' : 'png';
        const target = `${FileSystem.cacheDirectory}hoflayn-${result.id}.${extension}`;
        const downloaded = await FileSystem.downloadAsync(
          result.afterUrl,
          target,
        );
        await Sharing.shareAsync(downloaded.uri);
        return;
      }
      await Share.share({ message: result.afterUrl });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Paylaşım açılamadı.');
    }
  }

  async function chooseCoverProduct() {
    if (!result?.processedAssetId) return;
    setError(null);
    try {
      const rows = await apiRequest<ProductDto[]>('/api/v1/products');
      setProducts(rows);
      setShowProducts(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ürünler alınamadı.');
    }
  }

  async function assignCover(productId: string) {
    if (!result?.processedAssetId) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/v1/products/${productId}/cover`, {
        method: 'PATCH',
        body: JSON.stringify({ coverImageId: result.processedAssetId }),
      });
      setShowProducts(false);
      setSuccess('Hazırlanan görsel ürün kapağı olarak kaydedildi.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kapak atanamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="AI Fotoğraf">Stüdyo</AppTitle>
      <Text style={styles.help}>
        Ürün fotoğrafını seç; arka planı kaldır veya beyaz ürün görseli hazırla.
        Her işlem 1 kredi kullanır.
      </Text>
      {isDemo ? (
        <View style={styles.demoBanner}>
          <Text style={styles.demoTitle}>Etkileşimli demo</Text>
          <Text style={styles.help}>
            Galerinden bir fotoğraf seçebilirsin. Demo kredi harcamaz ve görseli
            sunucuya yüklemez.
          </Text>
        </View>
      ) : null}

      <Card>
        <View style={styles.modes}>
          {(
            [
              ['remove_bg', 'Arka planı kaldır · 1 kredi'],
              ['white_bg', 'Beyaz arka plan · 1 kredi'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={[styles.mode, mode === value && styles.modeSelected]}>
              <Text
                style={[
                  styles.modeText,
                  mode === value && styles.modeTextSelected,
                ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {asset ? (
          <Image
            source={{ uri: asset.uri }}
            style={styles.image}
            alt="Seçilen ürün fotoğrafı"
          />
        ) : (
          <Pressable style={styles.placeholder} onPress={() => void chooseImage()}>
            <Text style={styles.placeholderText}>Galeriden fotoğraf seç</Text>
          </Pressable>
        )}
        <PrimaryButton
          label={asset ? 'Başka fotoğraf seç' : 'Fotoğraf seç'}
          onPress={() => void chooseImage()}
        />
        {error ? <Message>{error}</Message> : null}
        <PrimaryButton
          label="Fotoğrafı hazırla · 1 kredi"
          loading={loading}
          disabled={!asset}
          onPress={() => void submit()}
        />
      </Card>

      {result?.afterUrl ? (
        <Card>
          <Text style={styles.resultTitle}>Hazır</Text>
          <Image
            source={{ uri: result.afterUrl }}
            style={styles.image}
            alt="Hazırlanan ürün fotoğrafı"
          />
          <Text style={styles.help}>
            {result.creditsCharged} kredi kullanıldı · {result.provider}
          </Text>
          {success ? <Message tone="success">{success}</Message> : null}
          <PrimaryButton
            label="Görseli paylaş"
            onPress={() => void shareResult()}
          />
          {result.processedAssetId ? (
            <SecondaryButton
              label="Ürüne kapak olarak ata"
              onPress={() => void chooseCoverProduct()}
            />
          ) : null}
          {showProducts ? (
            <View style={styles.productList}>
              <Text style={styles.resultTitle}>Ürün seç</Text>
              {products.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.productRow}
                  disabled={loading}
                  onPress={() => void assignCover(product.id)}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.assignText}>Kapak yap</Text>
                </Pressable>
              ))}
              {!products.length ? (
                <Text style={styles.help}>Önce bir ürün oluşturmalısın.</Text>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  demoBanner: {
    gap: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.softBrand,
  },
  demoTitle: { color: colors.brand, fontWeight: '800' },
  modes: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 11,
  },
  modeSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  modeText: { color: colors.ink, textAlign: 'center', fontWeight: '600' },
  modeTextSelected: { color: colors.brand },
  placeholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  placeholderText: { color: colors.brand, fontWeight: '700' },
  image: { width: '100%', height: 280, borderRadius: 16, resizeMode: 'contain' },
  resultTitle: { color: colors.success, fontSize: 18, fontWeight: '700' },
  productList: { gap: 8 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  productName: { flex: 1, color: colors.ink, fontWeight: '700' },
  assignText: { color: colors.brand, fontWeight: '700' },
});
