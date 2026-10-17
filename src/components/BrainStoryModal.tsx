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
  memoryScore: number;
  flexibilityScore: number;
  focusScore: number;
  playSound: (type: 'click' | 'success' | 'fail') => void;
}

export const BrainStoryModal: React.FC<BrainStoryModalProps> = ({
  isOpen,
  onClose,
  brainAge,
  speedScore,
  memoryScore,
  flexibilityScore,
  focusScore,
  playSound,
}) => {
  const { language } = useGameStore();
  const t = Translations[language];
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Render high-res 1080x1920 (9:16) canvas
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

    // 1. Deep Obsidian Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#090A10');
    bgGrad.addColorStop(0.5, '#0E1018');
    bgGrad.addColorStop(1, '#07080D');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Ambient Glowing Gradients
    const glow1 = ctx.createRadialGradient(540, 680, 50, 540, 680, 600);
    glow1.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
    glow1.addColorStop(0.5, 'rgba(245, 158, 11, 0.05)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1080, 1920);

    const glow2 = ctx.createRadialGradient(850, 1400, 40, 850, 1400, 500);
    glow2.addColorStop(0, 'rgba(99, 102, 241, 0.12)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1080, 1920);

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

    // 3. Card Frame (960 x 1800)
    roundRect(60, 60, 960, 1800, 56, 'rgba(255, 255, 255, 0.025)', 'rgba(255, 255, 255, 0.08)', 2);

    // 4. Header Badge: ZEKA • MIND INTELLIGENCE REPORT
    roundRect(330, 130, 420, 56, 28, 'rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.12)', 1.5);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText('ZEKA • COGNITIVE LABS', 540, 166);

    // 5. Brain Age Hero Card
    roundRect(120, 240, 840, 360, 44, 'rgba(255, 255, 255, 0.04)', 'rgba(245, 158, 11, 0.25)', 2);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 24px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText((t.brain_age_label || 'ESTIMATED BRAIN AGE').toUpperCase(), 540, 305);

    // Giant Glowing Age Number
    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 160px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '-4px';
    ctx.fillText(String(brainAge), 500, 470);
    ctx.restore();

    ctx.fillStyle = '#E5E7EB';
    ctx.font = '800 40px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t.brain_age_years || 'YAŞ', 630, 455);
    ctx.textAlign = 'center';

    // Insight pill
    const insightText = brainAge <= 25 
      ? (t.brain_insight_high || 'Üstün refleksler ve dinamik zihin!') 
      : brainAge <= 35 
      ? (t.brain_insight_mid || 'Dengeli ve keskin bilişsel kapasite.') 
      : (t.brain_insight_low || 'Düzenli egzersizle zihnini genç tut!');

    roundRect(160, 515, 760, 52, 26, 'rgba(245, 158, 11, 0.12)', 'rgba(245, 158, 11, 0.2)', 1.5);
    ctx.fillStyle = '#FCD34D';
    ctx.font = '700 21px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(insightText, 540, 549);

    // 6. Minimalist Radar Diagram
    const centerX = 540;
    const centerY = 890;
    const radius = 210;

    // Concentric guideline diamonds
    [0.25, 0.5, 0.75, 1.0].forEach((scale) => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius * scale);
      ctx.lineTo(centerX + radius * scale, centerY);
      ctx.lineTo(centerX, centerY + radius * scale);
      ctx.lineTo(centerX - radius * scale, centerY);
      ctx.closePath();
      ctx.strokeStyle = scale === 1.0 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
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

    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Vertices
    [p1, p2, p3, p4].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.stroke();
    });

    // Radar Labels
    ctx.font = '900 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#F3F4F6';
    ctx.textAlign = 'center';
    ctx.fillText(`${t.brain_speed || 'HIZ'} %${speedScore}`, centerX, centerY - radius - 24);
    ctx.fillText(`${t.brain_flexibility || 'ESNEKLİK'} %${flexibilityScore}`, centerX, centerY + radius + 40);

    ctx.textAlign = 'left';
    ctx.fillText(`${t.brain_memory_stat || 'HAFIZA'} %${memoryScore}`, centerX + radius + 24, centerY + 8);

    ctx.textAlign = 'right';
    ctx.fillText(`${t.brain_focus || 'ODAK'} %${focusScore}`, centerX - radius - 24, centerY + 8);
    ctx.textAlign = 'center';

    // 7. Stat Cards (4 metrics with bars)
    const stats = [
      { name: t.brain_speed || 'HIZ', score: speedScore, icon: '⚡' },
      { name: t.brain_memory_stat || 'HAFIZA', score: memoryScore, icon: '🧠' },
      { name: t.brain_flexibility || 'ESNEKLİK', score: flexibilityScore, icon: '🔄' },
      { name: t.brain_focus || 'ODAK', score: focusScore, icon: '🎯' },
    ];

    const gridY = 1220;
    stats.forEach((st, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = 120 + col * 430;
      const by = gridY + row * 160;

      roundRect(bx, by, 410, 130, 28, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.08)', 1.5);

      // Icon & Name
      ctx.textAlign = 'left';
      ctx.font = '700 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`${st.icon} ${st.name}`, bx + 24, by + 46);

      // Percentage
      ctx.textAlign = 'right';
      ctx.font = '900 26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(`%${st.score}`, bx + 386, by + 46);

      // Progress Track
      roundRect(bx + 24, by + 74, 362, 16, 8, 'rgba(255, 255, 255, 0.08)');
      roundRect(bx + 24, by + 74, (362 * st.score) / 100, 16, 8, '#F59E0B');
    });

    // 8. Footer CTA / Social Proof
    const footerY = 1600;
    roundRect(160, footerY, 760, 140, 36, 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.08)', 1.5);

    ctx.textAlign = 'center';
    ctx.font = '800 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Senin zihnin kaç yaşında? 🧠', 540, footerY + 54);

    ctx.font = '700 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#F59E0B';
    ctx.fillText('zeka.arcn.games', 540, footerY + 98);

    // Convert to Blob & Data URL
    canvas.toBlob((blob) => {
      if (blob) {
        setImageBlob(blob);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    }, 'image/png');
  }, [isOpen, brainAge, speedScore, memoryScore, flexibilityScore, focusScore, language]);

  const handleNativeShare = async () => {
    haptic.impact('medium');
    playSound('click');
    setIsSharing(true);

    try {
      if (imageBlob && navigator.canShare) {
        const file = new File([imageBlob], 'zeka-beyin-yasi.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `ZEKA Beyin Yaşım: ${brainAge}`,
            text: `ZEKA'da beyin yaşım ${brainAge} çıktı! ⚡ Senin zihnin kaç yaşında? Hemen test et: https://zeka.arcn.games`,
          });
          setIsSharing(false);
          return;
        }
      }
    } catch (e) {
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
