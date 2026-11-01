import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { AppConfig } from '../config/AppConfig';

/**
 * ZEKA - Google Ads (AdMob) Integration Layer
 * Connected to centralized AppConfig.ts
 */

export interface AdResult {
  success: boolean;
  message?: string;
}

class AdsService {
  private static instance: AdsService;
  private isInitialized: boolean = false;
  private isAdPrepared: boolean = false;
  private isPreparing: boolean = false;

  private get config() {
    return {
      rewardedAdIdAndroid: AppConfig.admob.androidRewardedAdId,
      rewardedAdIdIOS: AppConfig.admob.iosRewardedAdId,
      isEnabled: AppConfig.admob.isEnabled,
      isTesting: AppConfig.admob.isTesting,
    };
  }

  private constructor() {
    this.init();
  }

  public static getInstance(): AdsService {
    if (!AdsService.instance) {
      AdsService.instance = new AdsService();
    }
    return AdsService.instance;
  }

  private async init() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;

    try {
      await AdMob.initialize({
        initializeForTesting: this.config.isTesting,
      });
      this.isInitialized = true;
      this.preloadRewardedAd(); // Start preloading first ad
    } catch (e) {
      console.error('AdMob Initialization Error:', e);
    }
  }

  public async preloadRewardedAd() {
    if (!Capacitor.isNativePlatform() || !this.config.isEnabled || this.isPreparing) return;
    
    this.isPreparing = true;
    const platform = Capacitor.getPlatform();
    const adId = platform === 'ios' ? this.config.rewardedAdIdIOS : this.config.rewardedAdIdAndroid;
    
    try {
      await AdMob.prepareRewardVideoAd({ adId });
      this.isAdPrepared = true;
      console.log('Reward Ad Prepared');
    } catch (e) {
      console.error('Failed to preload Reward Ad', e);
      this.isAdPrepared = false;
    } finally {
      this.isPreparing = false;
    }
  }

  public async showRewardedAd(): Promise<AdResult> {
    if (!Capacitor.isNativePlatform() || !this.config.isEnabled) {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 2000);
      });
    }

    if (!this.isInitialized) {
      await this.init();
    }

    // Fallback preparation if not ready yet
    if (!this.isAdPrepared && !this.isPreparing) {
      await this.preloadRewardedAd();
    }

    try {
      return new Promise(async (resolve) => {
        let isRewarded = false;

        const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          isRewarded = true;
        });

        const closeListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          rewardListener.remove();
          closeListener.remove();
          this.isAdPrepared = false;
          window.dispatchEvent(new Event('onZekaAdClose'));
          this.preloadRewardedAd(); // Preload for NEXT time
          resolve({ success: isRewarded });
        });

        const errorListener = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          rewardListener.remove();
          closeListener.remove();
          errorListener.remove();
          this.isAdPrepared = false;
          window.dispatchEvent(new Event('onZekaAdClose'));
          this.preloadRewardedAd();
          resolve({ success: false, message: 'Ad Load Error' });
        });

        window.dispatchEvent(new Event('onZekaAdShow'));
        await AdMob.showRewardVideoAd().catch((e) => {
          console.error('Show error', e);
          rewardListener.remove();
          closeListener.remove();
          window.dispatchEvent(new Event('onZekaAdClose'));
          resolve({ success: false, message: 'Ad Show Error' });
        });
      });

    } catch (error) {
      console.error('AdMob Global Error:', error);
      this.isAdPrepared = false;
      this.preloadRewardedAd();
      return { success: false, message: 'Ad Error' };
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
}

export const Ads = AdsService.getInstance();
