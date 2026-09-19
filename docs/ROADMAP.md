# v1 Roadmap

Durum: **beta verisi bekleniyor** · Posture: modular monolith, extract-on-signal
(ADR-008)

Bu doküman iki bölüm: (A) v1 kapsam kuralları ve aday listesi, (B) mimari
çıkarma eşikleri. Kapsam satırları `docs/RETRO.md` doldurulduktan sonra
**kanıtla** kesinleşir.

## Kural: kanıt olmadan kapsam yok

Her v1 maddesi şu üçünü taşımak zorunda:

| Alan | Anlamı |
|------|--------|
| **Kanıt** | Funnel sayısı, 3+ üretici talebi, veya ölçülmüş teknik sinyal |
| **Etki** | Hangi funnel adımını hareket ettirir |
| **Maliyet** | Provider USD + geliştirme süresi kabaca |

Kanıt kolonu boşsa madde "Beklemede" bölümüne düşer. Solo geliştirici için en
pahalı hata, kimsenin istemediği şeyi cilalamaktır.

## A. v1 kapsamı

### A1. Kesinleşmiş (beta'dan bağımsız, teknik borç)

Bunlar beta sonucundan bağımsız yapılır çünkü public launch'ın önkoşulu:

| Madde | Neden | Durum |
|-------|-------|-------|
| Stripe live cutover | Gerçek gelir olmadan v1 yok (`docs/STRIPE_CUTOVER.md`) | Kod hazır, env kararı bekliyor |
| Aylık kredi yenileme | Pro: `invoice.paid` → period-key idempotent grant | ✅ Stage 15 |
| Şifre sıfırlama akışı | `/forgot-password` + `/reset-password` + allowlist | ✅ Stage 15 |
| Hesap/atölye ayarları sayfası | `/settings` — ad, kategori, destek, silme mailto | ✅ Stage 15 |
| Storage temizliği | Ürün sil/kapak değiş → `ttlAt` orphan; `npm run storage:gc` | ✅ Stage 15 |

### Free plan kredi yenileme (karar)

**Free plan otomatik aylık kredi almaz.** `FREE_MONTHLY_CREDITS` (90) katalog
metadata'sıdır; sadece Pro `invoice.paid` period grant çalışır. Free tarafında
yalnızca signup `free_grant` (`FREE_INITIAL_CREDITS` = 3) vardır.

Gerekçe: free aylık yenileme CAC'yi sürekli hale getirir; beta maliyeti kontrol
altında kalsın. Public launch sonrası talep + abuse sinyali gelirse ayrı ADR.

### A2. Beta kanıtına bağlı adaylar

`RETRO.md` bölüm 6'dan buraya taşınır. Şablon:

| # | Aday | Kanıt (RETRO ref) | Etkilediği adım | Karar |
|---|------|-------------------|-----------------|-------|
| 1 | | | | v1 / beklet / kes |
| 2 | | | | |
| 3 | | | | |

Ön değerlendirme (beta öncesi hipotez — **karar değil**):

| Aday | Hipotez | Doğrulayacak sinyal |
|------|---------|---------------------|
| Lifestyle / vitrin sahnesi | En çok istenecek özellik | 3+ üretici talebi + `remove_bg` doygunluğu |
| Toplu foto işleme | Tek tek yükleme yorucu | Üretici başına >10 stüdyo işi |
| Instagram doğrudan paylaşım | Kopyala-yapıştır sürtünme yaratıyor | Caption üretip paylaşmayanlar |
| Katalog PDF | Toptan müşteriye gönderim | Talep gelirse |
| Hoflayn Web çift yön senkron | Stok/fiyat geri akışı | Export kullanan üretici sayısı |

### A3. Yapmayacaklarımız (v1'de kesin hayır)

Bunlar iyi fikir olabilir; v1'de **yapılmayacak** ve tartışma yeniden açılmayacak.
Gerekçe her satırda yazılı olduğu için "acaba" turu yok.

| Yapmayacağız | Gerekçe |
|--------------|---------|
| Mobil uygulama | Responsive web yeterli; iki platform solo geliştiriciyi durdurur |
| Takım üyeliği / çoklu kullanıcı | Şema hazır (`memberships`), talep yok. Şema desteklediği için sonra ucuz |
| Kendi model eğitimi / fine-tune | Provider abstraction (P4) zaten swap sağlıyor; maliyet ve zaman uçurumu |
| Turborepo / paket ayrımı | ADR-001; tek deploy hâlâ hızlı |
| Ayrı mikroservisler | ADR-008; eşikler B bölümünde, hiçbiri tetiklenmedi |
| PHP marketplace migrasyonu | P6/ADR-006 — asla. Bridge tek entegrasyon yolu |
| Gerçek zamanlı işbirliği / websocket | Kullanım senaryosu tek kullanıcı, tek atölye |
| Üçüncü parti analytics (PostHog/GA) | `docs/ANALYTICS.md` — kendi verimiz yeterli, KVKK yüzeyi küçük kalsın |
| Genel amaçlı AI sohbet arayüzü | Üretici somut çıktı istiyor, sohbet değil |
| Çoklu dil (i18n) | Hedef kitle TR; İngilizce talebi ölçülene kadar hayır |

