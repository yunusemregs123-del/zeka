import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { RewardAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

/**
 * ZEKA - Google Ads (AdMob) Integration Layer
 * Fixed for Verbatim Module Syntax and Capacitor Handle API.
 */

export interface AdResult {
  success: boolean;
  message?: string;
}

class AdsService {
  private static instance: AdsService;
  private isInitialized: boolean = false;

  private config = {
    rewardedAdIdAndroid: 'ca-app-pub-3940256099942544/5224354917',
    rewardedAdIdIOS: 'ca-app-pub-3940256099942544/1712485313',
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

  private async init() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;

    try {
      await AdMob.initialize({
        initializeForTesting: true,
      });
      this.isInitialized = true;
    } catch (e) {
      console.error('AdMob Initialization Error:', e);
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

    const platform = Capacitor.getPlatform();
    const adId = platform === 'ios' ? this.config.rewardedAdIdIOS : this.config.rewardedAdIdAndroid;

    try {
      const options: RewardAdOptions = { adId: adId };
      await AdMob.prepareRewardVideoAd(options);

      return new Promise(async (resolve) => {
        let isRewarded = false;

        // @ts-ignore
        const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          isRewarded = true;
        });

        // @ts-ignore
        const closeListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          rewardListener.remove();
          closeListener.remove();
          resolve({ success: isRewarded });
        });

        // @ts-ignore
        const errorListener = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          rewardListener.remove();
          closeListener.remove();
          errorListener.remove();
          resolve({ success: false, message: 'Ad Load Error' });
        });

        await AdMob.showRewardVideoAd().catch(() => {
          rewardListener.remove();
          closeListener.remove();
          resolve({ success: false, message: 'Ad Show Error' });
        });
      });

    } catch (error) {
      console.error('AdMob Global Error:', error);
      return { success: false, message: 'Ad Error' };
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
}

export const Ads = AdsService.getInstance();
