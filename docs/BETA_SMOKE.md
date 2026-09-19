# Closed Beta Smoke Checklist

Kapalı beta öncesi duman testi. Otomatik kısım: `npm run beta:smoke` (env + health + opsiyonel gates).  
Manuel kısım: aşağıdaki tablolar (cihaz / gerçek hesap).

Daha geniş senaryo planı: [`BETA.md`](BETA.md) · Davet: [`BETA_INVITE.md`](BETA_INVITE.md)

## Otomatik GO/NO-GO

```bash
npm run beta:smoke           # env + DB/preflight + /api/health
npm run beta:smoke -- --gates   # + typecheck, lint, build, mobile, expo export
npm run beta:smoke -- --dry-run # yalnızca checklist yazdır (exit 0)
```

| Sonuç | Anlam |
|-------|--------|
| **GO** | Required env + DB + health ready |
| **NO-GO** | Eksik env, DB/health fail veya ( `--gates` ) kalite kapısı fail |

## Env (otomatik)

Required: `NEXT_PUBLIC_APP_URL`, Supabase URL/anon/service, `DATABASE_URL`.  
Billing yarı yapılandırılmışsa NO-GO (preflight ile aynı).  
Beta: `ALLOWLIST_EMAILS` dolu olmalı (kapalı beta); boşsa uyarı (gate açık).  
Opsiyonel: `BETA_SIGNUPS_CLOSED`, `BETA_MAX_TENANTS`, Stripe, AI keys.

## Manuel — Auth / Invite

| # | Yol | Beklenen |
|---|-----|----------|
| A1 | Welcome → Uygulamayı keşfet | Demo home; kayıt gerekmez |
| A2 | Davetli hesap oluştur → listede olmayan e-posta | `invite_required` TR mesaj |
| A3 | Daveti kontrol et → listede e-posta | OK → signup |
| A4 | Login + onboarding | Atölye adı / kategori → tabs |
| A5 | `BETA_SIGNUPS_CLOSED` (opsiyonel) | Signup kapalı mesajı |

## Manuel — Stüdyo

| # | Yol | Beklenen |
|---|-----|----------|
| S1 | Foto yükle → remove_bg / white_bg | Sonuç + kredi düşümü |
| S2 | Kredi 0 iken işlem | Net yetersiz kredi |

## Manuel — Ürün / Stok

| # | Yol | Beklenen |
|---|-----|----------|
| P1 | Yeni ürün | Liste + detay |
| P2 | Stok giriş / çıkış / sayım | `stock_movements` + bakiye |
| P3 | Düşük stok eşiği | Ürünler / satışlar bandı |

## Manuel — Satış

| # | Yol | Beklenen |
|---|-----|----------|
| V1 | Manuel satış | Stok out + liste + pulse bugün |
| V2 | Satış iptal | voided + stok in |
| V3 | Summary | Voided düşmez completed’e |

## Manuel — Billing / Usage

| # | Yol | Beklenen |
|---|-----|----------|
| B1 | Hesap → kredi paketleri | Stripe Checkout (test) |
| B2 | Return success | Banner + bakiye poll |
| B3 | Member satın al | Yönetici mesajı / 403 |
| B4 | Nereye harcandı? | byOperation TR etiketler |

## Manuel — Mobil nabız

| # | Yol | Beklenen |
|---|-----|----------|
| H1 | Ana Sayfa pulse | Bugün satış, düşük stok, kredi, 7g kullanım satırı |
| H2 | Deep link Satışlar / Ürünler / Hesap | Doğru ekran |

## API smoke (curl / mobil proxy)

Base: `$NEXT_PUBLIC_APP_URL` veya `$EXPO_PUBLIC_API_URL`

| Endpoint | Not |
|----------|-----|
| `GET /api/health` | `ready: true` |
| `POST /api/v1/invite/check` | email body |
| `GET /api/v1/invite/check` | gate status |
| `GET /api/v1/me` | Bearer |
| `GET /api/v1/home/pulse` | Bearer |
| `GET /api/v1/usage` | `byOperation` |
| `GET /api/v1/billing` | packs |
| `GET/POST …/products`, `…/stock-movements`, `…/sales` | tenant scoped |

## Çıkış kriteri (beta açılışı)

1. `npm run beta:smoke -- --gates` → **GO**
2. Manuel A1–A4, S1, P1–P2, V1, B1 (test mode) yeşil
3. En az bir davetli gerçek cihaz (LAN Expo) smoke
4. Özet freeze: [`BETA_READINESS.md`](BETA_READINESS.md) — aksi halde davet **yok**
