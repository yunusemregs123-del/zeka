import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Translations, type LanguageCode } from '../lib/Translations';
import * as Icons from './Icons';
import type { WeeklyRewardData } from '../store/useGameStore';

interface WeeklyRewardModalProps {
  reward: WeeklyRewardData;
  language: LanguageCode;
  onClaim: () => void;
}

export const WeeklyRewardModal: React.FC<WeeklyRewardModalProps> = ({
  reward,
  language,
  onClaim,
}) => {
  const t = Translations[language];
  const rank = reward.rank;

  // Visual styling based on placement
  const getRankBadge = () => {
    if (rank === 1) {
      return {
        icon: <Icons.Crown className="w-10 h-10 text-amber-500 drop-shadow-md" />,
        bg: 'from-amber-400/20 via-yellow-400/15 to-amber-500/10 border-amber-300/50',
        ring: 'ring-amber-400/40',
        text: 'bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent',
        badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950',
        label: '#1 ŞAMPİYON',
      };
    }
    if (rank === 2) {
      return {
        icon: <Icons.Trophy className="w-10 h-10 text-slate-400 drop-shadow-md" />,
        bg: 'from-slate-300/25 via-slate-200/20 to-slate-400/10 border-slate-300/60',
        ring: 'ring-slate-300/50',
        text: 'bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent',
        badgeBg: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
        label: '#2 İKİNCİ',
      };
    }
    if (rank === 3) {
      return {
        icon: <Icons.Medal className="w-10 h-10 text-amber-700 drop-shadow-md" />,
        bg: 'from-amber-700/20 via-orange-600/15 to-amber-800/10 border-amber-600/40',
        ring: 'ring-amber-600/40',
        text: 'bg-gradient-to-r from-amber-800 to-orange-800 bg-clip-text text-transparent',
        badgeBg: 'bg-gradient-to-r from-amber-700 to-orange-700 text-white',
        label: '#3 ÜÇÜNCÜ',
      };
    }
    return {
      icon: <Icons.Star className="w-10 h-10 text-indigo-500 drop-shadow-md" />,
      bg: 'from-indigo-500/15 via-blue-500/10 to-indigo-600/10 border-indigo-300/50',
      ring: 'ring-indigo-400/40',
      text: 'bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent',
      badgeBg: 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white',
      label: `#${rank} İLK 10`,
    };
  };

  const badge = getRankBadge();
  const rankDescription = (t.weekly_reward_rank_text || 'Geçen haftayı {rank}. sırada tamamladın!').replace('{rank}', String(rank));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        {/* Animated Celebration Card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/60 text-center overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-300/25 rounded-full blur-3xl pointer-events-none" />

          {/* Sparkles / Confetti Dots */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
            <span className="absolute top-4 left-6 text-xs animate-pulse">✨</span>
            <span className="absolute top-8 right-8 text-sm animate-bounce">🎉</span>
            <span className="absolute bottom-16 left-8 text-xs animate-pulse">⭐</span>
            <span className="absolute top-20 right-4 text-xs animate-ping">✨</span>
          </div>

          {/* Rank Icon Spotlight */}
          <div className="relative mx-auto w-24 h-24 mb-3 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${badge.bg} border flex items-center justify-center shadow-lg ring-4 ${badge.ring}`}
            >
              {badge.icon}
            </motion.div>
            <div className={`absolute -bottom-2 px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md ${badge.badgeBg}`}>
              {badge.label}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="mt-4 mb-4">
            <h2 className="text-lg font-black tracking-tight text-neutral-900 uppercase">
              {t.weekly_reward_title || 'HAFTALIK LİG ÖDÜLÜ'}
            </h2>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {t.weekly_reward_subtitle || 'Geçen haftaki üstün derecen ödüllendirildi!'}
            </p>
            <p className="text-sm font-bold text-neutral-800 mt-2">
              {rankDescription}
            </p>
          </div>

          {/* Giant Coin Reward Box */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.95, 1.02, 0.98, 1] }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="my-5 py-3.5 px-4 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200/80 rounded-2xl shadow-inner flex items-center justify-center gap-3"
          >
            <Icons.Coin className="w-8 h-8 text-amber-500 animate-spin-slow drop-shadow" />
            <div className="text-left">
              <span className="block text-[10px] font-bold text-amber-700/80 uppercase tracking-widest">
                KAZANILAN ÖDÜL
              </span>
              <span className="text-2xl font-black text-amber-900 tracking-tight">
                +{reward.coins} <span className="text-base font-extrabold text-amber-700">COIN</span>
              </span>
            </div>
          </motion.div>

          {/* Claim Action Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onClaim}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-neutral-950 font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-amber-500/25 border border-amber-300/50 flex items-center justify-center gap-2 transition-all active:shadow-sm"
          >
            <Icons.Trophy className="w-4 h-4 text-neutral-950" />
            <span>{t.weekly_reward_btn || 'HARİKA, ÖDÜLÜ AL!'}</span>
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

