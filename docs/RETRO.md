# Beta Retrospektif — Şablon

Kapalı beta (10 üretici) bitince **bu dosyayı doldur**. Boş bırakılan alan
"veri yok" demektir; tahminle doldurma — v1 kararları buradan çıkacak.

> Doldurma sırası: önce sayılar (`npm run beta:funnel -- 30 --json`), sonra
> üretici notları (`docs/BETA.md` gözlem formu), en son yorum.

---

## 0. Künye

| Alan | Değer |
|------|-------|
| Beta penceresi | ____ – ____ (gg.aa.yyyy) |
| Davetli üretici | ____ / 10 |
| Kayıt olan | ____ |
| Stripe modu | test / live |
| Rapor tarihi | ____ |

## 1. Funnel

`npm run beta:funnel -- 30` çıktısını buraya yapıştır:

```
(çıktı)
```

| Adım | Sayı | Dönüşüm | Hedef | Sonuç |
|------|-----:|--------:|------:|-------|
| signup | ___ | — | 10 | |
| onboarding_done | ___ | ___% | %90 | |
| studio_job (**aktivasyon**) | ___ | ___% | %70 | |
| product_created | ___ | ___% | %50 | |
| caption_generated (**kuzey yıldızı**) | ___ | ___% | %40 | |
| checkout_started | ___ | ___% | %30 | |
| paid | ___ | ___% | 3 | |

**Aktivasyon (signup → ilk stüdyo işi): ___%** — beta başarı eşiği %70
(`docs/BETA.md`).

### En büyük düşüş

| Adım çifti | Kayıp | Neden (kanıt) |
|------------|------:|---------------|
| ____ → ____ | ___ üretici | |

Onboarding'i bitirip hiç foto işlemeyenler (script uyarısı):

- ____

Bu grup için ne biliyoruz? (destek e-postası, log, konuşma)

## 2. Modül kullanımı

| Modül | Kullanan üretici | Toplam işlem | Hata | Yorum |
|-------|-----------------:|-------------:|-----:|-------|
| `remove_bg` | ___ | ___ | ___ | |
| `white_bg` | ___ | ___ | ___ | |
| `generate_description` | ___ | ___ | ___ | |
| `generate_caption` | ___ | ___ | ___ | |
| Ürün kartı | ___ | ___ | — | |
| Hoflayn Web export | ___ | ___ | ___ | |

Hiç kullanılmayan modül var mı? Varsa v1'de **kesilecek mi**, yoksa keşfedilebilirlik
sorunu mu? (Kanıt olmadan "iyileştirelim" deme.)

## 3. Kredi ve marj gerçekleşmesi

`docs/COSTING.md` tahminleri vs gerçek:

| Operasyon | Tahmini USD | Gerçek USD (ort.) | Sapma | Kredi | Gerçek marj |
|-----------|------------:|------------------:|------:|------:|------------:|
| `remove_bg` | $0.0020 | | | 1 | |
| `white_bg` | $0.0020 | | | 1 | |
| `generate_description` | $0.0025 | | | 2 | |
| `generate_caption` | $0.0015 | | | 2 | |

Gerçek USD kaynağı: `ai_usage_logs` (7/30 gün ortalaması).  
`ai_cost_variance` uyarısı kaç kez düştü? ____

| Soru | Cevap |
|------|-------|
| Toplam provider maliyeti (beta) | $____ |
| Toplam tahsil edilen kredi | ____ |
| Ücretsiz krediyle yakılan | $____ |
| Bir üreticinin ortalama tüketimi | ____ kredi |
| 3 hediye kredi yeterli miydi? | evet / hayır — neden |
| Maliyet capleri devreye girdi mi? | ____ kez |

**Karar:** kredi fiyatları aynı kalsın mı? (`CREDIT_COSTS`) — evet / hayır, gerekçe:

## 4. Üretici sesi

Her üretici için `docs/BETA.md` gözlem formundan aktar. Alıntıları **birebir** yaz;
parafraz karar kalitesini düşürür.

### Üretici 1 — ____ (kategori: ____)

| Alan | Not |
|------|-----|
| İlk "aha" anı | |
| Takıldığı yer | |
| En çok kullandığı | |
| Hiç dokunmadığı | |
| Ödeme isteği | evet / hayır |
| NPS | __/10 |

> "____" (birebir alıntı)

### Üretici 2 — ____

*(1–10 arası tekrarla)*

### Tekrar eden temalar

| Tema | Kaç üretici | Örnek alıntı |
|------|------------:|--------------|
| | | |

Bir istek **3+ üreticiden** geldiyse v1 adayıdır. 1 kişiden geldiyse not düş, yapma.

## 5. Teknik olaylar

| Olay | Kaç kez | Etki | Kök neden | Aksiyon |
|------|--------:|------|-----------|---------|
| `ai_job.failed` | | | | |
| Provider timeout / circuit open | | | | |
| Rate limit tetiklendi | | | | |
| Maliyet capi | | | | |
| Billing webhook hatası | | | | |
| Bridge export hatası | | | | |

Inline job runtime (ADR-009) beta'da sorun çıkardı mı? Kaç istek zaman aşımına
uğradı? → `docs/ROADMAP.md` extract eşiklerini besler.

## 6. Kararlar

Her karar: **kanıt → karar → sahip**. Kanıtı olmayan satır silinir.

| # | Kanıt | Karar | Nereye |
|---|-------|-------|--------|
| 1 | | | ROADMAP v1 / ADR-013 / çöp |
| 2 | | | |
| 3 | | | |

### v1'e alınanlar
- ____

### Ertelenenler (kanıt yetersiz)
- ____

### Kesilenler (kullanılmadı)
- ____
