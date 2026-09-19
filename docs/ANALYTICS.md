# Analytics Lite (Stage 13)

Beta ölçümü **kendi verimizden** okunur: yapılandırılmış console log + veritabanı.
Üçüncü parti analytics (PostHog, GA, Segment) **yok** — kapalı beta için gereksiz
bağımlılık ve KVKK yüzeyi.

İki katman:

| Katman | Ne için | Nerede |
|--------|---------|--------|
| `funnel.*` log satırları | Gerçek zamanlı: "şu an ne oldu?" | Vercel logs |
| `npm run beta:funnel` | Kohort: "10 üreticinin kaçı nerede takıldı?" | Postgres |

## Funnel olayları

Hepsi `logFunnel()` ile yazılır, `tenantId` zorunlu (`src/lib/observability/log.ts`).

| Event | Ne zaman | Kaynak |
|-------|----------|--------|
| `funnel.signup` | Yeni tenant provision edildi (ilk kayıt) | `lib/auth/actions.ts`, `app/auth/callback/route.ts` |
| `funnel.onboarding_done` | Atölye adı + kategori kaydedildi | `onboarding/_actions/complete-onboarding.ts` |
| `funnel.studio_job` | Stüdyo işi çalıştı (`remove_bg` / `white_bg`) | `studio/_actions/create-studio-job.ts` |
| `funnel.product_created` | İlk/yeni ürün kartı | `products/_actions/product-actions.ts` |
| `funnel.caption_generated` | Instagram caption üretildi | `products/_actions/instagram-caption-actions.ts` |
| `funnel.checkout_started` | Stripe Checkout oturumu açıldı | `lib/billing/stripe.ts` |

Aktivasyon tanımı (beta hedefi): **signup → studio_job** aynı oturumda.  
Kuzey yıldızı: `caption_generated` — üç modülün birlikte çalıştığı tek an.

### Log formatı

Tek satır JSON, `event` alanı ile filtrelenir:

```json
{"ts":"2026-07-26T12:00:00.000Z","level":"info","event":"funnel.studio_job","tenantId":"…","jobId":"…","operation":"white_bg","status":"succeeded"}
```

Vercel'de filtre: `funnel.` (ops gürültüsü olan `ai_job.*`, `billing.webhook` ayrı kalır).

Log'lara **asla** e-posta gövdesi, görsel içeriği, prompt metni veya API anahtarı
yazılmaz. `tenantId` / `jobId` gibi referanslar yeterli.

## Kohort raporu

```bash
npm run beta:funnel                # son 14 gün, tablo
npm run beta:funnel -- 30          # son 30 gün
npm run beta:funnel -- 30 --json   # JSON (docs/RETRO.md'ye yapıştırmak için)
```

Çıktı iki bölüm:

1. **Funnel (tenants)** — her adımda kaç atölye, yüzdesiyle
2. **Per tenant** — atölye başına foto / ürün / caption / hata / kredi / ödeme

Ayrıca onboarding'i bitirip hiç foto işlemeyen atölyeler ayrı listelenir —
kapalı beta'da en kritik sinyal budur.

### Veri kaynakları

| Adım | Tablo |
|------|-------|
| signup | `tenants.created_at` |
| onboarding_done | `tenants.craft_category is not null` |
| studio_job | `ai_jobs` (succeeded, `remove_bg`/`white_bg`) |
| product_created | `products` |
| caption_generated | `ai_jobs` (succeeded, `generate_caption`) |
| checkout_started | `billing_customers` (Stripe müşterisi yalnızca checkout açılınca oluşur) |
| paid | `subscriptions.status in ('active','trialing')` |

`billing_events` tablosunun tenant kolonu yok (provider inbox / idempotency
defteri), bu yüzden ödeme niyeti `billing_customers` üzerinden ölçülür.

## Ne ölçmüyoruz (bilinçli)

- Sayfa görüntüleme, tıklama, oturum süresi — kapalı beta'da 10 kişi için gürültü
- Cihaz / tarayıcı kırılımı
- Isı haritası, session replay

Bunlara ihtiyaç public launch'ta doğar; o noktada ayrı bir ADR ile karar verilir.

## Beta sonrası

Kohort raporu + `docs/BETA.md` gözlem notları birlikte `docs/RETRO.md` şablonuna
işlenir. Oradaki kararlar `docs/ROADMAP.md` v1 kapsamını besler. Karar girdileri:
hangi adımda düşüş var, hangi modül hiç kullanılmadı, kredi fiyatı doğru mu
(`docs/COSTING.md`).
