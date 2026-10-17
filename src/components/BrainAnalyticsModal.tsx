import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Translations } from '../lib/Translations';
import * as Icons from './Icons';
import { haptic } from '../lib/Haptics';

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
  const { language, maxLevelCompleted, comboCount, streak, timeAttackBest, memoryBest } = useGameStore();
  const t = Translations[language];

  // Calculate scores (0 - 100)
  const speedScore = Math.min(100, Math.max(30, Math.round(50 + (timeAttackBest * 3))));
  const memoryScore = Math.min(100, Math.max(35, Math.round(40 + (memoryBest * 4) + (maxLevelCompleted > 51 ? 25 : 0))));
  const flexibilityScore = Math.min(100, Math.max(25, Math.round(45 + (maxLevelCompleted * 0.8))));
  const focusScore = Math.min(100, Math.max(40, Math.round(55 + (comboCount * 5) + (streak * 2))));

  // Brain Age calculation (between 20 and 70)
  const averagePerformance = (speedScore + memoryScore + flexibilityScore + focusScore) / 4;
  const brainAge = Math.max(20, Math.min(68, Math.round(75 - (averagePerformance * 0.65))));

  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    haptic.impact('medium');
    playSound('click');
    const shareText = `ZEKA: Mind Puzzle 🧠\n${t.brain_age_label}: ${brainAge} ⚡\n• ${t.brain_speed}: %${speedScore}\n• ${t.brain_memory_stat}: %${memoryScore}\n• ${t.brain_flexibility}: %${flexibilityScore}\n• ${t.brain_focus}: %${focusScore}\nhttps://zeka.arcn.games`;
    
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Radar Chart calculation (center at 100, 100, radius 70)
  const center = 100;
  const r = 70;
  // 4 axes: Top (Speed), Right (Memory), Bottom (Flexibility), Left (Focus)
  const p1 = { x: center, y: center - (r * (speedScore / 100)) };
  const p2 = { x: center + (r * (memoryScore / 100)), y: center };
  const p3 = { x: center, y: center + (r * (flexibilityScore / 100)) };
  const p4 = { x: center - (r * (focusScore / 100)), y: center };
  const polygonPoints = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[2rem] p-6 w-full max-w-[360px] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Icons.Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-neutral-900 leading-none">{t.brain_title}</h2>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t.brain_subtitle}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors text-neutral-400 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex-1 py-1">
              {/* Brain Age Badge */}
              <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-3xl p-5 mb-4 text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none"></div>
                <span className="text-[10px] font-black tracking-[0.2em] text-neutral-400 uppercase block mb-1">
                  {t.brain_age_label}
                </span>
                <div className="flex items-baseline justify-center gap-1.5 my-1">
                  <span className="text-5xl font-black tracking-tighter text-amber-400 tabular-nums">
                    {brainAge}
                  </span>
                  <span className="text-sm font-bold text-neutral-300">{t.brain_age_years}</span>
                </div>
                <span className="text-[11px] font-medium text-neutral-300 leading-relaxed block mt-1">
                  {brainAge <= 25 ? t.brain_insight_high : brainAge <= 35 ? t.brain_insight_mid : t.brain_insight_low}
                </span>
              </div>

              {/* Minimalist Radar Chart */}
              <div className="bg-neutral-50 rounded-3xl p-4 mb-4 border border-neutral-100 flex flex-col items-center">
                <svg width="200" height="200" viewBox="0 0 200 200" className="overflow-visible">
                  {/* Grid Rings */}
                  {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                    <polygon
                      key={i}
                      points={`${center},${center - (r * scale)} ${center + (r * scale)},${center} ${center},${center + (r * scale)} ${center - (r * scale)},${center}`}
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="1"
                      strokeDasharray={scale === 1 ? 'none' : '2 2'}
                    />
                  ))}
                  {/* Axis lines */}
                  <line x1={center} y1={center - r} x2={center} y2={center + r} stroke="#E5E7EB" strokeWidth="1" />
                  <line x1={center - r} y1={center} x2={center + r} y2={center} stroke="#E5E7EB" strokeWidth="1" />

                  {/* Filled Radar Shape */}
                  <polygon
                    points={polygonPoints}
                    fill="rgba(245, 158, 11, 0.25)"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                  />

                  {/* Nodes */}
                  {[p1, p2, p3, p4].map((p, idx) => (
                    <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
                  ))}

                  {/* Axis Labels */}
                  <text x={center} y={center - r - 8} textAnchor="middle" className="text-[9px] font-black fill-neutral-600">{t.brain_speed} (%{speedScore})</text>
                  <text x={center + r + 8} y={center + 3} textAnchor="start" className="text-[9px] font-black fill-neutral-600">{t.brain_memory_stat} (%{memoryScore})</text>
                  <text x={center} y={center + r + 16} textAnchor="middle" className="text-[9px] font-black fill-neutral-600">{t.brain_flexibility} (%{flexibilityScore})</text>
                  <text x={center - r - 8} y={center + 3} textAnchor="end" className="text-[9px] font-black fill-neutral-600">{t.brain_focus} (%{focusScore})</text>
                </svg>
              </div>

              {/* Share / Challenge Button */}
              <button
                onClick={handleShare}
                className="w-full py-4 bg-[#1D1D1F] hover:bg-black text-white rounded-2xl font-black tracking-widest text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{copied ? t.brain_share_copied : t.brain_share_btn}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
