import type { SymbolType } from '../lib/LevelEngine';

interface GameSymbolProps {
  type: SymbolType;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}

export const GameSymbol = ({ type, size = 'normal', className = '' }: GameSymbolProps) => {
  // Scaling factors based on 'size' prop to ensure uniform resizing of CSS shapes
  const scaleRef = size === 'small' ? 0.75 : size === 'large' ? 1.5 : 1;
  const baseSize = 24 * scaleRef; // Base equivalent to 24x24 SVG
  
  const containerClass = `flex items-center justify-center shrink-0 ${className}`;
  const containerStyle = { width: baseSize, height: baseSize };
  
  const color = '#171717'; // neutral-900
  const plusColor = '#d4d4d4'; // neutral-300
  
  // Base properties for shape borders to match strokeWidth=2.5 in SVG
  const strokeW = Math.max(1.5, 2.5 * scaleRef); 

  switch (type) {
    case 'CircleFilled':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 20 * scaleRef, height: 20 * scaleRef, backgroundColor: color, borderRadius: '50%' }}></div>
        </div>
      );
    case 'CircleEmpty':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 18 * scaleRef, height: 18 * scaleRef, border: `${strokeW}px solid ${color}`, borderRadius: '50%' }}></div>
        </div>
      );
    case 'TriangleUp':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: 0, height: 0, 
            borderLeft: `${10 * scaleRef}px solid transparent`,
            borderRight: `${10 * scaleRef}px solid transparent`,
            borderBottom: `${18 * scaleRef}px solid ${color}`
          }}></div>
        </div>
      );
    case 'TriangleDown':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: 0, height: 0, 
            borderLeft: `${10 * scaleRef}px solid transparent`,
            borderRight: `${10 * scaleRef}px solid transparent`,
            borderTop: `${18 * scaleRef}px solid ${color}`
          }}></div>
        </div>
      );
    case 'Mul2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 20 * scaleRef, height: 20 * scaleRef, border: `${strokeW}px solid ${color}`, borderRadius: `${6 * scaleRef}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: `${10 * scaleRef}px`, fontWeight: 900, color: color, letterSpacing: '-0.05em' }}>x2</span>
          </div>
        </div>
      );
    case 'Div2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 20 * scaleRef, height: 20 * scaleRef, border: `${strokeW}px solid ${color}`, borderRadius: `${6 * scaleRef}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: `${10 * scaleRef}px`, fontWeight: 900, color: color, letterSpacing: '-0.05em' }}>/2</span>
          </div>
        </div>
      );
    case 'Prev1':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 22 * scaleRef, height: 22 * scaleRef, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {/* Simple CSS arrow representation using text for guaranteed rendering */}
            <span style={{ fontSize: `${14 * scaleRef}px`, fontWeight: 900, color: color, marginTop: `-${4*scaleRef}px` }}>⟲</span>
            <span style={{ fontSize: `${9 * scaleRef}px`, fontWeight: 900, color: color, position: 'absolute', bottom: `${1*scaleRef}px`, right: `${2*scaleRef}px` }}>1</span>
          </div>
        </div>
      );
    case 'Prev2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 22 * scaleRef, height: 22 * scaleRef, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontSize: `${14 * scaleRef}px`, fontWeight: 900, color: color, marginTop: `-${4*scaleRef}px` }}>⟲</span>
            <span style={{ fontSize: `${9 * scaleRef}px`, fontWeight: 900, color: color, position: 'absolute', bottom: `${1*scaleRef}px`, right: `${2*scaleRef}px` }}>2</span>
          </div>
        </div>
      );
    case 'ReverseNext':
      return (
        <div className={containerClass} style={containerStyle}>
          {/* using standard exact unicode arrows to avoid any SVG path issue */}
          <span style={{ fontSize: `${18 * scaleRef}px`, fontWeight: 900, color: color }}>⇄</span>
        </div>
      );
    case 'InvertAll':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 20 * scaleRef, height: 20 * scaleRef, border: `${strokeW}px solid ${color}`, borderRadius: `${6 * scaleRef}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: `${14 * scaleRef}px`, fontWeight: 900, color: color }}>±</span>
          </div>
        </div>
      );
    case 'Star':
      return (
        <div className={containerClass} style={containerStyle}>
          <span style={{ fontSize: `${22 * scaleRef}px`, color: color, lineHeight: 1 }}>★</span>
        </div>
      );
    case 'Heart':
      return (
        <div className={containerClass} style={containerStyle}>
          <span style={{ fontSize: `${20 * scaleRef}px`, color: color, lineHeight: 1 }}>♥</span>
        </div>
      );
    case 'Plus':
      return (
        <div className={containerClass} style={{ ...containerStyle, width: 16 * scaleRef, height: 16 * scaleRef }}>
          <span style={{ fontSize: `${16 * scaleRef}px`, fontWeight: 900, color: plusColor, lineHeight: 1 }}>+</span>
        </div>
      );
    default:
      return <div className={containerClass} style={containerStyle}></div>;
  }
};
