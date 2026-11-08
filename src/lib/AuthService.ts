/**
 * ZEKA: Mind Puzzle - Cloud Save & Auth Sync Service
 * Seamlessly manages cloud backups, recovery codes, and Google/Apple integrations.
 */

import { AppConfig } from '../config/AppConfig';
import { getDeviceId, getPlayerName, setPlayerName } from './Leaderboard';
import { useGameStore } from '../store/useGameStore';

const CF_WORKER_URL = (import.meta.env.VITE_CF_WORKER_URL || AppConfig.api.workerUrl).replace(/\/$/, '');
const RECOVERY_CODE_KEY = 'zeka_recovery_code';
const AUTH_PROVIDER_KEY = 'zeka_auth_provider';

export interface WeeklyRewardInfo {
  week: string;
  rank: number;
  coins: number;
}

export interface CloudUserAccount {
  account_id: string;
  recovery_code: string;
  provider: string;
  player_name: string;
  max_level: number;
  coins: number;
  gift_coins?: number;
  weekly_reward?: WeeklyRewardInfo | null;
  force_sync?: boolean;
  time_attack_best?: number;
  memory_best: number;
  medals: string[];
  claimed_medals: string[];
}

let syncTimeout: any = null;
let inMemoryRecoveryCode: string | null = null;
let inMemoryAuthProvider: string | null = null;

export const AuthService = {
  /**
   * Get cached recovery code
   */
  getRecoveryCode(): string {
    if (inMemoryRecoveryCode !== null) return inMemoryRecoveryCode;
    inMemoryRecoveryCode = localStorage.getItem(RECOVERY_CODE_KEY) || '';
    return inMemoryRecoveryCode;
  },

  /**
   * Get current auth provider ('guest', 'google', 'apple')
   */
  getAuthProvider(): string {
    if (inMemoryAuthProvider !== null) return inMemoryAuthProvider;
    inMemoryAuthProvider = localStorage.getItem(AUTH_PROVIDER_KEY) || 'guest';
    return inMemoryAuthProvider;
  },

  /**
   * Synchronize local player state with Cloudflare Edge D1.
   * Debounced to prevent query spam during rapid gameplay.
   */
  scheduleSync(delayMs = 2500) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      this.syncNow().catch(() => {});
    }, delayMs);
  },

  /**
   * Immediately sync player progress to Cloudflare D1
   */
  async syncNow(providerOverride?: string, providerUserId?: string): Promise<CloudUserAccount | null> {
    const store = useGameStore.getState();
    const deviceId = getDeviceId();
    const playerName = getPlayerName() || 'Oyuncu';
    const recoveryCode = this.getRecoveryCode();
    const provider = providerOverride || this.getAuthProvider();

    try {
      const res = await fetch(`${CF_WORKER_URL}/api/user/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          provider,
          provider_user_id: providerUserId,
          recovery_code: recoveryCode,
          player_name: playerName,
          max_level: store.maxLevelCompleted,
          coins: store.coins,
          memory_best: store.memoryBest,
          medals: store.medals,
          claimed_medals: store.claimedMedals,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as CloudUserAccount;
        if (data.recovery_code) {
          inMemoryRecoveryCode = data.recovery_code;
          localStorage.setItem(RECOVERY_CODE_KEY, data.recovery_code);
        }
        if (data.provider) {
          inMemoryAuthProvider = data.provider;
          localStorage.setItem(AUTH_PROVIDER_KEY, data.provider);
        }

        // Apply admin force balance or cloud restoration to new device
        if (data.force_sync && typeof data.coins === 'number') {
          useGameStore.setState({ 
            coins: data.coins,
            maxLevelCompleted: Math.max(store.maxLevelCompleted, data.max_level || 1)
          });
          localStorage.setItem('zeka_coins', String(data.coins));
          localStorage.setItem('zeka_max_level', String(Math.max(store.maxLevelCompleted, data.max_level || 1)));
        } else if (typeof data.gift_coins === 'number' && data.gift_coins > 0) {
          // If server delivered gifted coins, increment current client wallet
          const currentCoins = useGameStore.getState().coins;
          const updatedCoins = currentCoins + data.gift_coins;
          useGameStore.setState({ coins: updatedCoins });
          localStorage.setItem('zeka_coins', String(updatedCoins));
        }

        // Trigger Weekly League Reward Celebration Modal if awarded
        if (data.weekly_reward && typeof data.weekly_reward.coins === 'number' && data.weekly_reward.coins > 0) {
          useGameStore.setState({ pendingWeeklyReward: data.weekly_reward });
        }
        // Note: In normal gameplay, spent coins stay spent and are saved to D1.
        // We do NOT unconditionally overwrite local coins with server coins.
        return data;
      }
    } catch (err) {
      console.warn('Cloud sync offline / deferred:', err);
    }
    return null;
  },

  /**
   * Restore account on a new phone using human-readable Recovery Code
   */
  async recoverWithCode(code: string): Promise<{ success: boolean; error?: string; account?: CloudUserAccount }> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Lütfen geçerli bir kod girin.' };
    }

    try {
      const res = await fetch(`${CF_WORKER_URL}/api/user/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recovery_code: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Hesap bulunamadı.' };
      }

      const acc = data as CloudUserAccount;
      // Apply account to local game store & localStorage
      inMemoryRecoveryCode = acc.recovery_code;
      inMemoryAuthProvider = acc.provider;
      localStorage.setItem(RECOVERY_CODE_KEY, acc.recovery_code);
      localStorage.setItem(AUTH_PROVIDER_KEY, acc.provider);
      localStorage.setItem('zeka_max_level', String(acc.max_level));
      localStorage.setItem('zeka_coins', String(acc.coins));
      localStorage.setItem('zeka_mem_best', String(acc.memory_best));
      localStorage.setItem('zeka_medals', JSON.stringify(acc.medals || []));
      localStorage.setItem('zeka_medals_claimed', JSON.stringify(acc.claimed_medals || []));

      useGameStore.setState({
        maxLevelCompleted: acc.max_level,
        coins: acc.coins,
        memoryBest: acc.memory_best,
        medals: acc.medals || [],
        claimedMedals: acc.claimed_medals || [],
      });

      return { success: true, account: acc };
    } catch (e: any) {
      return { success: false, error: 'Bağlantı hatası. Lütfen tekrar deneyin.' };
    }
  },

  /**
   * Hook for Google Play / Google Sign-In
   * When user clicks "Sign In with Google", pass the Google User ID here.
   */
  async signInWithGoogle(googleUserId: string, googleUserName?: string): Promise<boolean> {
    if (!googleUserId) return false;
    if (googleUserName && googleUserName.trim()) {
      setPlayerName(googleUserName);
    }
    const account = await this.syncNow('google', googleUserId);
    return !!account;
  },

  /**
   * Hook for Apple Sign-In
   * When user clicks "Sign In with Apple", pass the Apple User ID here.
   */
  async signInWithApple(appleUserId: string, appleUserName?: string): Promise<boolean> {
    if (!appleUserId) return false;
    if (appleUserName && appleUserName.trim()) {
      setPlayerName(appleUserName);
    }
    const account = await this.syncNow('apple', appleUserId);
    return !!account;
  },
};
