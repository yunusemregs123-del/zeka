/**
 * ZEKA: Mind Puzzle - Native Brain Report Sharing Service
 * Renders an ultra-high resolution 1080x1920 (9:16) image card and invokes
 * native device sharing (WhatsApp, Instagram Stories, Twitter, Save to Camera Roll).
 */

import { Translations, type LanguageCode } from './Translations';

export interface BrainStoryParams {
  brainAge: number;
  speedScore: number;
  speedMs: number;
  memoryScore: number;
  memorySpan: string;
  flexibilityScore: number;
  ruleComplexity: string;
  focusScore: number;
  focusAccuracy: number;
  cognitiveIndex: number;
  percentile: number;
  language: LanguageCode;
}

export async function generateBrainStoryBlob(params: BrainStoryParams): Promise<Blob | null> {
  const {
    brainAge,
    speedScore,
    speedMs,
    memoryScore,
    memorySpan,
    flexibilityScore,
    ruleComplexity,
    focusScore,
    focusAccuracy,
    cognitiveIndex,
    percentile,
    language,
  } = params;

  const t = Translations[language] || Translations['tr'];

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }

    // Helper: Rounded Rectangle
    const roundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      fill?: string,
      stroke?: string,
      strokeWidth = 2
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
    };

    // 1. Deep Matte Obsidian Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#0A0B0F');
    bgGrad.addColorStop(0.4, '#10121A');
    bgGrad.addColorStop(1, '#09090D');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Ambient Warm Amber Glow
    const glow1 = ctx.createRadialGradient(540, 680, 40, 540, 680, 580);
    glow1.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
    glow1.addColorStop(0.5, 'rgba(245, 158, 11, 0.04)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1080, 1920);

    // 3. Precision Outer Border
    roundRect(50, 50, 980, 1820, 56, 'rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.07)', 2);

    // 4. ZEKA APP ICON & LOGO
    const iconX = 470;
    const iconY = 120;
    const iconSize = 140;
    roundRect(iconX, iconY, iconSize, iconSize, 42, '#1D1D1F', 'rgba(255, 255, 255, 0.16)', 2);

    ctx.beginPath();
    ctx.arc(iconX + 32, iconY + 32, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(iconX + iconSize - 34, iconY + iconSize - 20);
    ctx.lineTo(iconX + iconSize - 22, iconY + iconSize - 20);
    ctx.lineTo(iconX + iconSize - 28, iconY + iconSize - 32);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 82px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Z', iconX + iconSize / 2, iconY + 98);

    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '-1.5px';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('ZEKA', 540, 325);

    ctx.font = '800 18px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '5px';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText((t.menu_subtitle || 'MIND PUZZLE').toUpperCase(), 540, 360);

    // Report Header Badge
    roundRect(310, 390, 460, 44, 22, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.1)', 1.5);
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '800 13px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '2.5px';
    ctx.fillText(t.brain_cognitive_report || 'COGNITIVE PERFORMANCE REPORT', 540, 417);

    // 5. HERO BRAIN AGE CARD
    const heroY = 465;
    const heroH = 265;
    roundRect(100, heroY, 880, heroH, 44, 'rgba(255, 255, 255, 0.035)', 'rgba(245, 158, 11, 0.25)', 2);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 20px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText((t.brain_age_label || 'ESTIMATED BRAIN AGE').toUpperCase(), 540, heroY + 52);

    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 135px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '-4px';
    ctx.fillText(String(brainAge), 495, heroY + 172);
    ctx.restore();

    ctx.fillStyle = '#E5E7EB';
    ctx.font = '800 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t.brain_age_years || 'YAŞ', 595, heroY + 160);
    ctx.textAlign = 'center';

    roundRect(240, heroY + 195, 600, 44, 22, 'rgba(245, 158, 11, 0.12)', 'rgba(245, 158, 11, 0.22)', 1.5);
    ctx.fillStyle = '#FCD34D';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(
      `${t.brain_cognitive_index || 'BİLİŞSEL İNDEKS'}: %${cognitiveIndex.toFixed(1)}  •  ${t.brain_percentile || 'TOP'} %${percentile}`,
      540,
      heroY + 223
    );

    // 6. RADAR POLYGON DIAGRAM
    const centerX = 540;
    const centerY = 970;
    const radius = 190;

    [0.25, 0.5, 0.75, 1.0].forEach((scale) => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius * scale);
      ctx.lineTo(centerX + radius * scale, centerY);
      ctx.lineTo(centerX, centerY + radius * scale);
      ctx.lineTo(centerX - radius * scale, centerY);
      ctx.closePath();
      ctx.strokeStyle = scale === 1.0 ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1.5;
      if (scale < 1.0) {
        ctx.setLineDash([4, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    const p1 = { x: centerX, y: centerY - radius * (speedScore / 100) };
    const p2 = { x: centerX + radius * (memoryScore / 100), y: centerY };
    const p3 = { x: centerX, y: centerY + radius * (flexibilityScore / 100) };
    const p4 = { x: centerX - radius * (focusScore / 100), y: centerY };

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.stroke();

    [p1, p2, p3, p4].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    });

    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#F3F4F6';
    ctx.textAlign = 'center';
    ctx.fillText(`${t.brain_speed || 'HIZ'} %${speedScore}`, centerX, centerY - radius - 20);
    ctx.fillText(`${t.brain_flexibility || 'ESNEKLİK'} %${flexibilityScore}`, centerX, centerY + radius + 36);

    ctx.textAlign = 'left';
    ctx.fillText(`${t.brain_memory_stat || 'HAFIZA'} %${memoryScore}`, centerX + radius + 22, centerY + 8);

    ctx.textAlign = 'right';
    ctx.fillText(`${t.brain_focus || 'ODAK'} %${focusScore}`, centerX - radius - 22, centerY + 8);
    ctx.textAlign = 'center';

    // 7. 4 METRIC CARDS
    const metrics = [
      {
        name: t.brain_speed || 'HIZ',
        score: speedScore,
        icon: '⚡',
        detail: `${t.brain_reaction || 'Reaksiyon'}: ~${speedMs}s`,
      },
      {
        name: t.brain_memory_stat || 'HAFIZA',
        score: memoryScore,
        icon: '🧠',
        detail: `${t.brain_memory_span || 'Kapasite'}: ${memorySpan} Chunk`,
      },
      {
        name: t.brain_flexibility || 'ESNEKLİK',
        score: flexibilityScore,
        icon: '🔄',
        detail: `${t.brain_logic_depth || 'Derinlik'}: ${ruleComplexity}`,
      },
      {
        name: t.brain_focus || 'ODAK',
        score: focusScore,
        icon: '🎯',
        detail: `${t.brain_accuracy || 'İsabet'}: %${focusAccuracy}`,
      },
    ];

    const gridY = 1240;
    metrics.forEach((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = 100 + col * 450;
      const by = gridY + row * 155;
      const bw = 430;
      const bh = 135;

      roundRect(bx, by, bw, bh, 28, 'rgba(255, 255, 255, 0.035)', 'rgba(255, 255, 255, 0.08)', 1.5);

      ctx.textAlign = 'left';
      ctx.font = '800 21px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#E5E7EB';
      ctx.fillText(`${m.icon} ${m.name}`, bx + 22, by + 42);

      ctx.textAlign = 'right';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(`%${m.score}`, bx + bw - 22, by + 42);

      roundRect(bx + 22, by + 60, bw - 44, 12, 6, 'rgba(255, 255, 255, 0.08)');
      roundRect(bx + 22, by + 60, ((bw - 44) * m.score) / 100, 12, 6, '#F59E0B');

      ctx.textAlign = 'left';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(m.detail, bx + 22, by + 106);
    });

    // 8. FOOTER WITH STORE PILLS
    const footerY = 1600;
    const footerH = 150;
    roundRect(100, footerY, 880, footerH, 36, 'rgba(255, 255, 255, 0.025)', 'rgba(255, 255, 255, 0.07)', 1.5);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '-0.5px';
    ctx.fillText('ZEKA', 145, footerY + 62);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 17px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(t.menu_subtitle ? `Minimal ${t.menu_subtitle}` : 'Minimal Mind Puzzle', 145, footerY + 98);

    const badgeW = 210;
    const badgeH = 58;
    const appStoreX = 525;
    const googlePlayX = 750;
    const badgeY = footerY + 46;

    // App Store
    roundRect(appStoreX, badgeY, badgeW, badgeH, 16, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.12)', 1.2);
    ctx.save();
    ctx.translate(appStoreX + 16, badgeY + 14);
    ctx.scale(0.17, 0.17);
    if (typeof Path2D !== 'undefined') {
      const applePath = new Path2D(
        "M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.59-7.71-11.71-14.01-6.73-10.32-11.83-21.78-15.3-34.37-3.47-12.59-5.21-24.58-5.21-35.97 0-14.44 3.73-26.49 11.2-36.14 7.46-9.66 16.73-14.59 27.79-14.81 5.32 0 11.2 1.34 17.65 4.02 6.45 2.68 10.74 4.08 12.87 4.2 2.01-.25 6.48-1.74 13.41-4.47 6.94-2.73 12.87-4.04 17.81-3.92 12.06.63 21.72 4.96 28.98 13.01-10.45 6.34-15.6 15.01-15.46 26.01.16 8.5 3.34 15.68 9.54 21.54 6.2 5.86 13.65 9.28 22.36 10.26-2.58 7.82-5.75 15.42-9.52 22.8zM119.22 31.05c0-6.84 2.47-13.25 7.42-19.23 4.94-5.99 11.13-9.66 18.57-11.02.16 1.05.25 2.1.25 3.14 0 6.64-2.54 13.1-7.62 19.38-5.08 6.28-11.3 9.87-18.62 10.78-.16-1.05-.25-2.07-.25-3.05z"
      );
      ctx.fillStyle = '#FFFFFF';
      ctx.fill(applePath);
    }
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Download on the', appStoreX + 54, badgeY + 24);
    ctx.font = '800 17px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('App Store', appStoreX + 54, badgeY + 45);

    // Google Play
    roundRect(googlePlayX, badgeY, badgeW, badgeH, 16, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.12)', 1.2);
    ctx.save();
    ctx.translate(googlePlayX + 16, badgeY + 16);
    const pW = 26;
    const pH = 26;
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(pW, pH / 2);
    ctx.lineTo(2, pH - 2);
    ctx.closePath();
    ctx.fillStyle = '#10B981';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(pW * 0.65, pH * 0.6);
    ctx.lineTo(pW, pH / 2);
    ctx.closePath();
    ctx.fillStyle = '#06B6D4';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, pH - 2);
    ctx.lineTo(pW * 0.65, pH * 0.4);
    ctx.lineTo(pW, pH / 2);
    ctx.closePath();
    ctx.fillStyle = '#EF4444';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pW * 0.65, pH * 0.4);
    ctx.lineTo(pW, pH / 2);
    ctx.lineTo(pW * 0.65, pH * 0.6);
    ctx.closePath();
    ctx.fillStyle = '#F59E0B';
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('GET IT ON', googlePlayX + 52, badgeY + 24);
    ctx.font = '800 17px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Google Play', googlePlayX + 52, badgeY + 45);

    // Output blob
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * High-level unified share action:
 * Tries native file share first (WhatsApp, Instagram, etc.), then standard share, then clipboard fallback.
 */
