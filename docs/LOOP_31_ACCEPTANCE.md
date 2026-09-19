# Loop 31 acceptance — Beta Launch Readiness Freeze

## Freeze rule

**Smoke GO + manuel kritik yollar yeşil olmadan “beta açıldı / davet gitti” deme.**

Özet: [`docs/BETA_READINESS.md`](BETA_READINESS.md)

## What shipped (docs)

| Doc | Change |
|-----|--------|
| `BETA_READINESS.md` | Single GO/NO-GO + bilinçli sınırlar + destek/davet |
| `LAUNCH.md` | Freeze bağlama; güncel scope; smoke önce |
| `BETA.md` | Sınırlar + senaryolar güncel; readiness önkoşul |
| `BETA_INVITE.md` | Son davet şablonu (mobil + demo + destek) |
| `BETA_SMOKE.md` | Freeze çıkış kriteri |
| `ADR-013` | Context: shipped surface |
| `README.md` | Readiness link |

## Verify

```text
npm run beta:smoke -- --dry-run
# docs-only loop; no product code change required
```

## Loop 32 prompt (do not run until Loop 31 accepted)

```text
LOOP 32 — Post-Beta Retro Kickoff

Hoflayn kapalı beta kapanışı için retrospektifi başlat.

1. docs/RETRO.md şablonunu güncelle: funnel komutları, başarı ölçütleri, bilinçli sınırlar referansı.
2. beta:funnel çıktısını RETRO’ya yapıştırma adımlarını netleştir (json + insan özeti).
3. ADR-013 için Accepted / Revise karar kutusu (tarih + gerekçe alanı).
4. ROADMAP v1 adaylarını RETRO kanıtına bağla (kanıtsız özellik ekleme yasağı).
5. LOOP 33 promptunu paylaş. Commit oluşturma.

Kapsam dışı: yeni ürün özelliği, pricing değişikliği, servis çıkarma.
Bitince retro adımlarını ve LOOP 33 promptunu paylaş. Commit oluşturma.
```
