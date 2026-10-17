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
    ctx.fillText('COGNITIVE PERFORMANCE REPORT', 540, 417);

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
    ctx.fillText('Minimal Mind Puzzle', 145, footerY + 98);

    // Right badges: Minimal App Store & Google Play pills
    const badgeW = 200;
    const badgeH = 56;
    const appStoreX = 540;
    const googlePlayX = 755;
    const badgeY = footerY + 47;

    // App Store Badge
    roundRect(appStoreX, badgeY, badgeW, badgeH, 16, 'rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.12)', 1.2);
    // Apple icon
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('', appStoreX + 32, badgeY + 36);

    ctx.textAlign = 'left';
    ctx.font = '600 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Download on the', appStoreX + 54, badgeY + 23);
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('App Store', appStoreX + 54, badgeY + 43);

    // Google Play Badge
    roundRect(googlePlayX, badgeY, badgeW, badgeH, 16, 'rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.12)', 1.2);
    // Play Triangle icon
    ctx.beginPath();
    ctx.moveTo(googlePlayX + 24, badgeY + 19);
    ctx.lineTo(googlePlayX + 38, badgeY + 28);
    ctx.lineTo(googlePlayX + 24, badgeY + 37);
    ctx.closePath();
    ctx.fillStyle = '#34D399';
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '600 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('GET IT ON', googlePlayX + 50, badgeY + 23);
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Google Play', googlePlayX + 50, badgeY + 43);

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
                  <span className="text-xs font-bold">Kart hazırlanıyor...</span>
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
