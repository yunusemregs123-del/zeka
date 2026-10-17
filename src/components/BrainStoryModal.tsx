import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Translations } from '../lib/Translations';
import { haptic } from '../lib/Haptics';

interface BrainStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  playSound: (type: 'click' | 'success' | 'fail') => void;
}

export const BrainStoryModal: React.FC<BrainStoryModalProps> = ({
  isOpen,
  onClose,
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
  playSound,
}) => {
  const { language } = useGameStore();
  const t = Translations[language];
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Render high-res 1080x1920 (9:16) canvas adhering to ZEKA brand standards
  useEffect(() => {
    if (!isOpen) {
      setImageUrl(null);
      setImageBlob(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // 2. Ambient Warm Amber Glow (Central focus)
    const glow1 = ctx.createRadialGradient(540, 680, 40, 540, 680, 580);
    glow1.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
    glow1.addColorStop(0.5, 'rgba(245, 158, 11, 0.04)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1080, 1920);

    // 3. Precision Outer Border (Card framing)
    roundRect(50, 50, 980, 1820, 56, 'rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.07)', 2);

    // 4. ZEKA APP ICON & LOGO (Exact game standard)
    const iconX = 470;
    const iconY = 120;
    const iconSize = 140;
    // Squircle background
    roundRect(iconX, iconY, iconSize, iconSize, 42, '#1D1D1F', 'rgba(255, 255, 255, 0.16)', 2);

    // Micro geometric accents inside icon
    ctx.beginPath();
    ctx.arc(iconX + 32, iconY + 32, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Small triangle in bottom right
    ctx.beginPath();
    ctx.moveTo(iconX + iconSize - 34, iconY + iconSize - 20);
    ctx.lineTo(iconX + iconSize - 22, iconY + iconSize - 20);
    ctx.lineTo(iconX + iconSize - 28, iconY + iconSize - 32);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Iconic 'Z'
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 82px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Z', iconX + iconSize / 2, iconY + 98);

    // Game Title & Subtitle
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

    // 5. HERO BRAIN AGE CARD (Mathematical & Clean)
    const heroY = 465;
    const heroH = 265;
    roundRect(100, heroY, 880, heroH, 44, 'rgba(255, 255, 255, 0.035)', 'rgba(245, 158, 11, 0.25)', 2);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 20px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText((t.brain_age_label || 'ESTIMATED BRAIN AGE').toUpperCase(), 540, heroY + 52);

    // Glowing Age
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

    // Mathematical Cognitive Index Pill
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

    // Guideline diamonds
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

    // Axes lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Data polygon
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

    // Vertices
    [p1, p2, p3, p4].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    });

    // Radar Labels
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

    // 7. 4 SCIENTIFIC METRIC CARDS (2x2 Grid)
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

      // Icon & Name
      ctx.textAlign = 'left';
      ctx.font = '800 21px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#E5E7EB';
      ctx.fillText(`${m.icon} ${m.name}`, bx + 22, by + 42);

      // Score
      ctx.textAlign = 'right';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(`%${m.score}`, bx + bw - 22, by + 42);

      // Progress bar
      roundRect(bx + 22, by + 60, bw - 44, 12, 6, 'rgba(255, 255, 255, 0.08)');
      roundRect(bx + 22, by + 60, ((bw - 44) * m.score) / 100, 12, 6, '#F59E0B');

      // Scientific micro-detail
      ctx.textAlign = 'left';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(m.detail, bx + 22, by + 106);
    });

    // 8. MINIMAL FOOTER WITH APP STORE & GOOGLE PLAY BADGES (No website URL)
    const footerY = 1600;
    const footerH = 150;
    roundRect(100, footerY, 880, footerH, 36, 'rgba(255, 255, 255, 0.025)', 'rgba(255, 255, 255, 0.07)', 1.5);

    // Left info: ZEKA • Mind Puzzle
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '-0.5px';
    ctx.fillText('ZEKA', 145, footerY + 62);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 17px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(t.menu_subtitle ? `Minimal ${t.menu_subtitle}` : 'Minimal Mind Puzzle', 145, footerY + 98);

    // Right badges: Minimal App Store & Google Play pills
    const badgeW = 210;
    const badgeH = 58;
    const appStoreX = 525;
    const googlePlayX = 750;
    const badgeY = footerY + 46;

    // 1. App Store Badge
    roundRect(appStoreX, badgeY, badgeW, badgeH, 16, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.12)', 1.2);
    
    // Draw Authentic Vector Apple Logo (Works 100% across all OS & devices without font dependencies)
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

    // 2. Google Play Badge
    roundRect(googlePlayX, badgeY, badgeW, badgeH, 16, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.12)', 1.2);

    // Draw Google Play Multi-Facet Vector Triangle
    ctx.save();
    ctx.translate(googlePlayX + 16, badgeY + 16);
    const pW = 26;
    const pH = 26;

    // Green base
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(pW, pH / 2);
    ctx.lineTo(2, pH - 2);
    ctx.closePath();
    ctx.fillStyle = '#10B981';
    ctx.fill();

    // Blue/Cyan top facet
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(pW * 0.65, pH * 0.6);
    ctx.lineTo(pW, pH / 2);
    ctx.closePath();
    ctx.fillStyle = '#06B6D4';
    ctx.fill();

    // Red bottom facet
    ctx.beginPath();
    ctx.moveTo(2, pH - 2);
    ctx.lineTo(pW * 0.65, pH * 0.4);
    ctx.lineTo(pW, pH / 2);
    ctx.closePath();
    ctx.fillStyle = '#EF4444';
    ctx.fill();

    // Amber right facet
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

    // Convert to Blob & Data URL
    canvas.toBlob((blob) => {
      if (blob) {
        setImageBlob(blob);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    }, 'image/png');
  }, [
    isOpen,
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
  ]);

  const handleNativeShare = async () => {
    haptic.impact('medium');
    playSound('click');
    setIsSharing(true);

    try {
      if (imageBlob && navigator.canShare) {
        const file = new File([imageBlob], 'zeka-brain-age.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `ZEKA Brain Age: ${brainAge}`,
            text: `ZEKA'da beyin yaşım ${brainAge} çıktı! ⚡ Bilişsel İndeks: %${cognitiveIndex.toFixed(1)} (Top %${percentile})`,
          });
          setIsSharing(false);
          return;
        }
      }
    } catch {
      // User dismissed share dialog
    }

    // Fallback: trigger image download
    handleDownloadImage();
    setIsSharing(false);
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    haptic.notification('success');
    playSound('success');

    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `zeka-beyin-yasi-${brainAge}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md pointer-events-auto">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: 0.22 }}
            className="bg-[#12131A] text-white rounded-[2.2rem] p-4 sm:p-5 w-full max-w-[350px] shadow-2xl border border-neutral-800 relative flex flex-col max-h-[94vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 text-sm">
                  📸
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white leading-none">
                    {t.brain_story_title || 'HİKAYE KARTI (9:16)'}
                  </h3>
                  <span className="text-[10px] font-bold text-neutral-400">
                    Instagram & TikTok Story
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors text-neutral-400 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* 9:16 Visual Preview Card */}
            <div className="relative w-full aspect-[9/16] max-h-[58vh] rounded-2xl overflow-hidden border border-neutral-700/60 bg-neutral-900 shadow-inner flex items-center justify-center my-auto">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="ZEKA Brain Age Story Card"
                  className="w-full h-full object-contain select-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold">{t.brain_story_loading || 'Kart hazırlanıyor...'}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-3 shrink-0">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNativeShare}
                disabled={!imageUrl || isSharing}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-neutral-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <span>🚀</span>
                <span>{t.brain_story_share || 'HİKAYEDE PAYLAŞ'}</span>
              </motion.button>

              <button
                onClick={handleDownloadImage}
                disabled={!imageUrl}
                className="w-full py-2.5 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-neutral-700/50"
              >
                <span>💾</span>
                <span>{isCopied ? (t.brain_story_copied || 'KAYDEDİLDİ! ✓') : (t.brain_story_save || 'GÖRSELİ İNDİR')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
