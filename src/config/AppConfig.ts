/**
 * ==============================================================================
 * 🚀 ZEKA: MIND PUZZLE - CANLI YAYIN MERKEZİ YAPILANDIRMASI (PRODUCTION CONFIG)
 * ==============================================================================
 * 
 * Sevgili Geliştirici,
 * Canlıya (Google Play & App Store) çıkmadan önce yapman gereken TÜM ayarlar
 * TEK BİR YERDE bu dosyada toplanmıştır. Başka hiçbir dosya aramana gerek yoktur.
 * 
 * Diğer bilgisayarındaki hesap bilgilerini buradaki alanlara yapıştırman yeterlidir!
 */

export const AppConfig = {
  // ----------------------------------------------------------------------------
  // 1. CLOUDFLARE EDGE BACKEND API
  // ----------------------------------------------------------------------------
  api: {
    workerUrl: 'https://zeka-edge-api.zekagame.workers.dev',
  },

  // ----------------------------------------------------------------------------
  // 2. GOOGLE ADMOB REKLAM AYARLARI
  // ----------------------------------------------------------------------------
  admob: {
    // Canlıya çıkarken 'isTesting' değerini false yapmayı unutma!
    isEnabled: true,
    isTesting: true, // ⚠️ CANLIYA ALIRKEN: false YAP!

    // Android için Ödüllü Video Reklam Birimi ID'si (AdMob Panelinden alınır)
    // Örnek format: ca-app-pub-XXXXXXXXXXXXX/YYYYYYYYYY
    androidRewardedAdId: 'ca-app-pub-3940256099942544/5224354917', // Test ID

    // iOS için Ödüllü Video Reklam Birimi ID'si
    iosRewardedAdId: 'ca-app-pub-3940256099942544/1712485313', // Test ID
  },

  // ----------------------------------------------------------------------------
  // 3. GOOGLE PLAY & APPLE SIGN-IN (GELİŞTİRİCİ HESAP BİLGİLERİ)
  // ----------------------------------------------------------------------------
  auth: {
    // Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Web Client ID
    // Örnek format: 123456789-abcdef.apps.googleusercontent.com
    googleWebClientId: '',

    // Android için oluşturulan Client ID (SHA-1 parmak izi ile eşleşen)
    googleAndroidClientId: '',

    // Apple Developer Portal > Identifiers > Services IDs > Sign in with Apple ID
    // Örnek format: com.zekagame.app.signin
    appleServiceId: 'com.zekagame.app',

    // Apple girişinde yönlendirilecek yetki URL'i (Cloudflare Worker auth endpoint)
    appleRedirectUri: 'https://zeka-edge-api.zekagame.workers.dev/api/auth/apple/callback',
  },

  // ----------------------------------------------------------------------------
  // 4. OYUN EKONOMİSİ VE ÖDÜL DENGESİ (COIN ECONOMY)
  // ----------------------------------------------------------------------------
  economy: {
    startingCoins: 200,        // Yeni başlayan oyuncuya verilen ilk bakiye
    dailyRewardCoins: 75,       // Her gün tek tıkla alınan günlük ödül
    adWatchCoins: 50,          // Reklam izleyince verilen coin
    hintSolutionCoins: 75,     // Çözümü doğrudan görme bedeli
    addTimeCoins: 10,          // +10 saniye ekleme bedeli
    duelEntryCoins: 50,        // 1v1 Düello giriş / rövanş bahsi
    duelVictoryReward: 100,    // 1v1 Düello galibiyet ödülü
  },
} as const;
