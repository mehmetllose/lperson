# Arka plan FCM bildirimleri (sistem çubuğu)

Bu proje, **Firebase Cloud Messaging (FCM)** ile telefonun üst bildirim alanına düşen push’u şu şekilde üretir:

1. Uygulama, giriş sonrası **FCM token**’ı alır ve Firestore `users/{uid}` içinde **`fcmToken`** alanına yazar.
2. **Cloud Functions** (`functions/index.js`) Firestore’daki olayları dinler ve ilgili cihazlara **`notification` + `data`** içeren mesaj gönderir. Android, uygulama arka plandayken bu mesajı sistem tepsisinde gösterir.

## Gereksinimler

- Firebase projesi: **`lperson`** (`.firebaserc`).
- **Blaze (ücretli)** plan: Firestore tetikleyicili Cloud Functions için gerekli.
- Android uygulaması Firebase’de **Android app** olarak kayıtlı olmalı (`com.calismatakip.app`).
- `android/app/google-services.json` dosyası (Firebase konsol → Proje ayarları → Uygulamanız → `google-services.json` indir).

## Kurulum özeti

1. Konsolda **Cloud Messaging** etkin olsun (Firebase varsayılanı genelde yeterli).
2. `google-services.json` dosyasını **`android/app/`** içine kopyalayın. `android/app/build.gradle` zaten bu dosya varken `google-services` eklentisini uygular.
3. Bilgisayarda Firebase CLI: proje kökünde  
   `npm install`  
   ardından  
   `npx firebase login`  
   `npm run deploy:functions`  
   (veya `firebase deploy --only functions`).
4. İlk deploy’da konsol, gerekirse **Cloud Build / Artifact Registry** API’lerini açmanızı isteyebilir; ekrandaki yönergeleri onaylayın.

## Tetiklenen olaylar

| Olay | Alıcı | Koşul |
|------|--------|--------|
| Çalışan giriş/çıkış (kayıt güncellendi) | Şirketteki **patron** kullanıcıları | `companies/{id}.settings.notifyPatronOnClockIn === true` (uygulama ile aynı mantık). Giriş/çıkış tek yazıda birlikte artarsa (ör. toplu düzeltme) bildirim **gönderilmez**. |
| Yeni **avans** / **saat** talebi | Patronlar | `requests` dokümanı oluşturuldu, `status: pending`. |
| Talep **onay** / **red** | Talebi gönderen **çalışan** | `status` `pending` → `approved` veya `rejected`. |

Bölge: kodda varsayılan **`us-central1`** (çoğu projede Firestore ABD / `nam5` ile uyumludur). Firestore konumunuz **Avrupa (`eur3`)** ise `functions/index.js` içindeki `setGlobalOptions({ region: ... })` değerini **`europe-west1`** yapın.

## iOS (isteğe bağlı)

iOS’ta FCM için Firebase konsolda **APNs** anahtarınızı / sertifikanızı yüklemeniz gerekir. Bu depoda Android odaklı akış test edilmiştir.

## Vardiya “X dakika önce” hatırlatmaları

Bunlar şu an istemcide **yerel bildirim** (`LocalNotifications`) ile planlanır; arka planda sunucudan zamanlanmış FCM için ayrıca **Cloud Scheduler** + iş mantığı gerekir. İsterseniz sonraki adımda eklenebilir.

## Sorun giderme

- Push gelmiyorsa: Firestore’da ilgili kullanıcıda **`fcmToken`** dolu mu, Functions deploy oldu mu, **Blaze** açık mı kontrol edin.
- Yalnızca uygulama içi görünüyorsa: genelde **`google-services.json` eksik** veya Functions yayında değildir.
- İzin: Android 13+ için `POST_NOTIFICATIONS` manifestte mevcut; kullanıcıdan izin istenmelidir.