## B. Extract-on-signal eşikleri

ADR-008 "ölçülmüş sinyal" der ama sayı vermezdi. Bu tablo o boşluğu kapatır.
**Eşik tetiklenmeden çıkarma yapılmaz**; tetiklenirse yapılmaması için gerekçe
yazılır.

### B1. AI job worker (en yakın aday)

Bugün: `processAiJob` istek içinde **inline** çalışıyor (ADR-009 kuyruğu
tanımladı, henüz worker yok).

| Sinyal | Eşik | Nasıl ölçülür | Bugün |
|--------|-----:|---------------|------:|
| İstek zaman aşımı | Ayda **>5** AI kaynaklı timeout | Vercel fonksiyon logları, `ai_job.failed` | 0 |
| p95 job süresi | **>20 sn** | `ai_usage_logs.latency_ms` p95 | ~2 sn (mock/rembg) |
| Eşzamanlı job | Dakikada **>30** | `ai_jobs.created_at` dakikalık sayım | <1 |
| Uzun operasyon eklenmesi | Tek bir op **>30 sn** beklenen (video, SDXL batch) | Tasarım aşamasında bilinir | Yok |

**İlk tetiklenende:** Inngest veya Trigger.dev ile `processAiJob`'ı arka plana al.
Kod hazır — `enqueueAiJob` zaten `createAiJob` + `processAiJob` ayrımı yapıyor,
kredi rezervasyonu job satırında. Değişecek tek şey tetikleyici.

**Ne yapılmayacak:** kendi kuyruk altyapımızı (Redis + worker + supervisor)
yazmak. Yönetilen servis, solo geliştirici için doğru seçim.

### B2. Rate limit / circuit breaker durumu

Bugün: **in-memory** (`src/lib/observability/rate-limit.ts`, AI circuit breaker).
Tek instance varsayımı.

| Sinyal | Eşik | Bugün |
|--------|-----:|------:|
| Vercel eşzamanlı instance | Düzenli **>1** (rate limit kaçağı görülür) | Beta trafiğinde tek |
| Rate limit atlatma şikâyeti | **1** doğrulanmış olay | 0 |

**Tetiklenince:** Upstash Redis'e taşı. Arayüz (`checkRateLimit`) aynı kalır.

### B3. Veritabanı

| Sinyal | Eşik | Aksiyon |
|--------|-----:|---------|
| Yavaş sorgu | p95 **>500 ms** | Index ekle (önce `EXPLAIN`, sonra index) |
| Bağlantı tükenmesi | Pooler doygunluğu uyarısı | Transaction pooler + `max` ayarı gözden geçir |
| Tablo boyutu | `ai_jobs` **>5M** satır | Arşiv tablosu / partition |

### B4. Modül çıkarma (ayrı servis)

| Sinyal | Eşik | Bugün |
|--------|-----:|------:|
| Bir modül CPU/bellek maliyeti | Toplam faturanın **>%40**'ı | Ölçülmedi |
| Bağımsız ölçekleme ihtiyacı | Bir modül diğerlerinin **>5x** trafiği | Yok |
| Takım büyümesi | **3+** geliştirici aynı dosyalarda çakışıyor | 1 geliştirici |
| Farklı runtime zorunluluğu | Python/GPU gerektiren iş | Yok |

Hiçbiri tetiklenmedi. Modüler monolit devam.

### B5. Ölçüm ritmi

| Ne zaman | Ne bakılır |
|----------|------------|
| Haftalık (beta) | `npm run beta:funnel`, `ai_job.failed` sayısı |
| Aylık | Bu tablodaki tüm eşikler, `docs/COSTING.md` sapması |
| Her yeni AI operasyonu | B1 p95 tahmini — 30 sn üstüyse worker önce gelir |

## C. v1 sonrası (fikir deposu)

Kanıt beklemeden buraya not düş, kapsamı kirletme:

- Toptan/B2B fiyat listesi
- Etsy / Shopify export adaptörü (bridge deseni tekrar kullanılır)
- Üretici topluluk/akademi içeriği
- Otomatik ürün fotoğrafı kalite skoru
