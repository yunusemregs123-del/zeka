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

  // REKLAM AYARLARI (Burayı Google panelindeki bilgilerle doldurun)
  private config = {
    rewardedAdId: 'YOUR_REWARDED_AD_ID', // Örn: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY
    isEnabled: true // Geliştirme aşamasında false yapabilirsiniz
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
