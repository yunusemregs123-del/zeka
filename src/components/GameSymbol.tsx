import type { SymbolType } from '../lib/LevelEngine';

interface GameSymbolProps {
  type: SymbolType;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}

export const GameSymbol = ({ type, size = 'normal', className = '' }: GameSymbolProps) => {
  const scaleRef = size === 'small' ? 0.75 : size === 'large' ? 1.5 : 1;
  const baseSize = 24 * scaleRef;
  const c = '#171717'; // neutral-900
  const p = '#d4d4d4'; // neutral-300
  const containerClass = `shrink-0 ${className}`;

  // Renders explicitly styled SVG elements with key={type} 
  // to force complete React DOM remount on symbol change.
  // Explicit fill="transparent" ensures WebView never paints paths black.
  switch (type) {
    case 'CircleFilled':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <circle cx="12" cy="12" r="10" fill={c} />
        </svg>
      );
    case 'CircleEmpty':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <circle cx="12" cy="12" r="9" fill="transparent" stroke={c} strokeWidth="2.5" />
        </svg>
      );
    case 'TriangleUp':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <path d="M12 2L22 20H2L12 2Z" fill={c} />
        </svg>
      );
    case 'TriangleDown':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <path d="M12 22L2 4H22L12 22Z" fill={c} />
        </svg>
      );
    case 'Mul2':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="transparent" stroke={c} strokeWidth="2.5" />
          <path d="M6 9.5L11 14.5M11 9.5L6 14.5" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Div2':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="transparent" stroke={c} strokeWidth="2.5" />
          <path d="M7 16.5L10 7.5" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Prev1':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M3 3v5h5" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M9.5 10L12 7.5v9" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Prev2':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M3 3v5h5" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M9 10C9 6.5 15 6.5 15 10.5C15 13.5 9 14.5 9 16.5H15" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'ReverseNext':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <path d="M9 18l-4-4 4-4" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M5 14h14" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M15 6l4 4-4 4" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M5 10h14" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'InvertAll':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <rect x="2" y="2" width="20" height="20" rx="4" fill="transparent" stroke={c} strokeWidth="2.5" />
          <path d="M22 2L2 22" fill="transparent" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M5 8h4" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path d="M15 16h4M17 14v4" fill="transparent" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Star':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={c} />
        </svg>
      );
    case 'Heart':
      return (
        <svg key={type} width={baseSize} height={baseSize} viewBox="0 0 24 24" className={containerClass}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={c} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'Plus':
      return (
        <svg key={type} width={16 * scaleRef} height={16 * scaleRef} viewBox="0 0 24 24" className={containerClass}>
          <path d="M12 5V19M5 12H19" fill="transparent" stroke={p} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return <div className={containerClass} style={{ width: baseSize, height: baseSize }} />;
  }
};
