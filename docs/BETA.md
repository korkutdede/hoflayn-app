# Beta — 10 üretici test planı

Hedef: Hoflayn Web satıcı profilinden 10 el yapımı üretici ile 2 haftalık kapalı beta.
Başarı: en az **7/10** üretici ilk oturumda ≥1 stüdyo işlemi tamamlar; en az **3** ücretli
dönüşüm veya kredi paketi denemesi (test kartı OK).

**Açılış öncesi:** [`BETA_READINESS.md`](BETA_READINESS.md) freeze GO.

## Önkoşullar

- [ ] `npm run db:migrate` + `npm run db:seed`
- [ ] `npm run beta:smoke` → GO (`--gates` önerilir)
- [ ] `/api/health` → `ready: true`
- [ ] Storage policies uygulandı (`supabase/storage-policies.sql`)
- [ ] Auth e-posta veya Google çalışıyor
- [ ] `ALLOWLIST_EMAILS` + `SUPPORT_EMAIL` set
- [ ] Stripe test mode + webhook (ödeme senaryoları için)

## Senaryolar

| # | Senaryo | Adımlar | Beklenen |
|---|---------|---------|----------|
| 1 | Kayıt + onboarding | Davetli signup → atölye adı + kategori | Tabs / home pulse |
| 2 | Stüdyo remove_bg | Foto yükle → arka plan temizle | Before/after, kredi −1 |
| 3 | Stüdyo white_bg | Aynı foto → beyaz ekran | JPEG sonuç, kredi −1 |
| 4 | Kredi tükenmesi | Bakiye 0 iken işlem | Net “yetersiz kredi” + billing CTA |
| 5 | Ürün + stok | Yeni ürün → stok gir/çık | Ledger + bakiye |
| 6 | Satış + void | Manuel satış → iptal | Stok out sonra in; summary |
| 7 | AI açıklama (Pro) | Writer → üret → onayla | Onaysız yazılmaz |
| 8 | Writer kapalı (Free) | Free tenant ile AI yazı | Blocker; prod’da işlem yok |
| 9 | Kredi paketi | Hesap → 50 kredi (test) | Webhook → bakiye +50 |
| 10 | Hoflayn Web export | Bridge env set / unset | Env yok: net hata; var: pending |

Duman matrisi: [`BETA_SMOKE.md`](BETA_SMOKE.md).

## Gözlem notları (üretici başına)

- Kategori / zanaat: ________
- İlk “aha” anı (hangi adım): ________
- Takıldığı yer: ________
- Ödeme isteği (evet/hayır): ________
- NPS (0–10): ________

## Bilinen bilinçli sınırlar (beta’da YOK)

- Lifestyle / vitrin AI sahneleri (yalnız `remove_bg` + `white_bg`)
- Hoflayn Web **çift yön** sync (export stub / webhook ile sınırlı)
- Takım üyeliği UI (çoklu kullanıcı yönetimi yok)
- Ayrı AI worker mikroservisi
- Push / e-posta bildirim
- Tam muhasebe, POS, vergi, kısmi iade
- Davet **kodu** / referral (yalnız allowlist e-posta)
- Public open signup (`ALLOWLIST_EMAILS` boş = kapalı beta değil)
- Üçüncü parti product analytics (GA/PostHog)

Tam freeze tablosu: [`BETA_READINESS.md`](BETA_READINESS.md) · Mimari erteleme: [`ADR-013-post-beta-architecture.md`](ADR-013-post-beta-architecture.md)

## Çıkış kriteri (beta “geçti”)

1. Senaryo 1–4 (+ satış/stok kritikleri) kritik bug’sız (≥8/10 üretici)
2. Ortalama destek yükü < 15 dk / üretici / hafta
3. Provider maliyeti / aktif üretici ölçülüp kredi fiyatı gözden geçirilir
4. [`RETRO.md`](RETRO.md) doldurulur (post-beta)
