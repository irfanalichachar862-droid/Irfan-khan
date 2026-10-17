import React from 'react';

interface ScanWakeLogoProps {
  className?: string;
  size?: number;
}

/**
 * Custom ScanWake Brand Mark combining:
 * 1. Alarm Clock (twin top bells + circular clock bezel + clock hands)
 * 2. QR Code (finder corner square + data matrix cells)
 * 3. Task Checkmark (bold verification checkmark integrated into the lower-right badge)
 */
export const ScanWakeLogo: React.FC<ScanWakeLogoProps> = ({
  className = '',
  size = 38,
}) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--sw-bg) 0%, var(--sw-surface) 100%)',
        borderColor: 'color-mix(in srgb, var(--sw-primary) 55%, transparent)',
      }}
      className={`rounded-xl border flex items-center justify-center shrink-0 shadow-md relative overflow-hidden ${className}`}
      aria-label="ScanWake Logo: Clock, Task & QR Code"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[84%] h-[84%]"
      >
        {/* 1. Twin Alarm Clock Bells at Top */}
        <path
          d="M11 16L21 8"
          stroke="var(--sw-primary)"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M53 16L43 8"
          stroke="var(--sw-primary)"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M32 6V11"
          stroke="var(--sw-accent)"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        {/* 2. Outer Clock Dial Ring */}
        <circle
          cx="32"
          cy="34"
          r="22"
          stroke="var(--sw-primary)"
          strokeWidth="3.6"
        />

        {/* 3. QR Code Finder Square & Data Modules (Left Side of Clock Face) */}
        <rect
          x="17"
          y="21"
          width="11"
          height="11"
          rx="2"
          stroke="var(--sw-accent)"
          strokeWidth="2.6"
        />
        <rect
          x="20.5"
          y="24.5"
          width="4"
          height="4"
          rx="0.8"
          fill="var(--sw-primary)"
        />
        {/* QR Matrix Dots */}
        <rect x="17" y="35" width="4" height="4" rx="0.8" fill="var(--sw-accent)" />
        <rect x="23" y="35" width="4" height="4" rx="0.8" fill="var(--sw-primary)" />
        <rect x="19" y="41" width="4" height="4" rx="0.8" fill="var(--sw-primary)" />

        {/* 4. Clock Hands (Center to Upper-Right) */}
        <circle cx="32" cy="34" r="2.8" fill="#FFFFFF" />
        <path
          d="M32 34V22"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M32 34L42 28"
          stroke="var(--sw-accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 5. Task Checkmark Badge (Bottom-Right Corner Overlapping Clock & QR) */}
        <circle
          cx="46"
          cy="46"
          r="12.5"
          fill="var(--sw-primary)"
          stroke="var(--sw-bg)"
          strokeWidth="3"
        />
        <path
          d="M40.5 46.2L44.2 50L51.8 42"
          stroke="var(--sw-bg)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