export async function shareBrainReport(
  params: BrainStoryParams
): Promise<{ success: boolean; method: 'files' | 'share' | 'clipboard' }> {
  const t = Translations[params.language] || Translations['tr'];
  const shareText = `ZEKA: Mind Puzzle 🧠\n${t.brain_age_label || 'Tahmini Beyin Yaşı'}: ${params.brainAge} ⚡\n• ${t.brain_cognitive_index || 'Bilişsel İndeks'}: %${params.cognitiveIndex.toFixed(1)} (${t.brain_percentile || 'Top'} %${params.percentile})\n• ${t.brain_speed || 'Hız'}: %${params.speedScore} (~${params.speedMs}s)\n• ${t.brain_memory_stat || 'Hafıza'}: %${params.memoryScore} (${params.memorySpan} Chunk)\n• ${t.brain_flexibility || 'Esneklik'}: %${params.flexibilityScore}\n• ${t.brain_focus || 'Odak'}: %${params.focusScore} (%${params.focusAccuracy})`;

  try {
    const blob = await generateBrainStoryBlob(params);

    if (blob && typeof navigator !== 'undefined' && 'canShare' in navigator) {
      const file = new File([blob], `zeka-brain-age-${params.brainAge}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `ZEKA Brain Age: ${params.brainAge}`,
          text: shareText,
        });
        return { success: true, method: 'files' };
      }
    }

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      await navigator.share({
        title: `ZEKA Brain Age: ${params.brainAge}`,
        text: shareText,
      });
      return { success: true, method: 'share' };
    }
  } catch {
    // User dismissed or share was interrupted
  }

  // Clipboard fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(shareText);
    return { success: true, method: 'clipboard' };
  }

  return { success: false, method: 'clipboard' };
}
