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
          <div style={{ position: 'relative', width: baseSize, height: baseSize }}>
            {/* The circular loop track for the arrow (18x18 bounds, r=9, center=12,12) */}
            <div style={{ position: 'absolute', top: 3 * scaleRef, left: 3 * scaleRef, width: 18 * scaleRef, height: 18 * scaleRef, border: `${strokeW}px solid ${c}`, borderTopColor: 'transparent', borderRadius: '50%', transform: 'rotate(-45deg)', boxSizing: 'border-box' }} />
            {/* The line-art arrowhead (M3 3v5h5). It's literally an L-shape at (3,3) going 5px down and 5px right! */}
            <div style={{ position: 'absolute', top: 3 * scaleRef, left: 3 * scaleRef, width: 5 * scaleRef, height: 5 * scaleRef, borderLeft: `${strokeW}px solid ${c}`, borderBottom: `${strokeW}px solid ${c}`, borderRadius: 1, boxSizing: 'border-box' }} />
            {/* Number 1 centered */}
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: `${13 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, -apple-system, sans-serif' }}>1</span>
          </div>
        </div>
      );
    case 'Prev2':
      return (
        <div className={containerClass} style={containerStyle}>
          <div style={{ position: 'relative', width: baseSize, height: baseSize }}>
            {/* The circular loop track */}
            <div style={{ position: 'absolute', top: 3 * scaleRef, left: 3 * scaleRef, width: 18 * scaleRef, height: 18 * scaleRef, border: `${strokeW}px solid ${c}`, borderTopColor: 'transparent', borderRadius: '50%', transform: 'rotate(-45deg)', boxSizing: 'border-box' }} />
            {/* The line-art arrowhead */}
            <div style={{ position: 'absolute', top: 3 * scaleRef, left: 3 * scaleRef, width: 5 * scaleRef, height: 5 * scaleRef, borderLeft: `${strokeW}px solid ${c}`, borderBottom: `${strokeW}px solid ${c}`, borderRadius: 1, boxSizing: 'border-box' }} />
            {/* Number 2 centered */}
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: `${13 * scaleRef}px`, fontWeight: 900, color: c, fontFamily: 'system-ui, -apple-system, sans-serif' }}>2</span>
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
          <div style={{ position: 'relative', width: baseSize, height: baseSize }}>
            {/* Box (outer width 20, center 12. x=2 to x=22) */}
            <div style={{ position: 'absolute', top: 2 * scaleRef, left: 2 * scaleRef, width: 20 * scaleRef, height: 20 * scaleRef, border: `${strokeW}px solid ${c}`, borderRadius: `${4 * scaleRef}px`, boxSizing: 'border-box' }} />
            
            {/* Diagonal line (M22 2L2 22). Path from exactly corner to corner, sticking out due to no overflow:hidden! */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 28.28 * scaleRef, height: strokeW, backgroundColor: c, transform: 'translate(-50%, -50%) rotate(-45deg)', borderRadius: `${1.25 * scaleRef}px` }} />

            {/* Minus token (SVG M5 8h4). Center Y=8. Left X=5. Width=4. Thickness=2 (so -1 offset) */}
            <div style={{ position: 'absolute', top: (8 - 1) * scaleRef, left: 5 * scaleRef, width: 4 * scaleRef, height: 2 * scaleRef, backgroundColor: c, borderRadius: `${1 * scaleRef}px` }} />
            
            {/* Plus token horizontal (SVG M15 16h4). Center Y=16. Left X=15. Width=4. */}
            <div style={{ position: 'absolute', top: (16 - 1) * scaleRef, left: 15 * scaleRef, width: 4 * scaleRef, height: 2 * scaleRef, backgroundColor: c, borderRadius: `${1 * scaleRef}px` }} />
            
            {/* Plus token vertical (SVG M17 14v4). Center X=17. Top Y=14. Height=4. */}
            <div style={{ position: 'absolute', top: 14 * scaleRef, left: (17 - 1) * scaleRef, width: 2 * scaleRef, height: 4 * scaleRef, backgroundColor: c, borderRadius: `${1 * scaleRef}px` }} />
          </div>
        </div>
      );
    case 'Star':
      return (
        <div className={containerClass} style={containerStyle}>
          <span style={{ fontSize: `${22 * scaleRef}px`, color: c, lineHeight: 1, marginTop: -1 }}>★</span>
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
