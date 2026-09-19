# ADR-013 — Beta sonrası mimari duruş

## Status

Proposed (Stage 14) — beta kapanışında `docs/RETRO.md` doldurulunca **Accepted**
veya revize edilir. Karar tarihi: ____

## Context

Stage 0–13 ile kapalı beta çalışır durumda: auth + tenancy + RLS, kredi defteri,
AI job omurgası, stüdyo (`remove_bg` / `white_bg`), ürün kartı, writer (açıklama +
Instagram caption + SEO), katalog/etiket (Pro), stok/satış lite, Stripe billing,
Hoflayn Web bridge (tek yön), maliyet capleri, davet kapısı, home pulse, kullanım
şeffaflığı, smoke/readiness freeze (`docs/BETA_READINESS.md`) ve funnel ölçümü.

Beta bitince baskı iki yönden gelir:

1. **Ürün tarafı** — üreticilerden gelen istekleri v1'e doldurma isteği
2. **Mimari taraf** — "artık gerçek kullanıcı var, servisleri ayıralım" refleksi

Bu ADR ikisine de bir çerçeve koyar: neyi **taşıdık** (v1'e giriyor), neyi
**ertelediğimiz** ve erteleme kararının hangi ölçümle bozulacağı.

Karar bağlamı değişmedi: **tek geliştirici**, hedef 100k üretici *ufukta* ama
bugünkü gerçek 10 üretici. ADR-008'in extract-on-signal duruşu geçerli; eksik
olan şey sinyallerin sayısallaştırılmasıydı.

## Decision

### D1. Modüler monolit devam eder

Beta sonrası hiçbir modül ayrı servise çıkarılmaz. `docs/ROADMAP.md` B bölümündeki
eşiklerin **hiçbiri** tetiklenmedi (tek geliştirici, tek instance, p95 job süresi
saniyeler mertebesinde).

Çıkarma kararı artık tartışma değil ölçüm işi: eşik tablosu ROADMAP B'de yaşar,
aylık gözden geçirilir.

### D2. AI worker çıkarma **ertelendi**, tetikleyicisi tanımlandı

`processAiJob` inline kalır. ADR-009 kuyruk modelini tanımlamıştı; kod şekli
(job satırı + `enqueueAiJob` ayrımı + kredi rezervasyonunun job'a bağlı olması)
zaten worker'a hazır. Erken çıkarmanın getirisi yok, işletme maliyeti var.

Bozulma koşulu (ROADMAP B1'den, herhangi biri yeter):
ayda >5 timeout · p95 >20 sn · dakikada >30 job · >30 sn süren yeni operasyon.

Tetiklendiğinde yönetilen servis (Inngest / Trigger.dev) kullanılır; kendi kuyruk
altyapımız yazılmaz.

### D3. In-memory rate limit / circuit breaker **kabul edilmiş borç**

Tek instance varsayımı beta ölçeğinde doğru. Çok instance sinyali görülürse
(veya bir kez doğrulanmış atlatma olayı) Upstash Redis'e taşınır; çağıran arayüz
(`checkRateLimit`) değişmez.

### D4. Bridge tek yönlü kalır

P6/ADR-006 korunur. Çift yönlü senkron ancak export'u fiilen kullanan üretici
sayısı anlamlı olursa değerlendirilir. "Tek veri modeli" hedefi hâlâ reddediliyor;
iki sistem ayrı bounded context.

### D5. Ölçüm kendi verimizde kalır

Üçüncü parti analytics eklenmez (`docs/ANALYTICS.md`). Structured log +
`beta:funnel` kohort raporu v1 kararları için yeterli kanıt üretti. Bu, hem KVKK
yüzeyini hem bağımlılığı küçük tutar.

### D6. v1 kapsamı kanıt kuralına bağlanır

Bir özellik v1'e ancak funnel sayısı, 3+ üretici talebi veya ölçülmüş teknik
sinyalle girer (`docs/ROADMAP.md` A). "Yapmayacaklarımız" listesi (ROADMAP A3)
bağlayıcıdır — yeni kanıt olmadan yeniden açılmaz.

### D7. Launch öncesi teknik borçlar v1 blocker'ı

Beta sonucundan bağımsız olarak public launch öncesi kapatılır: Stripe live
cutover, aylık kredi yenileme, şifre sıfırlama, hesap ayarları, storage temizliği
(ROADMAP A1). Bunlar "özellik" değil, ürünün eksik yarısı.

## Consequences

**Olumlu**

- Tek deploy birimi korunur; solo geliştirici hızı düşmez
- Çıkarma tartışmaları sayıya bağlandı, fikir turuna dönmez
- v1 kapsamı kanıt gerektirdiği için hayali özellik cilalanmaz
- Worker'a geçiş ucuz kaldı (tetikleyici değişimi, mimari değişim değil)

**Olumsuz / kabul edilen risk**

- Inline AI işleme, uzun bir operasyon eklendiği gün **anında** blocker olur —
  bu yüzden her yeni AI operasyonunda p95 tahmini zorunlu (ROADMAP B5)
- In-memory limitler çok instance'ta sızdırır; sinyal görülene kadar kabul
- Tek yönlü bridge, pazaryeri tarafında stok tutarsızlığı riski taşır; üretici
  uyarılır, otomatik çözülmez

**Bozulma koşulu (bu ADR ne zaman revize edilir)**

ROADMAP B'deki herhangi bir eşik tetiklendiğinde, veya ikinci geliştirici
katıldığında, veya RETRO kararları D1–D6'dan biriyle çelişen kanıt ürettiğinde.
