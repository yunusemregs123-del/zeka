import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

class HapticsService {
  private isEnabled(): boolean {
    return localStorage.getItem('zeka_haptics_disabled') !== 'true';
  }

  public setEnabled(enabled: boolean) {
    localStorage.setItem('zeka_haptics_disabled', (!enabled).toString());
  }

  public getStatus(): boolean {
    return this.isEnabled();
  }

  public async impact(style: 'light' | 'medium' | 'heavy' = 'light') {
    if (!this.isEnabled()) return;

    try {
      if (Capacitor.isNativePlatform()) {
        const impactStyle = 
          style === 'heavy' ? ImpactStyle.Heavy :
          style === 'medium' ? ImpactStyle.Medium :
          ImpactStyle.Light;
        await Haptics.impact({ style: impactStyle });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const ms = style === 'heavy' ? 25 : style === 'medium' ? 15 : 8;
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore vibration errors silently
    }
  }

  public async notification(type: 'success' | 'warning' | 'error' = 'success') {
    if (!this.isEnabled()) return;

    try {
      if (Capacitor.isNativePlatform()) {
        const notifType = 
          type === 'error' ? NotificationType.Error :
          type === 'warning' ? NotificationType.Warning :
          NotificationType.Success;
        await Haptics.notification({ type: notifType });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'error') {
          navigator.vibrate([20, 40, 20]);
        } else if (type === 'success') {
          navigator.vibrate([15, 30, 15]);
        } else {
          navigator.vibrate(20);
        }
      }
    } catch {
      // Ignore vibration errors silently
    }
  }

  public async selection() {
    if (!this.isEnabled()) return;

    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.selectionStart();
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
    } catch {
      // Ignore vibration errors silently
    }
  }
}

export const haptic = new HapticsService();
