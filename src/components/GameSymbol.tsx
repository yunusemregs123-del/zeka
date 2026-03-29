import type { SymbolType } from '../lib/LevelEngine';
import './GameSymbol.css';

interface GameSymbolProps {
  type: SymbolType;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}

// SymbolType → CSS class mapping
const SYMBOL_CLASS_MAP: Record<Exclude<SymbolType, 'Plus'>, string> = {
  CircleFilled: 'hotosm-icon--daire-dolu',
  CircleEmpty: 'hotosm-icon--daire-bos',
  TriangleUp: 'hotosm-icon--ucgen-yukari',
  TriangleDown: 'hotosm-icon--ucgen-asagi',
  Mul2: 'hotosm-icon--pin-a-iki',
  Div2: 'hotosm-icon--pin-a',
  Prev1: 'hotosm-icon--pin-bir',
  Prev2: 'hotosm-icon--soru-isareti',
  ReverseNext: 'hotosm-icon--cift-ok',
  InvertAll: 'hotosm-icon--hesap-arti',
  Star: 'hotosm-icon--yildiz',
  Heart: 'hotosm-icon--kalp',
};

const SIZE_PX = { small: 18, normal: 24, large: 36 } as const;

export const GameSymbol = ({ type, size = 'normal', className = '' }: GameSymbolProps) => {
  const px = SIZE_PX[size];

  // Plus stays as a pure text element (no icon needed)
  if (type === 'Plus') {
    const scaleRef = size === 'small' ? 0.75 : size === 'large' ? 1.5 : 1;
    return (
      <div
        className={`shrink-0 flex items-center justify-center ${className}`}
        style={{ width: 14 * scaleRef, height: 14 * scaleRef }}
      >
        <span style={{ fontSize: `${15 * scaleRef}px`, fontWeight: 900, color: '#d4d4d4', fontFamily: 'system-ui, sans-serif', lineHeight: 1, marginTop: '-2px' }}>+</span>
      </div>
    );
  }

  const iconClass = SYMBOL_CLASS_MAP[type];
  if (!iconClass) return <div className={`shrink-0 flex items-center justify-center ${className}`} style={{ width: px, height: px }} />;

  return (
    <span
      className={`hotosm-icon ${iconClass} ${className}`}
      style={{ width: px, height: px, '--icon-color': '#171717' } as React.CSSProperties}
      role="img"
    />
  );
};
