/**
 * ZEKA - Google Ads (AdMob/AdSense) Integration Layer
 * 
 * Bu dosya reklam entegrasyonu için merkezi bir noktadır. 
 * Google'dan aldığınız Reward ID'lerini ve Script'leri buraya ekleyerek 
 * tüm oyunda reklamları aktif edebilirsiniz.
 */

export interface AdResult {
  success: boolean;
  message?: string;
}

class AdsService {
  private static instance: AdsService;
  private isLoaded: boolean = false;

  // REKLAM AYARLARI (AdMob'dan aldığınız Unit ID'leri buraya yapıştırın)
  // Dev modunda veya test aşamasında false yapın ki gerçek reklam gösterip banlanmayın.
  private config = {
    // ÖRNEK TEST ID'leri: (Canlıya alırken kendi AdMob "Ödüllü" reklam ID'nizi buraya yazın)
    rewardedAdIdAndroid: 'ca-app-pub-3940256099942544/5224354917', // <-- YAPIŞTIRILACAK YER (ANDROID)
    rewardedAdIdIOS: 'ca-app-pub-3940256099942544/1712485313',     // <-- YAPIŞTIRILACAK YER (IOS)
    isEnabled: true 
  };

  private constructor() {
    this.init();
  }

  public static getInstance(): AdsService {
    if (!AdsService.instance) {
      AdsService.instance = new AdsService();
    }
    return AdsService.instance;
  }

  private init() {
    // Google Ads SDK'sını yüklemek için gerekli başlangıç kodları buraya gelebilir
    console.log('AdsService initialized');
    
    // Simülasyon: Reklamın hazır olduğunu varsayıyoruz
    this.isLoaded = true;
  }

  /**
   * Ödüllü Reklam Göster (Rewarded Ad)
   * 
   * Bu fonksiyon çağrıldığında Google Reklamı açılır.
   * Kullanıcı reklamı sonuna kadar izlerse 'success: true' döner.
   */
  public async showRewardedAd(): Promise<AdResult> {
    if (!this.config.isEnabled) {
      return { success: true, message: 'Ads disabled (Dev Mode)' };
    }

    try {
      console.log('Showing Rewarded Ad...');

      /**
       * GOOGLE ADS ENTEGRASYON NOTU:
       * Buraya Google'ın size verdiği `showRewardedAd` kodlarını yapıştırın.
       * 
       * Örnek (AdMob):
       * if (rewardedAd) {
       *   await rewardedAd.show();
       *   return { success: true };
       * }
       */

      // --- SİMÜLASYON BAŞLANGIÇ (Gerçek kodlarla değiştirilince silinebilir) ---
      return new Promise((resolve) => {
        // Reklam izleme süresini simüle ediyoruz (1.5 saniye)
        setTimeout(() => {
          resolve({ success: true });
        }, 1500);
      });
      // --- SİMÜLASYON BİTİŞ ---

    } catch (error) {
      console.error('Ad Error:', error);
      return { success: false, message: 'Reklam yüklenirken bir sorun oluştu.' };
    }
  }

  /**
   * Reklamın yüklü olup olmadığını kontrol et
   */
  public isReady(): boolean {
    return this.isLoaded;
  }
}

export const Ads = AdsService.getInstance();
