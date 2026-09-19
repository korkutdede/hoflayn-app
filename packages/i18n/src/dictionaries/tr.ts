/**
 * Source dictionary. Keys are flat and dotted so a message missing from any
 * other locale is a type error rather than a runtime surprise.
 */
export const tr = {
  "app.name": "Hoflayn",
  "app.description":
    "El yapımı ve butik üreticiler için AI destekli çalışma masası.",

  "locale.tr": "Türkçe",
  "locale.en": "English",

  "landing.title": "Atölyen için AI çalışma masası",
  "landing.subtitle":
    "Ürün fotoğrafı, açıklama ve katalog — üreticiler için, operasyon yükü olmadan.",
  "landing.relation":
    "Bu uygulama hoflayn.com pazaryerinin çalışma masasıdır. Vitrindeki ürünler değil; fotoğraf, açıklama, stok ve katalog işlerin burada. Pazaryerinde satıcıysan aynı e-postayı kullan.",
  "landing.cta.signup": "Ücretsiz başla",
  "landing.cta.login": "Giriş yap",
  "landing.cta.marketplace": "hoflayn.com vitrini",

  "auth.email.label": "E-posta",
  "auth.email.placeholder": "sen@atolye.com",
  "auth.password.label": "Şifre",
  "auth.or": "veya",
  "auth.google": "Google ile devam et",

  "auth.login.title": "Giriş yap",
  "auth.login.description": "Atölye çalışma masana devam et — Hoflayn",
  "auth.login.submit": "Giriş yap",
  "auth.login.submitting": "Giriş yapılıyor…",
  "auth.login.forgot": "Şifremi unuttum",
  "auth.login.noAccount": "Hesabın yok mu?",
  "auth.login.signupLink": "Kayıt ol",

  "auth.signup.title": "Hesap oluştur",
  "auth.signup.description":
    "İlk {credits} kredin hediye — ürün fotoğrafını hemen işle",
  "auth.signup.name.label": "Adın",
  "auth.signup.name.placeholder": "Ayşe",
  "auth.signup.submit": "Kayıt ol",
  "auth.signup.submitting": "Kaydediliyor…",
  "auth.signup.hasAccount": "Zaten hesabın var mı?",
  "auth.signup.loginLink": "Giriş yap",
  "auth.signup.success":
    "Kayıt alındı. E-posta onayını açtıysan gelen kutunu kontrol et; aksi halde giriş yapabilirsin.",
  "auth.signup.explore": "Giriş yapmadan keşfet",
  "auth.invite.check": "E-postayı kontrol et",

  "auth.forgot.title": "Şifremi unuttum",
  "auth.forgot.description":
    "Davetli e-postana sıfırlama bağlantısı gönderilir.",
  "auth.forgot.submit": "Sıfırlama bağlantısı gönder",
  "auth.forgot.submitting": "Gönderiliyor…",
  "auth.forgot.backToLogin": "Girişe dön",
  "auth.forgot.success":
    "E-posta listendeyse sıfırlama bağlantısı gönderildi. Gelen kutunu kontrol et.",

  "auth.reset.title": "Yeni şifre",
  "auth.reset.description":
    "E-postadaki bağlantıdan geldiysen yeni şifreni belirle.",
  "auth.reset.password.label": "Yeni şifre",
  "auth.reset.confirm.label": "Şifre tekrar",
  "auth.reset.submit": "Şifreyi güncelle",
  "auth.reset.submitting": "Kaydediliyor…",
  "auth.reset.expiredPrefix": "Bağlantı süresi dolduysa",
  "auth.reset.expiredLink": "yeniden iste",

  "auth.error.invalidForm": "Geçersiz form",
  "auth.error.invalidEmail": "Geçerli bir e-posta gir",
  "auth.error.passwordMin": "Şifre en az {min} karakter olmalı",
  "auth.error.passwordMismatch": "Şifreler eşleşmiyor",
  "auth.error.noSession":
    "Oturum bulunamadı. E-postadaki sıfırlama bağlantısını yeniden aç.",
  "auth.error.google":
    "Google ile giriş şu an açılamadı. Biraz sonra tekrar dene.",
  "auth.error.callback":
    "Google oturumu doğrulanamadı. Tekrar dene.",

  "beta.badge": "Kapalı beta",
  "beta.inviteRequired": "Davetli e-posta gerekli",
  "beta.problem": "Sorun mu var?",
  "beta.notInvited": "Bu e-posta davet listesinde değil. Destek için",
  "beta.mail.subject": "[Hoflayn Beta] Davet / destek",
  "beta.mail.body": "Merhaba,\n\nKapalı beta hakkında:\n",
  "beta.error.closed":
    "Kapalı beta kayıtları şu an durduruldu. Bilgi için {support} adresine yaz.",
  "beta.error.exhausted":
    "Kapalı beta kontenjanı doldu. Yeni davet için {support} adresine yaz.",
  "beta.error.notInvited":
    "Hoflayn şu an davetli kapalı beta. Bu e-posta listede değil. Davet için {support} adresine yaz.",

  "settings.language.title": "Dil",
  "settings.language.description":
    "Arayüz dili. Seçimin hesabına kaydedilir, diğer cihazlarında da geçerli olur.",

  "nav.dashboard": "Dashboard",
  "nav.studio": "Stüdyo",
  "nav.products": "Ürünler",
  "nav.billing": "Plan",
  "nav.settings": "Ayarlar",
  "nav.signOut": "Çıkış",

  "error.eyebrow": "Bir şeyler ters gitti",
  "error.title": "Çalışma masası yüklenemedi",
  "error.description":
    "Sayfayı yenilemeyi dene. Sorun sürerse çıkış yapıp tekrar giriş yap.",
  "error.retry": "Tekrar dene",

  "credits.insufficient":
    "Yetersiz kredi (gerekli: {required}, mevcut: {available})",

  "welcome.eyebrow": "Kapalı beta · ilk adımlar",
  "welcome.title": "Çalışma masanı kur",
  "welcome.progress": "{done}/{total} tamam",
  "welcome.step.studioPhoto.title": "Ürün fotoğrafı işle",
  "welcome.step.studioPhoto.hint": "Stüdyoda remove_bg veya white_bg",
  "welcome.step.productCreated.title": "Ürün ekle",
  "welcome.step.productCreated.hint": "Kataloguna ilk kartı oluştur",
  "welcome.step.captionGenerated.title": "Instagram caption üret",
  "welcome.step.captionGenerated.hint": "Ürün detayından üret ve kopyala",

  "dashboard.eyebrow": "Çalışma masası",
  "dashboard.slugLabel": "Slug",
  "dashboard.credits.title": "Kredi bakiyesi",
  "dashboard.credits.costs":
    "remove_bg = {removeBg} · white_bg = {whiteBg} · açıklama = {description} · Instagram = {caption} kredi",
  "dashboard.credits.cta": "Plan ve kredi",
  "dashboard.usage.title.one": "Son {count} gün kullanım",
  "dashboard.usage.title.other": "Son {count} gün kullanım",
  "dashboard.usage.description":
    "Atölyene ait AI maliyeti (provider USD tahmini) ve harcanan kredi.",
  "dashboard.usage.credits": "Kredi",
  "dashboard.usage.usd": "~USD",
  "dashboard.usage.jobs": "İşlem",
  "dashboard.usage.succeeded": "Başarılı",
  "dashboard.studio.title": "AI Fotoğraf Stüdyosu",
  "dashboard.studio.description":
    "Ürün fotoğrafını yükle, arka planı temizle veya beyaz ekran üret.",
  "dashboard.studio.cta": "Stüdyoyu aç",
  "dashboard.testJob.title": "AI omurgası (test)",
  "dashboard.testJob.description":
    "Mock provider ile kredi + job lifecycle duman testi.",
  "dashboard.testJob.submit": "Test AI job (remove_bg · mock)",
  "dashboard.testJob.submitting": "İşleniyor…",
  "dashboard.testJob.result":
    "Job {status}: {jobId}… · provider={provider} · kredi={credits}",
  "dashboard.testJob.error.noDatabase":
    "DATABASE_URL tanımlı değil. Supabase bağlantısını .env.local'e ekle.",
  "dashboard.jobs.empty.title": "Henüz AI işlemi yok",
  "dashboard.jobs.empty.description":
    "Bir ürün oluştur; AI açıklaması ve Instagram caption üret veya Stüdyo'da fotoğraf işle.",
  "dashboard.jobs.empty.action": "Ürünlere git",
  "dashboard.support.description":
    "Beta sürecindeyiz — takıldığın her şeyi bize yaz, hızlıca dönelim.",
  "dashboard.support.cta": "Destek ekibine yaz",
  "dashboard.support.mail.subject": "[Hoflayn Beta] Destek — {slug}",
  "dashboard.support.mail.body":
    "Atölye: {name}\nKullanıcı: {email}\n\nSorunun / önerini yaz:\n",

  "products.eyebrow": "Katalog",
  "products.new": "Yeni ürün",
  "products.backToList": "Listeye dön",
  "products.card.title": "Atölye ürünleri",
  "products.card.description":
    "SaaS kataloğun — Hoflayn Web'a tek tıkla gönderebilirsin.",
  "products.empty.title": "Henüz ürün yok",
  "products.empty.description":
    "İlk ürün kartını oluştur; AI açıklaması ve Instagram caption üret, stüdyo görselini kapak yap.",
  "products.empty.action": "İlk ürünü oluştur",

  "products.form.cardTitle": "Ürün kartı",
  "products.form.cardDescription":
    "Kapak için stüdyo çıktılarından seçebilirsin.",
  "products.form.name": "Ürün adı",
  "products.form.description": "Açıklama",
  "products.form.price": "Satış fiyatı",
  "products.form.cost": "Maliyet",
  "products.form.stock": "Stok",
  "products.form.category": "Kategori",
  "products.form.categoryPlaceholder": "Örn. Seramik kase",
  "products.form.tags": "Etiketler",
  "products.form.tagsPlaceholder": "virgülle ayır",
  "products.form.cover": "Kapak görseli (Stüdyo çıktıları)",
  "products.form.coverEmpty":
    "Henüz stüdyo görseli yok. Önce Stüdyo'da bir fotoğraf işle.",
  "products.form.coverNone": "Yok",
  "products.form.saving": "Kaydediliyor…",
  "products.form.create": "Ürün oluştur",
  "products.form.update": "Değişiklikleri kaydet",
  "products.form.delete": "Ürünü sil",
  "products.form.deleting": "Siliniyor…",
  "products.form.deleteConfirm":
    "Bu ürünü silmek istediğine emin misin? Kapak görseli yetim olarak işaretlenir.",

  "products.detail.editTitle": "Ürün düzenle",
  "products.detail.aiApproved": "Açıklama AI ile üretildi (onaylandı).",
  "products.detail.manualOrAi": "Manuel veya AI açıklama ekleyebilirsin.",
  "products.detail.caption.title": "Instagram caption",
  "products.detail.caption.description":
    "Paylaşım metni ve hashtag önerisi üret; kontrol edip panoya kopyala. Ürüne otomatik yazılmaz.",
  "products.detail.description.title": "AI ürün açıklaması",
  "products.detail.description.description":
    "Önce üret, kontrol et, sonra ürüne kaydet — otomatik yazılmaz.",
  "products.detail.bridge.title": "Hoflayn Web pazaryeri",
  "products.detail.bridge.description":
    "Ürünü dışa aktarır; PHP tarafı admin onayına düşürür. Kaynak gerçeklik hoflayn.app'te kalır.",

  "products.saved": "Kaydedildi",
  "products.error.nameMin": "Ürün adı en az {min} karakter",
  "products.error.invalidPrice": "Fiyat geçersiz",
  "products.error.coverNotOwned": "Kapak görseli bu atölyeye ait değil",
  "products.error.createFailed": "Ürün oluşturulamadı",
  "products.error.saveFailed": "Kayıt başarısız",
  "products.error.invalidProduct": "Geçersiz ürün",
  "products.error.notFound": "Ürün bulunamadı",
  "products.error.deleteRole": "Ürün silmek için yönetici yetkisi gerekli.",

  "ai.balance": "Bakiye: {credits}",
  "ai.generating": "Üretiliyor…",
  "ai.writer.disabled": "AI Yazı modülü planında kapalı.",
  "ai.writer.devBypass":
    "Geliştirmede mock ile deneyebilirsin (entitlement bypass).",
  "ai.writer.upgrade": "Pro plana geçerek aç.",
  "ai.writer.captionBypass":
    "AI Yazı entitlement kapalı; geliştirme bypass'ı ile mock kullanılacak.",
  "ai.writer.captionProOnly":
    "Bu özellik Pro AI Yazı modülünde kullanılabilir.",

  "ai.description.material": "Malzeme",
  "ai.description.materialPlaceholder": "Örn. taş çamur",
  "ai.description.audience": "Hedef kitle",
  "ai.description.audiencePlaceholder": "Örn. hediye arayanlar",
  "ai.description.features": "Özellikler",
  "ai.description.featuresPlaceholder": "Örn. elde şekillendirilmiş, mat glaze",
  "ai.description.generate": "AI açıklama (−{credits} kredi)",
  "ai.description.generateMock": "Mock dene (−{credits} kredi)",
  "ai.description.preview": "Önizleme — onaylamadan ürüne yazılmaz",
  "ai.description.save": "Açıklamayı ürüne kaydet",
  "ai.description.saved": "Açıklama ürüne kaydedildi.",

  "ai.caption.tone": "Ton",
  "ai.caption.tone.samimi": "Samimi",
  "ai.caption.tone.hikaye": "Hikâye odaklı",
  "ai.caption.tone.sade": "Sade",
  "ai.caption.generate": "Instagram caption üret (−{credits} kredi)",
  "ai.caption.preview": "Önizleme — ürüne otomatik yazılmaz",
  "ai.caption.copy": "Onayla ve kopyala",
  "ai.caption.copied": "Caption panoya kopyalandı.",
  "ai.caption.copyFailed":
    "Pano izni alınamadı. Metni elle seçip kopyalayabilirsin.",

  "ai.error.productName": "Ürün adı gerekli",
  "ai.error.writerRequired":
    "AI Yazı modülü planında kapalı. Pro'ya geç veya geliştirmede DEV_UNLOCK_WRITER=true kullan.",
  "ai.error.descriptionFailed": "AI açıklama üretilemedi",
  "ai.error.confirmMissing": "Onay için AI çıktısı eksik",
  "ai.error.updateFailed": "Ürün güncellenemedi",
  "ai.error.captionInvalid": "Geçersiz ürün veya ton seçimi",
  "ai.error.captionWriterRequired":
    "Instagram caption için AI Yazı modülü gerekli. Pro plana geçebilirsin.",
  "ai.error.captionFailed": "Instagram caption üretilemedi",

  "bridge.status.notSent": "Gönderilmedi",
  "bridge.status.draft": "Taslak",
  "bridge.status.pending": "Onay bekliyor",
  "bridge.status.published": "Yayında",
  "bridge.status.rejected": "Reddedildi",
  "bridge.status.failed": "Başarısız",
  "bridge.status.archived": "Arşiv",
  "bridge.externalId": "Dış ID",
  "bridge.viewOnWeb": "Hoflayn Web'da görüntüle",
  "bridge.localChanges": "Yerel değişiklik bekliyor",
  "bridge.lastAttempt": "Son deneme: {date}",
  "bridge.lastSuccess": "Son başarılı aktarım: {date}",
  "bridge.send": "Hoflayn Web'e gönder",
  "bridge.resend": "Hoflayn Web'e tekrar gönder",
  "bridge.sending": "Gönderiliyor…",
  "bridge.archive": "Hoflayn Web vitrinden kaldır",
  "bridge.archiveConfirm": "Ürün Hoflayn Web vitrinden arşivlensin mi?",
  "bridge.sent": "Gönderildi · durum: {status}",
  "bridge.rejectionReason": "Hoflayn Web gerekçesi: {reason}",
  "bridge.lastError": "Son hata: {error}",
  "bridge.error.role": "Marketplace aktarımı için yönetici yetkisi gerekli.",
  "bridge.error.exportFailed": "Dışa aktarım başarısız",
  "bridge.error.notConfigured":
    "Hoflayn Web Bridge yapılandırılmamış. HOFLAYN_WEB_BRIDGE_URL ve HOFLAYN_WEB_BRIDGE_API_KEY gerekli.",
  "bridge.error.badResponse": "Hoflayn Web geçersiz bir yanıt döndürdü.",
  "bridge.error.timeout":
    "Hoflayn Web yanıt vermedi ({seconds} sn zaman aşımı).",
  "bridge.error.unreachable": "Hoflayn Web bağlantısı kurulamadı: {message}",
  "bridge.error.rejectedByWeb": "Hoflayn Web isteği reddetti: {message}",
  "bridge.error.syncLinkMissing": "Bu ürün için eşleşme kaydı bulunamadı.",
  "bridge.error.missingFields":
    "Vitrine çıkarmak için şu alanları tamamla: {fields}.",

  "bridge.field.name": "ürün adı",
  "bridge.field.price": "fiyat",
  "bridge.field.description": "açıklama",
  "bridge.field.category": "kategori",
  "bridge.field.coverImage": "kapak görseli",

  "studio.title": "Ürün fotoğrafını işle",
  "studio.disabled.title": "Fotoğraf Stüdyosu kapalı",
  "studio.disabled.description":
    "Bu modül planında etkin değil. Plan sayfasından Pro'ya geçebilirsin.",
  "studio.disabled.action": "Planı gör",
  "studio.noCredits.title": "Kredin bitti",
  "studio.noCredits.description":
    "Stüdyo işlemleri kredi harcar. Ücretsiz bakiyen bittiyse paket al veya Pro'ya geç.",
  "studio.noCredits.action": "Kredi / plan",
  "studio.card.title": "Yükle ve işle",
  "studio.card.description":
    "Arka plan temizleme veya beyaz ekran — sonuçları yan yana karşılaştır.",
  "studio.mode": "Mod",
  "studio.mode.remove_bg.title": "Arka plan temizle",
  "studio.mode.remove_bg.desc": "Şeffaf PNG kesim",
  "studio.mode.white_bg.title": "Beyaz ekran",
  "studio.mode.white_bg.desc": "Kesim + beyaz zemin",
  "studio.mode.cost": "{desc} · {credits} kredi",
  "studio.image": "Ürün fotoğrafı",
  "studio.upload.cta": "Sürükle-bırak veya tıkla",
  "studio.upload.hint": "JPEG / PNG / WebP · max {mb} MB",
  "studio.process": "İşle (−{credits} kredi)",
  "studio.processing": "İşleniyor…",
  "studio.balanceLabel": "Bakiye",
  "studio.compare": "Karşılaştırma",
  "studio.download": "İndir",
  "studio.before": "Önce",
  "studio.after": "Sonra",
  "studio.alt.preview": "Önizleme",
  "studio.alt.original": "Orijinal",
  "studio.alt.result": "AI sonucu",
  "studio.error.moduleOff":
    "Fotoğraf Stüdyosu planında kapalı. Planını yükselt.",
  "studio.error.noDatabase": "DATABASE_URL tanımlı değil.",
  "studio.error.rateLimit":
    "Çok fazla istek. Dakikada en fazla {limit} işlem yapabilirsin. {seconds} sn sonra tekrar dene.",
  "studio.error.invalidMode": "Geçersiz mod seçimi.",
  "studio.error.noFile": "Bir ürün fotoğrafı seç.",
  "studio.error.badType": "Sadece JPEG, PNG veya WebP yükleyebilirsin.",
  "studio.error.tooLarge": "Dosya en fazla {mb} MB olabilir.",
  "studio.error.jobFailed": "İşlem başarısız",

  // Craft categories. These also feed AI prompts and catalog exports, so they
  // follow the tenant's content locale rather than the UI locale.
  "craft.ceramics.label": "Seramik",
  "craft.ceramics.description": "Çanak, vazo, tabak — kil ve glaze odaklı parçalar",
  "craft.candle.label": "Mum / Kokulu ürün",
  "craft.candle.description": "Mum, sabun, oda kokusu ve benzeri küçük üretim",
  "craft.wood.label": "Ahşap",
  "craft.wood.description": "Ahşap oyma, kesim, mobilya aksesuarı",
  "craft.epoxy.label": "Epoksi",
  "craft.epoxy.description": "Epoksi masa, takı, dekoratif döküm",
  "craft.textile.label": "Tekstil",
  "craft.textile.description": "Dikiş, örgü, baskı, kumaş ürünleri",
  "craft.other.label": "Diğer",
  "craft.other.description": "Listede yoksa buradan başla; sonra netleştiririz",
  "craft.error.required": "En az bir üretim alanı seç.",

  // Onboarding
  "onboarding.title": "Atölyeni tanıt",
  "onboarding.description":
    "Tek adım. Pazaryerinde satıcıysan aynı e-postayı kullan — ürün aktarımı buna bağlanır.",
  "onboarding.name": "Atölye adı",
  "onboarding.namePlaceholder": "Örn. Kil & Form",
  "onboarding.craftLegend": "Ne üretiyorsun?",
  "onboarding.craftHint":
    "Kategori, AI yazı ve önerileri atölyene yaklaştırmamıza yardım eder.",
  "onboarding.submit": "Devam et",
  "onboarding.nextSteps.title": "Sonraki adımlar",
  "onboarding.nextSteps.description":
    "Kapalı beta’da ilk oturumun üç kısa yolu — sırayla gitmen yeter.",
  "onboarding.step.studio.title": "Stüdyo",
  "onboarding.step.studio.body":
    "Bir ürün fotoğrafı yükle; arka planı temizle veya beyaz ekran üret.",
  "onboarding.step.product.title": "Ürün",
  "onboarding.step.product.body":
    "Kataloguna ilk ürün kartını ekle; istersen stüdyo çıktısını kapak yap.",
  "onboarding.step.caption.title": "Caption",
  "onboarding.step.caption.body":
    "Ürün detayından Instagram caption üret, kontrol et, panoya kopyala.",
  "onboarding.error.nameMin": "Atölye adı en az {min} karakter olmalı",
  "onboarding.error.noDatabase":
    "DATABASE_URL tanımlı değil. Supabase bağlantısını ekle.",

  // Settings
  "settings.eyebrow": "Hesap",
  "settings.workshop.title": "Atölye",
  "settings.workshop.description":
    "Ad ve kategori AI yazı tonunu ve dashboard etiketini etkiler.",
  "settings.craftLegend": "Zanaat kategorisi",
  "settings.save": "Kaydet",
  "settings.saving": "Kaydediliyor…",
  "settings.saved": "Atölye ayarları kaydedildi.",
  "settings.support.title": "Destek",
  "settings.support.description":
    "Beta sürecinde hızlı dönüş için e-posta yeter.",
  "settings.support.cta": "Destek ekibine yaz ({email})",
  "settings.support.mail.subject": "[Hoflayn] Destek — {slug}",
  "settings.support.mail.body": "Atölye: {name}\nKullanıcı: {email}\n\n",
  "settings.delete.title": "Hesabı sil",
  "settings.delete.description":
    "Self-serve silme yok — talep e-postası gönderilir, manuel işlenir. Krediler ve faturalandırma kaydı saklanır.",
  "settings.delete.cta": "Silme talebi gönder",
  "settings.delete.mail.subject": "[Hoflayn] Hesap silme talebi — {slug}",
  "settings.delete.mail.body":
    "Atölye: {name}\nKullanıcı: {email}\nTenant ID: {tenantId}\n\nHesabımı ve atölye verilerimi silmek istiyorum.\n",

  // Billing
  "billing.eyebrow": "Plan ve krediler",
  "billing.title": "Faturalandırma",
  "billing.testMode":
    "Stripe test modu aktif — gerçek kart çekilmez. Canlı ödemeler için cutover checklist’ine bakın.",
  "billing.paymentReceived":
    "Ödeme alındı. Stripe webhook’u işlendiğinde planın ve kredilerin güncellenecek.",
  "billing.currentPlan": "Mevcut plan: {plan}",
  "billing.plan.pro": "Profesyonel",
  "billing.plan.free": "Ücretsiz",
  "billing.creditBalance": "Kredi bakiyesi: {credits}",
  "billing.subscriptionStatus": "Abonelik durumu: {status}",
  "billing.proPrice": "Pro · ${price}/ay",
  "billing.proPerks":
    "Aylık {credits} kredi · yüksek günlük limit · Fotoğraf Stüdyosu",
  "billing.upgrade": "Pro’ya geç",
  "billing.upgradeOpening": "Stripe açılıyor…",
  "billing.managePortal": "Aboneliği yönet",
  "billing.managePortalOpening": "Açılıyor…",
  "billing.packs.title": "Tek seferlik kredi",
  "billing.packs.description":
    "Abonelik gerektirmez; krediler ödeme webhook’undan sonra bakiyene eklenir.",
  "billing.packs.label": "{credits} kredi",
  "billing.error.invalidPack": "Geçersiz kredi paketi.",
  "billing.error.checkoutFailed": "Ödeme işlemi başlatılamadı.",

  // API boundary. `code` is the contract clients branch on; these strings are
  // the human-readable fallback rendered in the caller's language.
  "api.error.internal": "Beklenmeyen bir sunucu hatası oluştu.",
  "api.error.invalidJson": "Geçerli bir JSON gövdesi gönder.",
  "api.error.missingToken": "Oturum açman gerekiyor.",
  "api.error.invalidToken": "Oturum süresi dolmuş.",
  "api.error.provisionFailed": "Hesap hazırlanamadı.",
  "api.error.membershipMissing": "Atölye üyeliği bulunamadı.",
  "api.error.onboardingRequired": "Devam etmeden önce atölyeni tamamla.",
  "api.error.invalidData": "Geçersiz veri.",
  "api.error.validation.workshop": "Atölye bilgileri geçersiz.",
  "api.error.validation.product": "Ürün bilgileri geçersiz.",
  "api.error.validation.studio": "Geçersiz stüdyo işlemi.",
  "api.error.invalidJobId": "Geçersiz AI işi.",
  "api.error.jobNotFound": "AI işi bulunamadı.",
  "api.error.invalidStudioJobId": "Geçersiz işlem.",
  "api.error.studioJobNotFound": "İşlem bulunamadı.",

  "workshop.error.notFound": "Atölye bulunamadı.",

  "products.error.invalidMeasure": "Ölçü/ağırlık geçersiz.",
  "products.error.analyzeImageRequired": "Analiz için bir ürün fotoğrafı seç.",
  "products.error.notFoundWithId": "Ürün bulunamadı: {id}",

  "stock.error.negativeRole":
    "Negatif stoka izin vermek için yönetici yetkisi gerekli.",
  "stock.error.saveFailed": "Stok hareketi kaydedilemedi.",
  "stock.error.thresholdRole":
    "Stok eşik ayarı için yönetici yetkisi gerekli.",

  "sales.error.roleRecord": "Satış kaydı için yönetici yetkisi gerekli.",
  "sales.error.roleVoid": "Satış iptali için yönetici yetkisi gerekli.",
  "sales.error.roleImport": "CSV satış import için yönetici yetkisi gerekli.",
  "sales.error.voidConflict": "Satış iptal edilemez (durum: {status}).",
  "sales.csv.error.tooFewLines": "CSV en az başlık + 1 satır içermeli.",
  "sales.csv.error.header": "CSV başlığı sku,quantity,unit_price içermeli.",
  "sales.csv.error.skuEmpty": "Satır {line}: sku boş.",
  "sales.csv.error.quantityInvalid": "Satır {line}: quantity geçersiz.",
  "sales.csv.error.unitPriceEmpty": "Satır {line}: unit_price boş.",
  "sales.error.unsupportedSource":
    "Hoflayn Web satış kaynağı henüz desteklenmiyor (ayrı adapter).",
  "sales.error.saveFailed": "Satış kaydedilemedi.",
  "sales.error.lineSaveFailed": "Satış satırı kaydedilemedi.",
  "sales.error.notFound": "Satış bulunamadı.",
  "sales.error.voidFailed": "Satış iptal edilemedi.",
  "sales.error.importEmpty": "İçe aktarılacak satır yok.",
  "sales.error.skuNotFound": "SKU bulunamadı: {skus}",

  "catalogs.error.planRequired": "PDF Katalog için Profesyonel plan gerekli.",
  "catalogs.error.role": "Katalog oluşturmak için yönetici yetkisi gerekli.",
  "catalogs.error.notFound": "Katalog bulunamadı.",
  "catalogs.error.itemNotFound": "Seçilen ürünlerden biri bulunamadı.",
  "catalogs.error.coverNotFound": "Kapak ürünü bulunamadı.",
  "catalogs.error.createFailed": "Katalog oluşturulamadı.",
  "catalogs.error.insufficientCredits": "Katalog PDF için yeterli kredin yok.",
  "catalogs.error.exportCreateFailed": "Export kaydı oluşturulamadı.",
  "catalogs.error.exportNotFound": "Export bulunamadı.",

  "labels.error.planRequired": "Barkod / etiket için Profesyonel plan gerekli.",
  "labels.error.role": "Etiket üretmek için yönetici yetkisi gerekli.",
  "labels.error.exportNotFound": "Etiket export bulunamadı.",
  "labels.error.insufficientCredits": "Etiket PDF için yeterli kredin yok.",
  "labels.error.itemNotFound": "Seçilen ürünlerden biri bulunamadı.",
  "labels.error.exportCreateFailed": "Etiket export oluşturulamadı.",
  "labels.error.payloadRequired": "SKU veya barkod değeri gerekli.",
  "labels.error.gs1Digits":
    "GS1-128 için 8–48 haneli sayısal değer gerekli (GTIN / AI akışı).",
  "labels.error.payloadTooLong": "Barkod değeri en fazla 64 karakter olabilir.",
  "labels.pdf.barcodeFailed": "Barkod üretilemedi",

  "catalog.pdf.itemCount.one": "{count} ürün",
  "catalog.pdf.itemCount.other": "{count} ürün",
  "catalog.pdf.noImage": "Görsel yok",

  "ai.fallbackProductName": "Ürün",

  "tenant.defaultName": "{owner} Atölyesi",
  "tenant.defaultName.fallback": "Atölyem",

  "stock.cause.sale": "Satış",
  "stock.cause.saleVoid": "Satış iptali",
  "stock.cause.saleDraft": "Satış taslağı rezervasyonu",

  "seo.audit.titleLength": "Başlık {length} karakter; hedef {min}-{max}.",
  "seo.audit.metaLength": "Meta {length} karakter; hedef {min}-{max}.",
  "seo.audit.slugFormat": "Slug yalnızca küçük harf, rakam ve tire içermeli.",
  "seo.audit.keywordInTitle": "Ana anahtar kelime başlıkta yok.",
  "seo.audit.keywordInMeta": "Ana anahtar kelime meta açıklamada yok.",
  "seo.audit.keywordRepetition": "Tekrarlayan anahtar kelimeler: {keywords}",
  "seo.audit.secondaryCount.one":
    "İkincil anahtar kelime sayısı {count}; max {max}.",
  "seo.audit.secondaryCount.other":
    "İkincil anahtar kelime sayısı {count}; max {max}.",

  "scenarios.error.notFound": "Senaryo bulunamadı.",
  "scenarios.error.saveFailed": "Senaryo kaydedilemedi.",
  "scenarios.error.productRequired": "Senaryoyu uygulamak için bir ürün seç.",
  "scenarios.error.fieldRequired": "Uygulanacak en az bir alan seç.",

  "seo.error.planRequired":
    "SEO Yardımcısı için Profesyonel plan (Yazı modülü) gerekli.",
  "seo.error.applyRole": "SEO uygulamak için yönetici yetkisi gerekli.",
  "seo.error.insufficientCredits": "SEO analizi için yeterli kredin yok.",
  "seo.error.generateFailed": "SEO analizi üretilemedi.",

  "ai.error.planRequired": "AI Yazı modülü için Profesyonel plan gerekli.",
  "ai.error.descriptionCredits": "AI açıklaması için yeterli kredin yok.",
  "ai.error.descriptionGenerateFailed": "AI açıklaması üretilemedi.",
  "ai.error.captionCredits": "Instagram metni için yeterli kredin yok.",
  "ai.error.captionGenerateFailed": "Instagram metni üretilemedi.",

  "studio.error.rateLimitSeconds":
    "Çok fazla istek. {seconds} saniye sonra tekrar dene.",

  "billing.error.role": "Ödeme işlemleri için yönetici yetkisi gerekli.",
  "billing.return.success":
    "Ödeme tamamlandı. Bakiye güncelleniyor; bir süre sonra yenilenir.",
  "billing.return.canceled":
    "Ödeme iptal edildi. İstediğin zaman yeniden deneyebilirsin.",

  "ai.error.costCapHourly":
    "Saatlik AI maliyet limiti aşıldı (≈${spent} / ${cap}). Lütfen sonra tekrar dene.",
  "ai.error.costCapDaily":
    "Günlük AI maliyet limiti aşıldı (≈${spent} / ${cap}). Yarın tekrar dene veya destek ile iletişime geç.",
  "catalogs.error.exportRole":
    "Katalog PDF üretmek için yönetici yetkisi gerekli.",
  "products.error.invalidCover": "Kapak bilgisi geçersiz.",
  "bridge.error.archiveRole":
    "Marketplace arşivleme için yönetici yetkisi gerekli.",
  "settings.error.role": "Atölye ayarları için yönetici yetkisi gerekli.",
  "scenarios.error.applyRole":
    "Ürüne uygulama için yönetici yetkisi gerekli.",
  "scenarios.error.invalidKind": "Geçersiz senaryo türü.",
  "sales.error.roleReserve": "Stok rezervasyonu için yönetici yetkisi gerekli.",
  "stock.error.insufficient":
    "Yetersiz stok: istenen {requested}, mevcut {available}.",
  "stock.error.notInteger": "Stok miktarı tam sayı olmalı.",
  "stock.error.negative": "Stok miktarı negatif olamaz.",
  "stock.error.zero": "Miktar 0'dan büyük olmalı.",

  // Keys mirror CREDIT_COSTS operations; a test enforces full coverage.
  "credits.operation.remove_bg": "Arka plan silme",
  "credits.operation.white_bg": "Beyaz arka plan",
  "credits.operation.analyze_product_image": "Ürün görseli analizi",
  "credits.operation.generate_description": "Ürün açıklaması",
  "credits.operation.generate_caption": "Sosyal medya metni",
  "credits.operation.analyze_seo": "SEO analizi",
  "credits.operation.generate_catalog": "PDF katalog",
  "credits.operation.generate_labels": "Barkod / etiket",

  "settings.contentLanguage.title": "Üretim dili",
  "settings.contentLanguage.description":
    "AI açıklamaları, Instagram metinleri, SEO önerileri ve PDF çıktıları bu dilde üretilir. Arayüz dilinden bağımsızdır — İngilizce çalışıp Türk pazarına satabilirsin.",
  "settings.contentLanguage.readOnly":
    "Bu ayarı yalnızca atölye yöneticisi değiştirebilir.",

  "settings.currency": "Para birimi",
  "settings.currency.hint":
    "Ürün fiyatları, katalog ve etiket çıktıları bu para biriminde gösterilir.",
  "currency.TRY": "₺ Türk lirası (TRY)",
  "currency.USD": "$ ABD doları (USD)",
  "currency.EUR": "€ Euro (EUR)",
  "currency.GBP": "£ Sterlin (GBP)",

  "calc.money.invalid": "Geçersiz tutar: {raw}",
  "calc.money.required": "Tutar gerekli.",
  "calc.component.materials": "Malzeme",
  "calc.component.labor": "İşçilik",
  "calc.component.packaging": "Ambalaj",
  "calc.component.commission": "Komisyon",
  "calc.component.shipping": "Kargo",
  "calc.component.other": "Diğer",
  "calc.profit.quantityPositive": "Adet pozitif tam sayı olmalı.",
  "calc.profit.quantityDefault":
    "Adet girilmedi; 1 ürün üzerinden birim maliyet hesaplandı.",
  "calc.profit.missing.materials": "Malzeme girilmedi; 0 kabul edildi.",
  "calc.profit.missing.labor": "İşçilik girilmedi; 0 kabul edildi.",
  "calc.profit.missing.packaging": "Ambalaj girilmedi; 0 kabul edildi.",
  "calc.profit.missing.shipping": "Kargo girilmedi; 0 kabul edildi.",
  "calc.profit.missing.other": "Diğer gider girilmedi; 0 kabul edildi.",
  "calc.profit.missing.commission": "Komisyon girilmedi; 0 kabul edildi.",
  "calc.profit.commissionRange": "Komisyon 0 ile 100 arasında olmalı.",
  "calc.profit.commissionPercent":
    "Komisyon satışın %{percent}'i olarak alındı.",
  "calc.profit.batchSplit":
    "Üretim maliyeti {batch} → {quantity} ürüne bölündü.",
  "calc.profit.sellNegative": "Satış fiyatı negatif olamaz.",
  "calc.profit.sellMissing": "Satış fiyatı girilmedi; kar/marj hesaplanmadı.",
  "calc.profit.sellZero": "Satış fiyatı 0; marj tanımsız.",
  "calc.profit.marginRange": "Hedef marj 0 ile 100 arasında olmalı.",
  "calc.profit.marginPlusCommission": "Hedef marj + komisyon %100'ü aşamaz.",
  "calc.profit.targetMissing":
    "Hedef marj girilmedi; hedef satış fiyatı hesaplanmadı.",
  "calc.desi.invalidCarrier": "Geçersiz taşıyıcı profili.",
  "calc.desi.divisorPositive": "Desi böleni pozitif olmalı.",
  "calc.desi.customDivisorDefault":
    "Özel bölen girilmedi; varsayılan 3000 kullanıldı.",
  "calc.desi.divisorOverride":
    "Profil böleni {profile}; senin girdiğin {custom} kullanıldı.",
  "calc.desi.lengthPositive": "Uzunluk pozitif bir sayı olmalı.",
  "calc.desi.widthPositive": "Genişlik pozitif bir sayı olmalı.",
  "calc.desi.heightPositive": "Yükseklik pozitif bir sayı olmalı.",
  "calc.desi.weightPositive": "Ağırlık sıfır veya pozitif olmalı.",
  "calc.desi.weightMissing":
    "Gerçek ağırlık girilmedi; faturalanan ağırlık desiye eşit kabul edildi.",
  "calc.carrier.yurtici.label": "Yurtiçi Kargo",
  "calc.carrier.yurtici.notes": "Yaygın TR desi böleni (cm³ / 3000).",
  "calc.carrier.aras.label": "Aras Kargo",
  "calc.carrier.aras.notes":
    "Genelde 3000 böleni kullanılır; taşıyıcı tarifesi değişebilir.",
  "calc.carrier.mng.label": "MNG Kargo",
  "calc.carrier.mng.notes":
    "Genelde 3000 böleni kullanılır; taşıyıcı tarifesi değişebilir.",
  "calc.carrier.custom.label": "Özel bölen",
  "calc.carrier.custom.notes": "Kendi desi bölenini gir.",

  "legal.privacy.title": "Gizlilik politikası",
  "legal.privacy.updated": "Son güncelleme: 14 Eylül 2026",
  "legal.privacy.p1":
    "Hoflayn, el yapımı ve butik üreticiler için bir çalışma masasıdır. Hesap e-postan, atölye adı, ürün ve satış kayıtların, yüklediğin görseller ve AI işlerinin girdileri/çıktıları hizmeti sunmak için işlenir.",
  "legal.privacy.p2":
    "Veriler Avrupa'daki altyapıda (Supabase / Vercel) tutulur. Ödemeler Stripe üzerinden geçer; kart numarası Hoflayn sunucularında saklanmaz. AI görüntü ve metin işleri seçilen sağlayıcılara (ör. OpenAI, Replicate) gönderilir.",
  "legal.privacy.p3":
    "Oturum çerezi, dil tercihi çerezi (hoflayn_locale) ve IP ülkesi (yalnızca dil tahmini) kullanılır. Pazarlama çerezi veya üçüncü parti analitik yoktur.",
  "legal.privacy.p4":
    "Verilerin KVKK ve GDPR kapsamındaki erişim, düzeltme ve silme hakların saklıdır. Silme talebi için ayarlar sayfasındaki hesap silme bağlantısını veya destek e-postasını kullan.",
  "legal.privacy.p5":
    "Hesap silindiğinde atölye verisi, görseller ve faturalama müşteri kaydı makul süre içinde kaldırılır. Yasal saklama yükümlülüğü olan ödeme kayıtları Stripe tarafında kalabilir.",
  "legal.privacy.p6":
    "Bu metni güncellersek uygulamada ve bu sayfada duyururuz. Sorular için destek adresine yaz.",
  "legal.terms.title": "Kullanım şartları",
  "legal.terms.updated": "Son güncelleme: 14 Eylül 2026",
  "legal.terms.p1":
    "Hoflayn bir yazılım hizmetidir. Ücretsiz planda sınırlı kredi, ücretli planda abonelik ve kredi paketleri sunulur. Krediler AI işlemleri için harcanır ve aksi belirtilmedikçe iade edilmez.",
  "legal.terms.p2":
    "Yüklediğin içerikten sen sorumlusun. Yasadışı, başkasının hakkını ihlal eden veya hizmeti bozan kullanım yasaktır. AI çıktılarını yayınlamadan önce kontrol etmen gerekir; Hoflayn doğruluğunu garanti etmez.",
  "legal.terms.p3":
    "Hizmet 'olduğu gibi' sunulur. Planlanan bakımlar ve sağlayıcı kesintileri olabilir. Azami sorumluluk, son 12 ayda ödediğin bedelle sınırlıdır.",
  "legal.terms.p4":
    "Aboneliği uygulama içi faturalamadan (web) iptal edebilirsin. Mobil mağaza derlemesinde satın alma Google Play faturalamasına taşınana kadar dış ödeme bağlantısı kapalı tutulabilir.",
  "legal.terms.p5":
    "Hesabını dilediğin zaman silebilirsin. Şartları kabul etmiyorsan hizmeti kullanma.",
  "legal.delete.title": "Hesap silme",
  "legal.delete.updated": "Son güncelleme: 14 Eylül 2026",
  "legal.delete.p1":
    "Hesabını ve atölye verilerini silmek için giriş yapıp Ayarlar → Hesabı sil yolunu kullanabilir veya aşağıdaki adrese e-posta gönderebilirsin. Talebi doğruladıktan sonra veriler silinir.",
  "legal.delete.p2":
    "Silme; ürünler, görseller, satış kayıtları, AI iş geçmişi ve oturumunu kapsar. Yasal saklama gereken fatura kayıtları ödeme sağlayıcısında kalabilir.",
  "legal.delete.cta": "{email} adresine silme talebi gönder",
  "legal.delete.mail.subject": "Hesap silme talebi",
  "legal.delete.mail.body":
    "Hoflayn hesabımı ve atölye verilerimi silmek istiyorum. Kayıtlı e-posta adresim bu mesajın gönderenidir.",
  "legal.back": "Ana sayfa",
  "landing.legal.privacy": "Gizlilik",
  "landing.legal.terms": "Şartlar",
  "landing.legal.marketplace": "Pazaryeri",
  "auth.terms.label":
    "Gizlilik politikasını ve kullanım şartlarını okudum, kabul ediyorum.",
  "auth.terms.required":
    "Kayıt olmak için gizlilik politikasını ve kullanım şartlarını kabul etmelisin.",
  "auth.terms.google":
    "Google ile devam ederek gizlilik politikasını ve kullanım şartlarını kabul etmiş olursun.",
  "auth.public.support": "Sorun mu var? {email}",
} as const;
