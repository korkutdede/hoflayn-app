import { router, type Href } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import {
  AppTitle,
  Card,
  PrimaryButton,
  Screen,
} from '@/src/components/ui';
import { colors } from '@/src/theme';

export default function ToolsScreen() {
  return (
    <Screen>
      <AppTitle eyebrow="Atölye araçları">Hızlı hesaplar</AppTitle>
      <Text style={styles.help}>
        Gider, fiyat ve desi AI kredisi harcamaz. Katalog ve etiket 1 kredi
        ister.
      </Text>

      <Card>
        <Text style={styles.title}>Gider defteri</Text>
        <Text style={styles.help}>
          Malzeme ve atölye harcamalarını satır satır yaz; bu ay ve bugüne
          kadarki toplamı gör.
        </Text>
        <PrimaryButton
          label="Gider defterini aç"
          onPress={() => router.push('/tools-profit')}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Fiyat belirle</Text>
        <Text style={styles.help}>
          Birim maliyet, marj ve hedef satış fiyatını hesapla; senaryoyu ürüne
          uygula.
        </Text>
        <PrimaryButton
          label="Fiyat belirlemeyi aç"
          onPress={() => router.push('/tools-pricing')}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Kargo / Desi</Text>
        <Text style={styles.help}>
          Ölçü ve ağırlıktan desi ile faturalanan ağırlığı hesapla. Taşıyıcı
          bölenini değiştirebilirsin.
        </Text>
        <PrimaryButton
          label="Desi hesabını aç"
          onPress={() => router.push('/tools-desi')}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Barkod / etiket</Text>
        <Text style={styles.help}>
          Code128, QR veya GS1-128 etiket PDF’i. Boyut, kopya ve fiyat
          gösterimini seçip paylaş.
        </Text>
        <PrimaryButton
          label="Etiket sihirbazını aç"
          onPress={() => router.push('/labels-wizard' as Href)}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Satışlar</Text>
        <Text style={styles.help}>
          Manuel satış kaydı ve stok çıkışı. CSV import API iskeleti hazır;
          Hoflayn Web ayrı kalır.
        </Text>
        <PrimaryButton
          label="Satışları aç"
          onPress={() => router.push('/sales' as Href)}
        />
      </Card>

      <Card>
        <Text style={styles.title}>PDF katalog</Text>
        <Text style={styles.help}>
          Seçili ürünlerden paylaşılabilir katalog PDF’i üret. 1 kredi harcar;
          üretim arka planda tamamlanır.
        </Text>
        <PrimaryButton
          label="Katalogları aç"
          onPress={() => router.push('/catalogs')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  help: { color: colors.muted, lineHeight: 22 },
});
