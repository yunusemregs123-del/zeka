import React from 'react';
import { motion } from 'framer-motion';
import { getCheckpointForLevel, getNextCheckpoint } from '../lib/LevelEngine';

interface JourneyMapProps {
  level: number;
  levelLabel?: string;
  isDark?: boolean;
}

export const JourneyMap: React.FC<JourneyMapProps> = ({
  level,
  levelLabel = 'LEVEL',
  isDark = false,
}) => {
  const lastCP = getCheckpointForLevel(level);
  const nextCP = getNextCheckpoint(level);
  const totalRange = nextCP - lastCP;
  const currentStep = level - lastCP;
  const progressPercent = Math.max(0, Math.min(100, (currentStep / totalRange) * 100));

  // Intermediate node marks (4 equal segments)
  const nodeFractions = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 mb-4 mt-1">
      {/* Labels */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className={`text-[10px] font-black tracking-tight uppercase tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {levelLabel} {lastCP}
          </span>
        </div>

        <span className={`text-[10px] font-black tracking-widest uppercase tabular-nums ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
          {currentStep}/{totalRange}
        </span>

        <div className="flex items-center gap-1.5 opacity-70">
          <span className={`text-[10px] font-black tracking-tight uppercase tabular-nums ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {levelLabel} {nextCP}
          </span>
          <span className="text-[10px]">★</span>
        </div>
      </div>

      {/* Constellation Track */}
      <div className="relative h-6 flex items-center justify-between">
        {/* Track Line Background */}
        <div className={`absolute left-0 right-0 h-[3px] rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-neutral-200/80'}`}>
          {/* Active Filling Progress */}
          <motion.div
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 20 }}
            className={`h-full rounded-full ${
              isDark ? 'bg-gradient-to-r from-emerald-400 to-amber-400' : 'bg-gradient-to-r from-neutral-900 to-neutral-700'
            }`}
          />
        </div>

        {/* Milestone Nodes */}
        {nodeFractions.map((fraction, index) => {
          const nodePercent = fraction * 100;
          const isPassed = progressPercent >= nodePercent;
          const isTarget = index === nodeFractions.length - 1;

          return (
            <div
              key={index}
              className="relative z-10 flex items-center justify-center -translate-x-1/2"
              style={{ left: `${nodePercent}%`, position: 'absolute' }}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isPassed ? [1, 1.25, 1] : 1,
                  backgroundColor: isPassed
                    ? isDark ? '#34D399' : '#1D1D1F'
                    : isDark ? '#262626' : '#E5E5E5',
                }}
                transition={{ duration: 0.2 }}
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 ${
                  isPassed
                    ? isDark ? 'border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'border-white shadow-sm'
                    : isDark ? 'border-neutral-700' : 'border-neutral-100'
                }`}
              >
                {isTarget ? (
                  <span className="text-[7px] font-black text-amber-400 leading-none">★</span>
                ) : isPassed ? (
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                ) : null}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
