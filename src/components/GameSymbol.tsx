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
  const containerClass = `shrink-0 flex items-center justify-center ${className}`;
  const containerStyle = { width: baseSize, height: baseSize };

  // Helper values scoped to scale
  const strokeW = 2.5 * scaleRef;
  const shapeSize = 20 * scaleRef;

  // NUCLEAR DOM FIX:
  // Render ONLY pure HTML/CSS elements (divs, borders, text).
  // Zero SVG or IMG tags. Completely immune to Android WebView caching,
  // texture corruption, and React DOM-node morphing.
  // Meticulously hand-crafted to pixel-perfectly match the old SVG designs!

  switch (type) {
    case 'CircleFilled':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: shapeSize, height: shapeSize, backgroundColor: c, borderRadius: '50%' }} />
        </div>
      );
    case 'CircleEmpty':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: shapeSize, height: shapeSize, border: `${strokeW}px solid ${c}`, borderRadius: '50%', boxSizing: 'border-box' }} />
        </div>
      );
    case 'TriangleUp':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: 0, height: 0, 
            borderLeft: `${11 * scaleRef}px solid transparent`,
            borderRight: `${11 * scaleRef}px solid transparent`,
            borderBottom: `${19 * scaleRef}px solid ${c}`
          }} />
        </div>
      );
    case 'TriangleDown':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: 0, height: 0, 
            borderLeft: `${11 * scaleRef}px solid transparent`,
            borderRight: `${11 * scaleRef}px solid transparent`,
            borderTop: `${19 * scaleRef}px solid ${c}`
          }} />
        </div>
      );
    case 'Mul2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: shapeSize, height: shapeSize, 
            border: `${strokeW}px solid ${c}`, borderRadius: `${6 * scaleRef}px`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' 
          }}>
            <span style={{ fontSize: `${13 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em', lineHeight: 1 }}>x2</span>
          </div>
        </div>
      );
    case 'Div2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: shapeSize, height: shapeSize, 
            border: `${strokeW}px solid ${c}`, borderRadius: `${6 * scaleRef}px`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' 
          }}>
            <span style={{ fontSize: `${13 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em', lineHeight: 1, marginTop: '-2px', marginLeft: '1px' }}>/2</span>
          </div>
        </div>
      );
    case 'Prev1':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: shapeSize, height: shapeSize, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              border: `${strokeW}px solid ${c}`, borderRightColor: 'transparent',
              borderRadius: '50%', transform: 'rotate(-45deg)', boxSizing: 'border-box'
            }} />
            <div style={{
              position: 'absolute', top: -1.5 * scaleRef, left: 7 * scaleRef,
              borderLeft: `${4 * scaleRef}px solid transparent`, borderRight: `${4 * scaleRef}px solid transparent`,
              borderBottom: `${6 * scaleRef}px solid ${c}`, transform: 'rotate(-45deg)'
            }} />
            <span style={{ fontSize: `${13 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1, marginTop: '1px' }}>1</span>
          </div>
        </div>
      );
    case 'Prev2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: shapeSize, height: shapeSize, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              border: `${strokeW}px solid ${c}`, borderRightColor: 'transparent',
              borderRadius: '50%', transform: 'rotate(-45deg)', boxSizing: 'border-box'
            }} />
            <div style={{
              position: 'absolute', top: -1.5 * scaleRef, left: 7 * scaleRef,
              borderLeft: `${4 * scaleRef}px solid transparent`, borderRight: `${4 * scaleRef}px solid transparent`,
              borderBottom: `${6 * scaleRef}px solid ${c}`, transform: 'rotate(-45deg)'
            }} />
            <span style={{ fontSize: `${13 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1, marginTop: '1px' }}>2</span>
          </div>
        </div>
      );
    case 'ReverseNext':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${4 * scaleRef}px`, alignItems: 'center', width: shapeSize, height: shapeSize, justifyContent: 'center' }}>
            {/* Top Arrow (Left pointing) */}
            <div style={{ position: 'relative', width: `${15 * scaleRef}px`, height: `${strokeW}px`, backgroundColor: c, borderRadius: 1 }}>
              <div style={{ position: 'absolute', left: 0, top: '50%', width: `${5 * scaleRef}px`, height: `${5 * scaleRef}px`, borderTop: `${strokeW}px solid ${c}`, borderLeft: `${strokeW}px solid ${c}`, transform: 'translate(1px, -50%) rotate(-45deg)', borderRadius: '1px' }} />
            </div>
            {/* Bottom Arrow (Right pointing) */}
            <div style={{ position: 'relative', width: `${15 * scaleRef}px`, height: `${strokeW}px`, backgroundColor: c, borderRadius: 1 }}>
              <div style={{ position: 'absolute', right: 0, top: '50%', width: `${5 * scaleRef}px`, height: `${5 * scaleRef}px`, borderTop: `${strokeW}px solid ${c}`, borderRight: `${strokeW}px solid ${c}`, transform: 'translate(-1px, -50%) rotate(45deg)', borderRadius: '1px' }} />
            </div>
          </div>
        </div>
      );
    case 'InvertAll':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            position: 'relative', width: shapeSize, height: shapeSize, 
            border: `${strokeW}px solid ${c}`, borderRadius: `${4 * scaleRef}px`, boxSizing: 'border-box', overflow: 'hidden'
          }}>
            {/* Diagonal line */}
            <div style={{ position: 'absolute', width: '150%', height: `${strokeW}px`, backgroundColor: c, top: '50%', left: '-25%', transform: 'rotate(-45deg)', transformOrigin: 'center' }} />
            {/* Minus token on top left */}
            <div style={{ position: 'absolute', top: 2 * scaleRef, left: 1 * scaleRef, width: 5.5 * scaleRef, height: 2.5 * scaleRef, backgroundColor: c, borderRadius: 1 }} />
            {/* Plus token on bottom right */}
            <div style={{ position: 'absolute', bottom: 1 * scaleRef, right: 1.5 * scaleRef, width: 6 * scaleRef, height: 6 * scaleRef }}>
               <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2.5 * scaleRef, marginTop: -1.25 * scaleRef, backgroundColor: c, borderRadius: 1 }} />
               <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: 2.5 * scaleRef, marginLeft: -1.25 * scaleRef, backgroundColor: c, borderRadius: 1 }} />
            </div>
          </div>
        </div>
      );
    case 'Star':
      return (
        <div className={containerClass} style={containerStyle}>
          <span style={{ fontSize: `${26 * scaleRef}px`, color: c, lineHeight: 1, marginTop: -1 }}>★</span>
        </div>
      );
    case 'Heart':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ position: 'relative', width: 11 * scaleRef, height: 11 * scaleRef, backgroundColor: c, transform: 'rotate(-45deg)', marginTop: 4 * scaleRef }}>
            <div style={{ position: 'absolute', width: 11 * scaleRef, height: 11 * scaleRef, backgroundColor: c, borderRadius: '50%', top: -5.5 * scaleRef, left: 0 }} />
            <div style={{ position: 'absolute', width: 11 * scaleRef, height: 11 * scaleRef, backgroundColor: c, borderRadius: '50%', top: 0, left: 5.5 * scaleRef }} />
          </div>
        </div>
      );
    case 'Plus':
      return (
        <div className={containerClass} style={{ ...containerStyle, width: 14 * scaleRef, height: 14 * scaleRef }}>
          <span style={{ fontSize: `${15 * scaleRef}px`, fontWeight: 900, color: p, fontFamily: 'system-ui, sans-serif', lineHeight: 1, marginTop: '-2px' }}>+</span>
        </div>
      );
    default:
      return <div className={containerClass} style={containerStyle} />;
  }
};
