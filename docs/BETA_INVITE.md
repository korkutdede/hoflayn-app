# Kapalı Beta Davet Rehberi

Hedef: **10 üretici**, kontrollü davet. Public signup kapalı (`ALLOWLIST_EMAILS` dolu).

**Göndermeden önce:** [`BETA_READINESS.md`](BETA_READINESS.md) freeze **GO**.

## Davet e-postası (kopyala-yapıştır)

**Konu:** Hoflayn kapalı beta davetin

```
Merhaba,

Hoflayn’ın kapalı beta’sına seni davet ediyoruz.
El yapımı / butik ürünlerin için fotoğraf hazırlama, ürün kartı,
stok/satış takibi ve (Pro’da) açıklama / caption gibi günlük işleri
tek yerden deneyeceksin.

Web: https://<APP_URL>/signup
Mobil: uygulamada “Davetli hesap oluştur”
Davetli e-posta: <EMAIL>
(Kayıt bu e-posta ile olmalı — “Daveti kontrol et” adımını kullan.)

İlk adımlar:
1) Atölye adını ve üretim alanını kaydet
2) Stüdyoda bir ürün fotoğrafını işle (arka plan / beyaz ekran)
3) Bir ürün ekle; istersen stok hareketi veya basit satış dene
4) (Pro) Caption veya açıklama üret → onayla

Demo: uygulamada “Uygulamayı keşfet” (kayıt gerekmez; veriler örnektir)

Stripe test ödeme (test mode ise):
Kart 4242 4242 4242 4242 · gelecek tarih · herhangi CVC

Destek: <SUPPORT_EMAIL>
Sorun olursa uygulamadaki destek bağlantısından veya bu adresten yaz.

Teşekkürler,
Hoflayn
```

## Ne var / ne yok

### Var (beta)
- Stüdyo: `remove_bg`, `white_bg`
- Ürün, stok ledger, düşük stok, satış + void, home pulse
- Writer / SEO / katalog / etiket (Pro modülleri)
- Billing: Pro + kredi paketleri
- Hoflayn Web Bridge export (PHP endpoint varsa)
- Davet: e-posta allowlist

### Yok (bilinçli — söyle)
- Lifestyle sahneleri, Hoflayn Web çift yön, takım UI, push, tam muhasebe/POS,
  kısmi iade, davet kodu / referral, public signup

Ayrıntı: [`BETA_READINESS.md`](BETA_READINESS.md)

## Stripe test kartı (test mode)

- Kart: `4242 4242 4242 4242`
- Tarih: gelecek ay/yıl · CVC: 3 hane
- Live: [`STRIPE_CUTOVER.md`](STRIPE_CUTOVER.md)

## Ops checklist

1. Env:
   ```
   ALLOWLIST_EMAILS="a@atelier.com,b@studio.com,..."
   SUPPORT_EMAIL="destek@hoflayn.app"
   # opsiyonel: BETA_MAX_TENANTS="10"
   ```
2. `npm run beta:smoke` (+ `--gates`) → **GO**
3. [`BETA_READINESS.md`](BETA_READINESS.md) checkbox’ları
4. Davet e-postasını gönder
5. Funnel: `npm run beta:funnel`
6. Gate kapatmak / public açmak: `ALLOWLIST_EMAILS` boşalt (yeniden deploy) — bu kapalı beta sonudur

## Destek

- `SUPPORT_EMAIL` → `getSupportEmail()` / mailto (“Sorun mu var?”, auth, invite hataları)
- Varsayılan: `destek@hoflayn.app`
- Inbox açılış süresince izlenir
