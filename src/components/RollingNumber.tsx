import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RollingNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
  style,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    if (value !== displayValue) {
      setDirection(value > displayValue ? 'up' : 'down');
      setDisplayValue(value);
    }
  }, [value, displayValue]);

  return (
    <span className={`inline-flex items-center tabular-nums overflow-hidden leading-none ${className}`} style={style}>
      {prefix && <span>{prefix}</span>}
      <span className="relative inline-block overflow-hidden py-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={displayValue}
            initial={{ y: direction === 'up' ? '60%' : '-60%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: direction === 'up' ? '-60%' : '60%', opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            {displayValue}
          </motion.span>
        </AnimatePresence>
      </span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
};
