import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const CircleFilled = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export const CircleEmpty = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export const TriangleUp = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2L22 20H2L12 2Z" />
  </svg>
);

export const TriangleDown = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 22L2 4H22L12 22Z" />
  </svg>
);

export const Mul2 = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="6" />
    <path d="M6 9.5L11 14.5M11 9.5L6 14.5" strokeWidth="2" />
    <path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" strokeWidth="2" />
  </svg>
);

export const Div2 = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="6" />
    <path d="M7 16.5L10 7.5" strokeWidth="2" />
    <path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" strokeWidth="2" />
  </svg>
);

export const Prev1 = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M9.5 10L12 7.5v9" strokeWidth="2" />
  </svg>
);

export const Prev2 = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M9 10C9 6.5 15 6.5 15 10.5C15 13.5 9 14.5 9 16.5H15" strokeWidth="2" />
  </svg>
);

export const ReverseNext = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 18l-4-4 4-4" />
    <path d="M5 14h14" />
    <path d="M15 6l4 4-4 4" />
    <path d="M5 10h14" />
  </svg>
);

export const Star = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export const InvertAll = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <path d="M22 2L2 22" />
    <path d="M5 8h4" strokeWidth="2" />
    <path d="M15 16h4M17 14v4" strokeWidth="2" />
  </svg>
);

export const Heart = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

export const Plus = (props: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 5V19M5 12H19" />
  </svg>
);

export const Trophy = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export const Info = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export const MusicOn = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export const MusicOff = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
    <path d="M3 3l18 18" strokeWidth="2.5" />
  </svg>
);
export const Play = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

export const Gift = (props: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </svg>
);
export const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
