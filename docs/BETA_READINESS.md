# Beta Launch Readiness Freeze (Loop 31)

**Kural:** `npm run beta:smoke` (**GO**) + manuel kritik yollar yeşil olmadan  
kapalı betayı **“açıldı / davet gönderildi”** sayma. Soft uyarılar (allowlist boş,  
`EXPO_PUBLIC_API_URL` eksik) kapalı beta için **NO-GO** kabul edilir.

Tek özet bu dosya. Ayrıntılar:

| Belge | Rol |
|-------|-----|
| [`LAUNCH.md`](LAUNCH.md) | Ops / env / Stripe / storage checklist |
| [`BETA_SMOKE.md`](BETA_SMOKE.md) | Otomatik + manuel duman testleri |
| [`BETA.md`](BETA.md) | 10 üretici senaryo + başarı ölçütleri |
| [`BETA_INVITE.md`](BETA_INVITE.md) | Davet şablonu + destek |
| [`RETRO.md`](RETRO.md) | Beta **sonrası** (Loop 32) — açılışta doldurma |

## GO / NO-GO özeti

| # | Kapı | Komut / kanıt | Durum |
|---|------|---------------|-------|
| 1 | Otomatik smoke | `npm run beta:smoke` → **GO** | ☐ |
| 2 | Kalite kapıları | `npm run beta:smoke -- --gates` → **GO** | ☐ |
| 3 | Kapalı kapı | `ALLOWLIST_EMAILS` dolu (10 e-posta) | ☐ |
| 4 | Destek | `SUPPORT_EMAIL` set; inbox izleniyor | ☐ |
| 5 | Manuel kritik | A1–A4, S1, P1–P2, V1, B1 ([`BETA_SMOKE.md`](BETA_SMOKE.md)) | ☐ |
| 6 | Cihaz | En az 1 davetli gerçek cihaz (Expo LAN) | ☐ |
| 7 | Launch ops | [`LAUNCH.md`](LAUNCH.md) §1–6 tamam | ☐ |

**Açılış kararı:** 1–7 hepsi ☐ → işaretlenmeden davet maili **gönderilmez**.

## Bilinçli sınırlar — beta’da YOK

Aşağıdakiler beta’da **yoktur**; talep gelirse “bilinçli sınır / post-beta” de.

| Yok | Not |
|-----|-----|
| Lifestyle / vitrin AI sahneleri | Sadece `remove_bg`, `white_bg` |
| Hoflayn Web **çift yön** sync | Yalnızca export stub + inbound status (varsa) |
| Takım üyeliği / çoklu kullanıcı UI | Şema `memberships` var; beta tek kullanıcı |
| Ayrı AI worker servisi | Inline / deferred job; extract ADR-013 |
| Push / e-posta bildirim | Yok |
| Tam muhasebe / POS / vergi | Satış ledger lite |
| Kısmi iade | Sadece tam sale void |
| Referral / davet kodu | Allowlist e-posta |
| Üçüncü parti analytics (GA/PostHog) | `docs/ANALYTICS.md` |
| Public open signup | `ALLOWLIST_EMAILS` boş = herkese açık = **kapalı beta değil** |

### Beta’da VAR (freeze scope)

- Mobil + web: auth, onboarding, stüdyo, ürün, SEO yardımı, katalog/etiket (Pro), stok hareketi, satış + void + özet, düşük stok, home pulse, kredi paketleri, kullanım kırılımı, davet kapısı
- Stripe: Pro + `credits_50` / `credits_200`
- Bridge: opsiyonel Hoflayn Web export

## Destek (son hali)

- Env: `SUPPORT_EMAIL` (yoksa `destek@hoflayn.app`)
- Kod: `getSupportEmail()` / `supportMailto()` — dashboard “Sorun mu var?”, auth badge, invite hata metinleri
- Davet reddi ve beta destek aynı adrese gider
- Açılışta biri inbox’u izler (iş saatleri net)

## Davet (son hali)

Şablon: [`BETA_INVITE.md`](BETA_INVITE.md).  
Mobil: karşılama → **Davetli hesap oluştur** → **Daveti kontrol et** → kayıt.  
Demo: **Uygulamayı keşfet** (invite yok).

## Freeze sonrası

1. Davet maillerini gönder  
2. Funnel: `npm run beta:funnel`  
3. Kapanışta [`RETRO.md`](RETRO.md) + ADR-013 kararı (Loop 32)
