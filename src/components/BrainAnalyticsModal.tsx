import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Translations } from '../lib/Translations';
import * as Icons from './Icons';
import { haptic } from '../lib/Haptics';
import { shareBrainReport, downloadBrainStoryImage, copyBrainReportText } from '../lib/ShareReport';

interface BrainAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playSound: (type: 'click' | 'success' | 'fail') => void;
}

export const BrainAnalyticsModal: React.FC<BrainAnalyticsModalProps> = ({
  isOpen,
  onClose,
  playSound,
}) => {
  const { language, maxLevelCompleted, comboCount, streak, timeAttackBest, memoryBest, lastLevelTime } = useGameStore();
  const t = Translations[language];
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  // 1. SPEED SCORE (Processing Speed & Reaction):
  // Baseline 60. Rewards active fast solves (combo), fast level times and time attack best.
  const speedSolveBonus = lastLevelTime > 0 && lastLevelTime <= 3.5 ? 10 : 0;
  const speedRaw = 60 + Math.min(26, comboCount * 4.4) + Math.min(16, timeAttackBest * 2.2) + speedSolveBonus;
  const speedScore = Math.min(100, Math.max(50, Math.round(speedRaw)));
  const speedMs = Math.max(0.65, Number((2.8 - Math.min(2.0, (speedScore - 50) * 0.028)).toFixed(2)));

  // 2. MEMORY SCORE (Working Memory Span & Rule Retention):
  // Baseline 60. Rewards unbroken streaks (holding active arithmetic state without error).
  const memoryStreakBonus = Math.min(25, streak * 2.5);
  const memoryModeBonus = Math.min(16, memoryBest * 3.5);
  const memoryLevelBonus = Math.min(14, maxLevelCompleted * 0.3);
  const memoryRaw = 60 + memoryStreakBonus + memoryModeBonus + memoryLevelBonus;
  const memoryScore = Math.min(100, Math.max(50, Math.round(memoryRaw)));
  const memorySpan = (5.5 + Math.min(3.4, (memoryScore - 50) * 0.07)).toFixed(1);

  // 3. AGILITY / FLEXIBILITY SCORE (Cognitive Switching & Mathematical Agility):
  // Baseline 62. Rewards fluid problem switching under combo and streak synergy.
  const flexibilitySynergy = Math.min(24, (streak * 1.6) + (comboCount * 2.0));
  const flexibilityLevel = Math.min(16, maxLevelCompleted * 0.35);
  const flexibilityRaw = 62 + flexibilitySynergy + flexibilityLevel;
  const flexibilityScore = Math.min(100, Math.max(55, Math.round(flexibilityRaw)));
  const ruleComplexity = Math.min(10, Math.max(1, Math.round(1 + (maxLevelCompleted / 12)))) + '/10';

  // 4. FOCUS SCORE (Inhibitory Control & Sustained Accuracy):
  // Baseline 65. Directly powered by flawless execution and error-free streaks.
  const focusStreak = Math.min(25, streak * 3.2);
  const focusCombo = Math.min(12, comboCount * 2.2);
  const focusRaw = 65 + focusStreak + focusCombo;
  const focusScore = Math.min(100, Math.max(60, Math.round(focusRaw)));
  const focusAccuracy = Number((92 + Math.min(7.8, (focusScore - 60) * 0.20)).toFixed(1));

  // OVERALL COGNITIVE INDEX (0 - 100):
  const cognitiveIndex = Number(((speedScore * 0.25) + (memoryScore * 0.25) + (flexibilityScore * 0.25) + (focusScore * 0.25)).toFixed(1));
  const percentile = Math.max(1, Math.min(75, Math.round(100 - (cognitiveIndex * 0.96))));

  // PSYCHOMETRIC BRAIN AGE (Calibrated 20-46 standard):
  const rawAge = 20 + Math.round((100 - cognitiveIndex) * 0.44);
  const brainAge = Math.max(20, Math.min(46, rawAge));

  const shareParams = {
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
  };

  // 1. Share Story Action (Native 9:16 Card)
  const handleShareStory = async () => {
    haptic.impact('medium');
    playSound('click');
    setIsSharing(true);

    try {
      const res = await shareBrainReport(shareParams);
      if (res.method === 'download') {
        setSavedStatus(t.brain_story_copied || 'KAYDEDİLDİ! ✓');
        setTimeout(() => setSavedStatus(null), 2500);
      }
    } catch {
      // Handled inside shareBrainReport without false-positive clipboard overwrite
    } finally {
      setIsSharing(false);
    }
  };

  // 2. Direct Image Download Action
  const handleSaveImage = async () => {
    haptic.impact('light');
    playSound('click');
    setIsSaving(true);
    const success = await downloadBrainStoryImage(shareParams);
    setIsSaving(false);
    if (success) {
      haptic.notification('success');
      setSavedStatus(t.brain_story_copied || 'KAYDEDİLDİ! ✓');
      setTimeout(() => setSavedStatus(null), 2500);
    }
  };

  // 3. Direct Text Copy Action
  const handleCopyText = async () => {
    haptic.impact('light');
    playSound('click');
    const success = await copyBrainReportText(shareParams);
    if (success) {
      haptic.notification('success');
      setCopiedStatus(t.brain_share_copied || 'KOPYALANDI! ✓');
      setTimeout(() => setCopiedStatus(null), 2500);
    }
  };

  // Radar Polygon calculation (center at 120, 80 with radius 48 inside a 240x160 viewBox)
  // Guarantees zero text overflow on any screen size
  const cx = 120;
  const cy = 80;
  const r = 48;
  const p1 = { x: cx, y: cy - (r * (speedScore / 100)) };
  const p2 = { x: cx + (r * (memoryScore / 100)), y: cy };
  const p3 = { x: cx, y: cy + (r * (flexibilityScore / 100)) };
  const p4 = { x: cx - (r * (focusScore / 100)), y: cy };
  const polygonPoints = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-[360px] shadow-2xl flex flex-col overflow-hidden max-h-[90dvh]"
          >
            {/* Header with Title & Subtitle */}
            <div className="flex justify-between items-center p-4 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Icons.Brain className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-neutral-900 tracking-tight uppercase leading-none">
                    {t.brain_title || 'BEYİN ANALİTİĞİ'}
                  </h2>
                  <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                    {t.brain_subtitle || 'BİLİŞSEL PERFORMANS'}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 rounded-full transition-colors"
              >
                <Icons.X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto">
              {/* Brain Age Hero Card */}
              <div className="bg-[#1D1D1F] text-white rounded-2xl p-4 text-center shadow-sm relative overflow-hidden mb-3 border border-neutral-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                    {t.brain_age_label || 'TAHMİNİ BEYİN YAŞIN'}
                  </span>
                  <div className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-black text-amber-400 tracking-wide">
                    {t.brain_percentile || 'İLK'} %{percentile}
                  </div>
                </div>

                <div className="flex items-baseline justify-center gap-1.5 my-1">
                  <span className="text-5xl font-black text-amber-400 tracking-tight tabular-nums">
                    {brainAge}
                  </span>
                  <span className="text-sm font-black text-neutral-400">
                    {t.brain_age_years || 'YAŞ'}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold text-neutral-300 mt-1">
                  <span className="text-amber-400">•</span>
                  <span>
                    {brainAge <= 24
                      ? t.brain_insight_high
                      : brainAge <= 34
                      ? t.brain_insight_mid
                      : t.brain_insight_low}
                  </span>
                </div>
              </div>

              {/* 4 Metric Breakdown Cards (Clean 2x2 Grid) */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* HIZ */}
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-2.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Icons.Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {t.brain_speed || 'HIZ'}
                    </span>
                    <span className="text-xs font-black text-neutral-900 tabular-nums">%{speedScore}</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-500 block truncate">
                    ~{speedMs}s {t.brain_reaction || 'Reaksiyon'}
                  </span>
                </div>

                {/* HAFIZA */}
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-2.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Icons.Brain className="w-3 h-3 text-blue-500" />
                      {t.brain_memory_stat || 'HAFIZA'}
                    </span>
                    <span className="text-xs font-black text-neutral-900 tabular-nums">%{memoryScore}</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-500 block truncate">
                    {memorySpan} Chunk {t.brain_memory_span || 'Kapasite'}
                  </span>
                </div>

                {/* ESNEKLİK */}
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-2.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Icons.Sliders className="w-3 h-3 text-purple-500" />
                      {t.brain_flexibility || 'ESNEKLİK'}
                    </span>
                    <span className="text-xs font-black text-neutral-900 tabular-nums">%{flexibilityScore}</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-500 block truncate">
                    {ruleComplexity} {t.brain_logic_depth || 'Derinlik'}
                  </span>
                </div>

                {/* ODAK */}
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-2.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Icons.Target className="w-3 h-3 text-emerald-500" />
                      {t.brain_focus || 'ODAK'}
                    </span>
                    <span className="text-xs font-black text-neutral-900 tabular-nums">%{focusScore}</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-500 block truncate">
                    %{focusAccuracy} {t.brain_accuracy || 'İsabet'}
                  </span>
                </div>
              </div>

              {/* Minimal Radar Chart (No Label Overflow) */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-neutral-50 rounded-2xl border border-neutral-100 mb-4">
                <div className="flex justify-between items-center w-full px-1 mb-1">
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                    {t.brain_radar_title || 'BİLİŞSEL DAĞILIM'}
                  </span>
                  <span className="text-[9px] font-black text-neutral-500 tabular-nums">
                    {t.brain_cognitive_index || 'İNDEKS'}: %{cognitiveIndex}
                  </span>
                </div>

                <svg viewBox="0 0 240 160" className="w-full h-32 select-none">
                  {/* Concentric diamond grid */}
                  {[0.33, 0.66, 1.0].map((scale, i) => (
                    <polygon
                      key={i}
                      points={`${cx},${cy - (r * scale)} ${cx + (r * scale)},${cy} ${cx},${cy + (r * scale)} ${cx - (r * scale)},${cy}`}
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="1"
                      strokeDasharray={scale === 1 ? 'none' : '2 2'}
                    />
                  ))}

                  {/* Axis lines */}
                  <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#E5E7EB" strokeWidth="1" />
                  <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#E5E7EB" strokeWidth="1" />

                  {/* Filled Radar Shape */}
                  <polygon
                    points={polygonPoints}
                    fill="rgba(245, 158, 11, 0.20)"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />

                  {/* Nodes */}
                  {[p1, p2, p3, p4].map((p, idx) => (
                    <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
                  ))}

                  {/* Labels positioned safely inside the 240 width */}
                  <text x={cx} y={cy - r - 6} textAnchor="middle" className="text-[8.5px] font-black fill-neutral-500 tracking-tight uppercase">
                    {t.brain_speed} (%{speedScore})
                  </text>
                  <text x={cx + r + 6} y={cy + 3} textAnchor="start" className="text-[8.5px] font-black fill-neutral-500 tracking-tight uppercase">
                    {t.brain_memory_stat} (%{memoryScore})
                  </text>
                  <text x={cx} y={cy + r + 13} textAnchor="middle" className="text-[8.5px] font-black fill-neutral-500 tracking-tight uppercase">
                    {t.brain_flexibility} (%{flexibilityScore})
                  </text>
                  <text x={cx - r - 6} y={cy + 3} textAnchor="end" className="text-[8.5px] font-black fill-neutral-500 tracking-tight uppercase">
                    {t.brain_focus} (%{focusScore})
                  </text>
                </svg>
              </div>

              {/* Action Buttons: Minimalist & Clean */}
              <div className="flex flex-col gap-2">
                {/* 1. Primary Action: Share Story (9:16) */}
                <button
                  type="button"
                  onClick={handleShareStory}
                  disabled={isSharing}
                  className="w-full py-3 bg-[#1D1D1F] hover:bg-black active:scale-[0.98] text-white rounded-2xl font-black text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSharing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  ) : (
                    <Icons.Share className="w-4 h-4 text-white shrink-0" />
                  )}
                  <span>{t.brain_story_share || 'HİKAYEDE PAYLAŞ (9:16)'}</span>
                </button>

                {/* 2. Secondary Row: Save Image & Copy Summary */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveImage}
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] text-neutral-700 rounded-xl font-bold text-[11px] tracking-wide transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
                    ) : savedStatus ? (
                      <>
                        <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-black">{savedStatus}</span>
                      </>
                    ) : (
                      <>
                        <Icons.Download className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{t.brain_story_save || 'Görseli İndir'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] text-neutral-700 rounded-xl font-bold text-[11px] tracking-wide transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedStatus ? (
                      <>
                        <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-black">{copiedStatus}</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{t.brain_copy_summary || 'Özeti Kopyala'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
