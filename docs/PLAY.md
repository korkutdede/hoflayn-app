# Google Play — yayın checklist

Play Store’a **internal testing** ile başla. App Store ve public web listing ayrı işler.
Bu dosya kodun hazırladığı kısmı ve senin Console’da yapman gerekenleri ayırır.

Üretim web origin: `https://hoflayn.app`  
Paket adı: `app.hoflayn.mobile`  
Sürüm: `1.0.0` / `versionCode` 1 (`mobile/app.json`)

## Kod tarafı (repo)

- [x] Açık kayıt: `ALLOWLIST_EMAILS` boşsa gate `open`
- [x] Kayıtta şartlar onayı + gizlilik / şartlar linki
- [x] Kamuya açık sayfalar: `/privacy`, `/terms`, `/account-delete`
- [x] Uygulama içi hesap silme yolu (Hesap sekmesi → web sayfası)
- [x] `EXPO_PUBLIC_ENABLE_EXTERNAL_BILLING=false` (Play Billing onayı yokken dış Stripe checkout yok)
- [x] `mobile/eas.json` — `preview` APK, `production` AAB, submit track `internal`
- [x] Fotoğraf izni: `expo-image-picker` (galeri; kamera izni yok)

## Üretim env (Vercel / hosting)

Play incelemesi gizlilik sayfasını **canlı HTTPS** üzerinden açar. Web production açık olmalı.

```
NEXT_PUBLIC_APP_URL=https://hoflayn.app
ALLOWLIST_EMAILS=          # boş / tanımsız
BETA_SIGNUPS_CLOSED=       # tanımsız veya false
BETA_MAX_TENANTS=          # tanımsız
```

Mobil production:

```
EXPO_PUBLIC_API_URL=https://hoflayn.app
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_ENABLE_EXTERNAL_BILLING=false
```

Supabase Auth redirect: `https://hoflayn.app/auth/callback` ve Expo scheme `hoflayn://auth/callback`.

### Google ile giriş (web + Android)

Aynı Google Cloud **web** OAuth client hoflayn.com ile paylaşılır. Key’i Google vermez; Console’daki mevcut client’a app origin + Supabase callback eklenmezse giriş patlar.

1. Supabase → Authentication → Providers → Google → Client ID + Secret’ı yapıştır, Enable.
2. Google Cloud Console (aynı client):
   - Authorized JavaScript origins: `https://hoflayn.app`, local için `http://localhost:3000`
   - Authorized redirect URIs: `https://ywskviqzrzfpiglvhozl.supabase.co/auth/v1/callback`
   - PHP callback’i silme: `https://hoflayn.com/functions/core/auth/endpoints/google-callback.php`
3. Supabase → Authentication → URL Configuration → Redirect URLs:  
   `https://hoflayn.app/auth/callback`, `http://localhost:3000/auth/callback`, `hoflayn://auth/callback`
4. Vercel’e `HOFLAYN_WEB_BRIDGE_*` değerlerini koy (PHP ile birebir). Bridge altyapı olarak dolu kalsın; vitrin feed / SSO yok.
5. Native Play Google butonu (ayrı Android client, paket `app.hoflayn.mobile` + SHA-1) sonraki dilim. Şu an sistem tarayıcısı + web client.

Google girişi yalnızca Supabase kullanıcısı açar. Ürün aktarımı, aynı e-posta ile hoflayn.com satıcı hesabı varsa çalışır.

Stripe live cutover ayrı karar: [`STRIPE_CUTOVER.md`](STRIPE_CUTOVER.md). Play AAB’de harici ödeme **kapalı** kalsın.

## Veritabanı

`npm run db:migrate` session pooler (5432) ve gerekirse direct host’u dener. Transaction pooler (6543) DDL yapamaz. Proje duraklatılmışsa veya connection string eskiyse pooler `tenant/user not found` döner — Dashboard’dan güncel **Session** veya **Direct** URI yapıştır.

Sonra:

```
npm run db:seed
```

`0015` (`users.locale`, `tenants.content_locale`) ve `0016` (`tenants.currency`) uygulanmadan dil/para birimi ayarları runtime’da düşer.

## Hazırlanan mağaza varlıkları (repo)

Yapıştırılacak metin ve grafikler:

- Listing + Data safety cevapları: [`mobile/store/android/LISTING.txt`](../mobile/store/android/LISTING.txt)
- Yüksek çözünürlüklü ikon: `mobile/store/android/icon-512.png` (512×512)
- Feature graphic: `mobile/store/android/feature-graphic.png` (1024×500)
- Production AAB env: `mobile/eas.json` → `EXPO_PUBLIC_API_URL=https://hoflayn.app`, billing kapalı

Grafikleri yenilemek için: `node scripts/play-store-assets.cjs`

## EAS build (senin hesabın)

1. Expo hesabı: https://expo.dev — `npm i -g eas-cli` sonra `eas login`
2. `cd mobile` → `eas init` (bir kez; `extra.eas.projectId` yazar)
3. İç test APK: `eas build -p android --profile preview`
4. Mağaza AAB: `eas build -p android --profile production`
5. Play’e yükleme: `eas submit -p android --profile production`  
   veya AAB’yi Play Console → Internal testing → Create release

İlk imza: Google Play App Signing’i aç; upload key’i EAS yönetebilir (`eas credentials`).

## Play Console (hesabın olmalı)

Developer hesabı (~$25, bir kez). Uygulama oluştur → paket `app.hoflayn.mobile`.

### Store listing (TR)

- Uygulama adı: Hoflayn
- Kısa açıklama (~80 karakter)
- Uzun açıklama
- Uygulama ikonu 512×512 (`mobile/assets/images/icon.png` kaynak)
- Feature graphic 1024×500
- Telefon ekran görüntüleri en az 2 (ürün listesi, stüdyo, kayıt)
- Gizlilik politikası URL: `https://hoflayn.app/privacy`
- Kategori: Business / Productivity
- E-posta: `destek@hoflayn.app`

### Policy

- **Data safety:** e-posta, ad, atölye/ürün verisi, yüklenen ürün fotoğrafları (Supabase Storage). Analitik SDK yok. Ödeme Play build’de toplanmaz.
- **Account deletion:** `https://hoflayn.app/account-delete` + uygulama içi Hesap → Hesabı sil
- **Content rating** anketi (IARC)
- Hedef kitle: 18+ (iş uygulaması; çocuklara yönelik değil)
- Ads: no
- Sensitive permissions: sadece medya okuma (ürün fotoğrafı)

### Test

Internal testing track’e kendi Google hesabını tester ekle. Kapalı test / açık test sonra.

Play, production API’ye bağlanan bir build ister. `preview` APK LAN IP ile olmasın; production profile `EXPO_PUBLIC_API_URL=https://hoflayn.app` kullanmalı (`eas secret` veya `mobile/.env`).

## Bu repodan yapılamayanlar

Play Console kaydı, EAS proje ID, imza, ekran görüntüleri, Data safety formu, content rating, **Submit for review**. Bunlar senin Expo + Play hesaplarında.

App Store: ayrı listing, Apple Developer, `eas build -p ios` — şimdilik kapsam dışı.
