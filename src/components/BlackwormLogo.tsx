import React, { useState } from 'react';
import { BLACKWORM_LOGO_BASE64 } from '../assets/logoBase64';
import { useApp } from '../context/AppContext';

interface BlackwormLogoProps {
  variant?: 'full' | 'horizontal' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const BlackwormLogo: React.FC<BlackwormLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  const [imageError, setImageError] = useState(false);

  // Dynamically resolve custom logo from AppContext if set in Settings
  let activeLogo = BLACKWORM_LOGO_BASE64;
  try {
    const appContext = useApp();
    if (appContext?.companyDetails?.logoUrl) {
      activeLogo = appContext.companyDetails.logoUrl;
    }
  } catch {
    activeLogo = BLACKWORM_LOGO_BASE64;
  }

  // Height configurations for direct image rendering
  const imgHeights = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-18 h-18',
  };

  // Fallback SVG if image is ever unavailable
  const FallbackIconSVG = (
    <svg
      viewBox="0 0 160 140"
      className="shrink-0 drop-shadow-xs w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top Left Green Leaf */}
      <path
        d="M 58,54 C 52,28 62,12 78,4 C 74,18 84,38 78,52 C 72,48 64,50 58,54 Z"
        fill="#009A44"
      />
      {/* Top Right Orange Leaf */}
      <path
        d="M 80,48 C 88,24 106,16 128,14 C 114,24 116,42 98,46 C 92,46 84,46 80,48 Z"
        fill="#F37023"
      />
      {/* Stylized B in Red */}
      <path
        d="M 28 64 H 82 C 96 64 96 82 82 82 H 56 V 88 H 84 C 98 88 98 108 82 108 H 28 Z"
        fill="#E5242A"
      />
      <rect x="42" y="72" width="22" height="6" rx="3" fill="#FFFFFF" />
      <rect x="42" y="94" width="24" height="6" rx="3" fill="#FFFFFF" />

      {/* Stylized A in Green */}
      <path
        d="M 98 108 L 118 64 L 138 108 H 124 L 118 94 L 112 108 Z"
        fill="#009A44"
      />
      {/* A inner dot */}
      <circle cx="118" cy="84" r="3.5" fill="#FFFFFF" />
      <circle cx="118" cy="84" r="2.2" fill="#009A44" />
    </svg>
  );

  // Compact icon variant
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${iconSizes[size]} shrink-0 ${className}`}>
        {!imageError ? (
          <img
            src={activeLogo}
            alt="Blackworm Agritech"
            className="w-full h-full object-contain select-none"
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          FallbackIconSVG
        )}
      </div>
    );
  }

  // Badge variant
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs ${className}`}>
        <img
          src={activeLogo}
          alt="Blackworm Agritech"
          className="h-8 w-auto object-contain shrink-0 select-none"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Full / Stacked Variant
  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center p-1 ${className}`}>
        <img
          src={activeLogo}
          alt="Blackworm Agritech Pvt Ltd"
          className="w-36 sm:w-48 h-auto object-contain max-h-36 select-none"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Default: Horizontal Variant (Header, Letterhead, etc.)
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src={activeLogo}
        alt="Blackworm Agritech Logo"
        className={`${imgHeights[size]} w-auto object-contain shrink-0 max-w-[160px] sm:max-w-[200px] select-none`}
        onError={() => setImageError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

