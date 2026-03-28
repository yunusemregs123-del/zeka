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
            display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', boxSizing: 'border-box' 
          }}>
            <span style={{ fontSize: `${10 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.05em', marginTop: '1px' }}>x2</span>
          </div>
        </div>
      );
    case 'Div2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: shapeSize, height: shapeSize, 
            border: `${strokeW}px solid ${c}`, borderRadius: `${6 * scaleRef}px`, 
            display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', boxSizing: 'border-box' 
          }}>
            <span style={{ fontSize: `${10 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.05em', marginTop: '1px' }}>/2</span>
          </div>
        </div>
      );
    case 'Prev1':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 22 * scaleRef, height: 22 * scaleRef, position: 'relative' }}>
            {/* The circular loop track for the arrow */}
            <div style={{
              position: 'absolute', top: 2 * scaleRef, left: 3 * scaleRef, width: 14 * scaleRef, height: 14 * scaleRef,
              borderTop: `${strokeW}px solid ${c}`,
              borderLeft: `${strokeW}px solid ${c}`,
              borderBottom: `${strokeW}px solid ${c}`,
              borderRight: `${strokeW}px solid transparent`,
              borderRadius: '50%',
              boxSizing: 'border-box'
            }} />
            {/* The Arrowhead */}
            <div style={{
              position: 'absolute', top: -0.5 * scaleRef, left: 6 * scaleRef,
              borderLeft: `${3.5 * scaleRef}px solid transparent`,
              borderRight: `${3.5 * scaleRef}px solid transparent`,
              borderTop: `${5.5 * scaleRef}px solid ${c}`,
              transform: 'rotate(25deg)'
            }} />
            <span style={{
              position: 'absolute', bottom: 1 * scaleRef, right: 1 * scaleRef,
              fontSize: `${10 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, sans-serif', lineHeight: 1
            }}>1</span>
          </div>
        </div>
      );
    case 'Prev2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ width: 22 * scaleRef, height: 22 * scaleRef, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 2 * scaleRef, left: 3 * scaleRef, width: 14 * scaleRef, height: 14 * scaleRef,
              borderTop: `${strokeW}px solid ${c}`,
              borderLeft: `${strokeW}px solid ${c}`,
              borderBottom: `${strokeW}px solid ${c}`,
              borderRight: `${strokeW}px solid transparent`,
              borderRadius: '50%',
              boxSizing: 'border-box'
            }} />
             <div style={{
              position: 'absolute', top: -0.5 * scaleRef, left: 6 * scaleRef,
              borderLeft: `${3.5 * scaleRef}px solid transparent`,
              borderRight: `${3.5 * scaleRef}px solid transparent`,
              borderTop: `${5.5 * scaleRef}px solid ${c}`,
              transform: 'rotate(25deg)'
            }} />
            <span style={{
              position: 'absolute', bottom: 1 * scaleRef, right: 1 * scaleRef,
              fontSize: `${10 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, sans-serif', lineHeight: 1
            }}>2</span>
          </div>
        </div>
      );
    case 'ReverseNext':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${4 * scaleRef}px`, alignItems: 'center', width: shapeSize, height: shapeSize, justifyContent: 'center' }}>
            {/* Right pointing arrow */}
            <div style={{ position: 'relative', width: `${16 * scaleRef}px`, height: `${strokeW}px`, backgroundColor: c }}>
              <div style={{ position: 'absolute', right: -1, top: `${-(strokeW*1.5)/2}px`, borderTop: `${strokeW*1.5}px solid transparent`, borderBottom: `${strokeW*1.5}px solid transparent`, borderLeft: `${5 * scaleRef}px solid ${c}` }} />
            </div>
            {/* Left pointing arrow */}
            <div style={{ position: 'relative', width: `${16 * scaleRef}px`, height: `${strokeW}px`, backgroundColor: c }}>
              <div style={{ position: 'absolute', left: -1, top: `${-(strokeW*1.5)/2}px`, borderTop: `${strokeW*1.5}px solid transparent`, borderBottom: `${strokeW*1.5}px solid transparent`, borderRight: `${5 * scaleRef}px solid ${c}` }} />
            </div>
          </div>
        </div>
      );
    case 'InvertAll':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ 
            width: shapeSize, height: shapeSize, 
            border: `${strokeW}px solid ${c}`, borderRadius: `${5 * scaleRef}px`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' 
          }}>
             <span style={{ fontSize: `${12 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, sans-serif', marginTop: '-1px' }}>±</span>
          </div>
        </div>
      );
    case 'Star':
      return (
        <div className={containerClass} style={containerStyle}>
          <span style={{ fontSize: `${22 * scaleRef}px`, color: c, lineHeight: 1, marginTop: '-2px' }}>★</span>
        </div>
      );
    case 'Heart':
      return (
        <div className={containerClass} style={containerStyle}>
          <span style={{ fontSize: `${20 * scaleRef}px`, color: c, lineHeight: 1, marginTop: '2px' }}>♥</span>
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
